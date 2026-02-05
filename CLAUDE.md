# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CueMarkers is a collaborative, server-based web application for creating timecoded cues on music/video tracks. Used by choreographers, lighting designers, and performance directors for precise timing control. Supports real-time multi-user editing with Socket.IO and exports to various formats including GrandMA3 lighting software macros.

## Development Commands

```bash
# Start development services (PostgreSQL + MinIO)
docker-compose up -d

# Run database migrations
npm run migrate

# Start server in development mode (with auto-reload)
npm run dev

# Start production server
npm start

# Create new migration
npm run migrate:make <migration_name>

# Rollback last migration
npm run migrate:rollback
```

Server runs on http://localhost:3000 by default. Copy `.env.example` to `.env` before starting.

## Architecture

### Backend (server/)
- **Express + Socket.IO**: REST API for CRUD operations, WebSocket for real-time collaboration
- **PostgreSQL + Knex**: Database with 6 migrations (users, projects, project_members, tracks, cues, project_settings)
- **S3/MinIO**: Media file storage via AWS SDK v3
- **Session auth**: express-session + Passport.js, shared with Socket.IO for authenticated events

**Key routes** (`/api/v1`):
- `/auth/register`, `/login`, `/logout`, `/me`
- `/projects` (CRUD)
- `/projects/:id/members` (invite, role management)
- `/projects/:id/tracks` (CRUD, upload media, presigned URLs)
- `/projects/:id/tracks/:trackId/cues` (CRUD, batch import)
- `/projects/:id/settings` (get/update JSONB)
- `/projects/:id/export/{json|csv|markdown|ma3-xml|zip}` (server-side generation)

**Socket handlers** (in `server/socket/handlers.js`):
- `join-project`: Emits full `project:state` (project, tracks, cues, settings, members, online users)
- Real-time mutations: `cue:*`, `track:*`, `settings:update`
- Presence: `member:joined`, `member:left`, `cursor:update`

**Conflict Resolution**: Last-write-wins. Field-level merging (name + time on same cue both apply). Delete wins over edit.

### Frontend (client/)
- **Vanilla JS SPA**: Hash router with 3 views
- **Global singletons**: `window.cmApi` (HTTP), `window.cmSocket` (WebSocket), `window.cmState` (reactive state)
- **Views**:
  - `AuthView`: Login/register forms
  - `ProjectsView`: Dashboard with create/share/delete project cards
  - `EditorView`: Main editor wrapping `MusicCueApp` class, handles track tabs, media upload, S3 integration, real-time sync

**Editor integration** (`client/js/views/editor.js`):
- Instantiates `MusicCueApp` from `script.js`
- Overrides key methods to sync with server:
  - `loadMediaFile()` → Multer upload → S3 → presigned URL
  - `saveQuickCue()` → socket emit `cue:create`
  - `saveCue()` → socket emit `cue:update`
  - `deleteCue()` → socket emit `cue:delete`
  - `saveSettings()` → socket emit `settings:update`
- Listens for socket events and reconciles remote changes into local `MusicCueApp` instance

### Legacy Files (root)
Original single-user app at root (`index.html`, `script.js`, `styles.css`). The `client/` folder overrides these via SPA routing. `script.js` has conditional auto-init: skips if `#app-root` exists.

### Data Model
```
users -> project_members -> projects -> tracks -> cues
                                    -> project_settings
```

**Roles**: `owner` (full access, can delete/invite), `editor` (create/edit cues/tracks), `viewer` (read-only). All role checks in routes + socket handlers.

### Media Storage
Tracks store `media_s3_key` + `media_s3_filename`. `GET /projects/:id/tracks/:trackId/media` returns presigned URL (1-hour expiry). Client loads directly from URL.

### WebSocket Flow
1. Client calls `cmSocket.connect()` after auth
2. On project open, emits `join-project` → server auth-checks membership
3. Server broadcasts `project:state` with full state
4. Client mutations emit socket events (debounced for drag, instant for others)
5. Server broadcasts changes to all room members
6. Optimistic updates on client; server events confirm or reconcile
