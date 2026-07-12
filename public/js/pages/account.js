import { el, $, toast } from '../utils.js';
import { renderShell } from './shell.js';
import { getCachedProfile } from '../auth.js';
import { supabase } from '../supabaseClient.js';
import { updateProfile } from '../api/team.js';

export async function renderAccount() {
  const content = renderShell('account');
  const profile = getCachedProfile();

  content.appendChild(el('div', { class: 'panel narrow' }, [
    el('h3', {}, 'My Profile'),
    el('div', { class: 'form-grid' }, [
      el('div', { class: 'form-field' }, [el('label', {}, 'Full Name'), el('input', { id: 'acc-name', value: profile?.full_name || '' })]),
      el('div', { class: 'form-field' }, [el('label', {}, 'Phone'), el('input', { id: 'acc-phone', value: profile?.phone || '' })]),
      el('div', { class: 'form-field' }, [el('label', {}, 'Role'), el('input', { value: profile?.role || '', disabled: 'true' })]),
      el('div', { class: 'form-field' }, [el('label', {}, 'Reports To'), el('input', { value: profile?.manager?.full_name || '—', disabled: 'true' })])
    ]),
    el('button', { class: 'btn btn-primary', onclick: saveProfile }, 'Save Profile')
  ]));

  content.appendChild(el('div', { class: 'panel narrow' }, [
    el('h3', {}, 'Change Password'),
    el('div', { class: 'form-grid' }, [
      el('div', { class: 'form-field' }, [el('label', {}, 'New Password'), el('input', { id: 'acc-pass', type: 'password' })]),
      el('div', { class: 'form-field' }, [el('label', {}, 'Confirm Password'), el('input', { id: 'acc-pass2', type: 'password' })])
    ]),
    el('button', { class: 'btn btn-primary', onclick: changePassword }, 'Update Password')
  ]));

  async function saveProfile() {
    try {
      await updateProfile(profile.id, { full_name: $('#acc-name').value.trim(), phone: $('#acc-phone').value.trim() });
      toast('Profile updated.', 'success');
    } catch (err) { toast(err.message, 'error'); }
  }

  async function changePassword() {
    const p1 = $('#acc-pass').value, p2 = $('#acc-pass2').value;
    if (!p1 || p1.length < 6) { toast('Password must be at least 6 characters.', 'error'); return; }
    if (p1 !== p2) { toast('Passwords do not match.', 'error'); return; }
    try {
      const { error } = await supabase.auth.updateUser({ password: p1 });
      if (error) throw error;
      toast('Password updated.', 'success');
      $('#acc-pass').value = ''; $('#acc-pass2').value = '';
    } catch (err) { toast(err.message, 'error'); }
  }
}
