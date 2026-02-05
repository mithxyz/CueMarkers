const { Router } = require('express');
const db = require('../db/knex');
const { requireAuth } = require('../middleware/auth');

const router = Router();

// GET /api/v1/projects — list user's projects
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const projects = await db('projects')
      .join('project_members', 'projects.id', 'project_members.project_id')
      .where('project_members.user_id', req.session.userId)
      .select('projects.*', 'project_members.role')
      .orderBy('projects.updated_at', 'desc');
    res.json({ projects });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/projects — create project
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { name, description, export_id } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Project name is required' });

    const [project] = await db('projects')
      .insert({
        name: name.trim(),
        description: description || '',
        owner_id: req.session.userId,
        export_id: Number(export_id) || 101,
      })
      .returning('*');

    // Auto-add owner as member
    await db('project_members').insert({
      project_id: project.id,
      user_id: req.session.userId,
      role: 'owner',
      accepted_at: db.fn.now(),
    });

    res.status(201).json({ project });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/projects/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const member = await db('project_members')
      .where({ project_id: req.params.id, user_id: req.session.userId })
      .first();
    if (!member) return res.status(404).json({ error: 'Project not found' });

    const project = await db('projects').where({ id: req.params.id }).first();
    if (!project) return res.status(404).json({ error: 'Project not found' });

    res.json({ project, role: member.role });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/projects/:id
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const member = await db('project_members')
      .where({ project_id: req.params.id, user_id: req.session.userId })
      .first();
    if (!member || member.role === 'viewer') return res.status(403).json({ error: 'Forbidden' });

    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name.trim();
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.export_id !== undefined) updates.export_id = Number(req.body.export_id) || 101;
    updates.updated_at = db.fn.now();

    const [project] = await db('projects').where({ id: req.params.id }).update(updates).returning('*');
    res.json({ project });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/projects/:id
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const member = await db('project_members')
      .where({ project_id: req.params.id, user_id: req.session.userId })
      .first();
    if (!member || member.role !== 'owner') return res.status(403).json({ error: 'Only the owner can delete a project' });

    await db('projects').where({ id: req.params.id }).del();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
