import { supabase } from '../supabaseClient.js';

// All queries here rely on RLS to scope rows to whatever the signed-in user
// (and their configured visibility_scope) is allowed to see — no extra
// filtering by user id is needed client-side.

export async function getDashboardData({ from = '', to = '' } = {}) {
  let merchantQ = supabase.from('merchants').select('*');
  const { data: merchants, error: mErr } = await merchantQ;
  if (mErr) throw mErr;

  let activityQ = supabase.from('activities_view').select('*');
  if (from) activityQ = activityQ.gte('activity_date', from);
  if (to) activityQ = activityQ.lte('activity_date', to);
  const { data: activities, error: aErr } = await activityQ;
  if (aErr) throw aErr;

  const { data: followUps, error: fErr } = await supabase.from('follow_ups_view').select('*');
  if (fErr) throw fErr;

  const sumBool = (rows, field) => rows.reduce((t, r) => t + (r[field] ? 1 : 0), 0);
  const sumNum = (rows, field) => rows.reduce((t, r) => t + (Number(r[field]) || 0), 0);

  const stageCounts = {};
  merchants.forEach(m => { stageCounts[m.pipeline_stage] = (stageCounts[m.pipeline_stage] || 0) + 1; });

  const dealsClosed = sumBool(activities, 'deal_closed');
  const totalLeads = merchants.length;

  const metrics = {
    totalMerchants: merchants.length,
    totalLeads,
    calls: sumBool(activities, 'calls'),
    visits: sumBool(activities, 'outdoor_visits'),
    emails: sumBool(activities, 'emails_sent'),
    qualified: sumBool(activities, 'qualified_lead'),
    submitted: sumBool(activities, 'submitted_review'),
    approved: sumBool(activities, 'approved_merchant'),
    activated: sumBool(activities, 'activated_merchant'),
    posDeployed: sumNum(activities, 'pos_machines_deployed'),
    linksSold: sumBool(activities, 'payment_links_sold'),
    gatewaysSold: sumBool(activities, 'payment_gateways_sold'),
    bnplSignups: sumBool(activities, 'bnpl_signup'),
    dealsClosed,
    expectedVolume: sumNum(merchants, 'expected_monthly_volume'),
    conversionRate: totalLeads ? dealsClosed / totalLeads : 0,
    stageCounts,
    openFollowUps: followUps.filter(f => f.effective_status === 'Pending').length,
    overdueFollowUps: followUps.filter(f => f.effective_status === 'Overdue').length
  };

  const topPerformers = computeTopPerformers(activities, merchants);

  return { merchants, activities, followUps, metrics, topPerformers };
}

function computeTopPerformers(activities, merchants) {
  const byAgent = {};
  const bump = (agentId, field, amount = 1) => {
    if (!agentId) return;
    byAgent[agentId] = byAgent[agentId] || { calls: 0, visits: 0, deals: 0, posDeployed: 0, bnpl: 0 };
    byAgent[agentId][field] += amount;
  };
  activities.forEach(a => {
    if (a.calls) bump(a.agent_id, 'calls');
    if (a.outdoor_visits) bump(a.agent_id, 'visits');
    if (a.deal_closed) bump(a.agent_id, 'deals');
    if (a.pos_machines_deployed) bump(a.agent_id, 'posDeployed', a.pos_machines_deployed);
    if (a.bnpl_signup) bump(a.agent_id, 'bnpl');
  });

  const topOf = (field) => {
    const entries = Object.entries(byAgent).sort((a, b) => b[1][field] - a[1][field]);
    return entries[0] ? { agentId: entries[0][0], value: entries[0][1][field] } : null;
  };

  return {
    topCalls: topOf('calls'),
    topVisits: topOf('visits'),
    topDeals: topOf('deals'),
    topPos: topOf('posDeployed'),
    topBnpl: topOf('bnpl')
  };
}
