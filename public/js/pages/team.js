import { el, $, toast, openModal, closeModal, confirmDialog, initials } from '../utils.js';
import { renderShell } from './shell.js';
import { listTeam, updateProfile, deleteProfile, listRoleSettings, updateRoleSettings } from '../api/team.js';
import { getCachedProfile, isAdmin } from '../auth.js';
import { ROLE_LEVELS } from '../config.js';

export async function renderTeam() {
  const content = renderShell('team');
  content.innerHTML = '<div class="loading">Loading team…</div>';

  const [team, roleSettings] = await Promise.all([listTeam(), listRoleSettings().catch(() => [])]);
  content.innerHTML = '';

  content.appendChild(el('div', { class: 'panel' }, [
    el('div', { class: 'row space-between' }, [
      el('h3', {}, 'Team & Reporting Hierarchy'),
      el('p', { class: 'muted' }, 'New logins are created by having the person sign up, then set their role & manager here.')
    ]),
    el('table', { class: 'table' }, [
      el('thead', {}, el('tr', {}, ['Name', 'Username', 'Role', 'Reports To', 'Status', 'Position', '']
        .map(h => el('th', {}, h)))),
      el('tbody', {}, team.map(t => buildRow(t)))
    ])
  ]));

  if (isAdmin() && roleSettings.length) {
    content.appendChild(el('div', { class: 'panel' }, [
      el('h3', {}, 'Role Visibility Settings'),
      el('p', { class: 'muted' }, 'Controls how much data each role can see: their own records, direct reports, full downline, or everyone.'),
      el('table', { class: 'table' }, [
        el('thead', {}, el('tr', {}, ['Role', 'Level', 'Visibility Scope', 'Can Manage Users', 'Can Manage Setup']
          .map(h => el('th', {}, h)))),
        el('tbody', {}, roleSettings.map(rs => buildRoleRow(rs)))
      ])
    ]));
  }

  function buildRow(t) {
    const isSelf = t.id === getCachedProfile()?.id;
    return el('tr', {}, [
      el('td', {}, el('div', { class: 'row gap-sm' }, [el('span', { class: 'avatar-sm' }, initials(t.full_name)), el('span', {}, t.full_name)])),
      el('td', {}, t.username || '—'),
      el('td', {}, isAdmin() && !isSelf ? roleSelect(t) : t.role),
      el('td', {}, isAdmin() && !isSelf ? managerSelect(t) : (t.manager?.full_name || '—')),
      el('td', {}, el('span', { class: 'badge badge-' + (t.status === 'Active' ? 'success' : 'danger') }, t.status)),
      el('td', {}, t.position || '—'),
      el('td', {}, isAdmin() && !isSelf ? [
        el('button', { class: 'btn btn-ghost btn-sm', onclick: () => toggleStatus(t) }, t.status === 'Active' ? 'Deactivate' : 'Activate'),
        el('button', { class: 'btn btn-ghost btn-sm', onclick: () => removeMember(t) }, '🗑')
      ] : '')
    ]);
  }

  function roleSelect(t) {
    return el('select', { onchange: (e) => saveField(t.id, { role: e.target.value }) },
      ROLE_LEVELS.map(r => el('option', { value: r, selected: r === t.role ? 'true' : null }, r)));
  }

  function managerSelect(t) {
    const options = [el('option', { value: '' }, '— none —')].concat(
      team.filter(m => m.id !== t.id).map(m => el('option', { value: m.id, selected: m.id === t.manager_id ? 'true' : null }, m.full_name))
    );
    return el('select', { onchange: (e) => saveField(t.id, { manager_id: e.target.value || null }) }, options);
  }

  async function saveField(id, payload) {
    try { await updateProfile(id, payload); toast('Updated.', 'success'); }
    catch (err) { toast(err.message, 'error'); }
  }

  async function toggleStatus(t) {
    try {
      await updateProfile(t.id, { status: t.status === 'Active' ? 'Inactive' : 'Active' });
      toast('Status updated.', 'success');
      renderTeam();
    } catch (err) { toast(err.message, 'error'); }
  }

  async function removeMember(t) {
    const ok = await confirmDialog(`Remove ${t.full_name} from the team? Their auth login must also be deleted from the Supabase Dashboard.`);
    if (!ok) return;
    try { await deleteProfile(t.id); toast('Removed.', 'success'); renderTeam(); }
    catch (err) { toast(err.message, 'error'); }
  }

  function buildRoleRow(rs) {
    const scopeSelect = el('select', {
      onchange: (e) => saveRoleSetting(rs.role, { visibility_scope: e.target.value })
    }, ['own', 'direct_reports', 'downline', 'all'].map(s => el('option', { value: s, selected: s === rs.visibility_scope ? 'true' : null }, s)));
    const usersCb = el('input', { type: 'checkbox', checked: rs.can_manage_users ? 'true' : null, onchange: (e) => saveRoleSetting(rs.role, { can_manage_users: e.target.checked }) });
    const setupCb = el('input', { type: 'checkbox', checked: rs.can_manage_setup ? 'true' : null, onchange: (e) => saveRoleSetting(rs.role, { can_manage_setup: e.target.checked }) });
    return el('tr', {}, [el('td', {}, rs.role), el('td', {}, String(rs.level)), el('td', {}, scopeSelect), el('td', {}, usersCb), el('td', {}, setupCb)]);
  }

  async function saveRoleSetting(role, payload) {
    try { await updateRoleSettings(role, payload); toast('Role settings updated.', 'success'); }
    catch (err) { toast(err.message, 'error'); }
  }
}
