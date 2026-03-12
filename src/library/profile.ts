import { supabase } from "./supabase";

// Update Profile Details into Supabase
export type ProfileUpdates = {
  full_name?: string;
  avatar?: string;
  age?: number | null;
  gender?: string | null;
  grade_level?: string | null;
  bio?: string | null;
};

export async function updateUserProfile(userId: string, updates: ProfileUpdates) {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

