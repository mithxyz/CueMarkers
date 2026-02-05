const { Router } = require('express');
const db = require('../db/knex');
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const s3 = require('../services/s3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const router = Router({ mergeParams: true });

// Middleware: verify project membership
async function verifyMember(req, res, next) {
  const member = await db('project_members')
    .where({ project_id: req.params.id, user_id: req.session.userId })
    .first();
  if (!member) return res.status(404).json({ error: 'Project not found' });
  req.memberRole = member.role;
  next();
}

// GET /api/v1/projects/:id/tracks
router.get('/', requireAuth, verifyMember, async (req, res, next) => {
  try {
    const tracks = await db('tracks')
      .where({ project_id: req.params.id })
      .orderBy('sort_order', 'asc');
    res.json({ tracks });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/projects/:id/tracks
router.post('/', requireAuth, verifyMember, async (req, res, next) => {
  try {
    if (req.memberRole === 'viewer') return res.status(403).json({ error: 'Viewers cannot create tracks' });

    const { name, media_type } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Track name is required' });

    const maxOrder = await db('tracks').where({ project_id: req.params.id }).max('sort_order as max').first();
    const sort_order = (maxOrder?.max ?? -1) + 1;

    const [track] = await db('tracks')
      .insert({
        project_id: req.params.id,
        name: name.trim(),
        media_type: media_type === 'video' ? 'video' : 'audio',
        sort_order,
      })
      .returning('*');
    res.status(201).json({ track });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/projects/:id/tracks/:trackId
router.get('/:trackId', requireAuth, verifyMember, async (req, res, next) => {
  try {
    const track = await db('tracks')
      .where({ id: req.params.trackId, project_id: req.params.id })
      .first();
    if (!track) return res.status(404).json({ error: 'Track not found' });
    res.json({ track });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/projects/:id/tracks/:trackId
router.patch('/:trackId', requireAuth, verifyMember, async (req, res, next) => {
  try {
    if (req.memberRole === 'viewer') return res.status(403).json({ error: 'Forbidden' });

    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name.trim();
    if (req.body.sort_order !== undefined) updates.sort_order = Number(req.body.sort_order);
    if (req.body.media_duration !== undefined) updates.media_duration = Number(req.body.media_duration);
    updates.updated_at = db.fn.now();

    const [track] = await db('tracks')
      .where({ id: req.params.trackId, project_id: req.params.id })
      .update(updates)
      .returning('*');
    if (!track) return res.status(404).json({ error: 'Track not found' });
    res.json({ track });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/projects/:id/tracks/:trackId
router.delete('/:trackId', requireAuth, verifyMember, async (req, res, next) => {
  try {
    if (req.memberRole === 'viewer') return res.status(403).json({ error: 'Forbidden' });

    const track = await db('tracks')
      .where({ id: req.params.trackId, project_id: req.params.id })
      .first();
    if (!track) return res.status(404).json({ error: 'Track not found' });

    // Delete S3 file if present
    if (track.media_s3_key) {
      try { await s3.deleteFile(track.media_s3_key); } catch (e) { /* ignore */ }
    }

    await db('tracks').where({ id: req.params.trackId }).del();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/projects/:id/tracks/:trackId/upload
router.post('/:trackId/upload', requireAuth, verifyMember, upload.single('media'), async (req, res, next) => {
  try {
    if (req.memberRole === 'viewer') return res.status(403).json({ error: 'Forbidden' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const track = await db('tracks')
      .where({ id: req.params.trackId, project_id: req.params.id })
      .first();
    if (!track) return res.status(404).json({ error: 'Track not found' });

    // Delete old S3 file
    if (track.media_s3_key) {
      try { await s3.deleteFile(track.media_s3_key); } catch (e) { /* ignore */ }
    }

    const ext = path.extname(req.file.originalname) || '.bin';
    const s3Key = `projects/${req.params.id}/tracks/${req.params.trackId}/${uuidv4()}${ext}`;
    await s3.uploadFile(s3Key, req.file.buffer, req.file.mimetype);

    const isVideo = /^video\//.test(req.file.mimetype);
    const [updated] = await db('tracks')
      .where({ id: req.params.trackId })
      .update({
        media_filename: req.file.originalname,
        media_s3_key: s3Key,
        media_size: req.file.size,
        media_type: isVideo ? 'video' : 'audio',
        updated_at: db.fn.now(),
      })
      .returning('*');

    res.json({ track: updated });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/projects/:id/tracks/:trackId/media
router.get('/:trackId/media', requireAuth, verifyMember, async (req, res, next) => {
  try {
    const track = await db('tracks')
      .where({ id: req.params.trackId, project_id: req.params.id })
      .first();
    if (!track || !track.media_s3_key) return res.status(404).json({ error: 'No media uploaded' });

    const url = await s3.getPresignedUrl(track.media_s3_key);
    res.json({ url, filename: track.media_filename, media_type: track.media_type });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
