// Socket.IO client manager
class SocketManager {
  constructor() {
    this.socket = null;
    this.projectId = null;
    this.listeners = {};
    this.connected = false;
  }

  connect() {
    if (this.socket) return;
    this.socket = io({ withCredentials: true });

    this.socket.on('connect', () => {
      this.connected = true;
      console.log('Socket connected');
      // Rejoin project if we had one
      if (this.projectId) {
        this.socket.emit('join-project', { projectId: this.projectId });
      }
      this.emit('_connected');
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      console.log('Socket disconnected');
      this.emit('_disconnected');
    });

    this.socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });

    // Forward all server events to listeners
    const events = [
      'project:state',
      'cue:created', 'cue:updated', 'cue:deleted', 'cue:moved',
      'track:created', 'track:updated', 'track:deleted',
      'settings:updated',
      'member:joined', 'member:left',
      'cursor:update',
      'error',
    ];
    events.forEach((event) => {
      this.socket.on(event, (data) => this.emit(event, data));
    });
  }

  joinProject(projectId) {
    this.projectId = projectId;
    if (this.socket && this.connected) {
      this.socket.emit('join-project', { projectId });
    }
  }

  leaveProject() {
    if (this.socket && this.projectId) {
      this.socket.emit('leave-project');
    }
    this.projectId = null;
  }

  // Send events to server
  send(event, data) {
    if (this.socket && this.connected) {
      this.socket.emit(event, data);
    }
  }

  // Local event emitter
  on(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }

  off(event, fn) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((f) => f !== fn);
  }

  emit(event, data) {
    (this.listeners[event] || []).forEach((fn) => fn(data));
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
    this.projectId = null;
  }
}

window.SocketManager = SocketManager;
