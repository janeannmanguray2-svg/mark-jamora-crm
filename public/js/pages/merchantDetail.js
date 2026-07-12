import { el, $, toast, openModal, closeModal, confirmDialog, formatDate, formatMoney } from '../utils.js';
import { getMerchant, getStageHistory } from '../api/merchants.js';
import { listActivitiesForMerchant, createActivity, deleteActivity } from '../api/activities.js';
import { listFollowUps, createFollowUp, markFollowUpDone, deleteFollowUp } from '../api/followups.js';
import { listTeam } from '../api/team.js';
import { getCachedProfile } from '../auth.js';
import { FOLLOWUP_PRIORITIES } from '../config.js';

export async function openMerchantDetail(merchantId, onChange) {
  const [merchant, activities, followUps, team] = await Promise.all([
    getMerchant(merchantId),
    listActivitiesForMerchant(merchantId),
    listFollowUps({ merchantId }),
    listTeam().catch(() => [])
  ]);

  let activeTab = 'info';
  const body = el('div', { class: 'detail-tabs-host' });
  const overlay = openModal({
    title: merchant.merchant_name,
    bodyNode: body,
    footerNode: el('button', { class: 'btn btn-ghost', onclick: closeModal, type: 'button' }, 'Close'),
    wide: true
  });

  const tabs = ['info', 'activities', 'followups', 'history'];
  const tabLabels = { info: 'Info', activities: 'Activity Log', followups: 'Follow-ups', history: 'Stage History' };

  const nav = el('div', { class: 'tab-nav' }, tabs.map(t => el('button', {
    class: 'tab-btn' + (t === activeTab ? ' active' : ''), type: 'button',
    onclick: () => { activeTab = t; render(); }
  }, tabLabels[t])));

  const panel = el('div', { class: 'tab-panel' });
  body.appendChild(nav);
  body.appendChild(panel);
  render();

  function render() {
    Array.from(nav.children).forEach((btn, i) => btn.classList.toggle('active', tabs[i] === activeTab));
    panel.innerHTML = '';
    if (activeTab === 'info') panel.appendChild(renderInfo(merchant));
    if (activeTab === 'activities') panel.appendChild(renderActivities(merchant, activities, team));
    if (activeTab === 'followups') panel.appendChild(renderFollowUps(merchant, followUps, team));
    if (activeTab === 'history') panel.appendChild(renderHistoryPlaceholder(merchant.id));
  }
}

function renderInfo(m) {
  const row = (label, value) => el('div', { class: 'info-row' }, [el('span', { class: 'info-label' }, label), el('span', {}, value || '—')]);
  return el('div', { class: 'info-grid' }, [
    row('Contact Person', m.contact_person),
    row('Mobile Number', m.mobile_number),
    row('Email', m.email),
    row('City / Area', m.city),
    row('Products Required', m.products_required),
    row('Lead Source', m.lead_source),
    row('Pipeline Stage', m.pipeline_stage),
    row('Owner', m.owner?.full_name),
    row('Expected Monthly Volume', formatMoney(m.expected_monthly_volume) + ' AED'),
    row('Created', formatDate(m.created_at?.slice(0, 10))),
    row('Last Updated', formatDate(m.updated_at?.slice(0, 10))),
    el('div', { class: 'info-row info-notes' }, [el('span', { class: 'info-label' }, 'Notes'), el('p', {}, m.notes || '—')])
  ]);
}

