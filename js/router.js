const routes = {};

export function registerRoute(path, handler) {
  routes[path] = handler;
}

export function navigate(path) {
  if (location.hash.slice(1) === path) {
    handleRoute();
  } else {
    location.hash = path;
  }
}

export function currentPath() {
  return location.hash.slice(1) || 'dashboard';
}

async function handleRoute() {
  const path = currentPath();
  const handler = routes[path] || routes['dashboard'];
  await handler();
}

export function startRouter() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
