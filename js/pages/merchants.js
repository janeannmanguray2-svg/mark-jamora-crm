import { el, $, toast, openModal, closeModal, confirmDialog, formatMoney, debounce } from '../utils.js';
import { renderShell } from './shell.js';
import { listMerchants, createMerchant, updateMerchant, deleteMerchant, setPipelineStage } from '../api/merchants.js';
import { listTeam } from '../api/team.js';
import { listActiveValues } from '../api/setup.js';
import { PIPELINE_STAGES, STAGE_COLORS } from '../config.js';
import { getCachedProfile } from '../auth.js';
import { openMerchantDetail } from './merchantDetail.js';

let viewMode = 'kanban';
let cachedTeam = [];
let cachedLeadSources = [];
let cachedProducts = [];

export async function renderMerchants() {
  const content = renderShell('merchants');
  content.innerHTML = '<div class="loading">Loading merchants…</div>';

  [cachedTeam, cachedLeadSources, cachedProducts] = await Promise.all([
    listTeam().catch(() => []),
    listActiveValues('Lead Source').catch(() => []),
    listActiveValues('Products Required').catch(() => [])
  ]);

  content.innerHTML = '';
  content.appendChild(buildToolbar());
  const listHost = el('div', { id: 'merchants-host' });
  content.appendChild(listHost);
  await refresh();

  async function refresh() {
    listHost.innerHTML = '<div class="loading">Loading…</div>';
    const search = $('#merchant-search')?.value || '';
    const stage = $('#merchant-stage-filter')?.value || '';
    const owner = $('#merchant-owner-filter')?.value || '';
    const merchants = await listMerchants({ search, stage, ownerId: owner });
    listHost.innerHTML = '';
    listHost.appendChild(viewMode === 'kanban' ? buildKanban(merchants, refresh) : buildTable(merchants, refresh));
  }

  function buildToolbar() {
    const ownerOptions = [el('option', { value: '' }, 'All owners')]
      .concat(cachedTeam.map(t => el('option', { value: t.id }, t.full_name)));
    const stageOptions = [el('option', { value: '' }, 'All stages')]
      .concat(PIPELINE_STAGES.map(s => el('option', { value: s }, s)));

    return el('div', { class: 'toolbar' }, [
      el('input', { id: 'merchant-search', class: 'input', placeholder: 'Search merchants…', oninput: debounce(refresh, 350) }),
      el('select', { id: 'merchant-stage-filter', class: 'input', onchange: refresh }, stageOptions),
      el('select', { id: 'merchant-owner-filter', class: 'input', onchange: refresh }, ownerOptions),
      el('div', { class: 'toolbar-spacer' }),
      el('div', { class: 'view-toggle' }, [
        el('button', { class: 'btn btn-ghost' + (viewMode === 'kanban' ? ' active' : ''), onclick: () => { viewMode = 'kanban'; refresh(); } }, 'Board'),
        el('button', { class: 'btn btn-ghost' + (viewMode === 'table' ? ' active' : ''), onclick: () => { viewMode = 'table'; refresh(); } }, 'Table')
      ]),
      el('button', { class: 'btn btn-primary', onclick: () => openMerchantForm(null, refresh) }, '+ New Merchant')
    ]);
  }
}

function buildKanban(merchants, refresh) {
  const board = el('div', { class: 'kanban-board' });
  PIPELINE_STAGES.forEach(stage => {
    const items = merchants.filter(m => m.pipeline_stage === stage);
    const column = el('div', { class: 'kanban-column' }, [
      el('div', { class: 'kanban-col-header', style: `border-top-color:${STAGE_COLORS[stage]}` }, [
        el('span', {}, stage), el('span', { class: 'kanban-count' }, String(items.length))
      ]),
      el('div', { class: 'kanban-col-body' }, items.map(m => buildKanbanCard(m, refresh)))
    ]);
    column.addEventListener('dragover', (e) => e.preventDefault());
    column.addEventListener('drop', async (e) => {
      e.preventDefault();
      const id = e.dataTransfer.getData('text/plain');
      if (!id) return;
      try {
        await setPipelineStage(id, stage);
        toast('Stage updated.', 'success');
        refresh();
      } catch (err) { toast(err.message, 'error'); }
    });
    board.appendChild(column);
  });
  return board;
}

function buildKanbanCard(m, refresh) {
  const card = el('div', {
    class: 'kanban-card', draggable: 'true',
    ondragstart: (e) => e.dataTransfer.setData('text/plain', m.id),
    onclick: () => openMerchantDetail(m.id, refresh)
  }, [
    el('div', { class: 'kanban-card-title' }, m.merchant_name),
    el('div', { class: 'kanban-card-sub' }, m.city || '—'),
    el('div', { class: 'kanban-card-meta' }, [
      el('span', {}, m.owner?.full_name || 'Unassigned'),
      el('span', {}, m.expected_monthly_volume ? formatMoney(m.expected_monthly_volume) + ' AED' : '')
    ])
  ]);
  return card;
}

