import { supabase } from '../supabaseClient.js';

// RLS already restricts rows to whatever the signed-in user is allowed to see,
// so these queries stay simple — no manual "visible ids" filtering needed here.

export async function listMerchants({ search = '', stage = '', ownerId = '' } = {}) {
  let q = supabase.from('merchants').select('*, owner:owner_id(id, full_name)').order('updated_at', { ascending: false });
  if (search) q = q.or(`merchant_name.ilike.%${search}%,city.ilike.%${search}%,contact_person.ilike.%${search}%,mobile_number.ilike.%${search}%`);
  if (stage) q = q.eq('pipeline_stage', stage);
  if (ownerId) q = q.eq('owner_id', ownerId);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function getMerchant(id) {
  const { data, error } = await supabase
    .from('merchants')
    .select('*, owner:owner_id(id, full_name), creator:created_by(id, full_name)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createMerchant(payload, currentUserId) {
  const { data, error } = await supabase
    .from('merchants')
    .insert({ ...payload, created_by: currentUserId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMerchant(id, payload) {
  const { data, error } = await supabase
    .from('merchants')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function setPipelineStage(id, stage) {
  return updateMerchant(id, { pipeline_stage: stage, status: stage === 'Lost' ? 'Lost' : (stage === 'Deal Closed' ? 'Won' : 'Open') });
}

export async function deleteMerchant(id) {
  const { error } = await supabase.from('merchants').delete().eq('id', id);
  if (error) throw error;
}

export async function getStageHistory(merchantId) {
  const { data, error } = await supabase
    .from('pipeline_stage_history')
    .select('*, changed_by_profile:changed_by(full_name)')
    .eq('merchant_id', merchantId)
    .order('changed_at', { ascending: false });
  if (error) throw error;
  return data;
}
