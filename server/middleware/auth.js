const db = require('../db/knex');

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

function requireRole(...roles) {
  return async (req, res, next) => {
    const projectId = req.params.id || req.params.projectId;
    const userId = req.session.userId;
    if (!projectId || !userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    try {
      const member = await db('project_members')
        .where({ project_id: projectId, user_id: userId })
        .first();
      if (!member || !roles.includes(member.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      req.memberRole = member.role;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requireAuth, requireRole };
