const { Router } = require('express');
const db = require('../db/knex');
const { requireAuth } = require('../middleware/auth');
const exportService = require('../services/export');

const router = Router({ mergeParams: true });

async function verifyMember(req, res, next) {
  const member = await db('project_members')
    .where({ project_id: req.params.id, user_id: req.session.userId })
    .first();
  if (!member) return res.status(404).json({ error: 'Project not found' });
  req.memberRole = member.role;
  next();
}

async function loadProjectData(projectId) {
  const project = await db('projects').where({ id: projectId }).first();
  const tracks = await db('tracks').where({ project_id: projectId }).orderBy('sort_order', 'asc');
  const trackIds = tracks.map((t) => t.id);
  const allCues = trackIds.length ? await db('cues').whereIn('track_id', trackIds).orderBy('time', 'asc') : [];
  const cuesByTrack = {};
  for (const cue of allCues) {
    if (!cuesByTrack[cue.track_id]) cuesByTrack[cue.track_id] = [];
    cuesByTrack[cue.track_id].push(cue);
  }
  const settingsRow = await db('project_settings').where({ project_id: projectId }).first();
  const settings = settingsRow ? settingsRow.settings : {};
  return { project, tracks, cuesByTrack, settings };
}

// GET /api/v1/projects/:id/export/:format
router.get('/:format', requireAuth, verifyMember, async (req, res, next) => {
  try {
    const { project, tracks, cuesByTrack, settings } = await loadProjectData(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const exportId = Math.max(1, Number(project.export_id) || 101);
    const base = project.name;

    switch (req.params.format) {
      case 'json': {
        const data = exportService.buildJsonExport(project, tracks, cuesByTrack, settings);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${exportId}_${base}.json"`);
        return res.send(data);
      }
      case 'csv': {
        const data = exportService.buildCsvExport(project, tracks, cuesByTrack);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${exportId}_${base}.csv"`);
        return res.send(data);
      }
      case 'cuepoints-csv': {
        const data = exportService.buildCuepointsCsv(project, tracks, cuesByTrack);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${exportId}_${base}_cuepoints.csv"`);
        return res.send(data);
      }
      case 'markdown': {
        const data = exportService.buildMarkdownExport(project, tracks, cuesByTrack);
        res.setHeader('Content-Type', 'text/markdown');
        res.setHeader('Content-Disposition', `attachment; filename="${exportId}_${base}.md"`);
        return res.send(data);
      }
      case 'ma3-xml': {
        const data = exportService.buildMa3Xml(project, tracks, cuesByTrack, settings);
        if (!data) return res.status(400).json({ error: 'No cues to export' });
        res.setHeader('Content-Type', 'application/xml');
        res.setHeader('Content-Disposition', `attachment; filename="${exportId}_${base}_macro.xml"`);
        return res.send(data);
      }
      case 'zip': {
        const buffer = await exportService.buildZipExport(project, tracks, cuesByTrack, settings);
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${exportId}_${base}.zip"`);
        return res.send(buffer);
      }
      default:
        return res.status(400).json({ error: `Unknown format: ${req.params.format}` });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
