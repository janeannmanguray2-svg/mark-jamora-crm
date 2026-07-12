import { supabase } from '../supabaseClient.js';

export async function listSetup(category = '') {
  let q = supabase.from('setup_lists').select('*').order('category').order('value');
  if (category) q = q.eq('category', category);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function listActiveValues(category) {
  const { data, error } = await supabase
    .from('setup_lists')
    .select('value')
    .eq('category', category)
    .eq('status', 'Active')
    .order('value');
  if (error) throw error;
  return data.map(r => r.value);
}

export async function saveSetupItem(item) {
  if (item.id) {
    const { data, error } = await supabase.from('setup_lists').update(item).eq('id', item.id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from('setup_lists').insert(item).select().single();
  if (error) throw error;
  return data;
}

export async function deleteSetupItem(id) {
  const { error } = await supabase.from('setup_lists').delete().eq('id', id);
  if (error) throw error;
}
