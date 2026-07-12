// ============================================================================
// Small shared helpers used across every page module.
// ============================================================================

export function $(sel, root = document) { return root.querySelector(sel); }
export function $all(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([k, v]) => {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null) node.setAttribute(k, v);
  });
  (Array.isArray(children) ? children : [children]).forEach(c => {
    if (c == null) return;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return node;
}

let toastTimer = null;
export function toast(message, type = 'info') {
  let host = $('#toast-host');
  if (!host) {
    host = el('div', { id: 'toast-host' });
    document.body.appendChild(host);
  }
  const node = el('div', { class: `toast toast-${type}` }, message);
  host.appendChild(node);
  requestAnimationFrame(() => node.classList.add('show'));
  setTimeout(() => {
    node.classList.remove('show');
    setTimeout(() => node.remove(), 300);
  }, 3200);
}

export function openModal({ title, bodyNode, footerNode, wide = false }) {
  closeModal();
  const overlay = el('div', { id: 'modal-overlay', class: 'modal-overlay' });
  const card = el('div', { class: 'modal-card' + (wide ? ' modal-wide' : '') }, [
    el('div', { class: 'modal-header' }, [
      el('h3', {}, title),
      el('button', { class: 'icon-btn', onclick: closeModal, type: 'button' }, '✕')
    ]),
    el('div', { class: 'modal-body' }, bodyNode),
    footerNode ? el('div', { class: 'modal-footer' }, footerNode) : null
  ]);
  overlay.appendChild(card);
  overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) closeModal(); });
  document.body.appendChild(overlay);
  return overlay;
}

export function closeModal() {
  const existing = $('#modal-overlay');
  if (existing) existing.remove();
}

export function confirmDialog(message) {
  return new Promise((resolve) => {
    const footer = el('div', { class: 'row gap' }, [
      el('button', { class: 'btn btn-ghost', onclick: () => { closeModal(); resolve(false); } }, 'Cancel'),
      el('button', { class: 'btn btn-danger', onclick: () => { closeModal(); resolve(true); } }, 'Confirm')
    ]);
    openModal({ title: 'Please confirm', bodyNode: el('p', {}, message), footerNode: footer });
  });
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d + (String(d).length === 10 ? 'T00:00:00' : ''));
  if (isNaN(date)) return d;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatMoney(n) {
  const v = Number(n || 0);
  return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function initials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
}

export function debounce(fn, ms = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

export function isOverdue(followUp) {
  return followUp.status === 'Pending' && followUp.due_date < todayStr();
}
