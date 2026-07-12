import { supabase } from '../supabaseClient.js';

export async function listFollowUps({ merchantId = '', assignedTo = '', status = '', dueBefore = '' } = {}) {
  let q = supabase
    .from('follow_ups_view')
    .select('*, assignee:assigned_to(id, full_name)')
    .order('due_date', { ascending: true });
  if (merchantId) q = q.eq('merchant_id', merchantId);
  if (assignedTo) q = q.eq('assigned_to', assignedTo);
  if (status) q = q.eq('effective_status', status);
  if (dueBefore) q = q.lte('due_date', dueBefore);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function createFollowUp(payload, currentUserId) {
  const { data, error } = await supabase
    .from('follow_ups')
    .insert({ ...payload, created_by: currentUserId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateFollowUp(id, payload) {
  const { data, error } = await supabase.from('follow_ups').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function markFollowUpDone(id) {
  return updateFollowUp(id, { status: 'Done' });
}

export async function deleteFollowUp(id) {
  const { error } = await supabase.from('follow_ups').delete().eq('id', id);
  if (error) throw error;
}
