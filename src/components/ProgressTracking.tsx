import { useState, useEffect, useMemo } from "react";
import { TrendingUp, Target, Award, Brain, ChevronLeft, ChevronRight, Sparkles, BookOpen, } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, } from "recharts";

type ProgressTrackingProps = {
  userName: string;
  userId: string;
};

type DailyProgress = {
  date: string;
  duration: number;
  sessions: number;
  avgFocus: number;
};

type SessionReport = {
  id: string;
  sessionLabel: string;
  date: string;
  createdAt: string;
  baselineAttention: number;
  sessionAttention: number;
  focusedPercent: number;
  longestFocusedStreakMin: number;
  focusBand: "very_low_engagement" | "distracted" | "moderate_focus" | "strong_focus";
};

type CalendarCell = {
  date: Date;
  iso: string;
  duration: number;
};

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatFocusBandLabel(focusBand: SessionReport["focusBand"]) {
  return focusBand
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getFocusRecommendation(focusBand: SessionReport["focusBand"]) {
  switch (focusBand) {
    case "strong_focus":
      return {
        title: "Strong focus detected",
        summary:
          "This session showed strong sustained engagement. You are likely ready for longer uninterrupted study blocks.",
        action:
          "Keep your current setup and consider extending your next focused block slightly before taking a break.",
      };
    case "moderate_focus":
      return {
        title: "Moderate focus detected",
        summary:
          "Your attention remained fairly stable, although some fluctuations were present during the session.",
        action:
          "Maintain shorter structured blocks with planned breaks to improve consistency in your next session.",
      };
    case "distracted":
      return {
        title: "Distracted focus pattern",
        summary:
          "This session suggests noticeable lapses in attention and reduced ability to maintain continuous engagement.",
        action:
          "Try reducing environmental distractions and using shorter study intervals before gradually increasing duration.",
      };
    case "very_low_engagement":
    default:
      return {
        title: "Low engagement detected",
        summary:
          "This session showed limited sustained attention, suggesting that the study block may have been too demanding.",
        action:
          "Start with a shorter study period, include more frequent breaks, and reattempt the session in a lower-distraction setting.",
      };
  }
}

export function ProgressTracking({ userName, userId }: ProgressTrackingProps) {
  const [viewMode, setViewMode] = useState<"day" | "month">("day");
  const [progressMap, setProgressMap] = useState<Record<string, DailyProgress>>({});
  const [selectedSessionId, setSelectedSessionId] = useState("");

  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const todayStr = useMemo(() => formatLocalDate(new Date()), []);

  const mockSessionReports = useMemo<SessionReport[]>(
    () => [
      {
        id: "mock-session-1",
        sessionLabel: "Session 1 • 9:15 AM",
        date: todayStr,
        createdAt: `${todayStr}T09:15:00`,
        baselineAttention: 64,
        sessionAttention: 58,
        focusedPercent: 55,
        longestFocusedStreakMin: 12,
        focusBand: "moderate_focus",
      },
      {
        id: "mock-session-2",
        sessionLabel: "Session 2 • 2:40 PM",
        date: todayStr,
        createdAt: `${todayStr}T14:40:00`,
        baselineAttention: 66,
        sessionAttention: 74,
        focusedPercent: 78,
        longestFocusedStreakMin: 24,
        focusBand: "strong_focus",
      },
    ],
    [todayStr]
  );

  useEffect(() => {
    const saved = localStorage.getItem("studyProgress");
    const data = saved ? JSON.parse(saved) : {};
    setProgressMap(data);
  }, []);

  useEffect(() => {
    if (!selectedSessionId && mockSessionReports.length > 0) {
      setSelectedSessionId(mockSessionReports[0].id);
    }
  }, [mockSessionReports, selectedSessionId]);

  const selectedSession = useMemo(() => {
    return (
      mockSessionReports.find((report) => report.id === selectedSessionId) ??
      mockSessionReports[0] ??
      null
    );
  }, [mockSessionReports, selectedSessionId]);

  const focusRecommendation = useMemo(() => {
    if (!selectedSession) return null;
    return getFocusRecommendation(selectedSession.focusBand);
  }, [selectedSession]);

  const focusBreakdownInsights = useMemo(() => {
    if (!selectedSession) return [];

    const carryoverTitle =
      selectedSession.sessionAttention >= selectedSession.baselineAttention
        ? "Good carryover from baseline"
        : "Baseline carryover";

    const carryoverText =
      selectedSession.sessionAttention >= selectedSession.baselineAttention
        ? "Your study attention stayed strong compared to your baseline. Keep using this setup."
        : "Your study attention dipped slightly compared to baseline. Consider reducing distractions before you start.";

    const focusTitle =
      selectedSession.focusedPercent >= 70
        ? "High focus time"
        : selectedSession.focusedPercent >= 55
        ? "Moderate focus time"
        : "Low focus time";

    const focusText =
      selectedSession.focusedPercent >= 70
        ? "You maintained focus for a strong portion of the session. Try extending your main block slightly next time."
        : selectedSession.focusedPercent >= 55
        ? "You maintained focus for a decent portion of the session. Aim to improve by adding a short reset between blocks."
        : "Focus time was limited today. Try shorter work blocks with quick resets.";

    return [
      { title: carryoverTitle, text: carryoverText },
      { title: focusTitle, text: focusText },
    ];
  }, [selectedSession]);

  const currentMonth = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, []);

  const currentMonthLabel = useMemo(() => {
    return currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [currentMonth]);

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
    return currentMonthDaysData.map((day) => ({
      day: Number(day.date.split("-")[2]),
      studyTime: day.duration,
      focusLevel: day.avgFocus,
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
      const duration = entry ? Math.round(entry.duration || 0) : 0;
      cells.push({ date, iso, duration });
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
  const goTodayMonth = () => {
    const now = new Date();
    setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  };

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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="text-sm text-gray-500">Today's Sessions</p>
                <p className="text-sm text-gray-700">
                  You have {mockSessionReports.length} recorded sessions today.
                </p>
              </div>

              <div className="w-full md:w-72">
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                >
                  {mockSessionReports.map((report) => (
                    <option key={report.id} value={report.id}>
                      {report.sessionLabel}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <Brain className="w-8 h-8 opacity-80" />
                <TrendingUp className="w-5 h-5 opacity-80" />
              </div>
              <p className="text-blue-100 text-sm mb-1">Baseline Attention Score</p>
              <p className="text-3xl font-bold">{selectedSession?.baselineAttention ?? 0}</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <BookOpen className="w-8 h-8 opacity-80" />
                <TrendingUp className="w-5 h-5 opacity-80" />
              </div>
              <p className="text-purple-100 text-sm mb-1">Study Session Attention Score</p>
              <p className="text-3xl font-bold">{selectedSession?.sessionAttention ?? 0}</p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <Target className="w-8 h-8 opacity-80" />
                <TrendingUp className="w-5 h-5 opacity-80" />
              </div>
              <p className="text-green-100 text-sm mb-1">% Time Focused</p>
              <p className="text-3xl font-bold">{selectedSession?.focusedPercent ?? 0}%</p>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <Award className="w-8 h-8 opacity-80" />
                <TrendingUp className="w-5 h-5 opacity-80" />
              </div>
              <p className="text-orange-100 text-sm mb-1">Longest Focused Streak</p>
              <p className="text-3xl font-bold">{selectedSession?.longestFocusedStreakMin ?? 0}m</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-gray-900">Focus Recommendation</h3>
              </div>

              {selectedSession && focusRecommendation ? (
                <div className="space-y-5">
                  <div className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700">
                    {formatFocusBandLabel(selectedSession.focusBand)}
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900 text-lg">{focusRecommendation.title}</p>
                    <p className="text-sm text-gray-600 mt-2 leading-6">{focusRecommendation.summary}</p>
                  </div>

                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-indigo-900 mb-1">Suggested next step</p>
                    <p className="text-sm text-indigo-800 leading-6">{focusRecommendation.action}</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No recommendation available yet.</p>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Focus Breakdown</h3>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700">Focused Time</span>
                    <span className="font-semibold text-gray-900">
                      {selectedSession ? `${selectedSession.focusedPercent}%` : "0%"}
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${selectedSession ? selectedSession.focusedPercent : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700">Unfocused Time</span>
                    <span className="font-semibold text-gray-900">
                      {selectedSession ? `${100 - selectedSession.focusedPercent}%` : "100%"}
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500"
                      style={{ width: `${selectedSession ? 100 - selectedSession.focusedPercent : 100}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 grid gap-3">
                  {focusBreakdownInsights.map((insight, idx) => (
                    <div key={idx} className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <TrendingUp className="w-5 h-5 text-indigo-600 mt-0.5" />
                        <div>
                          <p className="font-semibold text-gray-900">{insight.title}</p>
                          <p className="text-sm text-gray-600 mt-1">{insight.text}</p>
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
                  <Line
                    type="monotone"
                    dataKey="focusLevel"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />
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
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </button>

              <div className="flex items-center gap-4">
                <p className="font-semibold text-gray-900">{calendarLabel}</p>
                <button
                  onClick={goTodayMonth}
                  className="px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition text-sm font-medium"
                >
                  Today
                </button>
              </div>

              <button
                onClick={goNextMonth}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="text-xs font-semibold text-gray-500 text-center">
                  {day}
                </div>
              ))}
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
                  title={`${cell.date.toLocaleDateString()}: ${cell.duration} min`}
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