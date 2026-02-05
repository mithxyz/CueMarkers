// Client state management
class AppState {
  constructor() {
    this.user = null;
    this.currentProject = null;
    this.currentRole = null;
    this.tracks = [];
    this.activeTrackId = null;
    this.cuesByTrack = {}; // trackId -> cue[]
    this.settings = {};
    this.members = [];
    this.onlineUsers = [];
    this.listeners = {};
  }

  setUser(user) {
    this.user = user;
    this.notify('user');
  }

  setProject(project, role) {
    this.currentProject = project;
    this.currentRole = role;
    this.notify('project');
  }

  setTracks(tracks) {
    this.tracks = tracks || [];
    if (this.tracks.length && !this.activeTrackId) {
      this.activeTrackId = this.tracks[0].id;
    }
    this.notify('tracks');
  }

  setActiveTrack(trackId) {
    this.activeTrackId = trackId;
    this.notify('activeTrack');
  }

  setCues(trackId, cues) {
    this.cuesByTrack[trackId] = (cues || []).sort((a, b) => a.time - b.time);
    this.notify('cues');
  }

  getActiveCues() {
    return this.cuesByTrack[this.activeTrackId] || [];
  }

  getActiveTrack() {
    return this.tracks.find((t) => t.id === this.activeTrackId) || null;
  }

  addCue(cue) {
    const trackId = cue.track_id;
    if (!this.cuesByTrack[trackId]) this.cuesByTrack[trackId] = [];
    // Avoid duplicates
    const idx = this.cuesByTrack[trackId].findIndex((c) => c.id === cue.id);
    if (idx >= 0) {
      this.cuesByTrack[trackId][idx] = cue;
    } else {
      this.cuesByTrack[trackId].push(cue);
    }
    this.cuesByTrack[trackId].sort((a, b) => a.time - b.time);
    this.notify('cues');
  }

  updateCue(cue) {
    this.addCue(cue); // same logic
  }

  removeCue(cueId) {
    for (const trackId of Object.keys(this.cuesByTrack)) {
      this.cuesByTrack[trackId] = this.cuesByTrack[trackId].filter((c) => c.id !== cueId);
    }
    this.notify('cues');
  }

  addTrack(track) {
    const idx = this.tracks.findIndex((t) => t.id === track.id);
    if (idx >= 0) {
      this.tracks[idx] = track;
    } else {
      this.tracks.push(track);
    }
    this.tracks.sort((a, b) => a.sort_order - b.sort_order);
    this.notify('tracks');
  }

  updateTrack(track) {
    this.addTrack(track);
  }

  removeTrack(trackId) {
    this.tracks = this.tracks.filter((t) => t.id !== trackId);
    delete this.cuesByTrack[trackId];
    if (this.activeTrackId === trackId) {
      this.activeTrackId = this.tracks.length ? this.tracks[0].id : null;
    }
    this.notify('tracks');
  }

  setSettings(settings) {
    this.settings = settings || {};
    this.notify('settings');
  }

  setMembers(members) {
    this.members = members || [];
    this.notify('members');
  }

  setOnlineUsers(users) {
    this.onlineUsers = users || [];
    this.notify('onlineUsers');
  }

  canEdit() {
    return this.currentRole === 'owner' || this.currentRole === 'editor';
  }

  isOwner() {
    return this.currentRole === 'owner';
  }

  reset() {
    this.currentProject = null;
    this.currentRole = null;
    this.tracks = [];
    this.activeTrackId = null;
    this.cuesByTrack = {};
    this.settings = {};
    this.members = [];
    this.onlineUsers = [];
  }

  // Simple event emitter
  on(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }

  off(event, fn) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((f) => f !== fn);
  }

  notify(event) {
    (this.listeners[event] || []).forEach((fn) => fn());
  }
}

window.AppState = AppState;
