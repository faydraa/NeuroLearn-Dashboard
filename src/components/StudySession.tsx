import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Play, Pause, Square, Coffee, Brain, Apple, CheckCircle } from "lucide-react";
import type { StudyPlan } from "../App";
import { MuseClient } from "muse-js";
import type { SubscriptionLike } from "rxjs";
import { supabase } from "../library/supabase";

type StudySessionProps = {
  studyPlan: StudyPlan;
  onComplete: () => void;
};

type Notification = {
  type: "break";
  message: string;
};

export type RawEEGSample = {
  timestamp: number;
  tp9: number;
  af7: number;
  af8: number;
  tp10: number;
  accX: number;
  accY: number;
  accZ: number;
};

export function StudySession({ studyPlan, onComplete }: StudySessionProps) {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);

  const [museConnected, setMuseConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const focusPercent = Math.round((studyPlan.baseline_mean_focus ?? 0.75) * 100);
  const focusBandLabel = (studyPlan.focusBand ?? "unknown").replaceAll("_", " ");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const focusLevelRef = useRef(focusPercent);

  const eegSubRef = useRef<SubscriptionLike | null>(null);
  const accSubRef = useRef<SubscriptionLike | null>(null);

  const latestRef = useRef<{
    tp9?: number;
    af7?: number;
    af8?: number;
    tp10?: number;
    accX?: number;
    accY?: number;
    accZ?: number;
  }>({});

  const isRecordingRef = useRef(false);
  const fullSessionRef = useRef<RawEEGSample[]>([]);
  const hasFinishedRef = useRef(false);

  // IMPORTANT:
  // If your real bucket name is still raw_test_data, change this back to "raw_test_data".
  // If you already renamed it to raw_eeg_data, keep this as "raw_eeg_data".
  const STORAGE_BUCKET = "raw_test_data";

  useEffect(() => {
    focusLevelRef.current = focusPercent;
  }, [focusPercent]);

  useEffect(() => {
    audioRef.current = new Audio(
      "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjGH0fPTgjMGHm7A7+OZSA0PVqzn77BdGAg+ltrzxnMpBSl+zPLaizsIGGS57OihUhELTKXh8bllHAU2jdXzzn0vBSF1yPDbkUELElyx6OyrWBUIQ5zd8sFuJAU0iNHz0YI0Bh1rv+7mnEsMEFOq5O+zYBoGPJPY88p2KwUme8rx3I4+CRZiturqpVQSC0mi4PK8aB8GM4nU8tGAMQYfccLu45ZFDBFYr+fvsF0YCDyU2vPJdSsFJ33L8tqNPQkXY7vq66ZUEgxJo+DyvmwhBjKH0/LPgDEGH27A7+OYRwwRV63n77BdGAg8lNrzyXYrBSh+y/HajD0JF2O76uunVRIMSKPg8r1sIQYyh9Pyz4AxBh9uwO/jmEcMEVWt5++wXRgIPJTa88l2KwUofsvx2ow9CRdju+rrp1USDEij4PK9bCEGMofT8s+AMQYfbsDv45hHDBFVrefvsF0YCDyU2vPJdisFK"
    );

    return () => {
      eegSubRef.current?.unsubscribe();
      accSubRef.current?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    isRecordingRef.current = isRunning;
  }, [isRunning]);

  const connectMuseWeb = async () => {
    if (!("bluetooth" in navigator)) {
      alert("Web Bluetooth is not supported on this browser.");
      return;
    }

    setIsConnecting(true);

    try {
      const client = new MuseClient();
      await client.connect();
      await client.start();

      const accSub = client.accelerometerData.subscribe((reading: any) => {
        const last = reading.samples?.[reading.samples.length - 1];
        if (!last) return;

        latestRef.current.accX = last.x;
        latestRef.current.accY = last.y;
        latestRef.current.accZ = last.z;
      });

      const eegSub = client.eegReadings.subscribe((reading: any) => {
        const last = reading.samples?.[reading.samples.length - 1];
        if (typeof last !== "number") return;

        if (reading.electrode === 0) latestRef.current.tp9 = last;
        if (reading.electrode === 1) latestRef.current.af7 = last;
        if (reading.electrode === 2) latestRef.current.af8 = last;
        if (reading.electrode === 3) latestRef.current.tp10 = last;

        if (!isRecordingRef.current) return;

        const { tp9, af7, af8, tp10, accX, accY, accZ } = latestRef.current;
        if ([tp9, af7, af8, tp10, accX, accY, accZ].some((v) => typeof v !== "number")) return;

        const sample: RawEEGSample = {
          timestamp: Date.now(),
          tp9: tp9 as number,
          af7: af7 as number,
          af8: af8 as number,
          tp10: tp10 as number,
          accX: accX as number,
          accY: accY as number,
          accZ: accZ as number,
        };

        fullSessionRef.current.push(sample);
      });

      eegSubRef.current?.unsubscribe();
      accSubRef.current?.unsubscribe();
      eegSubRef.current = eegSub;
      accSubRef.current = accSub;

      setMuseConnected(true);
      alert("Muse connected! Ready to begin your study session.");
    } catch (e: any) {
      alert(e?.message || String(e));
    } finally {
      setIsConnecting(false);
    }
  };

  const showNotification = useCallback((notif: Notification) => {
    setNotification(notif);
    setTimeout(() => setNotification(null), 10000);
  }, []);

  const playSound = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    try {
      a.currentTime = 0;
      a.play().catch(() => {});
    } catch {}
  }, []);

  const saveProgress = useCallback((totalSeconds: number) => {
    const today = new Date().toISOString().split("T")[0];
    const existing = localStorage.getItem("studyProgress");
    const progress = existing ? JSON.parse(existing) : {};

    const minutesThisSession = totalSeconds / 60;
    const currentFocus = focusLevelRef.current;

    if (!progress[today]) {
      progress[today] = {
        completedMinutes: 0,
        plannedMinutes: 0,
        sessions: 0,
        avgFocus: 0,
        focusMinutes: 0,
      };
    } else {
      if (progress[today].completedMinutes == null) progress[today].completedMinutes = progress[today].duration ?? 0;
      if (progress[today].plannedMinutes == null) progress[today].plannedMinutes = 0;
      if (progress[today].sessions == null) progress[today].sessions = 0;
      if (progress[today].avgFocus == null) progress[today].avgFocus = 0;
      if (progress[today].focusMinutes == null) progress[today].focusMinutes = 0;
    }

    progress[today].completedMinutes += minutesThisSession;
    progress[today].sessions += 1;

    const prevFocusMinutes = progress[today].focusMinutes || 0;
    const prevAvg = progress[today].avgFocus || 0;
    const newFocusMinutes = prevFocusMinutes + minutesThisSession;

    const weighted =
      newFocusMinutes > 0
        ? ((prevAvg * prevFocusMinutes) + (currentFocus * minutesThisSession)) / newFocusMinutes
        : currentFocus;

    progress[today].avgFocus = weighted;
    progress[today].focusMinutes = newFocusMinutes;
    progress[today].duration = progress[today].completedMinutes;

    localStorage.setItem("studyProgress", JSON.stringify(progress));
  }, []);

  const uploadStudySessionData = useCallback(
    async (elapsedSeconds: number) => {
      console.log("Step 1: Preparing to upload study session...");
      
      try {
        const sessionData = fullSessionRef.current;
        console.log(`Step 2: Found ${sessionData?.length || 0} EEG data points.`);

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          console.error("Auth Error:", authError);
          alert("Upload blocked: You are not logged in.");
          setIsUploading(false);
          hasFinishedRef.current = false;
          return;
        }
        console.log("Step 3: Authenticated as user:", user.id);

        if (!sessionData || sessionData.length === 0) {
          alert("No EEG data was recorded! Please make sure the headset is streaming before ending.");
          setIsUploading(false);
          hasFinishedRef.current = false;
          return;
        }

        const headers = ["timestamp", "eeg_1", "eeg_2", "eeg_3", "eeg_4", "acc_1", "acc_2", "acc_3"];
        const csvRows = [headers.join(",")];

        sessionData.forEach((sample) => {
          csvRows.push(
            `${sample.timestamp},${sample.tp9},${sample.af7},${sample.af8},${sample.tp10},${sample.accX},${sample.accY},${sample.accZ}`
          );
        });

        const csvString = csvRows.join("\n");
        const blob = new Blob([csvString], { type: "text/csv" });

        const fileName = `study session/${user.id}/session_${Date.now()}.csv`;
        console.log(`Step 4: Attempting to upload to Supabase -> ${fileName}`);

        const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(fileName, blob, {
          contentType: "text/csv",
          upsert: false,
        });

        if (error) {
          console.error("Step 5 Error: Supabase rejected the upload!", error);
          throw error;
        }

        console.log(`✅ Step 5 Success: Uploaded study data to ${fileName}`);
        
        // ONLY move forward if the upload actually succeeded!
        saveProgress(elapsedSeconds);
        onComplete();

      } catch (err: any) {
        console.error("CRITICAL ERROR during upload:", err);
        alert("Failed to upload session data: " + (err.message || JSON.stringify(err)));
        
        // Unfreeze the UI so you can try again
        setIsUploading(false);
        hasFinishedRef.current = false;
      }
    },
    [saveProgress, onComplete]
  );

  const finalizeSession = useCallback(
    async (elapsedSeconds: number) => {
      if (hasFinishedRef.current) return;

      hasFinishedRef.current = true;
      setIsRunning(false);
      setIsUploading(true);

      await uploadStudySessionData(elapsedSeconds);
    },
    [uploadStudySessionData]
  );

  const breaksSorted = useMemo(() => {
    return [...(studyPlan.breaks ?? [])].sort((a, b) => a.time - b.time);
  }, [studyPlan.breaks]);

  const getBreakIcon = (breakType: string) => {
    const t = breakType.toLowerCase();
    if (t.includes("water")) return Coffee;
    if (t.includes("breath") || t.includes("meditation")) return Brain;
    if (t.includes("snack")) return Apple;
    return Coffee;
  };

  useEffect(() => {
    if (!isRunning) return;

    const totalSeconds = studyPlan.totalDuration * 60;

    const interval = setInterval(() => {
      setTimeElapsed((prev) => {
        const newTime = prev + 1;

        breaksSorted.forEach((breakItem) => {
          if (newTime === breakItem.time * 60) {
            showNotification({
              type: "break",
              message: `Time for a ${breakItem.type}! Take ${breakItem.duration} minutes.`,
            });
            playSound();
          }
        });

        if (newTime >= totalSeconds) {
          clearInterval(interval);
          void finalizeSession(totalSeconds);
          return totalSeconds;
        }

        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, breaksSorted, studyPlan.totalDuration, showNotification, playSound, finalizeSession]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const totalSeconds = studyPlan.totalDuration * 60;
  const progressPercent = totalSeconds > 0 ? (timeElapsed / totalSeconds) * 100 : 0;

  const focusColor =
    focusPercent > 70 ? "text-green-600" : focusPercent > 50 ? "text-amber-600" : "text-red-600";
  const focusBarColor =
    focusPercent > 70 ? "bg-green-500" : focusPercent > 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Study Session</h1>
        <p className="text-gray-600">Stay focused and follow your personalised study plan</p>
      </div>

      {notification && (
        <div className="mb-6 p-4 rounded-xl border-2 animate-pulse bg-green-50 border-green-500">
          <div className="flex items-center gap-3">
            <Coffee className="w-6 h-6 text-green-600" />
            <p className="font-medium text-gray-900">{notification.message}</p>
          </div>
        </div>
      )}

      {isUploading ? (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Complete!</h2>
          <p className="text-gray-600">Uploading your EEG data to the cloud...</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6 mb-8 items-stretch">
          <div className="md:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-200 p-8 h-full">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-100 rounded-full mb-4">
                <Brain className="w-10 h-10 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Study Session Timer</h2>
              <p className="text-gray-600 text-sm">Focus on your work and follow the break reminders</p>
            </div>

            <div className="text-center mb-8">
              <div className="text-6xl font-bold text-gray-900 mb-4 font-mono">{formatTime(timeElapsed)}</div>
              <p className="text-gray-600">of {formatTime(totalSeconds)} total</p>
            </div>

            <div className="mb-8">
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-1000"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-center gap-4">
              {!museConnected ? (
                <button
                  onClick={connectMuseWeb}
                  disabled={isConnecting}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-xl font-medium hover:bg-indigo-700 transition"
                >
                  <Brain className="w-5 h-5" />
                  {isConnecting ? "Connecting..." : "Connect Headset to Start"}
                </button>
              ) : !isRunning ? (
                <button
                  onClick={() => {
                    if (timeElapsed === 0) {
                      fullSessionRef.current = [];
                      hasFinishedRef.current = false;
                    }
                    setIsRunning(true);
                  }}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-xl font-medium hover:bg-indigo-700 transition"
                >
                  <Play className="w-5 h-5" />
                  {timeElapsed === 0 ? "Start Session" : "Resume"}
                </button>
              ) : (
                <button
                  onClick={() => setIsRunning(false)}
                  className="flex items-center gap-2 bg-amber-600 text-white px-8 py-4 rounded-xl font-medium hover:bg-amber-700 transition"
                >
                  <Pause className="w-5 h-5" />
                  Pause
                </button>
              )}

              <button
                onClick={() => void finalizeSession(timeElapsed)}
                disabled={(!museConnected && timeElapsed === 0) || isUploading}
                className="flex items-center gap-2 bg-gray-600 text-white px-8 py-4 rounded-xl font-medium hover:bg-gray-700 transition disabled:opacity-50"
              >
                <Square className="w-5 h-5" />
                End Session
              </button>
            </div>
          </div>

          <div className="h-full flex flex-col gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Focus Level</h3>
              <div className="text-center mb-4">
                <div className={`text-4xl font-bold ${focusColor}`}>{focusPercent}%</div>
                <p className="text-xs text-gray-600 mt-1 capitalize">{focusBandLabel}</p>
                {typeof studyPlan.baseline_mean_focus === "number" && (
                  <p className="text-xs text-gray-500 mt-1">
                    Mean p_focus_smoothed: {studyPlan.baseline_mean_focus.toFixed(3)}
                  </p>
                )}
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-1000 ${focusBarColor}`} style={{ width: `${focusPercent}%` }} />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex-1">
              <h3 className="font-bold text-gray-900 mb-4">Upcoming Breaks</h3>

              {breaksSorted.length === 0 ? (
                <p className="text-sm text-gray-600">No breaks scheduled for this session.</p>
              ) : (
                <div className="space-y-3">
                  {breaksSorted.map((breakItem, idx) => {
                    const breakTimeSeconds = breakItem.time * 60;
                    const isPast = timeElapsed > breakTimeSeconds;
                    const Icon = getBreakIcon(breakItem.type);

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg ${isPast ? "bg-gray-100" : "bg-green-50 border border-green-200"}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`w-4 h-4 ${isPast ? "text-gray-400" : "text-green-600"}`} />
                          <p className={`font-medium text-sm ${isPast ? "text-gray-500 line-through" : "text-gray-900"}`}>
                            {breakItem.type}
                          </p>
                        </div>
                        <p className="text-xs text-gray-600">
                          At {breakItem.time} min • {breakItem.duration} min break
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}