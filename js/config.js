// ============================================================================
// PayMob CRM — Frontend configuration
// Fill these in with your own Supabase project's values
// (Supabase Dashboard -> Project Settings -> API).
// The anon key is safe to expose publicly; RLS policies do the real security.
// ============================================================================
export const SUPABASE_URL = 'https://khivgpcknnobzxpfsgyc.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoaXZncGNrbm5vYnp4cGZzZ3ljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4NzU0NTIsImV4cCI6MjA5OTQ1MTQ1Mn0.ZxAcWpaAs-LC82xtTFbTKmaYLtigDci9W-DMQ0P7mCE';

export const APP_NAME = 'PayMob CRM';

export const PIPELINE_STAGES = [
  'New Lead', 'Contacted', 'Qualified', 'Application Submitted',
  'Approved', 'Activated', 'Deal Closed', 'Lost'
];

export const STAGE_COLORS = {
  'New Lead': '#64748b',
  'Contacted': '#0ea5e9',
  'Qualified': '#6366f1',
  'Application Submitted': '#a855f7',
  'Approved': '#eab308',
  'Activated': '#22c55e',
  'Deal Closed': '#16a34a',
  'Lost': '#ef4444'
};

export const ROLE_LEVELS = ['Admin', 'Sales Director', 'Area Manager', 'Team Leader', 'Agent'];

export const FOLLOWUP_PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'];
export const FOLLOWUP_STATUSES = ['Pending', 'Done', 'Overdue', 'Cancelled'];
