// Projects dashboard view
const ProjectsView = {
  render(container) {
    container.innerHTML = `
      <div class="projects-page">
        <div class="projects-header">
          <div class="projects-title">
            <img src="/mlogo2.png" alt="M" class="header-logo-m">
            <span>arkers</span>
          </div>
          <div class="projects-user">
            <span id="userDisplayName"></span>
            <button id="logoutBtn" class="btn btn-secondary">Logout</button>
          </div>
        </div>

        <div class="projects-actions">
          <h2>Your Projects</h2>
          <button id="newProjectBtn" class="btn btn-primary">+ New Project</button>
        </div>

        <div id="projectsList" class="projects-grid">
          <div class="loading">Loading projects...</div>
        </div>

        <!-- New project modal -->
        <div id="newProjectModal" class="modal" style="display:none;">
          <div class="modal-content" style="max-width:400px;">
            <h3>New Project</h3>
            <div class="form-group">
              <label for="newProjectName">Project Name</label>
              <input type="text" id="newProjectName" placeholder="My Project" required>
            </div>
            <div class="form-group">
              <label for="newProjectDesc">Description (optional)</label>
              <textarea id="newProjectDesc" placeholder="Project description"></textarea>
            </div>
            <div class="modal-actions">
              <button id="createProjectBtn" class="btn btn-primary">Create</button>
              <button id="cancelProjectBtn" class="btn btn-secondary">Cancel</button>
            </div>
          </div>
        </div>

        <!-- Share modal -->
        <div id="shareModal" class="modal" style="display:none;">
          <div class="modal-content" style="max-width:450px;">
            <h3>Share Project</h3>
            <div id="shareMembers" class="share-members-list"></div>
            <div class="share-invite">
              <div class="form-group">
                <label for="shareEmail">Invite by email</label>
                <input type="email" id="shareEmail" placeholder="user@example.com">
              </div>
              <div class="form-group">
                <label for="shareRole">Role</label>
                <select id="shareRole">
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div id="shareError" class="auth-error" style="display:none;"></div>
              <button id="inviteBtn" class="btn btn-primary">Invite</button>
            </div>
            <div class="modal-actions">
              <button id="closeShareBtn" class="btn btn-secondary">Close</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const userEl = document.getElementById('userDisplayName');
    if (cmState.user) userEl.textContent = cmState.user.display_name;

    document.getElementById('logoutBtn').addEventListener('click', async () => {
      await cmApi.logout();
      cmSocket.disconnect();
      cmState.setUser(null);
      cmNavigate('login');
    });

    // New project modal
    const newProjectModal = document.getElementById('newProjectModal');
    document.getElementById('newProjectBtn').addEventListener('click', () => {
      newProjectModal.style.display = 'flex';
      document.getElementById('newProjectName').focus();
    });
    document.getElementById('cancelProjectBtn').addEventListener('click', () => {
      newProjectModal.style.display = 'none';
    });
    document.getElementById('createProjectBtn').addEventListener('click', async () => {
      const name = document.getElementById('newProjectName').value.trim();
      if (!name) return;
      const desc = document.getElementById('newProjectDesc').value.trim();
      await cmApi.createProject(name, desc);
      newProjectModal.style.display = 'none';
      loadProjects();
    });

    // Share modal
    let shareProjectId = null;
    const shareModal = document.getElementById('shareModal');
    document.getElementById('closeShareBtn').addEventListener('click', () => {
      shareModal.style.display = 'none';
    });
    document.getElementById('inviteBtn').addEventListener('click', async () => {
      const email = document.getElementById('shareEmail').value.trim();
      const role = document.getElementById('shareRole').value;
      const errorEl = document.getElementById('shareError');
      errorEl.style.display = 'none';
      if (!email || !shareProjectId) return;
      try {
        await cmApi.addMember(shareProjectId, email, role);
        document.getElementById('shareEmail').value = '';
        loadShareMembers(shareProjectId);
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
      }
    });

    async function loadShareMembers(projectId) {
      const data = await cmApi.listMembers(projectId);
      const el = document.getElementById('shareMembers');
      el.innerHTML = data.members.map((m) => `
        <div class="share-member">
          <span>${m.display_name} (${m.email})</span>
          <span class="member-role">${m.role}</span>
        </div>
      `).join('');
    }

    async function loadProjects() {
      const data = await cmApi.listProjects();
      const el = document.getElementById('projectsList');
      if (!data.projects.length) {
        el.innerHTML = '<p class="no-projects">No projects yet. Create your first one.</p>';
        return;
      }
      el.innerHTML = data.projects.map((p) => `
        <div class="project-card" data-id="${p.id}">
          <div class="project-card-header">
            <h3>${escapeHtml(p.name)}</h3>
            <span class="project-role">${p.role}</span>
          </div>
          <p class="project-desc">${escapeHtml(p.description || '')}</p>
          <div class="project-card-footer">
            <span class="project-date">${new Date(p.updated_at).toLocaleDateString()}</span>
            <div class="project-card-actions">
              <button class="btn btn-secondary share-project-btn" data-id="${p.id}">Share</button>
              <button class="btn btn-primary open-project-btn" data-id="${p.id}">Open</button>
              ${p.role === 'owner' ? `<button class="btn btn-danger delete-project-btn" data-id="${p.id}" data-name="${escapeHtml(p.name)}">Delete</button>` : ''}
            </div>
          </div>
        </div>
      `).join('');

      // Event delegation
      el.querySelectorAll('.open-project-btn').forEach((btn) => {
        btn.addEventListener('click', () => cmNavigate(`projects/${btn.dataset.id}`));
      });
      el.querySelectorAll('.share-project-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          shareProjectId = btn.dataset.id;
          shareModal.style.display = 'flex';
          loadShareMembers(shareProjectId);
        });
      });
      el.querySelectorAll('.delete-project-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!confirm(`Delete project "${btn.dataset.name}"?`)) return;
          await cmApi.deleteProject(btn.dataset.id);
          loadProjects();
        });
      });
    }

    loadProjects();

    return { destroy() {} };
  },
};

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

window.ProjectsView = ProjectsView;
