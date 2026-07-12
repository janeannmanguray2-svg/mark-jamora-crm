import { getSession, loadCurrentProfile, isAdmin, isManagerRole } from './auth.js';
import { registerRoute, startRouter, navigate } from './router.js';
import { renderLogin } from './pages/login.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderMerchants } from './pages/merchants.js';
import { renderFollowUps } from './pages/followups.js';
import { renderTeam } from './pages/team.js';
import { renderSetup } from './pages/setup.js';
import { renderAccount } from './pages/account.js';
import { toast } from './utils.js';

function guarded(renderFn, check) {
  return async () => {
    if (check && !check()) { navigate('dashboard'); return; }
    try { await renderFn(); }
    catch (err) { console.error(err); toast(err.message || 'Something went wrong.', 'error'); }
  };
}

registerRoute('dashboard', guarded(renderDashboard));
registerRoute('merchants', guarded(renderMerchants));
registerRoute('followups', guarded(renderFollowUps));
registerRoute('team', guarded(renderTeam, isManagerRole));
registerRoute('setup', guarded(renderSetup, isAdmin));
registerRoute('account', guarded(renderAccount));

async function boot() {
  const session = await getSession();
  if (!session) {
    await renderLogin(afterLogin);
    return;
  }
  try {
    await loadCurrentProfile();
    startRouter();
  } catch (err) {
    console.error(err);
    await renderLogin(afterLogin);
  }
}

async function afterLogin() {
  await loadCurrentProfile();
  startRouter();
}

boot();
