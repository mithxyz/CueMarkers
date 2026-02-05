// Auth view: login/register forms
const AuthView = {
  render(container, isRegister) {
    container.innerHTML = `
      <div class="auth-page">
        <div class="auth-card">
          <div class="auth-header">
            <img src="/mlogo2.png" alt="M" class="auth-logo">
            <h1>arkers</h1>
          </div>
          <h2>${isRegister ? 'Create Account' : 'Sign In'}</h2>
          <form id="authForm">
            ${isRegister ? `
              <div class="form-group">
                <label for="authName">Display Name</label>
                <input type="text" id="authName" placeholder="Your name" required>
              </div>
            ` : ''}
            <div class="form-group">
              <label for="authEmail">Email</label>
              <input type="email" id="authEmail" placeholder="you@example.com" required>
            </div>
            <div class="form-group">
              <label for="authPassword">Password</label>
              <input type="password" id="authPassword" placeholder="${isRegister ? 'At least 6 characters' : 'Password'}" required minlength="6">
            </div>
            <div id="authError" class="auth-error" style="display:none;"></div>
            <button type="submit" class="btn btn-primary auth-submit">${isRegister ? 'Create Account' : 'Sign In'}</button>
          </form>
          <p class="auth-switch">
            ${isRegister
              ? 'Already have an account? <a href="#/login">Sign in</a>'
              : 'No account? <a href="#/register">Create one</a>'}
          </p>
        </div>
      </div>
    `;

    const form = document.getElementById('authForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById('authError');
      errorEl.style.display = 'none';

      const email = document.getElementById('authEmail').value.trim();
      const password = document.getElementById('authPassword').value;

      try {
        let data;
        if (isRegister) {
          const display_name = document.getElementById('authName').value.trim();
          data = await cmApi.register(email, password, display_name);
        } else {
          data = await cmApi.login(email, password);
        }
        cmState.setUser(data.user);
        cmSocket.connect();
        cmNavigate('projects');
      } catch (err) {
        errorEl.textContent = err.message || 'Authentication failed';
        errorEl.style.display = 'block';
      }
    });

    return { destroy() {} };
  },
};

window.AuthView = AuthView;
