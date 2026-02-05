// Track which users are in which project rooms
const roomUsers = new Map(); // projectId -> Map<socketId, { userId, displayName }>

function joinRoom(projectId, socketId, userId, displayName) {
  if (!roomUsers.has(projectId)) roomUsers.set(projectId, new Map());
  roomUsers.get(projectId).set(socketId, { userId, displayName });
}

function leaveRoom(projectId, socketId) {
  const room = roomUsers.get(projectId);
  if (!room) return;
  room.delete(socketId);
  if (room.size === 0) roomUsers.delete(projectId);
}

function leaveAllRooms(socketId) {
  for (const [projectId, room] of roomUsers) {
    if (room.has(socketId)) {
      room.delete(socketId);
      if (room.size === 0) roomUsers.delete(projectId);
    }
  }
}

function getRoomUsers(projectId) {
  const room = roomUsers.get(projectId);
  if (!room) return [];
  // Deduplicate by userId
  const seen = new Set();
  const users = [];
  for (const info of room.values()) {
    if (!seen.has(info.userId)) {
      seen.add(info.userId);
      users.push(info);
    }
  }
  return users;
}

function getSocketProject(socketId) {
  for (const [projectId, room] of roomUsers) {
    if (room.has(socketId)) return projectId;
  }
  return null;
}

module.exports = { joinRoom, leaveRoom, leaveAllRooms, getRoomUsers, getSocketProject };
