import { supabase } from "./supabase";

export async function getCalendarEvents(userId: string) {
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("user_id", userId)
    .order("event_date", { ascending: true });

  if (error) throw error;
  return data;
}

export async function addCalendarEvent(event: {
  user_id: string;
  title: string;
  event_date: string;
  event_time?: string;
  description?: string;
}) {
  const { data, error } = await supabase
    .from("calendar_events")
    .insert(event)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCalendarEvent(id: string) {
  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", id);

  if (error) throw error;
}