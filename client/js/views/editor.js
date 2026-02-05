// Editor view: main project editor wrapping MusicCueApp
const EditorView = {
  _app: null,
  _saveTimer: null,
  _cursorTimer: null,

  render(container, projectId) {
    const state = cmState;
    const api = cmApi;
    const sock = cmSocket;

    container.innerHTML = `
      <div class="editor-page">
        <div class="editor-topbar">
          <button id="backToProjects" class="btn btn-secondary">< Projects</button>
          <span id="editorProjectName" class="editor-project-name"></span>
          <div class="editor-status">
            <span id="saveStatus" class="save-status">Loading...</span>
            <span id="onlineCount" class="online-count" title="Online users">0 online</span>
          </div>
          <button id="editorShareBtn" class="btn btn-secondary">Share</button>
        </div>

        <!-- Track tabs -->
        <div class="track-tabs" id="trackTabs">
          <div class="track-tabs-list" id="trackTabsList"></div>
          <button id="addTrackBtn" class="btn btn-secondary track-add-btn">+ Track</button>
        </div>

        <!-- Toast container for notifications -->
        <div id="toastContainer" class="toast-container"></div>

        <!-- Remote cursors overlay info -->
        <div id="remoteCursors" class="remote-cursors"></div>

        <!-- Original editor HTML structure will be injected here -->
        <div id="editorContent"></div>
      </div>

      <!-- Share modal -->
      <div id="editorShareModal" class="modal" style="display:none;">
        <div class="modal-content" style="max-width:450px;">
          <h3>Share Project</h3>
          <div id="editorShareMembers" class="share-members-list"></div>
          <div class="share-invite">
            <div class="form-group">
              <label for="editorShareEmail">Invite by email</label>
              <input type="email" id="editorShareEmail" placeholder="user@example.com">
            </div>
            <div class="form-group">
              <label for="editorShareRole">Role</label>
              <select id="editorShareRole">
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div id="editorShareError" class="auth-error" style="display:none;"></div>
            <button id="editorInviteBtn" class="btn btn-primary">Invite</button>
          </div>
          <div class="modal-actions">
            <button id="editorCloseShareBtn" class="btn btn-secondary">Close</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('backToProjects').addEventListener('click', () => {
      sock.leaveProject();
      state.reset();
      cmNavigate('projects');
    });

    // Share modal in editor
    const shareModal = document.getElementById('editorShareModal');
    document.getElementById('editorShareBtn').addEventListener('click', () => {
      shareModal.style.display = 'flex';
      loadEditorShareMembers();
    });
    document.getElementById('editorCloseShareBtn').addEventListener('click', () => {
      shareModal.style.display = 'none';
    });
    document.getElementById('editorInviteBtn').addEventListener('click', async () => {
      const email = document.getElementById('editorShareEmail').value.trim();
      const role = document.getElementById('editorShareRole').value;
      const errorEl = document.getElementById('editorShareError');
      errorEl.style.display = 'none';
      if (!email) return;
      try {
        await api.addMember(projectId, email, role);
        document.getElementById('editorShareEmail').value = '';
        loadEditorShareMembers();
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
      }
    });

    async function loadEditorShareMembers() {
      const data = await api.listMembers(projectId);
      document.getElementById('editorShareMembers').innerHTML = data.members.map((m) => `
        <div class="share-member">
          <span>${m.display_name} (${m.email})</span>
          <span class="member-role">${m.role}</span>
        </div>
      `).join('');
    }

    // Track tabs
    document.getElementById('addTrackBtn').addEventListener('click', async () => {
      if (!state.canEdit()) return;
      const name = prompt('Track name:');
      if (!name || !name.trim()) return;
      sock.send('track:create', { name: name.trim() });
    });

    function renderTrackTabs() {
      const list = document.getElementById('trackTabsList');
      if (!list) return;
      list.innerHTML = state.tracks.map((t) => `
        <button class="track-tab ${t.id === state.activeTrackId ? 'active' : ''}" data-track-id="${t.id}">
          ${t.name}
        </button>
      `).join('');
      list.querySelectorAll('.track-tab').forEach((btn) => {
        btn.addEventListener('click', () => {
          state.setActiveTrack(btn.dataset.trackId);
          renderTrackTabs();
          loadTrackIntoEditor();
        });
      });
    }

    // ── Load project ─────────────────────────────────────
    async function loadProject() {
      try {
        const projData = await api.getProject(projectId);
        state.setProject(projData.project, projData.role);
        document.getElementById('editorProjectName').textContent = projData.project.name;

        // Join socket room
        sock.joinProject(projectId);

        // Load tracks
        const trackData = await api.listTracks(projectId);
        state.setTracks(trackData.tracks);

        // If no tracks, create a default one
        if (!state.tracks.length) {
          if (state.canEdit()) {
            const newTrack = await api.createTrack(projectId, 'Track 1', 'audio');
            state.setTracks([newTrack.track]);
          }
        }

        // Load settings
        const settingsData = await api.getSettings(projectId);
        state.setSettings(settingsData.settings);

        renderTrackTabs();

        // Initialize the editor content with the original MusicCueApp structure
        initEditorContent();

        // Load cues for active track
        await loadTrackIntoEditor();

        setSaveStatus('Saved');
      } catch (err) {
        console.error('Failed to load project:', err);
        document.getElementById('editorContent').innerHTML = `
          <div class="editor-error">
            <p>Failed to load project: ${err.message}</p>
            <button class="btn btn-primary" onclick="cmNavigate('projects')">Back to Projects</button>
          </div>
        `;
      }
    }

    function initEditorContent() {
      const content = document.getElementById('editorContent');
      content.innerHTML = `
        <div class="container editor-container">
          <div class="upload-section" id="uploadSection">
            <div class="upload-area" id="uploadArea">
              <div class="upload-content">
                <div class="upload-icon">📁</div>
                <h3>Upload Media File</h3>
                <p id="uploadText">Drag and drop your media file here or click to browse</p>
                <input type="file" id="audioFile" accept="audio/*,video/*">
                <button class="upload-btn" id="uploadBtn">Choose File</button>
              </div>
            </div>
          </div>

          <div class="player-section" id="playerSection" style="display: none;">
            <div class="audio-controls">
              <audio id="audioPlayer" controls></audio>
              <video id="videoPlayer" controls style="display:none; max-width:100%; height:360px; background:#000;"></video>
              <div class="time-display">
                <span id="currentTime">0:00</span> / <span id="duration">0:00</span>
              </div>
            </div>
            <div class="cue-controls">
              <button id="addCueBtn" class="btn btn-primary">Add Cue at Current Time</button>
              <button id="playFromStart" class="btn btn-secondary">Play from Start</button>
              <div class="export-dropdown" id="exportDropdown">
                <button id="exportBtn" class="btn btn-success">Export ▼</button>
                <div class="export-menu" id="exportMenu" style="display:none;">
                  <button class="export-item" data-type="json">Export JSON</button>
                  <button class="export-item" data-type="csv">CuePoints - CSV</button>
                  <button class="export-item" data-type="md">Export Markdown</button>
                  <button class="export-item" data-type="sheet">Spreadsheet - CSV</button>
                  <button class="export-item" data-type="ma3">MA3 Macro (XML)</button>
                  <button class="export-item" data-type="zip">Export Bundle (.zip)</button>
                </div>
              </div>
              <button id="importCues" class="btn btn-secondary">Import</button>
              <div class="project-badge" id="projectBadge" style="display:none;">
                <span class="badge-id" id="badgeId"></span>
                <span class="badge-sep">•</span>
                <span class="badge-track" id="badgeTrack"></span>
              </div>
            </div>
          </div>

          <div class="main-content" id="mainContent" style="display: none;">
            <div class="left-column">
              <div class="waveform-section" id="waveformSection">
                <div class="waveform-instructions">
                  <p><strong>Cue Markers:</strong> Press M to add a new cue • Right-click to add a cue on the waveform</p>
                  <p><strong>Waveform Controls:</strong> Left-click to jump to time • Drag markers to move them</p>
                  <details class="controls-help">
                    <summary>Show Controls Guide</summary>
                    <div class="controls-grid">
                      <div>
                        <h4>Mouse</h4>
                        <ul>
                          <li>Left click: Jump to time</li>
                          <li>Right click: Add cue</li>
                          <li>Drag background: Pan</li>
                          <li>Drag cue: Move cue</li>
                          <li>Mouse wheel: Zoom in/out</li>
                        </ul>
                      </div>
                      <div>
                        <h4>Keyboard</h4>
                        <ul>
                          <li>Space or K: Play/Pause</li>
                          <li>Arrow keys: Seek</li>
                          <li>M: Add cue at current time</li>
                          <li>[ / ]: Jump prev/next cue</li>
                        </ul>
                      </div>
                    </div>
                  </details>
                </div>
                <div class="zoom-controls">
                  <button id="zoomOut" class="btn btn-secondary">-</button>
                  <span id="zoomLevel">100%</span>
                  <button id="zoomIn" class="btn btn-secondary">+</button>
                  <button id="zoomReset" class="btn btn-secondary">Reset</button>
                  <span class="zoom-info">Mouse wheel to zoom • Drag to pan</span>
                </div>
                <div class="waveform-container">
                  <canvas id="waveformCanvas"></canvas>
                  <div class="cue-markers" id="cueMarkers"></div>
                  <div class="time-popup" id="timePopup" style="display: none;"></div>
                </div>
              </div>
            </div>
            <div class="right-column">
              <div class="cues-panel" id="cuesPanel">
                <div class="panel-header">
                  <h3>Cue Markers</h3>
                  <button id="settingsBtn" class="btn btn-secondary" title="Settings">Settings</button>
                </div>
                <div class="cues-list" id="cuesList"></div>
              </div>
              <div class="settings-panel" id="settingsPanel" style="display: none;">
                <div class="panel-header">
                  <h3>Settings</h3>
                  <button id="closeSettingsBtn" class="btn btn-secondary" title="Close">X</button>
                </div>
                <div class="settings-content" id="settingsContent"></div>
              </div>
            </div>
          </div>

          <!-- Quick Cue Popup -->
          <div class="quick-cue-popup" id="quickCuePopup" style="display: none;">
            <div class="quick-cue-content">
              <h4>New Cue at <span id="quickCueTime"></span></h4>
              <input type="text" id="quickCueName" placeholder="Enter cue title..." autofocus>
              <div class="quick-cue-row" id="quickCueFadeRow">
                <input type="number" id="quickCueFade" placeholder="Fade (s)" min="0" step="0.1">
              </div>
              <div class="quick-cue-row" id="quickCueMarkerColorRow">
                <label style="display:block; font-size:0.9rem; margin-bottom:4px;">Marker Color</label>
                <input type="hidden" id="quickCueMarkerColor" value="#ff4444">
                <div class="color-dropdown" id="quickCueColorDropdown" data-target-input="quickCueMarkerColor">
                  <button type="button" class="color-dropdown-toggle">
                    <span class="color-swatch" style="background:#ff4444"></span>
                    <span class="color-label">Red</span>
                  </button>
                  <div class="color-dropdown-menu">
                    <div class="color-item" data-color="#ff4444" data-label="Red"><span style="background:#ff4444"></span>Red</div>
                    <div class="color-item" data-color="#dc2626" data-label="Crimson"><span style="background:#dc2626"></span>Crimson</div>
                    <div class="color-item" data-color="#f59e0b" data-label="Orange"><span style="background:#f59e0b"></span>Orange</div>
                    <div class="color-item" data-color="#fde047" data-label="Yellow"><span style="background:#fde047"></span>Yellow</div>
                    <div class="color-item" data-color="#22c55e" data-label="Green"><span style="background:#22c55e"></span>Green</div>
                    <div class="color-item" data-color="#84cc16" data-label="Lime"><span style="background:#84cc16"></span>Lime</div>
                    <div class="color-item" data-color="#06b6d4" data-label="Cyan"><span style="background:#06b6d4"></span>Cyan</div>
                    <div class="color-item" data-color="#2563eb" data-label="Blue"><span style="background:#2563eb"></span>Blue</div>
                    <div class="color-item" data-color="#1e3a8a" data-label="Navy"><span style="background:#1e3a8a"></span>Navy</div>
                    <div class="color-item" data-color="#a855f7" data-label="Purple"><span style="background:#a855f7"></span>Purple</div>
                    <div class="color-item" data-color="#ec4899" data-label="Pink"><span style="background:#ec4899"></span>Pink</div>
                    <div class="color-item" data-color="#9ca3af" data-label="Gray"><span style="background:#9ca3af"></span>Gray</div>
                  </div>
                </div>
              </div>
              <div class="quick-cue-row">
                <textarea id="quickCueDescription" placeholder="Optional description..."></textarea>
              </div>
              <div class="quick-cue-actions">
                <button id="quickSave" class="btn btn-primary">Save</button>
                <button id="quickCancel" class="btn btn-secondary">Cancel</button>
              </div>
            </div>
          </div>

          <!-- Edit modal -->
          <div class="modal" id="cueModal" style="display: none;">
            <div class="modal-content">
              <h3>Edit Cue Point</h3>
              <div class="form-group">
                <label for="cueNumber">Cue #:</label>
                <input type="text" id="cueNumber" readonly>
              </div>
              <div class="form-group">
                <label for="cueName">Title:</label>
                <input type="text" id="cueName" placeholder="Enter cue name">
              </div>
              <div class="form-group">
                <label for="cueTime">Time:</label>
                <input type="text" id="cueTime" readonly>
              </div>
              <div class="form-group" id="cueFadeGroup">
                <label for="cueFade">Fade Time (s):</label>
                <input type="number" id="cueFade" placeholder="0" min="0" step="0.1">
              </div>
              <div class="form-group" id="cueMarkerColorGroup">
                <label for="cueMarkerColor">Marker Color:</label>
                <input type="hidden" id="cueMarkerColor" value="#ff4444">
                <div class="color-dropdown" id="cueColorDropdown" data-target-input="cueMarkerColor">
                  <button type="button" class="color-dropdown-toggle">
                    <span class="color-swatch" id="cueMarkerSwatch" style="background:#ff4444"></span>
                    <span class="color-label">Red</span>
                  </button>
                  <div class="color-dropdown-menu">
                    <div class="color-item" data-color="#ff4444" data-label="Red"><span style="background:#ff4444"></span>Red</div>
                    <div class="color-item" data-color="#dc2626" data-label="Crimson"><span style="background:#dc2626"></span>Crimson</div>
                    <div class="color-item" data-color="#f59e0b" data-label="Orange"><span style="background:#f59e0b"></span>Orange</div>
                    <div class="color-item" data-color="#fde047" data-label="Yellow"><span style="background:#fde047"></span>Yellow</div>
                    <div class="color-item" data-color="#22c55e" data-label="Green"><span style="background:#22c55e"></span>Green</div>
                    <div class="color-item" data-color="#84cc16" data-label="Lime"><span style="background:#84cc16"></span>Lime</div>
                    <div class="color-item" data-color="#06b6d4" data-label="Cyan"><span style="background:#06b6d4"></span>Cyan</div>
                    <div class="color-item" data-color="#2563eb" data-label="Blue"><span style="background:#2563eb"></span>Blue</div>
                    <div class="color-item" data-color="#1e3a8a" data-label="Navy"><span style="background:#1e3a8a"></span>Navy</div>
                    <div class="color-item" data-color="#a855f7" data-label="Purple"><span style="background:#a855f7"></span>Purple</div>
                    <div class="color-item" data-color="#ec4899" data-label="Pink"><span style="background:#ec4899"></span>Pink</div>
                    <div class="color-item" data-color="#9ca3af" data-label="Gray"><span style="background:#9ca3af"></span>Gray</div>
                  </div>
                </div>
              </div>
              <div class="form-group">
                <label for="cueDescription">Description:</label>
                <textarea id="cueDescription" placeholder="Optional description"></textarea>
              </div>
              <div class="modal-actions">
                <button id="saveCue" class="btn btn-primary">Save</button>
                <button id="deleteCue" class="btn btn-danger">Delete</button>
                <button id="cancelCue" class="btn btn-secondary">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      `;

      // Override the MusicCueApp to use server-backed operations
      setupServerBackedApp();
    }

    function setupServerBackedApp() {
      // Create MusicCueApp instance (from script.js)
      if (typeof MusicCueApp === 'undefined') {
        console.error('MusicCueApp class not found. Make sure script.js is loaded.');
        return;
      }

      // Temporarily disable the auto-init from script.js
      const editorApp = new MusicCueApp();
      EditorView._app = editorApp;
      window.app = editorApp;

      // Override cue mutations to use socket
      const origSaveQuickCue = editorApp.saveQuickCue.bind(editorApp);
      editorApp.saveQuickCue = function () {
        const nameInput = document.getElementById('quickCueName');
        const fadeInput = document.getElementById('quickCueFade');
        const descInput = document.getElementById('quickCueDescription');
        const qcHidden = document.getElementById('quickCueMarkerColor');
        let time = this.pendingCueTime;
        if (typeof time !== 'number' || !Number.isFinite(time)) {
          time = Number(this.audioElement?.currentTime || 0);
        }
        const name = ((nameInput?.value) || '').trim() || 'Cue';
        let fade = this.settings.useFadeTimes ? Number(fadeInput?.value || 0) : 0;
        if (!Number.isFinite(fade) || fade < 0) fade = 0;
        const description = ((descInput?.value) || '').trim();
        const marker_color = this.settings.useMarkerColor ? (qcHidden?.value || '#ff4444') : '#ff4444';

        if (state.activeTrackId) {
          sock.send('cue:create', {
            track_id: state.activeTrackId,
            name, time, description, fade, marker_color,
          });
        }

        this.hideQuickCuePopup();
        this.pendingCueTime = null;
        setSaveStatus('Saving...');
      };

      // Override file upload to go to S3
      editorApp.loadMediaFile = async function (file) {
        if (!state.activeTrackId || !state.canEdit()) return;
        try {
          setSaveStatus('Uploading...');
          const result = await api.uploadMedia(projectId, state.activeTrackId, file);
          const mediaData = await api.getMediaUrl(projectId, state.activeTrackId);

          const isVideo = result.track.media_type === 'video';
          this.useVideo = isVideo;
          this.uploadedFile = file;

          if (isVideo) {
            if (this.videoElement) { this.videoElement.src = mediaData.url; this.videoElement.style.display = ''; }
            if (this.audioElement) { this.audioElement.src = ''; this.audioElement.style.display = 'none'; }
          } else {
            if (this.audioElement) { this.audioElement.crossOrigin = 'anonymous'; this.audioElement.src = mediaData.url; this.audioElement.style.display = ''; }
            if (this.videoElement) { this.videoElement.src = ''; this.videoElement.style.display = 'none'; }
          }

          // Decode for waveform
          try {
            const arrayBuffer = await file.arrayBuffer();
            if (!this.audioContext) this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (this.audioContext.state === 'suspended') { try { await this.audioContext.resume(); } catch (e) {} }
            this.audioBuffer = await new Promise((resolve, reject) => {
              this.audioContext.decodeAudioData(arrayBuffer.slice(0), resolve, reject);
            });
            this.generateWaveformData();

            // Update track duration
            await api.updateTrack(projectId, state.activeTrackId, { media_duration: this.audioBuffer.duration });
          } catch (e) {
            console.warn('Could not decode audio for waveform:', e);
            this.audioBuffer = { duration: 0 };
            this.waveformData = null;
          }

          document.getElementById('playerSection').style.display = 'block';
          document.getElementById('mainContent').style.display = 'flex';
          document.getElementById('uploadSection').style.display = 'none';
          setTimeout(() => { this.resizeCanvas(); this.drawWaveform(); }, 100);
          setSaveStatus('Saved');
        } catch (err) {
          console.error('Upload failed:', err);
          alert('Upload failed: ' + err.message);
          setSaveStatus('Error');
        }
      };

      // Override save/load settings to use server
      editorApp.loadSettings = function () {
        this.settings = { ...this.settings, ...state.settings };
        this.applySettings();
      };
      editorApp.saveSettings = function () {
        sock.send('settings:update', { settings: this.settings });
        setSaveStatus('Saving...');
      };

      // Override updateCueName for server sync
      const origUpdateCueName = editorApp.updateCueName.bind(editorApp);
      editorApp.updateCueName = function (cueId, newName) {
        origUpdateCueName(cueId, newName);
        const cue = this.cues.find((c) => c.id === cueId);
        if (cue) {
          sock.send('cue:update', { id: cueId, name: cue.name });
          setSaveStatus('Saving...');
        }
      };

      const origUpdateCueDesc = editorApp.updateCueDescription.bind(editorApp);
      editorApp.updateCueDescription = function (cueId, newDesc) {
        origUpdateCueDesc(cueId, newDesc);
        sock.send('cue:update', { id: cueId, description: newDesc || '' });
        setSaveStatus('Saving...');
      };

      // Override saveCue (modal save)
      const origSaveCue = editorApp.saveCue.bind(editorApp);
      editorApp.saveCue = function () {
        if (!this.currentCueId) return;
        const cue = this.cues.find((c) => c.id === this.currentCueId);
        if (cue) {
          cue.name = document.getElementById('cueName').value || 'Cue';
          cue.description = document.getElementById('cueDescription').value;
          cue.fade = Math.max(0, Number(document.getElementById('cueFade').value || 0));
          const mcInput = document.getElementById('cueMarkerColor');
          cue.markerColor = this.settings.useMarkerColor ? (mcInput?.value || '#ff4444') : '#ff4444';
          this.renumberCues();
          this.updateCuesList();
          this.drawWaveform();

          sock.send('cue:update', {
            id: cue.id,
            name: cue.name,
            description: cue.description,
            fade: cue.fade,
            marker_color: cue.markerColor,
          });
          setSaveStatus('Saving...');
        }
        this.closeModal();
      };

      // Override deleteCue
      const origDeleteCue = editorApp.deleteCue.bind(editorApp);
      editorApp.deleteCue = function (cueIdOrEvent) {
        const id = (typeof cueIdOrEvent === 'number' || typeof cueIdOrEvent === 'string') ? cueIdOrEvent : this.currentCueId;
        if (id == null) { this.closeModal(); return; }
        this.cues = this.cues.filter((c) => c.id !== id);
        this.renumberCues();
        this.updateCuesList();
        this.drawWaveform();
        this.closeModal();
        sock.send('cue:delete', { id });
        setSaveStatus('Saving...');
      };

      // Override marker drag end to sync time
      const origMouseUp = editorApp.onWaveformMouseUp.bind(editorApp);
      editorApp.onWaveformMouseUp = function (e) {
        if (this.draggedMarker) {
          sock.send('cue:move', { id: this.draggedMarker.id, time: this.draggedMarker.time });
          setSaveStatus('Saving...');
          delete this.draggedMarker.originalTime;
        }
        this.isDragging = false;
        this.draggedMarker = null;
        this.canvas.style.cursor = 'crosshair';
        this.hideTimePopup();
      };

      // Override export to use server endpoints
      editorApp.exportCuesJson = function () {
        window.open(api.getExportUrl(projectId, 'json'), '_blank');
      };
      editorApp.exportCuesCsv = function () {
        window.open(api.getExportUrl(projectId, 'csv'), '_blank');
      };
      editorApp.exportCuesSpreadsheet = function () {
        window.open(api.getExportUrl(projectId, 'cuepoints-csv'), '_blank');
      };
      editorApp.exportCuesMarkdown = function () {
        window.open(api.getExportUrl(projectId, 'markdown'), '_blank');
      };
      editorApp.exportMa3MacroXml = function () {
        window.open(api.getExportUrl(projectId, 'ma3-xml'), '_blank');
      };
      editorApp.exportBundleZip = function () {
        window.open(api.getExportUrl(projectId, 'zip'), '_blank');
      };
    }

    async function loadTrackIntoEditor() {
      const editorApp = EditorView._app;
      if (!editorApp || !state.activeTrackId) return;

      // Load cues for active track
      try {
        const cueData = await api.listCues(projectId, state.activeTrackId);
        const cues = (cueData.cues || []).map((c) => ({
          id: c.id,
          name: c.name,
          time: c.time,
          description: c.description || '',
          fade: c.fade || 0,
          markerColor: c.marker_color || '#ff4444',
        }));
        state.setCues(state.activeTrackId, cueData.cues);
        editorApp.cues = cues;
        editorApp.renumberCues();
        editorApp.updateCuesList();

        // Load media for track
        const track = state.getActiveTrack();
        if (track && track.media_s3_key) {
          try {
            const mediaData = await api.getMediaUrl(projectId, state.activeTrackId);
            const isVideo = track.media_type === 'video';
            editorApp.useVideo = isVideo;

            if (isVideo) {
              if (editorApp.videoElement) { editorApp.videoElement.src = mediaData.url; editorApp.videoElement.style.display = ''; }
              if (editorApp.audioElement) { editorApp.audioElement.src = ''; editorApp.audioElement.style.display = 'none'; }
            } else {
              if (editorApp.audioElement) { editorApp.audioElement.crossOrigin = 'anonymous'; editorApp.audioElement.src = mediaData.url; editorApp.audioElement.style.display = ''; }
              if (editorApp.videoElement) { editorApp.videoElement.src = ''; editorApp.videoElement.style.display = 'none'; }
            }

            document.getElementById('playerSection').style.display = 'block';
            document.getElementById('mainContent').style.display = 'flex';
            const uploadSection = document.getElementById('uploadSection');
            if (uploadSection) uploadSection.style.display = 'none';

            // Try to decode for waveform
            try {
              const resp = await fetch(mediaData.url);
              const buf = await resp.arrayBuffer();
              if (!editorApp.audioContext) editorApp.audioContext = new (window.AudioContext || window.webkitAudioContext)();
              if (editorApp.audioContext.state === 'suspended') { try { await editorApp.audioContext.resume(); } catch (e) {} }
              editorApp.audioBuffer = await new Promise((resolve, reject) => {
                editorApp.audioContext.decodeAudioData(buf, resolve, reject);
              });
              editorApp.generateWaveformData();
            } catch (e) {
              console.warn('Could not decode audio for waveform:', e);
              editorApp.audioBuffer = { duration: track.media_duration || 0 };
              editorApp.waveformData = null;
            }

            setTimeout(() => { editorApp.resizeCanvas(); editorApp.drawWaveform(); }, 100);
          } catch (e) {
            console.warn('Could not load media:', e);
          }
        } else {
          // No media: show upload area
          document.getElementById('playerSection').style.display = 'none';
          document.getElementById('mainContent').style.display = 'none';
          const uploadSection = document.getElementById('uploadSection');
          if (uploadSection) uploadSection.style.display = '';
        }

        editorApp.drawWaveform();
      } catch (err) {
        console.error('Failed to load track:', err);
      }
    }

    // ── Socket event handlers ────────────────────────────
    function setupSocketHandlers() {
      const editorApp = () => EditorView._app;

      sock.on('cue:created', (data) => {
        if (data.userId === state.user?.id) {
          setSaveStatus('Saved');
        } else {
          showToast(`${data.userId} added a cue`);
        }
        state.addCue(data.cue);
        const app = editorApp();
        if (app && data.cue.track_id === state.activeTrackId) {
          // Add to local cues array
          const existing = app.cues.findIndex((c) => c.id === data.cue.id);
          const localCue = {
            id: data.cue.id, name: data.cue.name, time: data.cue.time,
            description: data.cue.description || '', fade: data.cue.fade || 0,
            markerColor: data.cue.marker_color || '#ff4444',
          };
          if (existing >= 0) app.cues[existing] = localCue;
          else app.cues.push(localCue);
          app.renumberCues();
          app.updateCuesList();
          app.drawWaveform();
        }
      });

      sock.on('cue:updated', (data) => {
        if (data.userId === state.user?.id) setSaveStatus('Saved');
        state.updateCue(data.cue);
        const app = editorApp();
        if (app && data.cue.track_id === state.activeTrackId) {
          const idx = app.cues.findIndex((c) => c.id === data.cue.id);
          if (idx >= 0) {
            app.cues[idx] = {
              id: data.cue.id, name: data.cue.name, time: data.cue.time,
              description: data.cue.description || '', fade: data.cue.fade || 0,
              markerColor: data.cue.marker_color || '#ff4444',
            };
            app.renumberCues();
            app.updateCuesList();
            app.drawWaveform();
          }
        }
      });

      sock.on('cue:deleted', (data) => {
        if (data.userId === state.user?.id) setSaveStatus('Saved');
        state.removeCue(data.id);
        const app = editorApp();
        if (app) {
          app.cues = app.cues.filter((c) => c.id !== data.id);
          app.renumberCues();
          app.updateCuesList();
          app.drawWaveform();
        }
      });

      sock.on('cue:moved', (data) => {
        if (data.userId === state.user?.id) setSaveStatus('Saved');
        state.updateCue(data.cue);
        const app = editorApp();
        if (app && data.userId !== state.user?.id) {
          const idx = app.cues.findIndex((c) => c.id === data.cue.id);
          if (idx >= 0) {
            app.cues[idx].time = data.cue.time;
            app.renumberCues();
            app.updateCuesList();
            app.drawWaveform();
          }
        }
      });

      sock.on('track:created', (data) => {
        state.addTrack(data.track);
        renderTrackTabs();
      });

      sock.on('track:updated', (data) => {
        state.updateTrack(data.track);
        renderTrackTabs();
      });

      sock.on('track:deleted', (data) => {
        state.removeTrack(data.id);
        renderTrackTabs();
        if (state.activeTrackId) loadTrackIntoEditor();
      });

      sock.on('settings:updated', (data) => {
        if (data.userId === state.user?.id) setSaveStatus('Saved');
        state.setSettings(data.settings);
        const app = editorApp();
        if (app) {
          app.settings = { ...app.settings, ...data.settings };
          app.applySettings();
        }
      });

      sock.on('member:joined', (data) => {
        showToast(`${data.displayName} joined`);
        updateOnlineCount();
      });

      sock.on('member:left', (data) => {
        showToast(`${data.displayName} left`);
        updateOnlineCount();
      });

      sock.on('cursor:update', (data) => {
        // Could render remote cursors on waveform here
      });

      sock.on('project:state', (data) => {
        // Full state received on join
        if (data.onlineUsers) {
          state.setOnlineUsers(data.onlineUsers);
          updateOnlineCount();
        }
      });
    }

    function updateOnlineCount() {
      const el = document.getElementById('onlineCount');
      if (el) el.textContent = `${state.onlineUsers.length || 1} online`;
    }

    function setSaveStatus(text) {
      const el = document.getElementById('saveStatus');
      if (el) el.textContent = text;
    }

    function showToast(message) {
      const container = document.getElementById('toastContainer');
      if (!container) return;
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.textContent = message;
      container.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }

    // ── Initialize ───────────────────────────────────────
    setupSocketHandlers();
    loadProject();

    return {
      destroy() {
        sock.leaveProject();
        if (EditorView._app) {
          EditorView._app = null;
          window.app = null;
        }
        clearTimeout(EditorView._saveTimer);
        clearInterval(EditorView._cursorTimer);
      },
    };
  },
};

window.EditorView = EditorView;
