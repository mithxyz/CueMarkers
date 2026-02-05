const { Server } = require('socket.io');
const db = require('../db/knex');
const { registerHandlers } = require('./handlers');

function initSocket(httpServer, sessionMiddleware) {
  const io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
  });

  // Share session with Socket.IO
  io.engine.use(sessionMiddleware);

  // Auth middleware: require a valid session
  io.use(async (socket, next) => {
    const session = socket.request.session;
    if (!session || !session.userId) {
      return next(new Error('Authentication required'));
    }
    const user = await db('users').where({ id: session.userId }).select('id', 'display_name').first();
    if (!user) return next(new Error('User not found'));

    socket.userId = user.id;
    socket.displayName = user.display_name;
    next();
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (user: ${socket.displayName})`);
    registerHandlers(io, socket);
  });

  return io;
}

module.exports = { initSocket };
