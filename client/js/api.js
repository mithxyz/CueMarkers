// HTTP fetch wrapper for CueMarkers API
class ApiClient {
  constructor(baseUrl = '/api/v1') {
    this.baseUrl = baseUrl;
  }

  async request(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    };
    if (body !== undefined) opts.body = JSON.stringify(body);

    const res = await fetch(`${this.baseUrl}${path}`, opts);
    if (res.status === 204) return null;

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const err = new Error((data && data.error) || `HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  // Auth
  register(email, password, display_name) {
    return this.request('POST', '/auth/register', { email, password, display_name });
  }
  login(email, password) {
    return this.request('POST', '/auth/login', { email, password });
  }
  logout() {
    return this.request('POST', '/auth/logout');
  }
  me() {
    return this.request('GET', '/auth/me');
  }

  // Projects
  listProjects() {
    return this.request('GET', '/projects');
  }
  createProject(name, description) {
    return this.request('POST', '/projects', { name, description });
  }
  getProject(id) {
    return this.request('GET', `/projects/${id}`);
  }
  updateProject(id, data) {
    return this.request('PATCH', `/projects/${id}`, data);
  }
  deleteProject(id) {
    return this.request('DELETE', `/projects/${id}`);
  }

  // Members
  listMembers(projectId) {
    return this.request('GET', `/projects/${projectId}/members`);
  }
  addMember(projectId, email, role) {
    return this.request('POST', `/projects/${projectId}/members`, { email, role });
  }
  updateMember(projectId, memberId, role) {
    return this.request('PATCH', `/projects/${projectId}/members/${memberId}`, { role });
  }
  removeMember(projectId, memberId) {
    return this.request('DELETE', `/projects/${projectId}/members/${memberId}`);
  }

  // Tracks
  listTracks(projectId) {
    return this.request('GET', `/projects/${projectId}/tracks`);
  }
  createTrack(projectId, name, media_type) {
    return this.request('POST', `/projects/${projectId}/tracks`, { name, media_type });
  }
  getTrack(projectId, trackId) {
    return this.request('GET', `/projects/${projectId}/tracks/${trackId}`);
  }
  updateTrack(projectId, trackId, data) {
    return this.request('PATCH', `/projects/${projectId}/tracks/${trackId}`, data);
  }
  deleteTrack(projectId, trackId) {
    return this.request('DELETE', `/projects/${projectId}/tracks/${trackId}`);
  }
  async uploadMedia(projectId, trackId, file) {
    const form = new FormData();
    form.append('media', file);
    const res = await fetch(`${this.baseUrl}/projects/${projectId}/tracks/${trackId}/upload`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && data.error) || `Upload failed: ${res.status}`);
    return data;
  }
  getMediaUrl(projectId, trackId) {
    return this.request('GET', `/projects/${projectId}/tracks/${trackId}/media`);
  }

  // Cues
  listCues(projectId, trackId) {
    return this.request('GET', `/projects/${projectId}/tracks/${trackId}/cues`);
  }
  createCue(projectId, trackId, data) {
    return this.request('POST', `/projects/${projectId}/tracks/${trackId}/cues`, data);
  }
  updateCue(projectId, trackId, cueId, data) {
    return this.request('PATCH', `/projects/${projectId}/tracks/${trackId}/cues/${cueId}`, data);
  }
  deleteCue(projectId, trackId, cueId) {
    return this.request('DELETE', `/projects/${projectId}/tracks/${trackId}/cues/${cueId}`);
  }
  batchImportCues(projectId, trackId, cues) {
    return this.request('POST', `/projects/${projectId}/tracks/${trackId}/cues/batch`, { cues });
  }

  // Settings
  getSettings(projectId) {
    return this.request('GET', `/projects/${projectId}/settings`);
  }
  updateSettings(projectId, settings) {
    return this.request('PATCH', `/projects/${projectId}/settings`, { settings });
  }

  // Export (returns a URL to download)
  getExportUrl(projectId, format) {
    return `${this.baseUrl}/projects/${projectId}/export/${format}`;
  }
}

window.ApiClient = ApiClient;
