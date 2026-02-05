const db = require('../db/knex');
const rooms = require('./rooms');

function registerHandlers(io, socket) {
  const userId = socket.userId;
  const displayName = socket.displayName;

  // join-project
  socket.on('join-project', async (data) => {
    const { projectId } = data || {};
    if (!projectId) return;

    // Verify membership
    const member = await db('project_members')
      .where({ project_id: projectId, user_id: userId })
      .first();
    if (!member) {
      socket.emit('error', { message: 'Not a member of this project' });
      return;
    }

    // Leave any current room
    rooms.leaveAllRooms(socket.id);
    const currentRooms = [...socket.rooms].filter((r) => r.startsWith('project:'));
    for (const r of currentRooms) socket.leave(r);

    // Join new room
    const roomName = `project:${projectId}`;
    socket.join(roomName);
    rooms.joinRoom(projectId, socket.id, userId, displayName);

    // Send full project state
    const project = await db('projects').where({ id: projectId }).first();
    const tracks = await db('tracks').where({ project_id: projectId }).orderBy('sort_order', 'asc');
    const trackIds = tracks.map((t) => t.id);
    const cues = trackIds.length ? await db('cues').whereIn('track_id', trackIds).orderBy('time', 'asc') : [];
    const settingsRow = await db('project_settings').where({ project_id: projectId }).first();
    const members = await db('project_members')
      .join('users', 'project_members.user_id', 'users.id')
      .where('project_members.project_id', projectId)
      .select('project_members.*', 'users.email', 'users.display_name');

    socket.emit('project:state', {
      project,
      tracks,
      cues,
      settings: settingsRow ? settingsRow.settings : {},
      members,
      onlineUsers: rooms.getRoomUsers(projectId),
    });

    // Notify others
    socket.to(roomName).emit('member:joined', { userId, displayName });
  });

  // leave-project
  socket.on('leave-project', () => {
    const projectId = rooms.getSocketProject(socket.id);
    if (projectId) {
      rooms.leaveRoom(projectId, socket.id);
      socket.leave(`project:${projectId}`);
      socket.to(`project:${projectId}`).emit('member:left', { userId, displayName });
    }
  });

  // cue:create
  socket.on('cue:create', async (data) => {
    const projectId = rooms.getSocketProject(socket.id);
    if (!projectId) return;

    const member = await db('project_members').where({ project_id: projectId, user_id: userId }).first();
    if (!member || member.role === 'viewer') return;

    const maxOrder = await db('cues').where({ track_id: data.track_id }).max('sort_order as max').first();
    const [cue] = await db('cues')
      .insert({
        track_id: data.track_id,
        name: data.name || 'Cue',
        time: Number(data.time) || 0,
        description: data.description || '',
        fade: Number(data.fade) || 0,
        marker_color: data.marker_color || '#ff4444',
        sort_order: (maxOrder?.max ?? -1) + 1,
        created_by: userId,
      })
      .returning('*');

    io.to(`project:${projectId}`).emit('cue:created', { cue, userId });
  });

  // cue:update
  socket.on('cue:update', async (data) => {
    const projectId = rooms.getSocketProject(socket.id);
    if (!projectId) return;

    const member = await db('project_members').where({ project_id: projectId, user_id: userId }).first();
    if (!member || member.role === 'viewer') return;

    const updates = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.time !== undefined) updates.time = Number(data.time);
    if (data.description !== undefined) updates.description = data.description;
    if (data.fade !== undefined) updates.fade = Number(data.fade);
    if (data.marker_color !== undefined) updates.marker_color = data.marker_color;
    if (data.sort_order !== undefined) updates.sort_order = Number(data.sort_order);
    updates.updated_at = db.fn.now();

    const [cue] = await db('cues').where({ id: data.id }).update(updates).returning('*');
    if (cue) {
      io.to(`project:${projectId}`).emit('cue:updated', { cue, userId });
    }
  });

  // cue:delete
  socket.on('cue:delete', async (data) => {
    const projectId = rooms.getSocketProject(socket.id);
    if (!projectId) return;

    const member = await db('project_members').where({ project_id: projectId, user_id: userId }).first();
    if (!member || member.role === 'viewer') return;

    await db('cues').where({ id: data.id }).del();
    io.to(`project:${projectId}`).emit('cue:deleted', { id: data.id, userId });
  });

  // cue:move
  socket.on('cue:move', async (data) => {
    const projectId = rooms.getSocketProject(socket.id);
    if (!projectId) return;

    const member = await db('project_members').where({ project_id: projectId, user_id: userId }).first();
    if (!member || member.role === 'viewer') return;

    const [cue] = await db('cues')
      .where({ id: data.id })
      .update({ time: Number(data.time), updated_at: db.fn.now() })
      .returning('*');
    if (cue) {
      io.to(`project:${projectId}`).emit('cue:moved', { cue, userId });
    }
  });

  // track:create
  socket.on('track:create', async (data) => {
    const projectId = rooms.getSocketProject(socket.id);
    if (!projectId) return;

    const member = await db('project_members').where({ project_id: projectId, user_id: userId }).first();
    if (!member || member.role === 'viewer') return;

    const maxOrder = await db('tracks').where({ project_id: projectId }).max('sort_order as max').first();
    const [track] = await db('tracks')
      .insert({
        project_id: projectId,
        name: data.name || 'New Track',
        media_type: data.media_type === 'video' ? 'video' : 'audio',
        sort_order: (maxOrder?.max ?? -1) + 1,
      })
      .returning('*');

    io.to(`project:${projectId}`).emit('track:created', { track, userId });
  });

  // track:update
  socket.on('track:update', async (data) => {
    const projectId = rooms.getSocketProject(socket.id);
    if (!projectId) return;

    const member = await db('project_members').where({ project_id: projectId, user_id: userId }).first();
    if (!member || member.role === 'viewer') return;

    const updates = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.sort_order !== undefined) updates.sort_order = Number(data.sort_order);
    updates.updated_at = db.fn.now();

    const [track] = await db('tracks').where({ id: data.id, project_id: projectId }).update(updates).returning('*');
    if (track) {
      io.to(`project:${projectId}`).emit('track:updated', { track, userId });
    }
  });

  // track:delete
  socket.on('track:delete', async (data) => {
    const projectId = rooms.getSocketProject(socket.id);
    if (!projectId) return;

    const member = await db('project_members').where({ project_id: projectId, user_id: userId }).first();
    if (!member || member.role === 'viewer') return;

    await db('tracks').where({ id: data.id, project_id: projectId }).del();
    io.to(`project:${projectId}`).emit('track:deleted', { id: data.id, userId });
  });

  // settings:update
  socket.on('settings:update', async (data) => {
    const projectId = rooms.getSocketProject(socket.id);
    if (!projectId) return;

    const member = await db('project_members').where({ project_id: projectId, user_id: userId }).first();
    if (!member || member.role === 'viewer') return;

    const existing = await db('project_settings').where({ project_id: projectId }).first();
    const merged = { ...(existing ? existing.settings : {}), ...data.settings };

    if (existing) {
      await db('project_settings')
        .where({ project_id: projectId })
        .update({ settings: JSON.stringify(merged), updated_at: db.fn.now() });
    } else {
      await db('project_settings').insert({ project_id: projectId, settings: JSON.stringify(merged) });
    }

    io.to(`project:${projectId}`).emit('settings:updated', { settings: merged, userId });
  });

  // cursor:position
  socket.on('cursor:position', (data) => {
    const projectId = rooms.getSocketProject(socket.id);
    if (!projectId) return;
    socket.to(`project:${projectId}`).emit('cursor:update', {
      userId,
      displayName,
      time: data.time,
      trackId: data.trackId,
    });
  });

  // disconnect
  socket.on('disconnect', () => {
    const projectId = rooms.getSocketProject(socket.id);
    if (projectId) {
      rooms.leaveRoom(projectId, socket.id);
      socket.to(`project:${projectId}`).emit('member:left', { userId, displayName });
    }
    rooms.leaveAllRooms(socket.id);
  });
}

module.exports = { registerHandlers };
