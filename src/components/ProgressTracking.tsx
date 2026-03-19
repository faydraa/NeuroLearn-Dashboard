import { useState, useEffect, useMemo, useCallback } from "react";
import { TrendingUp, Target, Award, Brain, Activity, ChevronLeft, ChevronRight } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "../library/supabase";

type ProgressTrackingProps = {
  userName: string;
};

type DailyProgress = {
  date: string;
  duration: number;
  sessions: number;
  avgFocus: number;
};

type DailyAnalysis = {
  date: string;
  baselineAttention: number;
  sessionAttention: number;
  focusedPercent: number;
  longestFocusedStreakMin: number;
  attentionTrend: { t: string; attention: number }[];
};

type CalendarCell = {
  date: Date;
  iso: string;
  duration: number;
};

export function ProgressTracking({ userName }: ProgressTrackingProps) {
  const [viewMode, setViewMode] = useState<"day" | "month">("day");
  const [progressMap, setProgressMap] = useState<Record<string, DailyProgress>>({});
  const [dailyAnalysis, setDailyAnalysis] = useState<DailyAnalysis | null>(null);

  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const currentMonth = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, []);

  const currentMonthLabel = useMemo(() => {
    return currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [currentMonth]);

  useEffect(() => {
    const saved = localStorage.getItem("studyProgress");
    const data = saved ? JSON.parse(saved) : {};
    setProgressMap(data);
  }, []);

  const loadDailyAnalysis = useCallback(async () => {
    try {
      const fetchLatestStats = async (bucket: string, folder: string) => {
        const { data: files, error: listError } = await supabase.storage
          .from(bucket)
          .list(folder, { sortBy: { column: "created_at", order: "desc" } });

        if (listError || !files || files.length === 0) return null;

        const latestFile = files.find((f) => f.name.endsWith(".csv"));
        if (!latestFile) return null;

        const { data: fileData, error: downloadError } = await supabase.storage
          .from(bucket)
          .download(`${folder}/${latestFile.name}`);

        if (downloadError || !fileData) return null;

        const text = await fileData.text();
        const lines = text.trim().split("\n");
        if (lines.length < 2) return null;

        const headers = lines[0].split(",").map((h) => h.trim());
        const values = lines[1].split(",").map((v) => v.trim());

        const rowData: Record<string, string> = {};
        headers.forEach((h, i) => {
          rowData[h] = values[i];
        });

        return { rowData, allLines: lines, headers };
      };

      const baselineRes = await fetchLatestStats("focus_scores", `baseline/${userName}`);
      const sessionRes = await fetchLatestStats("focus_scores", `study session/${userName}`);

      const baselineAttention = baselineRes?.rowData["session_mean_focus"]
        ? Math.round(parseFloat(baselineRes.rowData["session_mean_focus"]) * 100)
        : 0;

      const sessionAttention = sessionRes?.rowData["session_mean_focus"]
        ? Math.round(parseFloat(sessionRes.rowData["session_mean_focus"]) * 100)
        : 0;

      const focusedPercent = sessionRes?.rowData["session_pct_focused"]
        ? Math.round(parseFloat(sessionRes.rowData["session_pct_focused"]))
        : 0;

      const longestFocusedStreakSec = sessionRes?.rowData["session_longest_streak_sec"]
        ? parseFloat(sessionRes.rowData["session_longest_streak_sec"])
        : 0;

      const longestFocusedStreakMin = Math.round(longestFocusedStreakSec / 60);

      const attentionTrend: { t: string; attention: number }[] = [];
      if (sessionRes) {
        const tIndex = sessionRes.headers.indexOf("t0_sec");
        const focusIndex = sessionRes.headers.indexOf("p_focus_smoothed");

        for (let i = 1; i < sessionRes.allLines.length; i += 60) {
          const vals = sessionRes.allLines[i].split(",");
          if (vals[tIndex] && vals[focusIndex]) {
            attentionTrend.push({
              t: `${Math.round(parseFloat(vals[tIndex]) / 60)}m`,
              attention: Math.round(parseFloat(vals[focusIndex]) * 100),
            });
          }
        }
      }

      setDailyAnalysis({
        date: todayStr,
        baselineAttention,
        sessionAttention,
        focusedPercent,
        longestFocusedStreakMin,
        attentionTrend,
      });
    } catch (error) {
      console.error("Error loading daily analysis from Supabase:", error);
    }
  }, [todayStr, userName]);

  useEffect(() => {
    if (viewMode === "day") loadDailyAnalysis();
  }, [viewMode, loadDailyAnalysis]);

  const currentMonthDaysData = useMemo(() => {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const lastDay = new Date(y, m + 1, 0).getDate();
    const days: DailyProgress[] = [];

    for (let d = 1; d <= lastDay; d++) {
      const iso = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const entry = progressMap?.[iso];
      days.push({
        date: iso,
        duration: entry ? Math.round(entry.duration || 0) : 0,
        sessions: entry ? Math.round(entry.sessions || 0) : 0,
        avgFocus: entry ? Math.round(entry.avgFocus || 0) : 0,
      });
    }

    return days;
  }, [currentMonth, progressMap]);

  const monthlyChartData = useMemo(() => {
    return currentMonthDaysData.map((d) => ({
      day: Number(d.date.split("-")[2]),
      studyTime: d.duration,
      focusLevel: d.avgFocus,
    }));
  }, [currentMonthDaysData]);

  const calendarLabel = useMemo(() => {
    return calendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [calendarMonth]);

  const calendarStartsOn = useMemo(() => {
    return new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay();
  }, [calendarMonth]);

  const calendarCells = useMemo((): CalendarCell[] => {
    const y = calendarMonth.getFullYear();
    const m = calendarMonth.getMonth();
    const lastDay = new Date(y, m + 1, 0).getDate();
    const cells: CalendarCell[] = [];

    for (let d = 1; d <= lastDay; d++) {
      const date = new Date(y, m, d);
      const iso = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const entry = progressMap?.[iso];
      cells.push({ date, iso, duration: entry ? Math.round(entry.duration || 0) : 0 });
    }

    return cells;
  }, [calendarMonth, progressMap]);

  const intensityClass = (duration: number) => {
    if (duration <= 0) return "bg-gray-200";
    if (duration < 45) return "bg-green-200";
    if (duration < 120) return "bg-green-400";
    return "bg-green-600";
  };

  const goPrevMonth = () =>
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));

  const goNextMonth = () =>
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  const focusBreakdownInsights = useMemo(() => {
    const baseline = dailyAnalysis?.baselineAttention ?? 0;
    const session = dailyAnalysis?.sessionAttention ?? 0;
    const focused = dailyAnalysis?.focusedPercent ?? 0;

    return [
      {
        title: session >= baseline ? "Good carryover from baseline" : "Baseline carryover",
        text:
          session >= baseline
            ? "Your study attention stayed strong compared to your baseline. Keep using this setup."
            : "Your study attention dipped slightly compared to baseline. Consider reducing distractions.",
      },
      {
        title:
          focused >= 70
            ? "High focus time"
            : focused >= 55
            ? "Moderate focus time"
            : "Low focus time",
        text:
          focused >= 70
            ? "You maintained focus for a strong portion of the session."
            : "Focus time was limited today. Try shorter work blocks with quick resets.",
      },
    ];
  }, [dailyAnalysis]);

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Progress Tracking</h1>
        <p className="text-gray-600">Track your learning journey and productivity</p>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setViewMode("day")}
          className={`px-6 py-2 rounded-lg font-medium transition ${
            viewMode === "day"
              ? "bg-indigo-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Daily Report
        </button>
        <button
          onClick={() => setViewMode("month")}
          className={`px-6 py-2 rounded-lg font-medium transition ${
            viewMode === "month"
              ? "bg-indigo-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Monthly
        </button>
      </div>

      {viewMode === "day" && (
        <>
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <Brain className="w-8 h-8 opacity-80" />
                <Activity className="w-5 h-5 opacity-80" />
              </div>
              <p className="text-blue-100 text-sm mb-1">Baseline Attention Score</p>
              <p className="text-3xl font-bold">{dailyAnalysis?.baselineAttention ?? 0}</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <Activity className="w-8 h-8 opacity-80" />
                <TrendingUp className="w-5 h-5 opacity-80" />
              </div>
              <p className="text-purple-100 text-sm mb-1">Study Session Attention Score</p>
              <p className="text-3xl font-bold">{dailyAnalysis?.sessionAttention ?? 0}</p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <Target className="w-8 h-8 opacity-80" />
                <TrendingUp className="w-5 h-5 opacity-80" />
              </div>
              <p className="text-green-100 text-sm mb-1">% Time Focused</p>
              <p className="text-3xl font-bold">{dailyAnalysis?.focusedPercent ?? 0}%</p>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <Award className="w-8 h-8 opacity-80" />
                <TrendingUp className="w-5 h-5 opacity-80" />
              </div>
              <p className="text-orange-100 text-sm mb-1">Longest Focused Streak</p>
              <p className="text-3xl font-bold">{dailyAnalysis?.longestFocusedStreakMin ?? 0}m</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Attention Trend (Today)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyAnalysis?.attentionTrend ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="t" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="attention" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Focus Breakdown</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700">Focused Time</span>
                    <span className="font-semibold text-gray-900">{dailyAnalysis?.focusedPercent ?? 0}%</span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${dailyAnalysis?.focusedPercent ?? 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700">Unfocused Time</span>
                    <span className="font-semibold text-gray-900">
                      {100 - (dailyAnalysis?.focusedPercent ?? 0)}%
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500"
                      style={{ width: `${100 - (dailyAnalysis?.focusedPercent ?? 0)}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 grid gap-3">
                  {focusBreakdownInsights.map((insight, idx) => (
                    <div key={idx} className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <TrendingUp className="w-5 h-5 text-indigo-600 mt-0.5" />
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{insight.title}</p>
                          <p className="text-xs text-gray-600 mt-1">{insight.text}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {viewMode === "month" && (
        <>
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Showing monthly summary for{" "}
              <span className="font-semibold text-gray-900">{currentMonthLabel}</span>
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Study Time (minutes)</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="day"
                    type="number"
                    domain={[1, currentMonthDaysData.length]}
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="studyTime" fill="#6366f1" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Focus Level (%)</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="day"
                    type="number"
                    domain={[1, currentMonthDaysData.length]}
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="focusLevel" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Activity Calendar</h3>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-gray-200 rounded" />
                  <span>No study</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-200 rounded" />
                  <span>Light</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-400 rounded" />
                  <span>Moderate</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-600 rounded" />
                  <span>Heavy</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <button
                onClick={goPrevMonth}
                className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <p className="font-semibold text-gray-900">{calendarLabel}</p>
              <button
                onClick={goNextMonth}
                className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: calendarStartsOn }).map((_, i) => (
                <div key={`blank-${i}`} className="h-14" />
              ))}

              {calendarCells.map((cell) => (
                <div
                  key={cell.iso}
                  className={`h-14 rounded-lg p-2 ${intensityClass(cell.duration)} ${
                    cell.iso === todayStr ? "ring-2 ring-indigo-500" : ""
                  }`}
                >
                  <p className="text-xs font-medium text-gray-700">{cell.date.getDate()}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}