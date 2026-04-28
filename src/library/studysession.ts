import { supabase } from "./supabase";

// Types of Performance Indicators Stored into Supabase
export type StudySessionRow = {
  user_id: string;
  session_label?: string | null;
  session_date: string;
  started_at?: string | null;
  completed_at?: string | null;
  duration_minutes: number;
  baseline_attention?: number | null;
  session_attention?: number | null;
  focused_percent?: number | null;
  longest_focused_streak_min?: number | null;
  avg_focus?: number | null;
  focus_band?: string | null;
};

// Retrieve Data from StudySession.tsx
export async function addStudySession(session: StudySessionRow) {
  console.log("addStudySession called with:", session);
  const { data, error } = await supabase
    .from("study_sessions")
    .insert([session])
    .select()
    .single();

  console.log("insert data =", data);
  console.log("insert error =", error);
  if (error) throw error;
  return data;
}

// Retrieve Data from Daily Study Session
export async function getTodayStudySessions(userId: string, today: string) {
  const { data, error } = await supabase
    .from("study_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("session_date", today)
    .order("completed_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

// Retrieved Data from Monthly Study Sessions
export async function getMonthStudySessions(
  userId: string,
  startDate: string,
  endDate: string
) {
  const { data, error } = await supabase
    .from("study_sessions")
    .select("*")
    .eq("user_id", userId)
    .gte("session_date", startDate)
    .lte("session_date", endDate)
    .order("session_date", { ascending: true })
    .order("completed_at", { ascending: true });

  if (error) throw error;
  return data || [];
}