function renderActivities(merchant, activities, team) {
  const container = el('div', {});
  const addBtn = el('button', { class: 'btn btn-primary btn-sm', onclick: () => openActivityForm() }, '+ Log Activity');
  container.appendChild(el('div', { class: 'row space-between' }, [el('h4', {}, 'Activity Log'), addBtn]));

  container.appendChild(activities.length ? el('table', { class: 'table' }, [
    el('thead', {}, el('tr', {}, ['Date', 'Day', 'Agent', 'Calls', 'Visits', 'Emails', 'POS Deployed', 'Deal Closed', 'Notes', '']
      .map(h => el('th', {}, h)))),
    el('tbody', {}, activities.map(a => el('tr', {}, [
      el('td', {}, formatDate(a.activity_date)),
      el('td', {}, a.day_name),
      el('td', {}, team.find(t => t.id === a.agent_id)?.full_name || '—'),
      el('td', {}, a.calls ? '✓' : ''),
      el('td', {}, a.outdoor_visits ? '✓' : ''),
      el('td', {}, a.emails_sent ? '✓' : ''),
      el('td', {}, String(a.pos_machines_deployed || 0)),
      el('td', {}, a.deal_closed ? '✓' : ''),
      el('td', {}, a.notes || ''),
      el('td', {}, el('button', { class: 'btn btn-ghost btn-sm', onclick: () => removeActivity(a.id) }, '🗑'))
    ])))
  ]) : el('p', { class: 'muted' }, 'No activity logged yet.'));

  function openActivityForm() {
    const checkboxField = (id, label) => el('label', { class: 'check-field' }, [el('input', { id, type: 'checkbox' }), label]);
    const bodyForm = el('div', { class: 'form-grid' }, [
      el('div', { class: 'form-field' }, [el('label', {}, 'Date'), el('input', { id: 'a-date', type: 'date', value: new Date().toISOString().slice(0, 10) })]),
      el('div', { class: 'form-field' }, [el('label', {}, 'Agent'), el('select', { id: 'a-agent' }, team.map(t => el('option', { value: t.id, selected: t.id === (getCachedProfile()?.id) ? 'true' : null }, t.full_name)))]),
      el('div', { class: 'form-field' }, [el('label', {}, 'POS Machines Deployed'), el('input', { id: 'a-pos', type: 'number', value: '0', min: '0' })]),
      el('div', { class: 'checkbox-grid' }, [
        checkboxField('a-calls', 'Calls Made'),
        checkboxField('a-visits', 'Outdoor Visit'),
        checkboxField('a-emails', 'Email Sent'),
        checkboxField('a-newlead', 'New Lead'),
        checkboxField('a-qualified', 'Qualified'),
        checkboxField('a-submitted', 'Submitted for Review'),
        checkboxField('a-approved', 'Approved'),
        checkboxField('a-activated', 'Activated'),
        checkboxField('a-links', 'Payment Link Sold'),
        checkboxField('a-gateways', 'Payment Gateway Sold'),
        checkboxField('a-bnpl', 'BNPL Sign-up'),
        checkboxField('a-deal', 'Deal Closed')
      ]),
      el('div', { class: 'form-field' }, [el('label', {}, 'Notes'), el('textarea', { id: 'a-notes', rows: '2' })])
    ]);
    const footer = el('div', { class: 'row gap' }, [
      el('button', { class: 'btn btn-ghost', type: 'button', onclick: closeModal }, 'Cancel'),
      el('button', { class: 'btn btn-primary', type: 'button', onclick: submit }, 'Save Activity')
    ]);
    openModal({ title: 'Log Activity — ' + merchant.merchant_name, bodyNode: bodyForm, footerNode: footer });

    async function submit() {
      const payload = {
        merchant_id: merchant.id,
        agent_id: $('#a-agent').value,
        activity_date: $('#a-date').value,
        pos_machines_deployed: Number($('#a-pos').value || 0),
        calls: $('#a-calls').checked,
        outdoor_visits: $('#a-visits').checked,
        emails_sent: $('#a-emails').checked,
        new_lead: $('#a-newlead').checked,
        qualified_lead: $('#a-qualified').checked,
        submitted_review: $('#a-submitted').checked,
        approved_merchant: $('#a-approved').checked,
        activated_merchant: $('#a-activated').checked,
        payment_links_sold: $('#a-links').checked,
        payment_gateways_sold: $('#a-gateways').checked,
        bnpl_signup: $('#a-bnpl').checked,
        deal_closed: $('#a-deal').checked,
        notes: $('#a-notes').value.trim()
      };
      try {
        await createActivity(payload);
        toast('Activity logged.', 'success');
        closeModal();
        openMerchantDetail(merchant.id);
      } catch (err) { toast(err.message, 'error'); }
    }
  }

  async function removeActivity(id) {
    const ok = await confirmDialog('Delete this activity entry?');
    if (!ok) return;
    try { await deleteActivity(id); toast('Deleted.', 'success'); openMerchantDetail(merchant.id); }
    catch (err) { toast(err.message, 'error'); }
  }

  return container;
}

