import { el, $, toast, openModal, closeModal, confirmDialog } from '../utils.js';
import { renderShell } from './shell.js';
import { listSetup, saveSetupItem, deleteSetupItem } from '../api/setup.js';

const CATEGORIES = ['Lead Source', 'Products Required', 'Period Options'];

export async function renderSetup() {
  const content = renderShell('setup');
  content.innerHTML = '<div class="loading">Loading setup…</div>';
  const items = await listSetup();
  content.innerHTML = '';

  content.appendChild(el('div', { class: 'row space-between' }, [
    el('h3', {}, 'Setup Lists'),
    el('button', { class: 'btn btn-primary', onclick: () => openForm(null) }, '+ Add Item')
  ]));

  CATEGORIES.forEach(cat => {
    const rows = items.filter(i => i.category === cat);
    content.appendChild(el('div', { class: 'panel' }, [
      el('h4', {}, cat),
      rows.length ? el('table', { class: 'table' }, [
        el('thead', {}, el('tr', {}, ['Value', 'Status', ''].map(h => el('th', {}, h)))),
        el('tbody', {}, rows.map(r => el('tr', {}, [
          el('td', {}, r.value),
          el('td', {}, el('span', { class: 'badge badge-' + (r.status === 'Active' ? 'success' : 'danger') }, r.status)),
          el('td', {}, [
            el('button', { class: 'btn btn-ghost btn-sm', onclick: () => openForm(r) }, 'Edit'),
            el('button', { class: 'btn btn-ghost btn-sm', onclick: () => remove(r) }, '🗑')
          ])
        ])))
      ]) : el('p', { class: 'muted' }, 'No items yet.')
    ]));
  });

  function openForm(item) {
    const isEdit = !!item;
    const bodyForm = el('div', { class: 'form-grid' }, [
      el('div', { class: 'form-field' }, [el('label', {}, 'Category'), el('select', { id: 's-cat' }, CATEGORIES.map(c => el('option', { value: c, selected: c === (item?.category || CATEGORIES[0]) ? 'true' : null }, c)))]),
      el('div', { class: 'form-field' }, [el('label', {}, 'Value'), el('input', { id: 's-val', value: item?.value || '' })]),
      el('div', { class: 'form-field' }, [el('label', {}, 'Status'), el('select', { id: 's-status' }, ['Active', 'Inactive'].map(s => el('option', { value: s, selected: s === (item?.status || 'Active') ? 'true' : null }, s)))])
    ]);
    const footer = el('div', { class: 'row gap' }, [
      el('button', { class: 'btn btn-ghost', type: 'button', onclick: closeModal }, 'Cancel'),
      el('button', { class: 'btn btn-primary', type: 'button', onclick: submit }, 'Save')
    ]);
    openModal({ title: isEdit ? 'Edit Item' : 'Add Item', bodyNode: bodyForm, footerNode: footer });

    async function submit() {
      const value = $('#s-val').value.trim();
      if (!value) { toast('Value is required.', 'error'); return; }
      try {
        await saveSetupItem({ id: item?.id, category: $('#s-cat').value, value, status: $('#s-status').value });
        toast('Saved.', 'success');
        closeModal();
        renderSetup();
      } catch (err) { toast(err.message, 'error'); }
    }
  }

  async function remove(item) {
    const ok = await confirmDialog(`Delete "${item.value}"?`);
    if (!ok) return;
    try { await deleteSetupItem(item.id); toast('Deleted.', 'success'); renderSetup(); }
    catch (err) { toast(err.message, 'error'); }
  }
}
