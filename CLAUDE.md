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
- **PostgreSQL + Knex**: Database with migration-based schema in `server/db/migrations/`
- **S3/MinIO**: Media file storage via AWS SDK
- **Session auth**: Passport.js with PostgreSQL session store

API routes follow pattern `/api/v1/<resource>`. Socket events handle real-time cue/track operations and cursor sync.

### Frontend (client/)
- **Vanilla JS SPA**: Hash-based routing (`#/login`, `#/projects`, `#/projects/:id`)
- **Global singletons**: `window.cmApi`, `window.cmSocket`, `window.cmState`
- **Views**: Auth, Projects list, Editor (waveform + cue list)

### Legacy Files (root)
The original single-page version exists at root (`index.html`, `script.js`, `styles.css`). The `client/` folder contains the multi-user version.

### Data Model
```
users -> project_members -> projects -> tracks -> cues
                                    -> project_settings
```

Project members have roles: `owner`, `editor`, `viewer`. Viewers cannot modify cues/tracks.

### Socket Events
Real-time sync uses room-based broadcasting (`project:<id>`). Key events:
- `join-project` / `leave-project`: Room management
- `cue:create/update/delete/move`: Cue operations
- `track:create/update/delete`: Track operations
- `settings:update`: Project settings sync
- `cursor:position`: Collaborative cursor display