function renderFollowUps(merchant, followUps, team) {
  const container = el('div', {});
  container.appendChild(el('div', { class: 'row space-between' }, [
    el('h4', {}, 'Follow-ups'),
    el('button', { class: 'btn btn-primary btn-sm', onclick: () => openFollowUpForm() }, '+ New Follow-up')
  ]));

  container.appendChild(followUps.length ? el('table', { class: 'table' }, [
    el('thead', {}, el('tr', {}, ['Title', 'Due', 'Assigned To', 'Priority', 'Status', '']
      .map(h => el('th', {}, h)))),
    el('tbody', {}, followUps.map(f => el('tr', {}, [
      el('td', {}, f.title),
      el('td', {}, formatDate(f.due_date)),
      el('td', {}, f.assignee?.full_name || '—'),
      el('td', {}, f.priority),
      el('td', {}, el('span', { class: 'badge badge-' + (f.effective_status === 'Overdue' ? 'danger' : f.effective_status === 'Done' ? 'success' : 'warn') }, f.effective_status)),
      el('td', {}, [
        f.effective_status !== 'Done' ? el('button', { class: 'btn btn-ghost btn-sm', onclick: () => complete(f.id) }, '✓') : null,
        el('button', { class: 'btn btn-ghost btn-sm', onclick: () => remove(f.id) }, '🗑')
      ])
    ])))
  ]) : el('p', { class: 'muted' }, 'No follow-ups yet.'));

  function openFollowUpForm() {
    const bodyForm = el('div', { class: 'form-grid' }, [
      el('div', { class: 'form-field' }, [el('label', {}, 'Title *'), el('input', { id: 'fu-title' })]),
      el('div', { class: 'form-field' }, [el('label', {}, 'Due Date *'), el('input', { id: 'fu-due', type: 'date', value: new Date().toISOString().slice(0, 10) })]),
      el('div', { class: 'form-field' }, [el('label', {}, 'Assigned To'), el('select', { id: 'fu-assignee' }, team.map(t => el('option', { value: t.id, selected: t.id === (getCachedProfile()?.id) ? 'true' : null }, t.full_name)))]),
      el('div', { class: 'form-field' }, [el('label', {}, 'Priority'), el('select', { id: 'fu-priority' }, FOLLOWUP_PRIORITIES.map(p => el('option', { value: p, selected: p === 'Normal' ? 'true' : null }, p)))]),
      el('div', { class: 'form-field' }, [el('label', {}, 'Description'), el('textarea', { id: 'fu-desc', rows: '2' })])
    ]);
    const footer = el('div', { class: 'row gap' }, [
      el('button', { class: 'btn btn-ghost', type: 'button', onclick: closeModal }, 'Cancel'),
      el('button', { class: 'btn btn-primary', type: 'button', onclick: submit }, 'Save Follow-up')
    ]);
    openModal({ title: 'New Follow-up — ' + merchant.merchant_name, bodyNode: bodyForm, footerNode: footer });

    async function submit() {
      const title = $('#fu-title').value.trim();
      const due = $('#fu-due').value;
      if (!title || !due) { toast('Title and due date are required.', 'error'); return; }
      try {
        await createFollowUp({
          merchant_id: merchant.id, title, due_date: due,
          assigned_to: $('#fu-assignee').value, priority: $('#fu-priority').value,
          description: $('#fu-desc').value.trim()
        }, getCachedProfile()?.id);
        toast('Follow-up created.', 'success');
        closeModal();
        openMerchantDetail(merchant.id);
      } catch (err) { toast(err.message, 'error'); }
    }
  }

  async function complete(id) {
    try { await markFollowUpDone(id); toast('Marked done.', 'success'); openMerchantDetail(merchant.id); }
    catch (err) { toast(err.message, 'error'); }
  }
  async function remove(id) {
    const ok = await confirmDialog('Delete this follow-up?');
    if (!ok) return;
    try { await deleteFollowUp(id); toast('Deleted.', 'success'); openMerchantDetail(merchant.id); }
    catch (err) { toast(err.message, 'error'); }
  }

  return container;
}

function renderHistoryPlaceholder(merchantId) {
  const host = el('div', {}, el('div', { class: 'loading' }, 'Loading history…'));
  getStageHistory(merchantId).then(rows => {
    host.innerHTML = '';
    host.appendChild(rows.length ? el('table', { class: 'table' }, [
      el('thead', {}, el('tr', {}, ['From', 'To', 'Changed By', 'When'].map(h => el('th', {}, h)))),
      el('tbody', {}, rows.map(r => el('tr', {}, [
        el('td', {}, r.from_stage || '—'),
        el('td', {}, r.to_stage),
        el('td', {}, r.changed_by_profile?.full_name || '—'),
        el('td', {}, new Date(r.changed_at).toLocaleString())
      ])))
    ]) : el('p', { class: 'muted' }, 'No stage changes recorded yet.'));
  }).catch(err => { host.innerHTML = ''; host.appendChild(el('p', { class: 'muted' }, err.message)); });
  return host;
}
