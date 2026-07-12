import { supabase } from './supabaseClient.js';

// In-memory cache of the signed-in user's profile row (id, role, manager_id, ...).
let currentProfile = null;

export async function signIn(loginId, password) {
  // Supabase Auth is email-based. If the user typed a bare username instead of
  // an email, resolve it to the matching profiles.email first.
  let email = String(loginId || '').trim();
  if (email && !email.includes('@')) {
    const { data, error } = await supabase
      .from('profiles')
      .select('email')
      .eq('username', email)
      .maybeSingle();
    if (error || !data?.email) throw new Error('No account found for that username.');
    email = data.email;
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  await loadCurrentProfile();
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
  currentProfile = null;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function loadCurrentProfile(force = false) {
  if (currentProfile && !force) return currentProfile;
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) { currentProfile = null; return null; }

  const { data, error } = await supabase
    .from('profiles')
    .select('*, manager:manager_id(id, full_name)')
    .eq('id', user.id)
    .single();
  if (error) throw error;
  currentProfile = data;
  return currentProfile;
}

export function getCachedProfile() {
  return currentProfile;
}

export function isAdmin() {
  return currentProfile?.role === 'Admin';
}

export function isManagerRole() {
  return ['Admin', 'Sales Director', 'Area Manager', 'Team Leader'].includes(currentProfile?.role);
}

export function canManageUsers() {
  return currentProfile?.role === 'Admin' || currentProfile?._roleSettings?.can_manage_users;
}
