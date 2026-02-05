// CueMarkers main entry point with hash router
(function () {
  const api = new ApiClient();
  const socketManager = new SocketManager();
  const state = new AppState();

  // Make globally accessible
  window.cmApi = api;
  window.cmSocket = socketManager;
  window.cmState = state;

  // ── Hash Router ────────────────────────────────────────
  function getRoute() {
    const hash = window.location.hash.replace(/^#\/?/, '');
    if (!hash || hash === 'login' || hash === 'register') return { view: hash || 'login' };
    if (hash === 'projects') return { view: 'projects' };
    const match = hash.match(/^projects\/([a-f0-9-]+)$/);
    if (match) return { view: 'editor', projectId: match[1] };
    return { view: 'login' };
  }

  function navigate(path) {
    window.location.hash = '#/' + path;
  }

  window.cmNavigate = navigate;

  // ── Views ──────────────────────────────────────────────
  const appRoot = document.getElementById('app-root');
  let currentView = null;

  async function renderView() {
    const route = getRoute();

    // Check auth for protected routes
    if (route.view !== 'login' && route.view !== 'register' && !state.user) {
      try {
        const data = await api.me();
        state.setUser(data.user);
        socketManager.connect();
      } catch {
        navigate('login');
        return;
      }
    }

    // Cleanup previous view
    if (currentView && currentView.destroy) currentView.destroy();

    switch (route.view) {
      case 'login':
      case 'register':
        currentView = AuthView.render(appRoot, route.view === 'register');
        break;
      case 'projects':
        currentView = ProjectsView.render(appRoot);
        break;
      case 'editor':
        currentView = EditorView.render(appRoot, route.projectId);
        break;
      default:
        navigate('login');
    }
  }

  window.addEventListener('hashchange', renderView);

  // ── Bootstrap ──────────────────────────────────────────
  async function init() {
    try {
      const data = await api.me();
      state.setUser(data.user);
      socketManager.connect();
      const route = getRoute();
      if (route.view === 'login' || route.view === 'register' || !window.location.hash) {
        navigate('projects');
      } else {
        renderView();
      }
    } catch {
      if (!window.location.hash || window.location.hash === '#/' || window.location.hash === '#/login') {
        renderView();
      } else {
        navigate('login');
      }
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