function buildTable(merchants, refresh) {
  return el('table', { class: 'table' }, [
    el('thead', {}, el('tr', {}, ['Merchant', 'City', 'Owner', 'Stage', 'Products', 'Volume (AED)', 'Updated', '']
      .map(h => el('th', {}, h)))),
    el('tbody', {}, merchants.map(m => el('tr', { class: 'clickable', onclick: () => openMerchantDetail(m.id, refresh) }, [
      el('td', {}, m.merchant_name),
      el('td', {}, m.city || '—'),
      el('td', {}, m.owner?.full_name || 'Unassigned'),
      el('td', {}, el('span', { class: 'badge', style: `background:${STAGE_COLORS[m.pipeline_stage]}22;color:${STAGE_COLORS[m.pipeline_stage]}` }, m.pipeline_stage)),
      el('td', {}, m.products_required || '—'),
      el('td', {}, formatMoney(m.expected_monthly_volume)),
      el('td', {}, new Date(m.updated_at).toLocaleDateString()),
      el('td', {}, el('button', {
        class: 'btn btn-ghost btn-sm', onclick: (e) => { e.stopPropagation(); handleDelete(m, refresh); }
      }, '🗑'))
    ])))
  ]);
}

async function handleDelete(m, refresh) {
  const ok = await confirmDialog(`Delete merchant "${m.merchant_name}"? This also removes its activities and follow-ups.`);
  if (!ok) return;
  try {
    await deleteMerchant(m.id);
    toast('Merchant deleted.', 'success');
    refresh();
  } catch (err) { toast(err.message, 'error'); }
}

export function openMerchantForm(merchant, onSaved) {
  const isEdit = !!merchant;
  const m = merchant || { merchant_name: '', city: '', contact_person: '', mobile_number: '', email: '', products_required: '', pos_quantity: 0, lead_source: '', pipeline_stage: 'New Lead', expected_monthly_volume: 0, owner_id: getCachedProfile()?.id || '', notes: '' };

  const field = (label, node) => el('div', { class: 'form-field' }, [el('label', {}, label), node]);
  const ownerSelect = el('select', { id: 'f-owner' }, cachedTeam.map(t => el('option', { value: t.id, selected: t.id === m.owner_id ? 'true' : null }, t.full_name)));
  const leadSourceSelect = el('select', { id: 'f-source' }, [el('option', { value: '' }, '—')].concat(
    cachedLeadSources.map(v => el('option', { value: v, selected: v === m.lead_source ? 'true' : null }, v))));
  const productsSelect = el('select', { id: 'f-products' }, [el('option', { value: '' }, '—')].concat(
    cachedProducts.map(v => el('option', { value: v, selected: v === m.products_required ? 'true' : null }, v))));
  const stageSelect = el('select', { id: 'f-stage' }, PIPELINE_STAGES.map(s => el('option', { value: s, selected: s === m.pipeline_stage ? 'true' : null }, s)));

  const body = el('div', { class: 'form-grid' }, [
    field('Merchant Name *', el('input', { id: 'f-name', value: m.merchant_name, required: 'true' })),
    field('City / Area', el('input', { id: 'f-city', value: m.city || '' })),
    field('Contact Person', el('input', { id: 'f-contact', value: m.contact_person || '' })),
    field('Mobile Number', el('input', { id: 'f-mobile', value: m.mobile_number || '' })),
    field('Email', el('input', { id: 'f-email', value: m.email || '' })),
    field('Products Required', productsSelect),
    field('POS Quantity', el('input', { id: 'f-posqty', type: 'number', value: m.pos_quantity || 0, min: '0' })),
    field('Lead Source', leadSourceSelect),
    field('Pipeline Stage', stageSelect),
    field('Owner (Agent)', ownerSelect),
    field('Expected Monthly Volume (AED)', el('input', { id: 'f-volume', type: 'number', value: m.expected_monthly_volume || 0, min: '0' })),
    field('Notes', el('textarea', { id: 'f-notes', rows: '3' }, m.notes || ''))
  ]);

  const footer = el('div', { class: 'row gap' }, [
    el('button', { class: 'btn btn-ghost', onclick: closeModal, type: 'button' }, 'Cancel'),
    el('button', { class: 'btn btn-primary', onclick: save, type: 'button' }, isEdit ? 'Save Changes' : 'Create Merchant')
  ]);

  openModal({ title: isEdit ? 'Edit Merchant' : 'New Merchant', bodyNode: body, footerNode: footer, wide: true });

  async function save() {
    const payload = {
      merchant_name: $('#f-name').value.trim(),
      city: $('#f-city').value.trim(),
      contact_person: $('#f-contact').value.trim(),
      mobile_number: $('#f-mobile').value.trim(),
      email: $('#f-email').value.trim(),
      products_required: $('#f-products').value,
      pos_quantity: Number($('#f-posqty').value || 0),
      lead_source: $('#f-source').value,
      pipeline_stage: $('#f-stage').value,
      owner_id: $('#f-owner').value || null,
      expected_monthly_volume: Number($('#f-volume').value || 0),
      notes: $('#f-notes').value.trim()
    };
    if (!payload.merchant_name) { toast('Merchant Name is required.', 'error'); return; }
    try {
      if (isEdit) await updateMerchant(m.id, payload);
      else await createMerchant(payload, getCachedProfile()?.id);
      toast('Merchant saved.', 'success');
      closeModal();
      onSaved && onSaved();
    } catch (err) { toast(err.message, 'error'); }
  }
}
