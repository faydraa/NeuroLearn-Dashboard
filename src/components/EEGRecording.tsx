import React, { useCallback, useEffect, useRef, useState } from "react";
import { Brain, Activity, AlertTriangle, RefreshCw } from "lucide-react";
import type { StudyPlan } from "../App";
import { MuseClient } from "muse-js";
import type { SubscriptionLike } from "rxjs";
import { EEGWaveform } from "./EEGWaveform";
import { supabase } from "../library/supabase";
import { generateRuleBasedPlan } from "../library/rulebasedstudy";

type EEGRecordingProps = {
  onComplete: (studyPlan: StudyPlan) => void;
  userName: string;
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

type RecordingStage = "eyesClosed" | "studying";
type SessionFolder = "baseline" | "study session";

const EYES_CLOSED_DURATION = 10;
const STUDYING_DURATION = 10 * 0; // baseline test version
const RECORDING_DURATION = EYES_CLOSED_DURATION + STUDYING_DURATION;

const MAX_POINTS = 512;

function formatMMSS(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function addPlannedMinutesForToday(plannedMinutesToAdd: number) {
  const today = new Date().toISOString().split("T")[0];
  const existing = localStorage.getItem("studyProgress");
  const progress = existing ? JSON.parse(existing) : {};

  if (!progress[today]) {
    progress[today] = { completedMinutes: 0, plannedMinutes: 0, sessions: 0, avgFocus: 0 };
  } else {
    if (progress[today].completedMinutes == null) progress[today].completedMinutes = progress[today].duration ?? 0;
    if (progress[today].plannedMinutes == null) progress[today].plannedMinutes = 0;
    if (progress[today].sessions == null) progress[today].sessions = 0;
    if (progress[today].avgFocus == null) progress[today].avgFocus = 0;
  }

  progress[today].plannedMinutes += plannedMinutesToAdd;

  if (progress[today].duration == null) {
    progress[today].duration = progress[today].completedMinutes;
  }

  localStorage.setItem("studyProgress", JSON.stringify(progress));
}

function meanOfColumn(csvText: string, columnName: string): number {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error("CSV has no data rows.");

  const headers = lines[0].split(",");
  const idx = headers.indexOf(columnName);
  if (idx === -1) throw new Error(`Column "${columnName}" not found in CSV.`);

  let sum = 0;
  let n = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const val = Number(cols[idx]);
    if (!Number.isFinite(val)) continue;
    sum += val;
    n += 1;
  }

  if (n === 0) throw new Error(`No numeric values found in column "${columnName}".`);
  return sum / n;
}

export function EEGRecording({ onComplete, userName }: EEGRecordingProps) {
  const [museConnected, setMuseConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const [recordingStage, setRecordingStage] = useState<RecordingStage>("eyesClosed");
  const recordingStageRef = useRef<RecordingStage>("eyesClosed");
  const [stageBanner, setStageBanner] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  const [waveformData, setWaveformData] = useState<RawEEGSample[]>([]);

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
  const bufferRef = useRef<RawEEGSample[]>([]);
  const rafIdRef = useRef<number | null>(null);
  const fullSessionRef = useRef<RawEEGSample[]>([]);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    return () => {
      eegSubRef.current?.unsubscribe();
      accSubRef.current?.unsubscribe();

      if (timerRef.current) window.clearInterval(timerRef.current);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  const flushToState = useCallback(() => {
    rafIdRef.current = null;

    if (!isRecordingRef.current) return;
    if (bufferRef.current.length === 0) return;

    const toAdd = bufferRef.current;
    bufferRef.current = [];

    setWaveformData((prev) => {
      const updated = [...prev, ...toAdd];
      if (updated.length > MAX_POINTS) {
        updated.splice(0, updated.length - MAX_POINTS);
      }
      return updated;
    });
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const uploadEEGData = useCallback(async (folder: SessionFolder) => {
    const sessionData = fullSessionRef.current;

    if (!sessionData || sessionData.length === 0) {
      throw new Error("No EEG samples were recorded.");
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("User is not authenticated.");
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

    const fileName = `${folder}/${user.id}/session_${Date.now()}.csv`;

    const { error } = await supabase.storage.from("raw_test_data").upload(fileName, blob, {
      contentType: "text/csv",
      upsert: false,
    });

    if (error) throw error;

    console.log(`Successfully uploaded raw file to ${fileName}`);
    return fileName;
  }, []);

  const finishRecording = useCallback(
    async (folder: SessionFolder, goToAnalyzing = false) => {
      stopTimer();
      setStageBanner(null);

      isRecordingRef.current = false;
      setIsRecording(false);

      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      if (bufferRef.current.length > 0) {
        const toAdd = bufferRef.current;
        bufferRef.current = [];

        setWaveformData((prev) => {
          const updated = [...prev, ...toAdd];
          if (updated.length > MAX_POINTS) {
            updated.splice(0, updated.length - MAX_POINTS);
          }
          return updated;
        });
      }

      setIsUploading(true);
      setUploadComplete(false);

      try {
        await uploadEEGData(folder);
        setUploadComplete(true);
        if (goToAnalyzing) setIsAnalyzing(true);
      } catch (err: any) {
        console.error("Upload failed:", err);
        alert("Failed to upload EEG CSV: " + (err?.message || String(err)));
      } finally {
        setIsUploading(false);
      }
    },
    [stopTimer, uploadEEGData]
  );

  const connectMuseWeb = async () => {
    if (!("bluetooth" in navigator)) {
      alert("Web Bluetooth is not supported on this browser. Please use Chrome or Edge (desktop) over HTTPS.");
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

      const sub = client.eegReadings.subscribe((reading: any) => {
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
        bufferRef.current.push(sample);

        if (rafIdRef.current == null) {
          rafIdRef.current = requestAnimationFrame(flushToState);
        }
      });

      eegSubRef.current?.unsubscribe();
      accSubRef.current?.unsubscribe();
      eegSubRef.current = sub;
      accSubRef.current = accSub;

      setMuseConnected(true);
      alert("Muse connected! You can start recording.");
    } catch (e: any) {
      alert(e?.message || String(e));
    } finally {
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    if (!isRecording) return;

    startTimeRef.current = Date.now();
    setProgress(0);
    setElapsedSec(0);

    recordingStageRef.current = "eyesClosed";
    setRecordingStage("eyesClosed");
    setStageBanner("Close your eyes and relax for 1 minute.");
    window.setTimeout(() => setStageBanner(null), 5000);

    stopTimer();

    timerRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - (startTimeRef.current ?? Date.now())) / 1000;
      const elapsedRounded = Math.floor(elapsed);
      setElapsedSec(elapsedRounded);

      if (elapsed >= EYES_CLOSED_DURATION && recordingStageRef.current === "eyesClosed") {
        recordingStageRef.current = "studying";
        setRecordingStage("studying");
        setStageBanner("Start studying now. Continue for 10 minutes.");
        window.setTimeout(() => setStageBanner(null), 6000);
      }

      const pct = RECORDING_DURATION > 0 ? Math.min((elapsed / RECORDING_DURATION) * 100, 100) : 100;
      setProgress(pct);

      if (pct >= 100) {
        void finishRecording("baseline", true);
      }
    }, 200);

    return () => {
      stopTimer();
    };
  }, [isRecording, finishRecording, stopTimer]);

  const handleCheckResults = async () => {
    setIsChecking(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("User not found");

      const folderPath = `baseline/${user.id}`;

      const { data, error } = await supabase.storage.from("focus_scores").list(folderPath, {
        sortBy: { column: "created_at", order: "desc" },
      });

      if (error) throw error;

      const csvFiles = data?.filter((f) => f.name.endsWith(".csv")) || [];

      if (csvFiles.length === 0) {
        alert("Results not found yet. Make sure your Python processing scripts have finished running, then try again.");
        setIsChecking(false);
        return;
      }

      const latestFile = csvFiles[0];

      const { data: blob, error: downloadError } = await supabase.storage
        .from("focus_scores")
        .download(`${folderPath}/${latestFile.name}`);

      if (downloadError || !blob) throw downloadError;

      const csvText = await blob.text();
      const baseline_mean_focus = meanOfColumn(csvText, "p_focus_smoothed");
      const plan = generateRuleBasedPlan(baseline_mean_focus);

      addPlannedMinutesForToday(plan.totalDuration);
      onCompleteRef.current(plan);
    } catch (err: any) {
      console.error("Failed to check results:", err);
      alert("Error fetching results: " + err.message);
    }
    setIsChecking(false);
  };

  const startRecording = () => {
    if (!museConnected) {
      alert("Please connect Muse first!");
      return;
    }

    bufferRef.current = [];
    setWaveformData([]);
    fullSessionRef.current = [];

    setIsAnalyzing(false);
    setUploadComplete(false);
    setIsUploading(false);
    setIsRecording(true);
  };

  // use this in your STUDY SESSION page
  const handleEndSession = async () => {
    if (!isRecording) return;
    await finishRecording("study session", false);
    alert("Study session ended and raw EEG data was saved.");
  };

  const totalRemaining = RECORDING_DURATION - elapsedSec;
  const stageRemaining =
    recordingStage === "eyesClosed" ? EYES_CLOSED_DURATION - elapsedSec : RECORDING_DURATION - elapsedSec;

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* existing JSX stays the same */}

      {!isRecording && !isAnalyzing && museConnected && (
        <button
          onClick={startRecording}
          className="w-full bg-indigo-600 text-white py-4 rounded-xl font-medium hover:bg-indigo-700 transition flex items-center justify-center gap-2"
        >
          <Activity className="w-5 h-5" />
          Start Recording
        </button>
      )}

      {isRecording && (
        <>
          <div className="mt-8">
            {waveformData.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-sm">Waiting for EEG stream...</div>
            ) : (
              <EEGWaveform waveformData={waveformData} />
            )}
          </div>

          <button
            onClick={handleEndSession}
            disabled={isUploading}
            className="w-full mt-4 bg-red-600 text-white py-3 rounded-xl font-medium hover:bg-red-700 disabled:bg-red-300 transition"
          >
            {isUploading ? "Saving Session..." : "End Session"}
          </button>
        </>
      )}

      {isAnalyzing && (
        <div className="flex flex-col items-center gap-6 mt-6">
          <div className="text-center space-y-2">
            {uploadComplete ? (
              <p className="text-green-600 font-semibold">✅ Raw data uploaded to Supabase</p>
            ) : (
              <p className="text-gray-500 animate-pulse">Uploading raw data to Supabase...</p>
            )}
            <p className="text-gray-600 text-sm">Please run your Python processing scripts now.</p>
          </div>

          <button
            onClick={handleCheckResults}
            disabled={!uploadComplete || isChecking}
            className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:bg-indigo-300 transition-all shadow-md"
          >
            <RefreshCw className={`w-5 h-5 ${isChecking ? "animate-spin" : ""}`} />
            {isChecking ? "Checking for Results..." : "I've run the scripts - Get Results!"}
          </button>
        </div>
      )}
    </div>
  );
}