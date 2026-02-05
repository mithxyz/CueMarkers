# CueMarkers Quick Start Guide

Get the collaborative cue timing tool running locally in 5 minutes.

## Prerequisites

- Node.js 20+ (or 18 for basic usage, AWS SDK prefers 20+)
- Docker & Docker Compose (for PostgreSQL + MinIO)
- Git

## Setup Steps

### 1. Start Database Services

```bash
cd /root/CueMarkers
docker-compose up -d
```

This starts:
- **PostgreSQL 16** on `localhost:5432` (credentials: `cuemarkers:cuemarkers`)
- **MinIO** (S3-compatible) on `localhost:9000` and `localhost:9001`

Verify services are running:
```bash
docker-compose ps
```

### 2. Create Environment Configuration

```bash
cp .env.example .env
```

The `.env.example` file contains sensible defaults for local development. Key variables:
- `PORT=3000` — Server port
- `SESSION_SECRET=dev-secret` — Session encryption key
- `DATABASE_URL=postgresql://cuemarkers:cuemarkers@localhost/cuemarkers` — Database connection
- `S3_*` — MinIO credentials (default: minioadmin/minioadmin)

### 3. Install Dependencies

```bash
npm install
```

Installs all server and client dependencies. Takes 1-2 minutes.

### 4. Run Database Migrations

```bash
npm run migrate
```

Creates all tables:
- `users` — User accounts
- `projects` — Collaborative projects
- `project_members` — Access control and roles
- `tracks` — Media tracks (audio/video)
- `cues` — Timecoded cues
- `project_settings` — Project configuration (JSONB)

### 5. Seed Test Data (Optional but Recommended)

```bash
npm run seed
```

Creates:
- **3 test users**:
  - `alice@example.com` (password: `password123`)
  - `bob@example.com` (password: `password123`)
  - `charlie@example.com` (password: `password123`)
- **3 test projects** with different roles
- **4 test tracks** across projects
- **17 sample cues** with realistic timing and colors
- **Project settings** for each project

### 6. Start the Server

```bash
npm run dev
```

Server starts with auto-reload on file changes. You should see:
```
✓ Express server running on http://localhost:3000
✓ Socket.IO ready
✓ PostgreSQL connected
✓ S3 service initialized
```

### 7. Open the Application

Visit **http://localhost:3000** in your browser.

## First Time Usage

### Login
1. Use any of the test credentials above
2. Or register a new account

### Create a Project
1. Click "New Project" on the dashboard
2. Enter name and description
3. Project is created with you as owner

### Add Media
1. Open a project
2. In the first track, click upload area or drag/drop audio file
3. File uploads to MinIO S3
4. Waveform generates automatically

### Add Cues
1. Click on waveform to add a cue
2. Or right-click existing cue to edit
3. Changes sync in real-time to other users

### Invite Collaborators
1. Click "Share" button on project card
2. Enter collaborator email
3. Select role: owner/editor/viewer
4. They accept invitation and get access

## Testing Multi-User Collaboration

Open the same project in two browser tabs/windows:

1. **Tab A**: Add a cue at 10 seconds
2. **Tab B**: Cue appears immediately (real-time sync via WebSocket)
3. **Tab A**: Add another cue, edit first cue's name
4. **Tab B**: All changes appear live with notifications

## Project Structure

```
├── server/                    # Node.js backend
│   ├── index.js              # Express + Socket.IO entry
│   ├── routes/               # REST API endpoints
│   ├── socket/               # WebSocket handlers
│   ├── services/             # Business logic (exports, S3)
│   └── db/migrations/        # Database schema
│
├── client/                    # Web SPA (vanilla JS)
│   ├── index.html            # Entry point
│   ├── styles.css            # Theme and UI
│   └── js/                   # Views, API, state
│
├── script.js                 # Original MusicCueApp class
├── package.json              # Dependencies and scripts
├── knexfile.js              # Database configuration
├── docker-compose.yml        # PostgreSQL + MinIO
└── .env                      # Local environment
```

## Useful Commands

```bash
# View test credentials
npm run seed

# Reset database (careful!)
npm run migrate:rollback && npm run migrate && npm run seed

# Check database tables
psql postgresql://cuemarkers:cuemarkers@localhost/cuemarkers -c "\dt"

# Tail server logs
docker logs -f cuemarkers_postgres_1

# MinIO console (file browser)
# http://localhost:9001 (credentials: minioadmin/minioadmin)
```

## Troubleshooting

### Connection refused on port 3000
- Server not running, check `npm run dev` output
- Port 3000 in use, change `PORT` in `.env`

### "ECONNREFUSED" database errors
- PostgreSQL not running, check `docker-compose ps`
- Wrong credentials in `.env`, verify against `docker-compose.yml`

### Waveform not loading
- Media file not uploaded yet, click upload area
- Audio format not supported by browser (WAV, MP3, OGG, FLAC OK)

### Cues not syncing in real-time
- WebSocket connection failed, check browser console
- Server log should show "Socket.IO ready"
- Try refreshing page and re-opening project

### S3 upload fails
- MinIO not running, check `docker-compose ps`
- Check `.env` S3 credentials match MinIO defaults

## Development Notes

- **Auto-reload**: Server restarts when file changes (thanks to `node --watch`)
- **Database migrations**: Run automatically on `npm run migrate`, reversible via `migrate:rollback`
- **Session persistence**: Sessions stored in PostgreSQL via `connect-pg-simple`
- **Presigned URLs**: Media served directly from S3 via 1-hour presigned URLs
- **Conflict resolution**: Last-write-wins with field-level merging on simultaneous edits

## Next Steps

1. **Explore the codebase**: Read `CLAUDE.md` for architecture overview
2. **Run tests**: Create a test suite (recommended: Jest + Supertest for API)
3. **Deploy**: Use Docker, set PostgreSQL backup, configure real AWS S3
4. **Extend features**: See STATUS.md for Phase 3+ enhancements

## Support

For detailed architecture, see:
- `CLAUDE.md` — Developer guidance
- `IMPLEMENTATION_SUMMARY.md` — Complete feature list
- `STATUS.md` — Deployment checklist

For bugs or questions, file an issue on GitHub.

---

**Happy cueing!** 🎬
