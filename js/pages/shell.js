import { el, initials } from '../utils.js';
import { getCachedProfile, signOut } from '../auth.js';
import { navigate } from '../router.js';

const NAV_ITEMS = [
  { path: 'dashboard', label: 'Dashboard', icon: '📊' },
  { path: 'merchants', label: 'Merchants', icon: '🏬' },
  { path: 'followups', label: 'Follow-ups', icon: '✅' },
  { path: 'team', label: 'Team', icon: '👥', roles: ['Admin', 'Sales Director', 'Area Manager', 'Team Leader'] },
  { path: 'setup', label: 'Setup', icon: '⚙️', roles: ['Admin'] },
  { path: 'account', label: 'My Account', icon: '🙍' }
];

export function renderShell(activePath) {
  const profile = getCachedProfile();
  const app = document.getElementById('app');
  app.innerHTML = '';

  const nav = el('nav', { class: 'sidebar' }, [
    el('div', { class: 'brand' }, [el('span', { class: 'brand-mark' }, '💳'), el('span', {}, 'PayMob CRM')]),
    el('div', { class: 'nav-list' }, NAV_ITEMS
      .filter(item => !item.roles || item.roles.includes(profile?.role))
      .map(item => el('a', {
        class: 'nav-link' + (item.path === activePath ? ' active' : ''),
        href: '#' + item.path
      }, [el('span', { class: 'nav-icon' }, item.icon), el('span', {}, item.label)]))
    ),
    el('div', { class: 'sidebar-footer' }, [
      el('div', { class: 'avatar' }, initials(profile?.full_name)),
      el('div', { class: 'sidebar-user' }, [
        el('div', { class: 'user-name' }, profile?.full_name || ''),
        el('div', { class: 'user-role' }, profile?.role || '')
      ])
    ])
  ]);

  const topbar = el('header', { class: 'topbar' }, [
    el('div', { class: 'topbar-title' }, NAV_ITEMS.find(i => i.path === activePath)?.label || ''),
    el('button', { class: 'btn btn-ghost', onclick: async () => { await signOut(); navigate('login'); location.reload(); } }, 'Sign out')
  ]);

  const main = el('main', { class: 'main-content' });
  const content = el('div', { id: 'page-content', class: 'page-content' });
  main.appendChild(topbar);
  main.appendChild(content);

  app.appendChild(nav);
  app.appendChild(main);
  return content;
}
