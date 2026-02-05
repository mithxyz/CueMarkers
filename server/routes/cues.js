const { Router } = require('express');
const db = require('../db/knex');
const { requireAuth } = require('../middleware/auth');
const { validateCue } = require('../utils/validators');

const router = Router({ mergeParams: true });

async function verifyMember(req, res, next) {
  const member = await db('project_members')
    .where({ project_id: req.params.id, user_id: req.session.userId })
    .first();
  if (!member) return res.status(404).json({ error: 'Project not found' });
  req.memberRole = member.role;
  next();
}

async function verifyTrack(req, res, next) {
  const track = await db('tracks')
    .where({ id: req.params.trackId, project_id: req.params.id })
    .first();
  if (!track) return res.status(404).json({ error: 'Track not found' });
  req.track = track;
  next();
}

// GET /api/v1/projects/:id/tracks/:trackId/cues
router.get('/', requireAuth, verifyMember, verifyTrack, async (req, res, next) => {
  try {
    const cues = await db('cues')
      .where({ track_id: req.params.trackId })
      .orderBy('time', 'asc');
    res.json({ cues });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/projects/:id/tracks/:trackId/cues
router.post('/', requireAuth, verifyMember, verifyTrack, async (req, res, next) => {
  try {
    if (req.memberRole === 'viewer') return res.status(403).json({ error: 'Forbidden' });

    const errors = validateCue(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join(', ') });

    const maxOrder = await db('cues').where({ track_id: req.params.trackId }).max('sort_order as max').first();
    const sort_order = (maxOrder?.max ?? -1) + 1;

    const [cue] = await db('cues')
      .insert({
        track_id: req.params.trackId,
        name: req.body.name || 'Cue',
        time: Number(req.body.time) || 0,
        description: req.body.description || '',
        fade: Number(req.body.fade) || 0,
        marker_color: req.body.marker_color || '#ff4444',
        sort_order,
        created_by: req.session.userId,
      })
      .returning('*');

    res.status(201).json({ cue });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/projects/:id/tracks/:trackId/cues/batch
router.post('/batch', requireAuth, verifyMember, verifyTrack, async (req, res, next) => {
  try {
    if (req.memberRole === 'viewer') return res.status(403).json({ error: 'Forbidden' });
    const { cues: cueList } = req.body;
    if (!Array.isArray(cueList)) return res.status(400).json({ error: 'cues must be an array' });

    const maxOrder = await db('cues').where({ track_id: req.params.trackId }).max('sort_order as max').first();
    let order = (maxOrder?.max ?? -1) + 1;

    const rows = cueList.map((c) => ({
      track_id: req.params.trackId,
      name: c.name || c.title || 'Cue',
      time: Number(c.time) || 0,
      description: c.description || '',
      fade: Number(c.fade) || 0,
      marker_color: c.marker_color || c.markerColor || '#ff4444',
      sort_order: order++,
      created_by: req.session.userId,
    }));

    const inserted = await db('cues').insert(rows).returning('*');
    res.status(201).json({ cues: inserted });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/projects/:id/tracks/:trackId/cues/:cueId
router.get('/:cueId', requireAuth, verifyMember, verifyTrack, async (req, res, next) => {
  try {
    const cue = await db('cues')
      .where({ id: req.params.cueId, track_id: req.params.trackId })
      .first();
    if (!cue) return res.status(404).json({ error: 'Cue not found' });
    res.json({ cue });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/projects/:id/tracks/:trackId/cues/:cueId
router.patch('/:cueId', requireAuth, verifyMember, verifyTrack, async (req, res, next) => {
  try {
    if (req.memberRole === 'viewer') return res.status(403).json({ error: 'Forbidden' });

    const errors = validateCue(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join(', ') });

    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.time !== undefined) updates.time = Number(req.body.time);
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.fade !== undefined) updates.fade = Number(req.body.fade);
    if (req.body.marker_color !== undefined) updates.marker_color = req.body.marker_color;
    if (req.body.sort_order !== undefined) updates.sort_order = Number(req.body.sort_order);
    updates.updated_at = db.fn.now();

    const [cue] = await db('cues')
      .where({ id: req.params.cueId, track_id: req.params.trackId })
      .update(updates)
      .returning('*');
    if (!cue) return res.status(404).json({ error: 'Cue not found' });
    res.json({ cue });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/projects/:id/tracks/:trackId/cues/:cueId
router.delete('/:cueId', requireAuth, verifyMember, verifyTrack, async (req, res, next) => {
  try {
    if (req.memberRole === 'viewer') return res.status(403).json({ error: 'Forbidden' });

    const deleted = await db('cues')
      .where({ id: req.params.cueId, track_id: req.params.trackId })
      .del();
    if (!deleted) return res.status(404).json({ error: 'Cue not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
