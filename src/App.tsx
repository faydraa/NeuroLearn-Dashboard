import { useState, useEffect } from "react";
import { LoginPage } from "./components/LoginPage";
import { Dashboard } from "./components/Dashboard";
import { EEGRecording } from "./components/EEGRecording";
import { StudySession } from "./components/StudySession";
import { ProgressTracking } from "./components/ProgressTracking";
import { Calendar } from "./components/Calendar";
import { MemoryGames } from "./components/MemoryGames";
import { Settings } from "./components/Settings";
import { Sidebar } from "./components/Sidebar";
import { MotivationalPopup } from "./components/MotivationalPopup";
import { supabase } from "./library/supabase";
import { logoutUser } from "./library/auth";

export type StudyPlan = {
  totalDuration: number;
  breaks: { time: number; duration: number; type: string }[];
  subjects: { name: string; duration: number; startTime: number }[];
  generatedAt: Date;
};

export type User = {
  id: string;
  username: string;
  name: string;
  avatar: string;
  age?: number;
  gender?: string;
  email?: string;
  gradeLevel?: string;
  bio?: string;
  createdAt?: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  type: "study" | "exam" | "assignment" | "other";
  color: string;
};

const EVENT_TYPE_COLORS: Record<CalendarEvent["type"], string> = {
  study: "bg-green-500",
  exam: "bg-red-500",
  assignment: "bg-blue-500",
  other: "bg-purple-500",
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<
    | "dashboard"
    | "recording"
    | "study"
    | "progress"
    | "calendar"
    | "games"
    | "settings"
  >("dashboard");
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [showMotivationalPopup, setShowMotivationalPopup] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    const fetchCalendarEvents = async (authUserId: string) => {
      try {
        const { data, error } = await supabase
          .from("calendar_events")
          .select("*")
          .eq("user_id", authUserId)
          .order("event_date", { ascending: true })
          .order("event_time", { ascending: true });

        if (error) throw error;

        const mappedEvents: CalendarEvent[] = (data || []).map((event: any) => ({
          id: event.id,
          title: event.title,
          date: event.event_date,
          time: event.event_time || "09:00",
          type: event.event_type as CalendarEvent["type"],
          color:
            EVENT_TYPE_COLORS[event.event_type as CalendarEvent["type"]] ||
            "bg-purple-500",
        }));

        setCalendarEvents(mappedEvents);
      } catch (err) {
        console.error("Failed to fetch calendar events:", err);
        setCalendarEvents([]);
      }
    };

    const fetchUserProfile = async (authUser: any) => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .single();

        if (error || !data) {
          console.error("Error fetching profile:", error?.message || "No profile found");
          setCurrentUser(null);
          setCalendarEvents([]);
          return;
        }

        setCurrentUser({
          id: data.id,
          username: data.user_id,
          name: data.full_name || data.user_id,
          avatar: data.avatar || "🐼",
          age: data.age || undefined,
          gender: data.gender || undefined,
          email: authUser.email || undefined,
          gradeLevel: data.grade_level || undefined,
          bio: data.bio || undefined,
          createdAt: data.created_at || undefined,
        });

        await fetchCalendarEvents(authUser.id);
      } catch (err) {
        console.error("Unexpected profile fetch error:", err);
        setCurrentUser(null);
        setCalendarEvents([]);
      }
    };

    setLoading(false);

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(async () => {
        try {
          if (session?.user) {
            await fetchUserProfile(session.user);
          } else {
            setCurrentUser(null);
            setCalendarEvents([]);
            setCurrentPage("dashboard");
            setStudyPlan(null);
          }
        } catch (err) {
          console.error("Auth state change error:", err);
          setCurrentUser(null);
          setCalendarEvents([]);
        }
      }, 0);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    let hourlyInterval: ReturnType<typeof setInterval> | null = null;

    const scheduleNextPopup = () => {
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setHours(now.getHours() + 1, 0, 0, 0);

      const timeUntilNextHour = nextHour.getTime() - now.getTime();

      return setTimeout(() => {
        setShowMotivationalPopup(true);

        hourlyInterval = setInterval(() => {
          setShowMotivationalPopup(true);
        }, 60 * 60 * 1000);
      }, timeUntilNextHour);
    };

    const timeout = scheduleNextPopup();

    return () => {
      clearTimeout(timeout);
      if (hourlyInterval) clearInterval(hourlyInterval);
    };
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await logoutUser();
      setCurrentUser(null);
      setCurrentPage("dashboard");
      setStudyPlan(null);
      setCalendarEvents([]);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleEEGComplete = (plan: StudyPlan) => {
    setStudyPlan(plan);
    setCurrentPage("study");
  };

  const handleUpdateProfile = (updatedUser: User) => {
    setCurrentUser(updatedUser);
  };

  const handleStudyComplete = () => {
    setCurrentPage("progress");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600 text-lg">Loading...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onLogout={handleLogout}
        user={currentUser}
      />

      <main className="flex-1 overflow-y-auto">
        {currentPage === "dashboard" && (
          <Dashboard
            user={currentUser}
            onStartRecording={() => setCurrentPage("recording")}
            studyPlan={studyPlan}
          />
        )}

        {currentPage === "recording" && (
          <EEGRecording onComplete={handleEEGComplete} userName={currentUser.name} />
        )}

        {currentPage === "study" && studyPlan && (
          <StudySession studyPlan={studyPlan} onComplete={handleStudyComplete} />
        )}

        {currentPage === "progress" && <ProgressTracking userName={currentUser.username} />}

        {currentPage === "calendar" && (
          <Calendar
            userName={currentUser.username}
            userId={currentUser.id}
            events={calendarEvents}
            setEvents={setCalendarEvents}
          />
        )}

        {currentPage === "games" && <MemoryGames />}

        {currentPage === "settings" && (
          <Settings user={currentUser} onUpdateProfile={handleUpdateProfile} />
        )}
      </main>

      {showMotivationalPopup && (
        <MotivationalPopup onClose={() => setShowMotivationalPopup(false)} />
      )}
    </div>
  );
}