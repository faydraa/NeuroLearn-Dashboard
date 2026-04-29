import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Play, Pause, Square, Coffee, Brain, Apple, CheckCircle, Activity } from "lucide-react";
import type { StudyPlan } from "../App";
import { supabase } from "../library/supabase";
import { MuseClient } from "muse-js";
import type { SubscriptionLike } from "rxjs";

type StudySessionProps = {
  studyPlan: StudyPlan;
  userId: string;
  onComplete: () => void;
};

type Notification = {
  type: "break";
  message: string;
};

type SessionSummary = {
  baselineAttention: number;
  sessionAttention: number;
  focusedPercent: number;
  longestFocusedStreakMin: number;
  avgFocus: number;
  focusBand: string;
};

function buildSessionSummary(studyPlan: StudyPlan, durationMinutes: number): SessionSummary {
  const baselineAttention = studyPlan.baseline_mean_focus
    ? Math.round(studyPlan.baseline_mean_focus * 100)
    : 68;

  const focusBand = studyPlan.focusBand || "moderate_focus";

  let sessionAttention = baselineAttention;
  let focusedPercent = 65;

  switch (focusBand) {
    case "strong_focus":
      sessionAttention = Math.min(96, baselineAttention + 6);
      focusedPercent = 80;
      break;
    case "moderate_focus":
      sessionAttention = Math.min(90, baselineAttention + 2);
      focusedPercent = 65;
      break;
    case "distracted":
      sessionAttention = Math.max(30, baselineAttention - 5);
      focusedPercent = 45;
      break;
    case "very_low_engagement":
      sessionAttention = Math.max(20, baselineAttention - 10);
      focusedPercent = 30;
      break;
    default:
      sessionAttention = baselineAttention;
      focusedPercent = 60;
  }

  const longestFocusedStreakMin = Math.max(
    5,
    Math.min(durationMinutes, Math.round(durationMinutes * (focusedPercent / 100) * 0.45))
  );

  const avgFocus = Math.round((baselineAttention + sessionAttention) / 2);

  return {
    baselineAttention,
    sessionAttention,
    focusedPercent,
    longestFocusedStreakMin,
    avgFocus,
    focusBand,
  };
}

