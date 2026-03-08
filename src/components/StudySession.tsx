import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Coffee, Brain, AlertCircle, Apple } from 'lucide-react';
import type { StudyPlan } from '../App';

type StudySessionProps = {
  studyPlan: StudyPlan;
  onComplete: () => void;
};

type Notification = {
  type: 'break' | 'distraction';
  message: string;
};

export function StudySession({ studyPlan, onComplete }: StudySessionProps) {
  const [timeElapsed, setTimeElapsed] = useState(0); // in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [focusLevel, setFocusLevel] = useState(75); // Simulated focus level
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(
      'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjGH0fPTgjMGHm7A7+OZSA0PVqzn77BdGAg+ltrzxnMpBSl+zPLaizsIGGS57OihUhELTKXh8bllHAU2jdXzzn0vBSF1yPDbkUELElyx6OyrWBUIQ5zd8sFuJAU0iNHz0YI0Bh1rv+7mnEsMEFOq5O+zYBoGPJPY88p2KwUme8rx3I4+CRZiturqpVQSC0mi4PK8aB8GM4nU8tGAMQYfccLu45ZFDBFYr+fvsF0YCDyU2vPJdSsFJ33L8tqNPQkXY7vq66ZUEgxJo+DyvmwhBjKH0/LPgDEGH27A7+OYRwwRV63n77BdGAg8lNrzyXYrBSh+y/HajD0JF2O76uunVRIMSKPg8r1sIQYyh9Pyz4AxBh9uwO/jmEcMEVWt5++wXRgIPJTa88l2KwUofsvx2ow9CRdju+rrp1USDEij4PK9bCEGMofT8s+AMQYfbsDv45hHDBFVrefvr10YBz2U2vPJdSsFKH7L8dqMPQkXY7vq66dVEgxIo+DyvWwhBjKH0/LPgDEGH27A7+OYRwwRVa3n76/dWAc9lNrzyXUrBSh+y/HajD0JF2O76uunVRIMSKPg8r1sIQYyh9Pyz4AxBh9uwO/jmEcMEVWt5++v3VgHPZTa88l1KwUofsvx2ow9CRdju+rrp1USDEij4PK9bCEGMofT8s+AMQYfbsDv45hHDBFVrefvsF0YCDyU2vPJdisFK'
    );
  }, []);

  const showNotification = (notif: Notification) => {
    setNotification(notif);
    setTimeout(() => setNotification(null), 10000);
  };

  const playSound = () => {
    const a = audioRef.current;
    if (!a) return;
    try {
      a.currentTime = 0;
      a.play().catch(() => {});
    } catch {
      // ignore
    }
  };

  // ✅ save completed minutes (accumulate across multiple sessions in a day)
  const saveProgress = (totalSeconds: number) => {
    const today = new Date().toISOString().split('T')[0];
    const existing = localStorage.getItem('studyProgress');
    const progress = existing ? JSON.parse(existing) : {};

    const minutesThisSession = totalSeconds / 60;

    // Backwards compatible init
    if (!progress[today]) {
      progress[today] = { completedMinutes: 0, plannedMinutes: 0, sessions: 0, avgFocus: 0, focusMinutes: 0 };
    } else {
      if (progress[today].completedMinutes == null) progress[today].completedMinutes = progress[today].duration ?? 0;
      if (progress[today].plannedMinutes == null) progress[today].plannedMinutes = 0;
      if (progress[today].sessions == null) progress[today].sessions = 0;
      if (progress[today].avgFocus == null) progress[today].avgFocus = 0;
      if (progress[today].focusMinutes == null) progress[today].focusMinutes = 0; // for weighted avg
    }

    // ✅ accumulate completed time + sessions
    progress[today].completedMinutes += minutesThisSession;
    progress[today].sessions += 1;

    // ✅ weighted average focus across sessions (by minutes)
    const prevFocusMinutes = progress[today].focusMinutes || 0;
    const prevAvg = progress[today].avgFocus || 0;
    const newFocusMinutes = prevFocusMinutes + minutesThisSession;
    const weighted = newFocusMinutes > 0
      ? ((prevAvg * prevFocusMinutes) + (focusLevel * minutesThisSession)) / newFocusMinutes
      : focusLevel;

    progress[today].avgFocus = weighted;
    progress[today].focusMinutes = newFocusMinutes;

    // optional: keep old key for older UI
    progress[today].duration = progress[today].completedMinutes;

    localStorage.setItem('studyProgress', JSON.stringify(progress));
  };

  const breaksWithMeditation = [
    ...studyPlan.breaks,
    { time: 70, duration: 3, type: 'Meditation break' },
  ].sort((a, b) => a.time - b.time);

  const getBreakIcon = (breakType: string) => {
    const t = breakType.toLowerCase();
    if (t.includes('water')) return Coffee;
    if (t.includes('meditation')) return Brain;
    if (t.includes('snack')) return Apple;
    return Coffee;
  };

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimeElapsed((prev) => {
        const newTime = prev + 1;

        breaksWithMeditation.forEach((breakItem) => {
          if (newTime === breakItem.time * 60) {
            showNotification({
              type: 'break',
              message: `Time for a ${breakItem.type}! Take ${breakItem.duration} minutes.`,
            });
            playSound();
          }
        });

        if (newTime % 120 === 0 && Math.random() < 0.3) {
          const randomFocus = 30 + Math.random() * 30;
          setFocusLevel(randomFocus);
          if (randomFocus < 50) {
            showNotification({
              type: 'distraction',
              message: 'Focus level dropping. Consider taking a short break or trying a short breathing exercise.',
            });
            playSound();
          }
        } else if (newTime % 30 === 0) {
          setFocusLevel(60 + Math.random() * 30);
        }

        if (newTime >= studyPlan.totalDuration * 60) {
          setIsRunning(false);
          saveProgress(newTime);
          setTimeout(() => {
            onComplete();
          }, 1000);
        }

        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, breaksWithMeditation, studyPlan.totalDuration, onComplete]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalSeconds = studyPlan.totalDuration * 60;
  const progressPercent = (timeElapsed / totalSeconds) * 100;

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Study Session</h1>
        <p className="text-gray-600">Stay focused and follow your personalised study plan</p>
      </div>

      {notification && (
        <div
          className={`mb-6 p-4 rounded-xl border-2 animate-pulse ${
            notification.type === 'break' ? 'bg-green-50 border-green-500' : 'bg-amber-50 border-amber-500'
          }`}
        >
          <div className="flex items-center gap-3">
            {notification.type === 'break' ? (
              <Coffee className="w-6 h-6 text-green-600" />
            ) : (
              <AlertCircle className="w-6 h-6 text-amber-600" />
            )}
            <p className="font-medium text-gray-900">{notification.message}</p>
          </div>
        </div>
      )}

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
            {!isRunning ? (
              <button
                onClick={() => setIsRunning(true)}
                className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-xl font-medium hover:bg-indigo-700 transition"
              >
                <Play className="w-5 h-5" />
                {timeElapsed === 0 ? 'Start Session' : 'Resume'}
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
              onClick={() => {
                setIsRunning(false);
                saveProgress(timeElapsed);
                onComplete();
              }}
              className="flex items-center gap-2 bg-gray-600 text-white px-8 py-4 rounded-xl font-medium hover:bg-gray-700 transition"
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
              <div
                className={`text-4xl font-bold ${
                  focusLevel > 70 ? 'text-green-600' : focusLevel > 50 ? 'text-amber-600' : 'text-red-600'
                }`}
              >
                {Math.round(focusLevel)}%
              </div>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${
                  focusLevel > 70 ? 'bg-green-500' : focusLevel > 50 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${focusLevel}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex-1">
            <h3 className="font-bold text-gray-900 mb-4">Upcoming Breaks</h3>
            <div className="space-y-3">
              {breaksWithMeditation.map((breakItem, idx) => {
                const breakTimeSeconds = breakItem.time * 60;
                const isPast = timeElapsed > breakTimeSeconds;
                const Icon = getBreakIcon(breakItem.type);

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg ${
                      isPast ? 'bg-gray-100' : 'bg-green-50 border border-green-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 ${isPast ? 'text-gray-400' : 'text-green-600'}`} />
                      <p className={`font-medium text-sm ${isPast ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
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
          </div>

        </div>
      </div>
    </div>
  );
}