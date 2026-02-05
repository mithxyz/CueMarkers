const { Router } = require('express');
const db = require('../db/knex');
const { requireAuth } = require('../middleware/auth');

const router = Router({ mergeParams: true });

// GET /api/v1/projects/:id/members
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const myMembership = await db('project_members')
      .where({ project_id: req.params.id, user_id: req.session.userId })
      .first();
    if (!myMembership) return res.status(404).json({ error: 'Project not found' });

    const members = await db('project_members')
      .join('users', 'project_members.user_id', 'users.id')
      .where('project_members.project_id', req.params.id)
      .select(
        'project_members.id',
        'project_members.user_id',
        'project_members.role',
        'project_members.invited_at',
        'project_members.accepted_at',
        'users.email',
        'users.display_name'
      );
    res.json({ members });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/projects/:id/members — invite by email
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const myMembership = await db('project_members')
      .where({ project_id: req.params.id, user_id: req.session.userId })
      .first();
    if (!myMembership || myMembership.role === 'viewer') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { email, role } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const memberRole = ['editor', 'viewer'].includes(role) ? role : 'viewer';

    const user = await db('users').where({ email: email.toLowerCase() }).first();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const existing = await db('project_members')
      .where({ project_id: req.params.id, user_id: user.id })
      .first();
    if (existing) return res.status(409).json({ error: 'User is already a member' });

    const [member] = await db('project_members')
      .insert({
        project_id: req.params.id,
        user_id: user.id,
        role: memberRole,
        accepted_at: db.fn.now(),
      })
      .returning('*');

    res.status(201).json({ member: { ...member, email: user.email, display_name: user.display_name } });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/projects/:id/members/:memberId
router.patch('/:memberId', requireAuth, async (req, res, next) => {
  try {
    const myMembership = await db('project_members')
      .where({ project_id: req.params.id, user_id: req.session.userId })
      .first();
    if (!myMembership || myMembership.role !== 'owner') {
      return res.status(403).json({ error: 'Only owner can change roles' });
    }

    const { role } = req.body;
    if (!['editor', 'viewer'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

    const target = await db('project_members').where({ id: req.params.memberId, project_id: req.params.id }).first();
    if (!target) return res.status(404).json({ error: 'Member not found' });
    if (target.role === 'owner') return res.status(400).json({ error: 'Cannot change owner role' });

    const [updated] = await db('project_members')
      .where({ id: req.params.memberId })
      .update({ role, updated_at: db.fn.now() })
      .returning('*');
    res.json({ member: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/projects/:id/members/:memberId
router.delete('/:memberId', requireAuth, async (req, res, next) => {
  try {
    const myMembership = await db('project_members')
      .where({ project_id: req.params.id, user_id: req.session.userId })
      .first();
    if (!myMembership || myMembership.role !== 'owner') {
      return res.status(403).json({ error: 'Only owner can remove members' });
    }

    const target = await db('project_members').where({ id: req.params.memberId, project_id: req.params.id }).first();
    if (!target) return res.status(404).json({ error: 'Member not found' });
    if (target.role === 'owner') return res.status(400).json({ error: 'Cannot remove the owner' });

    await db('project_members').where({ id: req.params.memberId }).del();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