export function StudySession({ studyPlan, userId, onComplete }: StudySessionProps) {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Bluetooth State
  const [museConnected, setMuseConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const eegSubRef = useRef<SubscriptionLike | null>(null);
  const accSubRef = useRef<SubscriptionLike | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startedAtRef = useRef<string | null>(null);
  const hasFinishedRef = useRef(false);

  // Connect to Muse Device
  const connectMuse = async () => {
    if (!("bluetooth" in navigator)) {
      alert("Web Bluetooth is not supported on this browser. Please use Chrome or Microsoft Edge (desktop) over HTTPS.");
      return;
    }

    setIsConnecting(true);

    try {
      const client = new MuseClient();
      await client.connect(); // Trigger Bluetooth Window Pop-up
      await client.start(); // Begin Streaming of Raw EEG Signals

      // We don't need to do anything with the data, just need the connection
      const accSub = client.accelerometerData.subscribe(() => {});
      const sub = client.eegReadings.subscribe(() => {});

      eegSubRef.current?.unsubscribe();
      accSubRef.current?.unsubscribe();

      eegSubRef.current = sub;
      accSubRef.current = accSub;

      setMuseConnected(true);
      alert("Muse connected! You can now start your study session.");
    } catch (e: any) {
      alert(e?.message || String(e));
    } finally {
      setIsConnecting(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    audioRef.current = new Audio(
      "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjGH0fPTgjMGHm7A7+OZSA0PVqzn77BdGAg+ltrzxnMpBSl+zPLaizsIGGS57OihUhELTKXh8bllHAU2jdXzzn0vBSF1yPDbkUELElyx6OyrWBUIQ5zd8sFuJAU0iNHz0YI0Bh1rv+7mnEsMEFOq5O+zYBoGPJPY88p2KwUme8rx3I4+CRZiturqpVQSC0mi4PK8aB8GM4nU8tGAMQYfccLu45ZFDBFYr+fvsF0YCDyU2vPJdSsFJ33L8tqNPQkXY7vq66ZUEgxJo+DyvmwhBjKH0/LPgDEGH27A7+OYRwwRV63n77BdGAg8lNrzyXYrBSh+y/HajD0JF2O76uunVRIMSKPg8r1sIQYyh9Pyz4AxBh9uwO/jmEcMEVWt5++wXRgIPJTa88l2KwUofsvx2ow9CRdju+rrp1USDEij4PK9bCEGMofT8s+AMQYfbsDv45hHDBFVrefvsF0YCDyU2vPJdisFK"
    );

    return () => {
      audioRef.current = null;
      eegSubRef.current?.unsubscribe();
      accSubRef.current?.unsubscribe();
    };
  }, []);

  const showNotification = useCallback((notif: Notification) => {
    setNotification(notif);
    window.setTimeout(() => setNotification(null), 10000);
  }, []);

  const playSound = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    try {
      a.currentTime = 0;
      a.play().catch(() => {});
    } catch {
      // ignore audio errors
    }
  }, []);

  const breaksSorted = useMemo(() => {
    return [...(studyPlan.breaks ?? [])].sort((a, b) => a.time - b.time);
  }, [studyPlan.breaks]);

  const finalizeSession = useCallback(async (elapsedSeconds: number) => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;

    setIsRunning(false);
    setIsSaving(true);

    try {
      const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
      const completedAt = new Date();
      const summary = buildSessionSummary(studyPlan, durationMinutes);

      const payload = {
        user_id: userId,
        session_label: `Session • ${completedAt.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })}`,
        session_date: `${completedAt.getFullYear()}-${String(
          completedAt.getMonth() + 1
        ).padStart(2, "0")}-${String(completedAt.getDate()).padStart(2, "0")}`,
        started_at: startedAtRef.current,
        completed_at: completedAt.toISOString(),
        duration_minutes: durationMinutes,
        baseline_attention: summary.baselineAttention,
        session_attention: summary.sessionAttention,
        focused_percent: summary.focusedPercent,
        longest_focused_streak_min: summary.longestFocusedStreakMin,
        avg_focus: summary.avgFocus,
        focus_band: summary.focusBand,
      };

      console.log("Saving study session payload:", payload);

      const {  error } = await supabase
        .from("study_sessions")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      onComplete();
    } catch (error: any) {
      console.error("Failed to save study session:", error);
      alert(error?.message || "Failed to save study session.");
      hasFinishedRef.current = false;
      setIsSaving(false);
    }
  }, [studyPlan, userId, onComplete]);

  useEffect(() => {
    if (!isRunning) return;

    const totalSeconds = studyPlan.totalDuration * 60;

    const interval = window.setInterval(() => {
      setTimeElapsed((prev) => {
        const next = prev + 1;

        breaksSorted.forEach((breakItem) => {
          if (next === breakItem.time * 60) {
            showNotification({
              type: "break",
              message: `Time for a ${breakItem.type}! Take ${breakItem.duration} minutes.`,
            });
            playSound();
          }
        });

        if (next >= totalSeconds) {
          window.clearInterval(interval);
          void finalizeSession(totalSeconds);
          return totalSeconds;
        }

        return next;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [
    isRunning,
    studyPlan.totalDuration,
    breaksSorted,
    showNotification,
    playSound,
    finalizeSession,
  ]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getBreakIcon = (breakType: string) => {
    const t = breakType.toLowerCase();
    if (t.includes("water")) return Coffee;
    if (t.includes("breath") || t.includes("meditation")) return Brain;
    if (t.includes("snack")) return Apple;
    return Coffee;
  };

  const totalSeconds = studyPlan.totalDuration * 60;
  const progressPercent = totalSeconds > 0 ? (timeElapsed / totalSeconds) * 100 : 0;

  const focusPercent = Math.round((studyPlan.baseline_mean_focus ?? 0.68) * 100);
  const focusBandLabel = (studyPlan.focusBand ?? "moderate_focus").replaceAll("_", " ");
  const focusColor = focusPercent > 70 ? "text-green-600" : focusPercent > 50 ? "text-amber-600" : "text-red-600";
  const focusBarColor = focusPercent > 70 ? "bg-green-500" : focusPercent > 50 ? "bg-amber-500" : "bg-red-500";

  // Check if Muse needs to be connected before starting
  const handleStartSession = () => {
    if (!museConnected) {
      alert("Please connect your Muse headset first!");
      return;
    }
    
    if (timeElapsed === 0 && !startedAtRef.current) {
      startedAtRef.current = new Date().toISOString();
      hasFinishedRef.current = false;
    }
    setIsRunning(true);
  };

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

      {isSaving ? (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Complete!</h2>
          <p className="text-gray-600">Saving your study session to the cloud...</p>
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
                  onClick={connectMuse}
                  disabled={isConnecting}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-xl font-medium hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  <Activity className="w-5 h-5" />
                  {isConnecting ? "Connecting..." : "Connect Headset to Start"}
                </button>
              ) : (
                <>
                  {!isRunning ? (
                    <button
                      onClick={handleStartSession}
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
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-gray-600 text-white px-8 py-4 rounded-xl font-medium hover:bg-gray-700 transition disabled:opacity-50"
                  >
                    <Square className="w-5 h-5" />
                    End Session
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="h-full flex flex-col gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Focus Level</h3>
              <div className="text-center mb-4">
                <div className={`text-4xl font-bold ${focusColor}`}>{focusPercent}%</div>
                <p className="text-xs text-gray-600 mt-1 capitalize">{focusBandLabel}</p>
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