import { el, formatMoney, formatDate } from '../utils.js';
import { renderShell } from './shell.js';
import { getDashboardData } from '../api/dashboard.js';
import { listTeam } from '../api/team.js';
import { STAGE_COLORS, PIPELINE_STAGES } from '../config.js';

export async function renderDashboard() {
  const content = renderShell('dashboard');
  content.innerHTML = '<div class="loading">Loading dashboard…</div>';

  const [{ metrics, topPerformers, followUps }, team] = await Promise.all([
    getDashboardData(), listTeam().catch(() => [])
  ]);
  const nameOf = (id) => team.find(t => t.id === id)?.full_name || '—';

  content.innerHTML = '';

  const cards = [
    ['Total Merchants', metrics.totalMerchants, ''],
    ['Calls', metrics.calls, ''],
    ['Outdoor Visits', metrics.visits, ''],
    ['Qualified Leads', metrics.qualified, ''],
    ['Approved', metrics.approved, ''],
    ['Activated', metrics.activated, ''],
    ['Deals Closed', metrics.dealsClosed, ''],
    ['Expected Volume (AED)', formatMoney(metrics.expectedVolume), ''],
    ['Conversion Rate', (metrics.conversionRate * 100).toFixed(1) + '%', ''],
    ['Open Follow-ups', metrics.openFollowUps, metrics.overdueFollowUps ? `${metrics.overdueFollowUps} overdue` : '']
  ];

  content.appendChild(el('div', { class: 'card-grid' },
    cards.map(([label, value, sub]) => el('div', { class: 'kpi-card' }, [
      el('div', { class: 'kpi-label' }, label),
      el('div', { class: 'kpi-value' }, String(value)),
      sub ? el('div', { class: 'kpi-sub warn' }, sub) : null
    ]))
  ));

  // Pipeline breakdown bar
  const total = Object.values(metrics.stageCounts).reduce((a, b) => a + b, 0) || 1;
  content.appendChild(el('div', { class: 'panel' }, [
    el('h3', {}, 'Pipeline Breakdown'),
    el('div', { class: 'stage-bar' }, PIPELINE_STAGES.filter(s => metrics.stageCounts[s]).map(stage =>
      el('div', {
        class: 'stage-segment',
        style: `width:${(metrics.stageCounts[stage] / total) * 100}%; background:${STAGE_COLORS[stage]}`,
        title: `${stage}: ${metrics.stageCounts[stage]}`
      })
    )),
    el('div', { class: 'stage-legend' }, PIPELINE_STAGES.filter(s => metrics.stageCounts[s]).map(stage =>
      el('div', { class: 'legend-item' }, [
        el('span', { class: 'legend-dot', style: `background:${STAGE_COLORS[stage]}` }),
        el('span', {}, `${stage} (${metrics.stageCounts[stage]})`)
      ])
    ))
  ]));

  // Top performers
  const tp = topPerformers;
  const tpRows = [
    ['Most Calls', tp.topCalls],
    ['Most Outdoor Visits', tp.topVisits],
    ['Most Deals Closed', tp.topDeals],
    ['Most POS Deployed', tp.topPos],
    ['Most BNPL Sign-ups', tp.topBnpl]
  ];
  content.appendChild(el('div', { class: 'panel' }, [
    el('h3', {}, 'Top Performers'),
    el('table', { class: 'table' }, [
      el('thead', {}, el('tr', {}, [el('th', {}, 'Category'), el('th', {}, 'Agent'), el('th', {}, 'Value')])),
      el('tbody', {}, tpRows.map(([label, entry]) => el('tr', {}, [
        el('td', {}, label),
        el('td', {}, entry ? nameOf(entry.agentId) : '—'),
        el('td', {}, entry ? String(entry.value) : '—')
      ])))
    ])
  ]));

  // Upcoming / overdue follow-ups
  const upcoming = followUps
    .filter(f => f.effective_status === 'Pending' || f.effective_status === 'Overdue')
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 8);
  content.appendChild(el('div', { class: 'panel' }, [
    el('h3', {}, 'Upcoming Follow-ups'),
    upcoming.length
      ? el('table', { class: 'table' }, [
          el('thead', {}, el('tr', {}, [el('th', {}, 'Merchant'), el('th', {}, 'Title'), el('th', {}, 'Due'), el('th', {}, 'Status')])),
          el('tbody', {}, upcoming.map(f => el('tr', {}, [
            el('td', {}, f.merchant_name),
            el('td', {}, f.title),
            el('td', {}, formatDate(f.due_date)),
            el('td', {}, el('span', { class: 'badge badge-' + (f.effective_status === 'Overdue' ? 'danger' : 'warn') }, f.effective_status))
          ])))
        ])
      : el('p', { class: 'muted' }, 'Nothing due — you\'re all caught up.')
  ]));
}
