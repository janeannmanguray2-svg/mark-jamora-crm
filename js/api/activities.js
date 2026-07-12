import { supabase } from '../supabaseClient.js';

export async function listActivitiesForMerchant(merchantId) {
  const { data, error } = await supabase
    .from('activities_view')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('activity_date', { ascending: false });
  if (error) throw error;
  return data;
}

export async function listActivities({ from = '', to = '', agentId = '' } = {}) {
  let q = supabase.from('activities_view').select('*').order('activity_date', { ascending: false });
  if (from) q = q.gte('activity_date', from);
  if (to) q = q.lte('activity_date', to);
  if (agentId) q = q.eq('agent_id', agentId);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function createActivity(payload) {
  const { data, error } = await supabase.from('activities').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateActivity(id, payload) {
  const { data, error } = await supabase.from('activities').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteActivity(id) {
  const { error } = await supabase.from('activities').delete().eq('id', id);
  if (error) throw error;
}
