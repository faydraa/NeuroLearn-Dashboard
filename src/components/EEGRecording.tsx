import React, { useCallback, useEffect, useRef, useState } from "react";
import { Brain, Activity, AlertTriangle } from "lucide-react";
import type { StudyPlan } from "../App";
import { MuseClient } from "muse-js";
import type { SubscriptionLike } from "rxjs";
import { EEGWaveform } from "./EEGWaveform";

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
};

type RecordingStage = "eyesClosed" | "studying";

// Restore these when you’re done testing
const EYES_CLOSED_DURATION = 0;
const STUDYING_DURATION = 0;
const RECORDING_DURATION = EYES_CLOSED_DURATION + STUDYING_DURATION;

const MAX_POINTS = 512;
const ANALYSIS_DURATION_MS = 15000;

function formatMMSS(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// add today's planned minutes
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

export function EEGRecording({ onComplete, userName }: EEGRecordingProps) {
  const [museConnected, setMuseConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);

  const [recordingStage, setRecordingStage] = useState<RecordingStage>("eyesClosed");
  const recordingStageRef = useRef<RecordingStage>("eyesClosed");
  const [stageBanner, setStageBanner] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  const [waveformData, setWaveformData] = useState<RawEEGSample[]>([]);

  const eegSubRef = useRef<SubscriptionLike | null>(null);
  const latestRef = useRef<{ tp9?: number; af7?: number; af8?: number; tp10?: number }>({});
  const isRecordingRef = useRef(false);

  const bufferRef = useRef<RawEEGSample[]>([]);
  const rafIdRef = useRef<number | null>(null);

  const fullSessionRef = useRef<RawEEGSample[]>([]);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    return () => {
      eegSubRef.current?.unsubscribe();

      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }

      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const flushToState = useCallback(() => {
    rafIdRef.current = null;

    if (!isRecordingRef.current) {
      bufferRef.current = [];
      return;
    }

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

      const sub = client.eegReadings.subscribe((reading: any) => {
        const last = reading.samples?.[reading.samples.length - 1];
        if (typeof last !== "number") return;

        if (reading.electrode === 0) latestRef.current.tp9 = last;
        if (reading.electrode === 1) latestRef.current.af7 = last;
        if (reading.electrode === 2) latestRef.current.af8 = last;
        if (reading.electrode === 3) latestRef.current.tp10 = last;

        if (!isRecordingRef.current) return;

        const { tp9, af7, af8, tp10 } = latestRef.current;
        if ([tp9, af7, af8, tp10].some((v) => typeof v !== "number")) return;

        const sample: RawEEGSample = {
          timestamp: Date.now(),
          tp9: tp9 as number,
          af7: af7 as number,
          af8: af8 as number,
          tp10: tp10 as number,
        };

        fullSessionRef.current.push(sample);
        bufferRef.current.push(sample);

        if (rafIdRef.current == null) {
          rafIdRef.current = requestAnimationFrame(flushToState);
        }
      });

      eegSubRef.current?.unsubscribe();
      eegSubRef.current = sub;

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

    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }

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

      // Avoid division by zero when RECORDING_DURATION is 0
      const pct =
        RECORDING_DURATION > 0 ? Math.min((elapsed / RECORDING_DURATION) * 100, 100) : 100;

      setProgress(pct);

      if (pct >= 100) {
        setStageBanner(null);
        setIsRecording(false);
        setIsAnalyzing(true);

        if (timerRef.current) {
          window.clearInterval(timerRef.current);
        }
        timerRef.current = null;
      }
    }, 200);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      timerRef.current = null;
    };
  }, [isRecording]);

  const generateStudyPlan = useCallback(() => {
    const totalDuration = 120;

    const breaks = [
      { time: 45, duration: 5, type: "Water break" },
      { time: 90, duration: 10, type: "Snack break" },
    ];

    const plan: StudyPlan = {
      totalDuration,
      breaks,
      subjects: [],
      generatedAt: new Date(),
    };

    addPlannedMinutesForToday(totalDuration);
    onComplete(plan);
  }, [onComplete]);

  useEffect(() => {
    if (!isAnalyzing) return;

    const t = window.setTimeout(() => {
      generateStudyPlan();
    }, ANALYSIS_DURATION_MS);

    return () => window.clearTimeout(t);
  }, [isAnalyzing, generateStudyPlan]);

  const startRecording = () => {
    if (!museConnected) {
      alert("Please connect Muse first!");
      return;
    }

    bufferRef.current = [];
    setWaveformData([]);
    fullSessionRef.current = [];

    setIsAnalyzing(false);
    setIsRecording(true);
  };

  const totalRemaining = RECORDING_DURATION - elapsedSec;
  const stageRemaining =
    recordingStage === "eyesClosed" ? EYES_CLOSED_DURATION - elapsedSec : RECORDING_DURATION - elapsedSec;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">EEG Recording Session</h1>
        <p className="text-gray-600">Analysing brainwave patterns to create your personalised study plan</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-indigo-100 rounded-full mb-4 relative">
            <Brain className="w-12 h-12 text-indigo-600" />
            {isRecording && (
              <span className="absolute top-0 right-0 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
              </span>
            )}
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {!isRecording && !isAnalyzing && "Ready to Record"}
            {isRecording && "Recording in Progress..."}
            {isAnalyzing && "Analyzing and Processing EEG..."}
          </h2>

          {isRecording && stageBanner && (
            <div className="mt-4 mx-auto max-w-xl bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-4 py-3 text-sm text-left">
              <span className="font-semibold">Instruction:</span> {stageBanner}
            </div>
          )}

          {!isRecording && !isAnalyzing && (
            <div className="space-y-4">
              <p className="text-sm">
                <span className={`font-bold ${museConnected ? "text-green-600" : "text-red-600"}`}>
                  {museConnected ? "● Muse Connected" : "○ Muse Not Connected"}
                </span>
              </p>

              {!museConnected ? (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 text-left">
                  <h2 className="text-lg font-bold text-gray-900 mb-2">Connect your Muse 2</h2>
                  <p className="text-gray-600 text-sm mb-4">
                    When you click the button, your browser will open a secure Bluetooth pairing window. Select your Muse
                    device there to continue.
                  </p>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900 mb-4">
                    <p className="font-semibold mb-2">Before pairing:</p>
                    <ul className="list-disc ml-5 space-y-1">
                      <li>Turn on Muse 2 (LED blinking)</li>
                      <li>Use Chrome / Edge desktop (Bluetooth Supported)</li>
                    </ul>
                  </div>

                  <button
                    onClick={connectMuseWeb}
                    disabled={isConnecting}
                    className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 disabled:bg-gray-400 transition"
                  >
                    {isConnecting ? "Opening Bluetooth Window..." : "Connect Muse Device"}
                  </button>
                </div>
              ) : (
                <p className="text-gray-600">Muse is connected. You can start recording anytime.</p>
              )}

              {museConnected && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-left">
                  <h3 className="font-bold text-blue-900 mb-3">Recording Instructions:</h3>
                  <ul className="space-y-2 text-blue-800 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="font-bold">1.</span>
                      <span>Ensure all 4 electrodes make good contact with your forehead/ears</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold">2.</span>
                      <span>Stay relaxed and minimise head movements during recording</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold">3.</span>
                      <span>
                        The recording will last <span className="font-semibold">11 minutes</span>:
                        <span className="block mt-1">
                          • <span className="font-semibold">First Minute:</span> Close your eyes and relax
                        </span>
                        <span className="block">
                          • <span className="font-semibold">Last 10 Minutes:</span> Start studying normally
                        </span>
                           <li className="flex items-start gap-2">
                    </li>                 
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold">4.</span>
                      <span>Before recording... Take a deep breath and relax for 1 minute</span>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {isRecording && (
          <div className="mb-8">
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="text-center text-sm text-gray-600 mt-2">
              {isRecording && (
                <>
                  <span className="font-semibold">{recordingStage === "eyesClosed" ? "Eyes closed" : "Studying"}</span>
                  {` • ${Math.round(progress)}% • ${formatMMSS(totalRemaining)} remaining`}
                  {recordingStage === "eyesClosed" && <> {` • switch in ${formatMMSS(stageRemaining)}`}</>}
                </>
              )}
            </p>
          </div>
        )}

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
          <div className="mt-8">
            {waveformData.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-sm">Waiting for EEG stream...</div>
            ) : (
              <EEGWaveform waveformData={waveformData} />
            )}
          </div>
        )}

        {isAnalyzing && (
          <div className="flex flex-col items-center gap-4">
            <p className="text-gray-600 mb-4">Stay on this page for your personalised study plan!</p>

            <div className="flex gap-4">
              <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>

      {isAnalyzing && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-6 py-4 text-sm flex items-start gap-3">
          <AlertTriangle className="w-9 h-9 mt-0.5 text-amber-700" />
          <div>
            <p className="font-bold">Important!</p>
            <p>Please do not remove the Muse headset. Continue to wear it for your study session.</p>
          </div>
        </div>
      )}
    </div>
  );
}