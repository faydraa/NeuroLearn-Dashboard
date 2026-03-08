import { useState, useEffect, useMemo } from 'react';
import { Brain, Sparkles, TrendingUp, Target, Clock } from 'lucide-react';
import type { User, StudyPlan } from '../App';

type DashboardProps = {
  user: User;
  onStartRecording: () => void;
  studyPlan: StudyPlan | null; // can keep (you may use elsewhere later)
};

type TodayProgress = {
  completedMinutes: number;
  plannedMinutes: number;
  sessions: number;
  avgFocus: number; // %
};

export function Dashboard({ user, onStartRecording, studyPlan }: DashboardProps) {
  const [greeting, setGreeting] = useState('');
  const [todayProgress, setTodayProgress] = useState<TodayProgress>({
    completedMinutes: 0,
    plannedMinutes: 0,
    sessions: 0,
    avgFocus: 0,
  });

  const todayKey = useMemo(() => new Date().toISOString().split('T')[0], []);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  useEffect(() => {
    try {
      const existing = localStorage.getItem('studyProgress');
      const progress = existing ? JSON.parse(existing) : {};
      const today = progress[todayKey];

      if (today) {
        // backwards compatible: migrate old keys
        const completed = today.completedMinutes ?? today.duration ?? 0;
        const planned = today.plannedMinutes ?? 0;

        setTodayProgress({
          completedMinutes: Math.round(completed),
          plannedMinutes: Math.round(planned),
          sessions: Math.round(today.sessions || 0),
          avgFocus: Math.round(today.avgFocus || 0),
        });
      } else {
        setTodayProgress({ completedMinutes: 0, plannedMinutes: 0, sessions: 0, avgFocus: 0 });
      }
    } catch {
      setTodayProgress({ completedMinutes: 0, plannedMinutes: 0, sessions: 0, avgFocus: 0 });
    }
  }, [todayKey]);

  const progressPercent =
    todayProgress.plannedMinutes > 0
      ? Math.min((todayProgress.completedMinutes / todayProgress.plannedMinutes) * 100, 100)
      : 0;

  const remaining =
    todayProgress.plannedMinutes > 0
      ? Math.max(0, todayProgress.plannedMinutes - todayProgress.completedMinutes)
      : 0;

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {greeting}, {user.name}! 👋🏻
        </h1>
        <p className="text-gray-600">Ready to study?</p>
      </div>

      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-8 text-white mb-8">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-8 h-8" />
              <h2 className="text-2xl font-bold">EEG Recording Session</h2>
            </div>
            <p className="text-indigo-100 mb-6 max-w-2xl">
              Put on your Muse 2 headband and start an EEG recording session. The system will analyse your brainwave
              patterns to create a personalised study session.
            </p>
            <button
              onClick={onStartRecording}
              className="bg-white text-indigo-600 px-6 py-3 rounded-lg font-medium hover:bg-indigo-50 transition flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Start EEG Recording
            </button>
          </div>

          <div className="hidden md:block">
            <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center">
              <Brain className="w-16 h-16" />
            </div>
          </div>
        </div>
      </div>

      {/* Today’s Progress */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-6 h-6 text-indigo-600" />
            <h3 className="text-xl font-bold text-gray-900">Today's Progress</h3>
          </div>
          <p className="text-sm text-gray-500">{new Date().toLocaleDateString()}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-indigo-50 rounded-lg p-4">
            <p className="text-sm text-indigo-600 font-medium mb-1">Study Time (Today)</p>
            <p className="text-2xl font-bold text-indigo-900">{todayProgress.completedMinutes} min</p>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-green-600 font-medium mb-1">Sessions</p>
            <p className="text-2xl font-bold text-green-900">{todayProgress.sessions}</p>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm text-purple-600 font-medium mb-1">Avg Focus</p>
            <p className="text-2xl font-bold text-purple-900">{todayProgress.avgFocus}%</p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">
              Daily progress (sum of today’s plans)
            </span>
            <span className="font-medium text-gray-900">{Math.round(progressPercent)}%</span>
          </div>

          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <p className="text-xs text-gray-500 mt-2">
            {todayProgress.plannedMinutes > 0
              ? `Goal: ${todayProgress.plannedMinutes} min • Remaining: ${remaining} min`
              : `No goal set yet today (generate a plan to start tracking).`}
          </p>
        </div>
      </div>

      {/* ✅ Removed: Today's Study Plan card */}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">This Week</p>
              <p className="text-2xl font-bold text-gray-900">12.5 hrs</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Total study time</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg Focus</p>
              <p className="text-2xl font-bold text-gray-900">78%</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Attention level</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Streak</p>
              <p className="text-2xl font-bold text-gray-900">7 days</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Keep it up!</p>
        </div>
      </div>
    </div>
  );
}