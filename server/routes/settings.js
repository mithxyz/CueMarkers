const { Router } = require('express');
const db = require('../db/knex');
const { requireAuth } = require('../middleware/auth');

const router = Router({ mergeParams: true });

const DEFAULT_SETTINGS = {
  pauseOnCuePopup: true,
  showCueNumbers: true,
  useFadeTimes: true,
  useMarkerColor: true,
  keepPlayheadInView: true,
  ma3Id: 101,
  ma3Trigger: 'Go+',
  ma3OverrideEnabled: false,
  ma3OverrideId: 101,
  ma3UseSeparateIds: false,
  ma3SeqId: 101,
  ma3TcId: 101,
  ma3PageId: 101,
  projectTitle: '',
};

async function verifyMember(req, res, next) {
  const member = await db('project_members')
    .where({ project_id: req.params.id, user_id: req.session.userId })
    .first();
  if (!member) return res.status(404).json({ error: 'Project not found' });
  req.memberRole = member.role;
  next();
}

// GET /api/v1/projects/:id/settings
router.get('/', requireAuth, verifyMember, async (req, res, next) => {
  try {
    const row = await db('project_settings').where({ project_id: req.params.id }).first();
    const settings = row ? { ...DEFAULT_SETTINGS, ...row.settings } : { ...DEFAULT_SETTINGS };
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/projects/:id/settings
router.patch('/', requireAuth, verifyMember, async (req, res, next) => {
  try {
    if (req.memberRole === 'viewer') return res.status(403).json({ error: 'Forbidden' });

    const existing = await db('project_settings').where({ project_id: req.params.id }).first();
    const merged = { ...(existing ? existing.settings : DEFAULT_SETTINGS), ...req.body.settings };

    if (existing) {
      await db('project_settings')
        .where({ project_id: req.params.id })
        .update({ settings: JSON.stringify(merged), updated_at: db.fn.now() });
    } else {
      await db('project_settings').insert({
        project_id: req.params.id,
        settings: JSON.stringify(merged),
      });
    }

    res.json({ settings: merged });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
