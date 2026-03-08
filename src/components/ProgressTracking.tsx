import { useState, useEffect, useMemo } from "react";
import { TrendingUp, Clock, Target, Award, Brain, Activity, ChevronLeft, ChevronRight,} from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,} from 'recharts';

type ProgressTrackingProps = {
  userName: string;
};

type DailyProgress = {
  date: string; // YYYY-MM-DD
  duration: number; // minutes
  sessions: number;
  avgFocus: number; // percentage
};

type DailyAnalysis = {
  date: string;
  baselineAttention: number;
  sessionAttention: number;
  focusedPercent: number;
  longestFocusedStreakSec: number;
  attentionTrend: { t: string; attention: number }[];
};

type CalendarCell = {
  date: Date;
  iso: string; // YYYY-MM-DD
  duration: number; // minutes
};

export function ProgressTracking({ userName }: ProgressTrackingProps) {
  const [viewMode, setViewMode] = useState<"day" | "month">("day");

  const [progressMap, setProgressMap] = useState<Record<string, DailyProgress>>({});
  const [dailyAnalysis, setDailyAnalysis] = useState<DailyAnalysis | null>(null);

  // ✅ Calendar month is toggleable (independent from charts)
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // ✅ Current month for "Monthly graphs + stats" (always this month)
  const currentMonth = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, [todayStr]); // re-evaluates when day changes (enough for month rollover)

  const currentMonthLabel = useMemo(() => {
    return currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [currentMonth]);

  useEffect(() => {
    const saved = localStorage.getItem("studyProgress");
    const data = saved ? JSON.parse(saved) : {};
    setProgressMap(data);
  }, []);

  useEffect(() => {
    if (viewMode === "day") loadDailyAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  // -----------------------
  // Daily Report (unchanged)
  // -----------------------
  const loadDailyAnalysis = () => {
    const key = `dailyAnalysis:${todayStr}`;
    const existing = localStorage.getItem(key);

    if (existing) {
      setDailyAnalysis(JSON.parse(existing));
      return;
    }

    const seed = hashString(todayStr + userName);
    const rand = mulberry32(seed);

    const baselineAttention = clamp(Math.round(60 + rand() * 30), 0, 100);
    const sessionAttention = clamp(Math.round(baselineAttention - 8 + rand() * 16), 0, 100);
    const focusedPercent = clamp(Math.round(50 + rand() * 45), 0, 100);
    const longestFocusedStreakSec = clamp(Math.round(120 + rand() * 900), 0, 3600);

    const attentionTrend: { t: string; attention: number }[] = [];
    let a = sessionAttention;
    for (let m = 0; m <= 120; m += 10) {
      a = clamp(Math.round(a + (rand() - 0.5) * 8), 0, 100);
      attentionTrend.push({
        t: m === 0 ? "Start" : `${m}m`,
        attention: a,
      });
    }

    const mock: DailyAnalysis = {
      date: todayStr,
      baselineAttention,
      sessionAttention,
      focusedPercent,
      longestFocusedStreakSec,
      attentionTrend,
    };

    localStorage.setItem(key, JSON.stringify(mock));
    setDailyAnalysis(mock);
  };

  // -----------------------
  // Monthly stats + charts (always CURRENT MONTH)
  // -----------------------
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

  const monthStats = useMemo(() => {
    const totalMinutes = currentMonthDaysData.reduce((sum, d) => sum + d.duration, 0);
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

    const totalSessions = currentMonthDaysData.reduce((sum, d) => sum + d.sessions, 0);

    const focusDays = currentMonthDaysData.filter((d) => d.avgFocus > 0);
    const avgFocus =
      focusDays.length > 0
        ? Math.round(focusDays.reduce((sum, d) => sum + d.avgFocus, 0) / focusDays.length)
        : 0;

    const streak = calculateStreak(currentMonthDaysData);

    return { totalHours, totalSessions, avgFocus, streak };
  }, [currentMonthDaysData]);

  // ✅ FIX: numeric X axis so day spacing is always even
  const monthlyChartData = useMemo(() => {
    return currentMonthDaysData.map((d) => {
      const dayNum = Number(d.date.split("-")[2]); // 1..31
      return {
        day: dayNum,
        studyTime: d.duration,
        focusLevel: d.avgFocus,
      };
    });
  }, [currentMonthDaysData]);

  // -----------------------
  // Calendar (toggleable months)
  // -----------------------
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

  const goPrevMonth = () => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const goNextMonth = () => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  const goTodayMonth = () => {
    const d = new Date();
    setCalendarMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  };

  // Insights under Focus Breakdown (Daily)
  const focusBreakdownInsights = useMemo(() => {
    if (!dailyAnalysis) return [];
    const { baselineAttention, sessionAttention, focusedPercent } = dailyAnalysis;

    const carryoverTitle = sessionAttention >= baselineAttention ? "Good carryover from baseline" : "Baseline carryover";
    const carryoverText =
      sessionAttention >= baselineAttention
        ? "Your study attention stayed strong compared to your baseline. Keep using this setup/environment."
        : "Your study attention dipped slightly compared to baseline. Consider reducing distractions before you start.";

    const focusTitle =
      focusedPercent >= 70 ? "High focus time" : focusedPercent >= 55 ? "Moderate focus time" : "Low focus time";
    const focusText =
      focusedPercent >= 70
        ? "You maintained focus for a strong portion of the session. Try extending your main block slightly next time."
        : focusedPercent >= 55
        ? "You maintained focus for a decent portion of the session. Aim to improve by adding a short meditation break mid-way."
        : "Focus time was limited today. Try shorter work blocks (e.g., 20–25 minutes) with quick resets between blocks.";

    return [
      { title: carryoverTitle, text: carryoverText },
      { title: focusTitle, text: focusText },
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
            viewMode === "day" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Daily Report
        </button>
        <button
          onClick={() => setViewMode("month")}
          className={`px-6 py-2 rounded-lg font-medium transition ${
            viewMode === "month" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Monthly
        </button>
      </div>

      {/* DAILY REPORT */}
      {viewMode === "day" && dailyAnalysis && (
        <>
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <Brain className="w-8 h-8 opacity-80" />
                <Activity className="w-5 h-5 opacity-80" />
              </div>
              <p className="text-blue-100 text-sm mb-1">Baseline Attention Score</p>
              <p className="text-3xl font-bold">{dailyAnalysis.baselineAttention}</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <Activity className="w-8 h-8 opacity-80" />
                <TrendingUp className="w-5 h-5 opacity-80" />
              </div>
              <p className="text-purple-100 text-sm mb-1">Study Session Attention Score</p>
              <p className="text-3xl font-bold">{dailyAnalysis.sessionAttention}</p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <Target className="w-8 h-8 opacity-80" />
                <TrendingUp className="w-5 h-5 opacity-80" />
              </div>
              <p className="text-green-100 text-sm mb-1">% Time Focused</p>
              <p className="text-3xl font-bold">{dailyAnalysis.focusedPercent}%</p>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <Award className="w-8 h-8 opacity-80" />
                <TrendingUp className="w-5 h-5 opacity-80" />
              </div>
              <p className="text-orange-100 text-sm mb-1">Longest Focused Streak</p>
              <p className="text-3xl font-bold">{dailyAnalysis.longestFocusedStreakSec}s</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Attention Trend (Today)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyAnalysis.attentionTrend}>
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
                    <span className="font-semibold text-gray-900">{dailyAnalysis.focusedPercent}%</span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: `${dailyAnalysis.focusedPercent}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700">Unfocused Time</span>
                    <span className="font-semibold text-gray-900">{100 - dailyAnalysis.focusedPercent}%</span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${100 - dailyAnalysis.focusedPercent}%` }} />
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

      {/* MONTHLY VIEW */}
      {viewMode === "month" && (
        <>
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Showing monthly summary for <span className="font-semibold text-gray-900">{currentMonthLabel}</span>
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <Clock className="w-8 h-8 opacity-80" />
                <TrendingUp className="w-5 h-5 opacity-80" />
              </div>
              <p className="text-blue-100 text-sm mb-1">Total Study Time</p>
              <p className="text-3xl font-bold">{monthStats.totalHours}h</p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <Target className="w-8 h-8 opacity-80" />
                <TrendingUp className="w-5 h-5 opacity-80" />
              </div>
              <p className="text-green-100 text-sm mb-1">Sessions Completed</p>
              <p className="text-3xl font-bold">{monthStats.totalSessions}</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <Brain className="w-8 h-8 opacity-80" />
                <TrendingUp className="w-5 h-5 opacity-80" />
              </div>
              <p className="text-purple-100 text-sm mb-1">Avg Focus Level</p>
              <p className="text-3xl font-bold">{monthStats.avgFocus}%</p>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <Award className="w-8 h-8 opacity-80" />
                <TrendingUp className="w-5 h-5 opacity-80" />
              </div>
              <p className="text-orange-100 text-sm mb-1">Current Streak</p>
              <p className="text-3xl font-bold">{monthStats.streak} days</p>
            </div>
          </div>

          {/* ✅ Numeric X axis for proper spacing */}
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
                    tickCount={8}
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
                    tickCount={8}
                  />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="focusLevel" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Calendar: toggle months */}
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
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="text-xs font-semibold text-gray-500 text-center">
                  {d}
                </div>
              ))}
            </div>

            {/* calendar always starts at 1st of month (blanks for alignment only) */}
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: calendarStartsOn }).map((_, i) => (
                <div key={`blank-${i}`} className="h-14" />
              ))}

              {calendarCells.map((cell) => {
                const isToday = cell.iso === todayStr;
                return (
                  <div
                    key={cell.iso}
                    className={`h-14 rounded-lg p-2 ${intensityClass(cell.duration)} ${
                      isToday ? "ring-2 ring-indigo-500" : ""
                    }`}
                    title={`${cell.date.toLocaleDateString()}: ${cell.duration} min`}
                  >
                    <p className="text-xs font-medium text-gray-700">{cell.date.getDate()}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function calculateStreak(data: DailyProgress[]): number {
  let streak = 0;
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].duration > 0) streak++;
    else break;
  }
  return streak;
}

function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x));
}

function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}