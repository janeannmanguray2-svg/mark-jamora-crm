import { el, $, toast, formatDate, confirmDialog } from '../utils.js';
import { renderShell } from './shell.js';
import { listFollowUps, markFollowUpDone, deleteFollowUp } from '../api/followups.js';
import { listTeam } from '../api/team.js';
import { getCachedProfile } from '../auth.js';
import { openMerchantDetail } from './merchantDetail.js';

export async function renderFollowUps() {
  const content = renderShell('followups');
  content.innerHTML = '<div class="loading">Loading follow-ups…</div>';

  const team = await listTeam().catch(() => []);
  content.innerHTML = '';

  const filterBar = el('div', { class: 'toolbar' }, [
    el('select', { id: 'fu-status-filter', class: 'input', onchange: refresh }, [
      el('option', { value: '' }, 'All statuses'),
      el('option', { value: 'Pending' }, 'Pending'),
      el('option', { value: 'Overdue' }, 'Overdue'),
      el('option', { value: 'Done' }, 'Done')
    ]),
    el('select', { id: 'fu-mine-filter', class: 'input', onchange: refresh }, [
      el('option', { value: 'mine' }, 'Assigned to me'),
      el('option', { value: 'all' }, 'Everyone visible to me')
    ])
  ]);
  content.appendChild(filterBar);
  const host = el('div', { id: 'followups-host' });
  content.appendChild(host);
  await refresh();

  async function refresh() {
    host.innerHTML = '<div class="loading">Loading…</div>';
    const status = $('#fu-status-filter').value;
    const mine = $('#fu-mine-filter').value === 'mine';
    const rows = await listFollowUps({ status, assignedTo: mine ? getCachedProfile()?.id : '' });
    host.innerHTML = '';
    host.appendChild(rows.length ? el('table', { class: 'table' }, [
      el('thead', {}, el('tr', {}, ['Merchant', 'Title', 'Due', 'Assigned To', 'Priority', 'Status', '']
        .map(h => el('th', {}, h)))),
      el('tbody', {}, rows.map(f => el('tr', {}, [
        el('td', { class: 'link', onclick: () => openMerchantDetail(f.merchant_id, refresh) }, f.merchant_name),
        el('td', {}, f.title),
        el('td', {}, formatDate(f.due_date)),
        el('td', {}, f.assignee?.full_name || team.find(t => t.id === f.assigned_to)?.full_name || '—'),
        el('td', {}, f.priority),
        el('td', {}, el('span', { class: 'badge badge-' + (f.effective_status === 'Overdue' ? 'danger' : f.effective_status === 'Done' ? 'success' : 'warn') }, f.effective_status)),
        el('td', {}, [
          f.effective_status !== 'Done' ? el('button', { class: 'btn btn-ghost btn-sm', onclick: () => complete(f.id) }, '✓ Done') : null,
          el('button', { class: 'btn btn-ghost btn-sm', onclick: () => remove(f.id) }, '🗑')
        ])
      ])))
    ]) : el('p', { class: 'muted' }, 'No follow-ups match this filter.'));
  }

  async function complete(id) {
    try { await markFollowUpDone(id); toast('Marked done.', 'success'); refresh(); }
    catch (err) { toast(err.message, 'error'); }
  }
  async function remove(id) {
    const ok = await confirmDialog('Delete this follow-up?');
    if (!ok) return;
    try { await deleteFollowUp(id); toast('Deleted.', 'success'); refresh(); }
    catch (err) { toast(err.message, 'error'); }
  }
}
