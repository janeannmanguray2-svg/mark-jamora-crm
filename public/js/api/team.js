import { supabase } from '../supabaseClient.js';

export async function listTeam() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, manager:manager_id(id, full_name)')
    .order('full_name', { ascending: true });
  if (error) throw error;
  return data;
}

export async function updateProfile(id, payload) {
  const { data, error } = await supabase.from('profiles').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function setProfileStatus(id, status) {
  return updateProfile(id, { status });
}

export async function deleteProfile(id) {
  // Deletes the profile row only. The matching auth.users record must be removed
  // separately from the Supabase Dashboard (or via an Edge Function using the
  // service role key) — the anon/browser client cannot delete auth users.
  const { error } = await supabase.from('profiles').delete().eq('id', id);
  if (error) throw error;
}

export async function listRoleSettings() {
  const { data, error } = await supabase.from('role_settings').select('*').order('level', { ascending: true });
  if (error) throw error;
  return data;
}

export async function updateRoleSettings(role, payload) {
  const { data, error } = await supabase.from('role_settings').update(payload).eq('role', role).select().single();
  if (error) throw error;
  return data;
}
