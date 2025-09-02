class MusicCueApp {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.audioElement = null;
        this.canvas = null;
        this.ctx = null;
        this.cues = [];
        this.currentCueId = null;
        this.isPlaying = false;
        this.waveformData = null;
        this.isResizing = false;
        
        // Zoom and pan properties
        this.zoomLevel = 1;
        this.panOffset = 0;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartPan = 0;
        this.draggedMarker = null;
        this.timePopup = null;
        
        this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        this.audioElement = document.getElementById('audioPlayer');
        this.canvas = document.getElementById('waveformCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.timePopup = document.getElementById('timePopup');
        this.themeToggle = document.getElementById('themeToggle');
        
        console.log('Canvas element found:', this.canvas);
        console.log('Canvas context:', this.ctx);
        console.log('Time popup element found:', this.timePopup);
        
        // Test popup visibility
        if (this.timePopup) {
            this.timePopup.style.display = 'block';
            this.timePopup.textContent = 'Test Popup';
            this.timePopup.style.left = '50px';
            this.timePopup.style.top = '50px';
            console.log('Popup test - should be visible now');
            
            // Hide after 2 seconds
            setTimeout(() => {
                this.timePopup.style.display = 'none';
                console.log('Popup test - hidden');
            }, 2000);
        }
        
        // Set canvas size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Also try to resize after a short delay to ensure DOM is ready
        setTimeout(() => {
            this.resizeCanvas();
        }, 500);
        // Initialize theme from storage
        const savedTheme = localStorage.getItem('theme') || 'dark';
        this.applyTheme(savedTheme);
    }

    resizeCanvas() {
        if (this.isResizing) return;
        this.isResizing = true;
        
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        
        // Set canvas size to match container
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        // Also set CSS size to ensure proper display
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        console.log('Canvas resized to:', this.canvas.width, 'x', this.canvas.height);
        
        this.isResizing = false;
        
        if (this.waveformData) {
            this.drawWaveform();
        }
    }
    
    resizeCanvasOnly() {
        if (this.isResizing) return;
        this.isResizing = true;
        
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        
        // Set canvas size to match container
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        // Also set CSS size to ensure proper display
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        console.log('Canvas resized to (no redraw):', this.canvas.width, 'x', this.canvas.height);
        
        this.isResizing = false;
    }

    setupEventListeners() {
        // File upload
        const uploadArea = document.getElementById('uploadArea');
        const audioFile = document.getElementById('audioFile');
        const uploadBtn = document.getElementById('uploadBtn');
        
        console.log('Setting up event listeners...');
        console.log('Upload area:', uploadArea);
        console.log('Audio file input:', audioFile);
        console.log('Upload button:', uploadBtn);
        
        // Handle upload area click
        uploadArea.addEventListener('click', (e) => {
            // Don't trigger if clicking the button directly
            if (e.target !== uploadBtn) {
                console.log('Upload area clicked');
                audioFile.click();
            }
        });
        
        // Handle upload button click
        uploadBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent upload area click
            console.log('Upload button clicked');
            audioFile.click();
        });
        
        uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        audioFile.addEventListener('change', this.handleFileSelect.bind(this));
        
        console.log('Event listeners set up successfully');

        // Audio player events
        this.audioElement.addEventListener('loadedmetadata', this.onAudioLoaded.bind(this));
        this.audioElement.addEventListener('timeupdate', this.onTimeUpdate.bind(this));
        this.audioElement.addEventListener('play', () => this.isPlaying = true);
        this.audioElement.addEventListener('pause', () => this.isPlaying = false);

        // Waveform click and drag
        this.canvas.addEventListener('click', this.onWaveformClick.bind(this));
        this.canvas.addEventListener('contextmenu', this.onWaveformRightClick.bind(this));
        this.canvas.addEventListener('mousedown', this.onWaveformMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onWaveformMouseMove.bind(this));
        this.canvas.addEventListener('mouseenter', this.onWaveformMouseEnter.bind(this));
        this.canvas.addEventListener('mouseleave', this.onWaveformMouseLeave.bind(this));
        this.canvas.addEventListener('mouseup', this.onWaveformMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.onWaveformWheel.bind(this));

        // Zoom controls
        document.getElementById('zoomIn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOut').addEventListener('click', () => this.zoomOut());
        document.getElementById('zoomReset').addEventListener('click', () => this.zoomReset());

        // Theme toggle
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => {
                const isDark = !document.body.classList.contains('theme-light');
                const next = isDark ? 'light' : 'dark';
                this.applyTheme(next);
            });
        }

        // Cue controls
        document.getElementById('addCueBtn').addEventListener('click', this.addCueAtCurrentTime.bind(this));
        document.getElementById('playFromStart').addEventListener('click', this.playFromStart.bind(this));
        const exportJsonBtn = document.getElementById('exportJson');
        const exportCsvBtn = document.getElementById('exportCsv');
        const importBtn = document.getElementById('importCues');
        if (exportJsonBtn) exportJsonBtn.addEventListener('click', this.exportCuesJson.bind(this));
        if (exportCsvBtn) exportCsvBtn.addEventListener('click', this.exportCuesCsv.bind(this));
        if (importBtn) importBtn.addEventListener('click', this.importCuesFlow.bind(this));

        // Modal events
        document.getElementById('saveCue').addEventListener('click', this.saveCue.bind(this));
        document.getElementById('deleteCue').addEventListener('click', this.deleteCue.bind(this));
        document.getElementById('cancelCue').addEventListener('click', this.closeModal.bind(this));

        // Keyboard shortcuts
        document.addEventListener('keydown', this.onKeyDown.bind(this));
    }

    applyTheme(theme) {
        if (theme === 'light') {
            document.body.classList.add('theme-light');
        } else {
            document.body.classList.remove('theme-light');
        }
        localStorage.setItem('theme', theme);
        if (this.themeToggle) {
            this.themeToggle.textContent = theme === 'light' ? '☀️' : '🌙';
            this.themeToggle.setAttribute('aria-label', 'Toggle theme');
            this.themeToggle.setAttribute('title', 'Toggle theme');
        }
        // Redraw waveform to reflect theme colors
        if (this.waveformData) this.drawWaveform();
    }

    onKeyDown(e) {
        // Ignore when typing in inputs/textareas or when modal is open
        const active = document.activeElement;
        const isTyping = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
        const isModalOpen = document.getElementById('cueModal').style.display !== 'none';
        if (isTyping || isModalOpen) return;

        // Space or K: toggle play/pause
        if (e.code === 'Space' || e.key.toLowerCase() === 'k') {
            e.preventDefault();
            this.togglePlay();
            return;
        }

        // Arrow Left/Right: seek, with Shift for bigger step, Alt for fine step
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const step = e.shiftKey ? -5 : e.altKey ? -0.1 : -1;
            this.seekBy(step);
            return;
        }
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            const step = e.shiftKey ? 5 : e.altKey ? 0.1 : 1;
            this.seekBy(step);
            return;
        }

        // , and . for frame-ish nudge (~0.05s)
        if (e.key === ',') {
            e.preventDefault();
            this.seekBy(-0.05);
            return;
        }
        if (e.key === '.') {
            e.preventDefault();
            this.seekBy(0.05);
            return;
        }

        // Zoom: +/=/Up to zoom in, -/_/Down to zoom out, 0 to reset
        if (e.key === '+' || e.key === '=' || e.key === 'Add') {
            e.preventDefault();
            this.zoomIn();
            return;
        }
        if (e.key === '-' || e.key === '_' || e.key === 'Subtract') {
            e.preventDefault();
            this.zoomOut();
            return;
        }
        if (e.key === '0') {
            e.preventDefault();
            this.zoomReset();
            return;
        }

        // M: add cue at current time
        if (e.key.toLowerCase() === 'm') {
            e.preventDefault();
            this.addCueAtCurrentTime();
            return;
        }

        // [ and ]: jump to previous/next cue
        if (e.key === '[') {
            e.preventDefault();
            this.jumpToPreviousCue();
            return;
        }
        if (e.key === ']') {
            e.preventDefault();
            this.jumpToNextCue();
            return;
        }
    }

    togglePlay() {
        if (!this.audioElement) return;
        if (this.audioElement.paused) {
            this.audioElement.play();
        } else {
            this.audioElement.pause();
        }
    }

    seekBy(deltaSeconds) {
        if (!this.audioElement || !this.audioBuffer) return;
        const newTime = Math.max(0, Math.min(this.audioBuffer.duration, this.audioElement.currentTime + deltaSeconds));
        this.audioElement.currentTime = newTime;
        this.drawWaveform();
    }

    jumpToPreviousCue() {
        if (!this.cues.length) return;
        const current = this.audioElement.currentTime;
        const prevCues = this.cues.filter(c => c.time < current).sort((a, b) => b.time - a.time);
        if (prevCues.length) this.audioElement.currentTime = prevCues[0].time;
    }

    jumpToNextCue() {
        if (!this.cues.length) return;
        const current = this.audioElement.currentTime;
        const nextCues = this.cues.filter(c => c.time > current).sort((a, b) => a.time - b.time);
        if (nextCues.length) this.audioElement.currentTime = nextCues[0].time;
    }

    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        console.log('Files dropped:', files.length);
        if (files.length > 0) {
            console.log('Processing dropped file:', files[0]);
            this.loadAudioFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        console.log('File selected:', file);
        if (file) {
            this.loadAudioFile(file);
        } else {
            console.log('No file selected');
        }
    }

    async loadAudioFile(file) {
        try {
            console.log('Loading audio file:', file.name, file.type, file.size);
            
            // Ensure audio element is ready and points to the file early
            const audioUrl = URL.createObjectURL(file);
            this.audioElement.crossOrigin = 'anonymous';
            this.audioElement.src = audioUrl;
            this.audioElement.load();
            this.audioElement.addEventListener('error', (ev) => {
                console.error('Audio element error', this.audioElement.error);
            }, { once: true });

            // Create or resume audio context (one per app)
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (this.audioContext.state === 'suspended') {
                try { await this.audioContext.resume(); } catch (e) { console.warn('Resume audioContext failed', e); }
            }
            console.log('Audio context state:', this.audioContext.state);
            
            // Load audio file bytes
            const arrayBuffer = await file.arrayBuffer();
            console.log('Array buffer loaded, size:', arrayBuffer.byteLength);
            
            // Use callback API for maximum compatibility (works in Safari)
            this.audioBuffer = await new Promise((resolve, reject) => {
                try {
                    this.audioContext.decodeAudioData(arrayBuffer.slice(0), (buf) => resolve(buf), (err) => reject(err));
                } catch (err) {
                    reject(err);
                }
            });
            console.log('Audio buffer decoded:', this.audioBuffer);
            
            // Generate waveform data
            this.generateWaveformData();
            
            // Show player and waveform sections
            document.getElementById('playerSection').style.display = 'block';
            document.getElementById('waveformSection').style.display = 'block';
            document.getElementById('cuesPanel').style.display = 'block';
            
            // Hide upload area
            document.getElementById('uploadArea').style.display = 'none';
            
            // Resize canvas after sections are visible
            setTimeout(() => {
                this.resizeCanvas();
            }, 100);
            
        } catch (error) {
            console.error('Error loading audio file:', error);
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            
            let errorMessage = 'Error loading audio file. ';
            if (error.name === 'NotSupportedError') {
                errorMessage += 'This audio format is not supported. Please try MP3, WAV, or OGG files.';
            } else if (error.name === 'EncodingError') {
                errorMessage += 'The audio file appears to be corrupted or in an unsupported format.';
            } else if (error.name === 'AbortError') {
                errorMessage += 'The file load was aborted. Please try again.';
            } else {
                errorMessage += 'Please try a different file.';
            }
            
            console.warn(errorMessage);
        }
    }

    generateWaveformData() {
        if (!this.audioBuffer) {
            console.error('No audio buffer available');
            return;
        }
        
        const channelData = this.audioBuffer.getChannelData(0);
        console.log('Channel data length:', channelData.length);
        
        const samples = 2000; // Number of samples for visualization - more detail
        const blockSize = Math.floor(channelData.length / samples);
        this.waveformData = [];
        
        for (let i = 0; i < samples; i++) {
            let sum = 0;
            for (let j = 0; j < blockSize; j++) {
                sum += Math.abs(channelData[i * blockSize + j]);
            }
            this.waveformData.push(sum / blockSize);
        }
        
        console.log('Generated waveform data:', this.waveformData.length, 'samples');
        console.log('Sample values:', this.waveformData.slice(0, 10));
        
        // Check if we have valid data
        const maxAmplitude = Math.max(...this.waveformData);
        console.log('Max amplitude:', maxAmplitude);
        
        if (maxAmplitude === 0) {
            console.warn('Waveform data appears to be silent or empty');
        }
        
        this.drawWaveform();
    }

    drawWaveform() {
        if (!this.waveformData) {
            console.log('No waveform data available');
            return;
        }
        
        const canvas = this.canvas;
        const ctx = this.ctx;
        let width = canvas.width;
        let height = canvas.height;
        
        // If canvas has no size, try to resize it (but don't call drawWaveform again)
        if (width === 0 || height === 0) {
            console.log('Canvas has no size, attempting to resize...');
            this.resizeCanvasOnly(); // Use resize-only method to avoid recursion
            width = canvas.width;
            height = canvas.height;
        }
        
        console.log('Drawing waveform - Canvas size:', width, 'x', height);
        console.log('Waveform data length:', this.waveformData.length);
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw background based on theme
        const isLight = document.body.classList.contains('theme-light');
        ctx.fillStyle = isLight ? '#f8f9fa' : '#0f172a';
        ctx.fillRect(0, 0, width, height);
        
        // Calculate visible range based on zoom and pan
        const totalWidth = width * this.zoomLevel;
        const samples = this.waveformData.length;
        const barWidth = totalWidth / samples;
        const pixelsPerSample = totalWidth / samples; // equals barWidth
        const firstVisibleSample = Math.max(0, Math.floor((-this.panOffset) / pixelsPerSample));
        const visibleSampleCount = Math.ceil(width / pixelsPerSample) + 2; // small buffer
        const lastVisibleSample = Math.min(samples, firstVisibleSample + visibleSampleCount);
        const centerY = height / 2;
        
        // Create gradient for waveform
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        if (isLight) {
            gradient.addColorStop(0, '#2196F3');
            gradient.addColorStop(0.5, '#1976D2');
            gradient.addColorStop(1, '#0D47A1');
        } else {
            gradient.addColorStop(0, '#60a5fa');
            gradient.addColorStop(0.5, '#3b82f6');
            gradient.addColorStop(1, '#1d4ed8');
        }
        
        ctx.fillStyle = gradient;
        
        // Draw only visible bars
        for (let i = firstVisibleSample; i < lastVisibleSample; i++) {
            if (i >= 0 && i < this.waveformData.length) {
                const amplitude = this.waveformData[i];
                // Make waveform much bigger - use 95% of height and ensure minimum height
                const barHeight = Math.max(amplitude * height * 0.95, 6);
                const x = (i * barWidth) + this.panOffset;
                const y = centerY - barHeight / 2;
                
                // Only draw if bar is visible
                if (x + barWidth > 0 && x < width) {
                    // Make bars slightly wider for better visibility
                    this.drawRoundedRect(ctx, x, y, Math.max(barWidth - 0.5, 1.5), barHeight, 3);
                }
            }
        }
        
        // Draw center line
        ctx.strokeStyle = isLight ? '#e0e0e0' : '#1f2937';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();
        
        // Draw time markers
        this.drawTimeMarkers();
        
        // Draw cue markers
        this.drawCueMarkers();
        
        // Draw playhead
        this.drawPlayhead();
    }
    
    drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
    }
    
    drawPlayhead() {
        if (!this.audioElement || !this.audioBuffer) return;
        
        const canvas = this.canvas;
        const ctx = this.ctx;
        const width = canvas.width;
        const height = canvas.height;
        const currentTime = this.audioElement.currentTime;
        const duration = this.audioBuffer.duration;
        const totalWidth = width * this.zoomLevel;
        
        const playheadX = (currentTime / duration) * totalWidth + this.panOffset;
        
        // Only draw if playhead is visible
        if (playheadX >= -10 && playheadX <= width + 10) {
            const isLight = document.body.classList.contains('theme-light');
            const phColor = isLight ? '#0ea5e9' : '#22d3ee'; // cyan distinct from red markers
            // Draw playhead line
            ctx.strokeStyle = phColor;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(playheadX, 0);
            ctx.lineTo(playheadX, height);
            ctx.stroke();
            
            // Draw playhead triangle
            ctx.fillStyle = phColor;
            ctx.beginPath();
            ctx.moveTo(playheadX - 6, 0);
            ctx.lineTo(playheadX + 6, 0);
            ctx.lineTo(playheadX, 12);
            ctx.closePath();
            ctx.fill();
        }
    }

    drawTimeMarkers() {
        const canvas = this.canvas;
        const ctx = this.ctx;
        const width = canvas.width;
        const height = canvas.height;
        const isLight = document.body.classList.contains('theme-light');
        
        ctx.strokeStyle = isLight ? '#ccc' : '#374151';
        ctx.lineWidth = 1;
        ctx.font = '12px Arial';
        ctx.fillStyle = isLight ? '#666' : '#cbd5e1';
        
        const duration = this.audioBuffer.duration;
        const totalWidth = width * this.zoomLevel;
        const pixelsPerSecond = totalWidth / duration;
        
        // Choose major/minor grid spacing based on zoom
        let majorStep = 5; // seconds
        if (pixelsPerSecond > 300) majorStep = 0.5;
        else if (pixelsPerSecond > 150) majorStep = 1;
        else if (pixelsPerSecond > 60) majorStep = 2;
        else if (pixelsPerSecond > 30) majorStep = 5;
        else if (pixelsPerSecond > 15) majorStep = 10;
        else majorStep = 15;
        
        const minorStep = majorStep / 5;
        
        // Visible time range
        const timeStart = Math.max(0, (-this.panOffset) / pixelsPerSecond);
        const timeEnd = Math.min(duration, (width - this.panOffset) / pixelsPerSecond);
        
        // Draw minor ticks
        ctx.strokeStyle = isLight ? '#e6e6e6' : '#1f2937';
        for (let t = Math.floor(timeStart / minorStep) * minorStep; t <= timeEnd; t += minorStep) {
            const x = t * pixelsPerSecond + this.panOffset;
            if (x >= -20 && x <= width + 20) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
            }
        }
        
        // Draw major ticks with labels
        ctx.strokeStyle = isLight ? '#ccc' : '#374151';
        for (let t = Math.floor(timeStart / majorStep) * majorStep; t <= timeEnd; t += majorStep) {
            const x = t * pixelsPerSecond + this.panOffset;
            if (x >= -50 && x <= width + 50) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
                ctx.fillText(this.formatTimeDetailed(t), x + 5, 15);
            }
        }
    }

    drawCueMarkers() {
        const canvas = this.canvas;
        const ctx = this.ctx;
        const width = canvas.width;
        const height = canvas.height;
        const duration = this.audioBuffer.duration;
        const totalWidth = width * this.zoomLevel;
        
        const sorted = [...this.cues].sort((a, b) => a.time - b.time);
        sorted.forEach((cue, index) => {
            const x = (cue.time / duration) * totalWidth + this.panOffset;
            
            // Only draw if marker is visible
            if (x >= -20 && x <= width + 20) {
                // Draw marker line with shadow
                ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                ctx.shadowBlur = 4;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
                
                ctx.strokeStyle = '#ff4444';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
                
                // Reset shadow
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
                
                // Draw marker circle
                ctx.fillStyle = '#ff4444';
                ctx.beginPath();
                ctx.arc(x, 15, 8, 0, 2 * Math.PI);
                ctx.fill();
                
                // Draw marker number
                ctx.fillStyle = 'white';
                ctx.font = 'bold 10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText((index + 1).toString(), x, 19);
                
                // Draw cue name with background
                ctx.textAlign = 'left';
                ctx.font = 'bold 11px Arial';
                const text = `#${index + 1} ${cue.name || 'Cue'}`;
                const textWidth = ctx.measureText(text).width;
                
                // Background for text
                ctx.fillStyle = 'rgba(255, 68, 68, 0.9)';
                ctx.fillRect(x + 5, 5, textWidth + 8, 16);
                
                // Text
                ctx.fillStyle = 'white';
                ctx.fillText(text, x + 9, 16);
            }
        });
    }

    onAudioLoaded() {
        document.getElementById('duration').textContent = this.formatTime(this.audioElement.duration);
    }

    onTimeUpdate() {
        document.getElementById('currentTime').textContent = this.formatTime(this.audioElement.currentTime);
        // Redraw waveform to update playhead position
        if (this.waveformData) {
            this.drawWaveform();
        }
    }

    onWaveformClick(e) {
        // Don't jump if we were dragging
        if (this.isDragging) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const totalWidth = this.canvas.width * this.zoomLevel;
        const clickTime = ((x - this.panOffset) / totalWidth) * this.audioBuffer.duration;
        
        this.audioElement.currentTime = Math.max(0, Math.min(this.audioBuffer.duration, clickTime));
    }
    
    onWaveformRightClick(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const totalWidth = this.canvas.width * this.zoomLevel;
        const clickTime = ((x - this.panOffset) / totalWidth) * this.audioBuffer.duration;
        
        // Add cue at clicked position
        this.addCueAtTime(clickTime);
    }
    
    onWaveformMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        
        // Check if clicking on a marker
        const clickedMarker = this.getMarkerAtPosition(x);
        if (clickedMarker) {
            this.draggedMarker = clickedMarker;
            this.draggedMarker.originalTime = clickedMarker.time; // Store original time
            this.isDragging = true;
            this.dragStartX = x;
            this.canvas.style.cursor = 'grabbing';
            return;
        }
        
        // Start panning
        this.isDragging = true;
        this.dragStartX = x;
        this.dragStartPan = this.panOffset;
        this.canvas.style.cursor = 'grabbing';
    }
    
    onWaveformMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        
        if (this.isDragging) {
            const deltaX = x - this.dragStartX;
            
            if (this.draggedMarker) {
                // Move marker with proper scaling
                const totalWidth = this.canvas.width * this.zoomLevel;
                const timeDelta = (deltaX / totalWidth) * this.audioBuffer.duration;
                
                // Calculate new time based on original position + delta
                const newTime = this.draggedMarker.originalTime + timeDelta;
                this.draggedMarker.time = Math.max(0, Math.min(this.audioBuffer.duration, newTime));
                this.updateCuesList();
                
                // Show time popup
                this.showTimePopup(x, this.draggedMarker.time);
            } else {
                // Pan waveform
                this.panOffset = this.dragStartPan + deltaX;
                this.constrainPan();
            }
            
            this.drawWaveform();
        } else {
            // Update cursor based on what's under the mouse
            const marker = this.getMarkerAtPosition(x);
            this.canvas.style.cursor = marker ? 'grab' : 'crosshair';
            
            // Show time popup when hovering over waveform
            const totalWidth = this.canvas.width * this.zoomLevel;
            const hoverTime = ((x - this.panOffset) / totalWidth) * this.audioBuffer.duration;
            if (hoverTime >= 0 && hoverTime <= this.audioBuffer.duration) {
                this.showTimePopup(x, hoverTime);
            } else {
                this.hideTimePopup();
            }
        }
    }
    
    onWaveformMouseEnter(e) {
        this.canvas.style.cursor = 'crosshair';
    }
    
    onWaveformMouseLeave(e) {
        this.canvas.style.cursor = 'default';
        this.hideTimePopup();
    }
    
    onWaveformMouseUp(e) {
        if (this.draggedMarker) {
            // Clean up the temporary original time property
            delete this.draggedMarker.originalTime;
        }
        this.isDragging = false;
        this.draggedMarker = null;
        this.canvas.style.cursor = 'crosshair';
        this.hideTimePopup();
    }
    
    onWaveformWheel(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const oldZoom = this.zoomLevel;
        this.zoomLevel = Math.max(0.1, Math.min(10, this.zoomLevel * zoomFactor));
        
        // Zoom towards mouse position
        const zoomRatio = this.zoomLevel / oldZoom;
        this.panOffset = x - (x - this.panOffset) * zoomRatio;
        
        this.constrainPan();
        this.updateZoomDisplay();
        this.drawWaveform();
    }
    
    getMarkerAtPosition(x) {
        const totalWidth = this.canvas.width * this.zoomLevel;
        const duration = this.audioBuffer.duration;
        
        for (let cue of this.cues) {
            const markerX = (cue.time / duration) * totalWidth + this.panOffset;
            if (Math.abs(x - markerX) < 15) { // 15px tolerance
                return cue;
            }
        }
        return null;
    }
    
    constrainPan() {
        const totalWidth = this.canvas.width * this.zoomLevel;
        const maxPan = Math.max(0, totalWidth - this.canvas.width);
        this.panOffset = Math.max(-maxPan, Math.min(0, this.panOffset));
    }
    
    zoomIn() {
        this.zoomLevel = Math.min(10, this.zoomLevel * 1.5);
        this.constrainPan();
        this.updateZoomDisplay();
        this.drawWaveform();
    }
    
    zoomOut() {
        this.zoomLevel = Math.max(0.1, this.zoomLevel / 1.5);
        this.constrainPan();
        this.updateZoomDisplay();
        this.drawWaveform();
    }
    
    zoomReset() {
        this.zoomLevel = 1;
        this.panOffset = 0;
        this.updateZoomDisplay();
        this.drawWaveform();
    }
    
    updateZoomDisplay() {
        document.getElementById('zoomLevel').textContent = Math.round(this.zoomLevel * 100) + '%';
    }
    
    showTimePopup(x, time) {
        if (!this.timePopup) return;
        
        // Position popup relative to the waveform container, clamped within bounds
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        const halfWidth = 60; // approx popup half width for clamping
        let popupX = x;
        popupX = Math.max(halfWidth, Math.min(rect.width - halfWidth, popupX));
        const popupY = rect.height - 35; // near bottom inside container
        
        this.timePopup.style.left = popupX + 'px';
        this.timePopup.style.top = popupY + 'px';
        this.timePopup.textContent = this.formatTimeDetailed(time);
        this.timePopup.style.display = 'block';
        this.timePopup.style.zIndex = '1000';
        this.timePopup.style.position = 'absolute';
        
        console.log('Showing time popup at:', popupX, popupY, 'Time:', this.formatTime(time));
    }
    
    hideTimePopup() {
        if (this.timePopup) {
            this.timePopup.style.display = 'none';
        }
    }

    addCueAtCurrentTime() {
        const time = this.audioElement.currentTime;
        const cue = {
            id: Date.now(),
            name: `Cue`,
            time: time,
            description: ''
        };
        
        this.cues.push(cue);
        this.renumberCues();
        this.updateCuesList();
        this.drawWaveform();
    }

    addCueAtTime(time) {
        const cue = {
            id: Date.now(),
            name: `Cue`,
            time: time,
            description: ''
        };
        
        this.cues.push(cue);
        this.renumberCues();
        this.updateCuesList();
        this.drawWaveform();
    }

    updateCuesList() {
        const cuesList = document.getElementById('cuesList');
        cuesList.innerHTML = '';
        
        // Sort cues by time and assign sequential numbers
        const sortedCues = [...this.cues].sort((a, b) => a.time - b.time);
        sortedCues.forEach((c, i) => c.number = i + 1);
        
        sortedCues.forEach(cue => {
            const cueElement = document.createElement('div');
            cueElement.className = 'cue-item';
            cueElement.innerHTML = `
                <div class="cue-info">
                    <div class="cue-name">#${cue.number} — ${cue.name || 'Cue'}</div>
                    <div class="cue-time">${this.formatTime(cue.time)}</div>
                    ${cue.description ? `<div class="cue-description">${cue.description}</div>` : ''}
                </div>
                <div class="cue-actions">
                    <button class="edit-btn" onclick="app.editCue(${cue.id})">Edit</button>
                    <button class="jump-btn" onclick="app.jumpToCue(${cue.id})">Jump</button>
                    <button class="delete-btn" onclick="app.deleteCue(${cue.id})">Delete</button>
                </div>
            `;
            cuesList.appendChild(cueElement);
        });
    }

    editCue(cueId) {
        const cue = this.cues.find(c => c.id === cueId);
        if (!cue) return;
        
        this.currentCueId = cueId;
        // Show computed number (by sorted order)
        document.getElementById('cueNumber').value = this.getCueNumber(cueId);
        document.getElementById('cueName').value = cue.name;
        document.getElementById('cueTime').value = this.formatTime(cue.time);
        document.getElementById('cueDescription').value = cue.description;
        
        document.getElementById('cueModal').style.display = 'flex';
    }

    saveCue() {
        if (!this.currentCueId) return;
        
        const cue = this.cues.find(c => c.id === this.currentCueId);
        if (cue) {
            cue.name = document.getElementById('cueName').value || `Cue`;
            cue.description = document.getElementById('cueDescription').value;
            
            this.renumberCues();
            this.updateCuesList();
            this.drawWaveform();
        }
        
        this.closeModal();
    }

    deleteCue(cueId) {
        if (cueId === this.currentCueId) {
            this.cues = this.cues.filter(c => c.id !== cueId);
            this.renumberCues();
            this.updateCuesList();
            this.drawWaveform();
            this.closeModal();
        } else {
            this.cues = this.cues.filter(c => c.id !== cueId);
            this.renumberCues();
            this.updateCuesList();
            this.drawWaveform();
        }
    }

    jumpToCue(cueId) {
        const cue = this.cues.find(c => c.id === cueId);
        if (cue) {
            this.audioElement.currentTime = cue.time;
        }
    }

    playFromStart() {
        this.audioElement.currentTime = 0;
        this.audioElement.play();
    }

    closeModal() {
        document.getElementById('cueModal').style.display = 'none';
        this.currentCueId = null;
    }

    exportCues() {
        const exportData = {
            audioFile: this.audioElement.src,
            duration: this.audioBuffer.duration,
            cues: this.cues.map(cue => ({
                name: cue.name,
                time: cue.time,
                timeFormatted: this.formatTime(cue.time),
                description: cue.description
            }))
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'cue-points.json';
        link.click();
    }

    exportCuesJson() {
        const sorted = [...this.cues].sort((a, b) => a.time - b.time).map((c, i) => ({
            number: i + 1,
            title: c.name || 'Cue',
            description: c.description || '',
            time: c.time,
            timeFormatted: this.formatTime(c.time)
        }));
        const exportData = {
            audioFile: this.audioElement.src,
            duration: this.audioBuffer?.duration || 0,
            cues: sorted
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'cues.json';
        a.click();
    }

    exportCuesCsv() {
        const fps = 30;
        const sorted = [...this.cues].sort((a, b) => a.time - b.time).map((c, i) => ({
            number: i + 1,
            title: this.sanitizeForCsv(c.name || 'Cue'),
            description: this.sanitizeForCsv(c.description || ''),
            timeSeconds: c.time,
            timecode: this.formatTimecodeFrames(c.time, fps)
        }));
        const headers = ['number','title','description','time_seconds','timecode'];
        const rows = sorted.map(r => `${r.number},${r.title},${r.description},${r.timeSeconds},${r.timecode}`);
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'cues.csv';
        a.click();
    }

    importCuesFlow() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,.csv,text/csv,application/json';
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const text = await file.text();
            try {
                if (file.name.toLowerCase().endsWith('.json')) {
                    const data = JSON.parse(text);
                    this.importFromJson(data);
                } else {
                    this.importFromCsv(text);
                }
            } catch (err) {
                alert('Failed to import cues: ' + err.message);
            }
        });
        input.click();
    }

    importFromJson(json) {
        if (!json || !Array.isArray(json.cues)) throw new Error('Invalid JSON format');
        this.cues = json.cues.map(c => ({
            id: Date.now() + Math.random(),
            name: c.title || c.name || 'Cue',
            time: Number(c.time ?? 0),
            description: c.description || ''
        }));
        this.renumberCues();
        this.updateCuesList();
        this.drawWaveform();
    }

    importFromCsv(csvText) {
        const lines = csvText.split(/\r?\n/).filter(Boolean);
        if (!lines.length) throw new Error('Empty CSV');
        const header = lines.shift().split(',').map(h => h.trim().toLowerCase());
        const idx = {
            number: header.indexOf('number'),
            title: header.indexOf('title'),
            description: header.indexOf('description'),
            time_seconds: header.indexOf('time_seconds'),
            timecode: header.indexOf('timecode'),
            time: header.indexOf('time'),
            time_formatted: header.indexOf('time_formatted')
        };
        const parseTime = (t, tc) => {
            const n = Number(t);
            if (!Number.isNaN(n)) return n;
            // hh:mm:ss:ff
            if (tc) {
                const m = /^\s*(\d{1,2}):(\d{2}):(\d{2}):(\d{2})\s*$/.exec(tc);
                if (m) {
                    const hh = Number(m[1]);
                    const mm = Number(m[2]);
                    const ss = Number(m[3]);
                    const ff = Number(m[4]);
                    const fps = 30;
                    return hh * 3600 + mm * 60 + ss + (ff / fps);
                }
            }
            // parse mm:ss
            const m = /^\s*(\d+):(\d{1,2})(?:\.(\d{1,3}))?\s*$/.exec(String(t));
            if (m) {
                const min = Number(m[1]);
                const sec = Number(m[2]);
                const ms = Number(m[3] || 0);
                return min * 60 + sec + ms / 1000;
            }
            return 0;
        };
        const cues = lines.map(line => {
            // naive CSV split respecting quotes
            const cells = [];
            let cur = '';
            let inQ = false;
            for (let i = 0; i < line.length; i++) {
                const ch = line[i];
                if (ch === '"') {
                    if (inQ && line[i+1] === '"') { cur += '"'; i++; }
                    else { inQ = !inQ; }
                } else if (ch === ',' && !inQ) {
                    cells.push(cur); cur = '';
                } else {
                    cur += ch;
                }
            }
            cells.push(cur);
            const title = idx.title >= 0 ? cells[idx.title] : 'Cue';
            const description = idx.description >= 0 ? cells[idx.description] : '';
            const timeVal = idx.time_seconds >= 0
                ? parseTime(cells[idx.time_seconds], cells[idx.timecode >= 0 ? idx.timecode : -1])
                : (idx.timecode >= 0
                    ? parseTime(undefined, cells[idx.timecode])
                    : (idx.time >= 0
                        ? parseTime(cells[idx.time])
                        : (idx.time_formatted >= 0 ? parseTime(cells[idx.time_formatted]) : 0)));
            return { id: Date.now() + Math.random(), name: title, time: timeVal, description };
        });
        this.cues = cues.filter(c => Number.isFinite(c.time)).sort((a,b) => a.time - b.time);
        this.renumberCues();
        this.updateCuesList();
        this.drawWaveform();
    }

    getCueNumber(cueId) {
        const sorted = [...this.cues].sort((a, b) => a.time - b.time);
        const idx = sorted.findIndex(c => c.id === cueId);
        return idx >= 0 ? idx + 1 : '';
    }

    renumberCues() {
        const sorted = [...this.cues].sort((a, b) => a.time - b.time);
        sorted.forEach((c, i) => c.number = i + 1);
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    formatTimeDetailed(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        const milliseconds = Math.floor((seconds - Math.floor(seconds)) * 1000);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}.${Math.floor(milliseconds / 10)
            .toString()
            .padStart(2, '0')}`;
    }

    formatTimecodeFrames(seconds, fps = 30) {
        const total = Math.max(0, Number(seconds) || 0);
        const hours = Math.floor(total / 3600);
        const minutes = Math.floor((total % 3600) / 60);
        const secs = Math.floor(total % 60);
        const frames = Math.round((total - Math.floor(total)) * fps);
        const hh = String(hours).padStart(2, '0');
        const mm = String(minutes).padStart(2, '0');
        const ss = String(secs).padStart(2, '0');
        const ff = String(Math.min(frames, fps - 1)).padStart(2, '0');
        return `${hh}:${mm}:${ss}:${ff}`;
    }

    sanitizeForCsv(value) {
        const s = String(value ?? '');
        // Remove problematic characters for external CSV importers
        // commas, quotes, newlines, tabs, semicolons
        return s
            .replace(/[",\n\r\t;]+/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .trim();
    }
}

// Initialize the app when the page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    
    // Add a visual indicator that the app is loading
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
        uploadArea.style.border = '3px dashed #4CAF50';
        uploadArea.style.background = 'rgba(76, 175, 80, 0.1)';
    }
    
    app = new MusicCueApp();
    console.log('App initialized:', app);
    
    // Change border back to normal after initialization
    if (uploadArea) {
        setTimeout(() => {
            uploadArea.style.border = '3px dashed #fff';
            uploadArea.style.background = 'rgba(255, 255, 255, 0.1)';
        }, 1000);
    }
});

