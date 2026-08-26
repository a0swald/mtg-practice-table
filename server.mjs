import { createServer } from 'node:http';
import next from 'next';
import { Server } from 'socket.io';

const dev = !process.argv.includes('--production');
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = Number(process.env.PORT || 3100);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

const httpServer = createServer((req, res) => handle(req, res));
const io = new Server(httpServer, { path: '/socket.io' });

const rooms = new Map();

function roomCode() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const code = String(1000 + Math.floor(Math.random() * 9000));
    if (!rooms.has(code)) return code;
  }
  throw new Error('Could not allocate table code.');
}

function snapshot(room) {
  return {
    code: room.code,
    hostPlayerId: room.hostPlayerId,
    players: Array.from(room.players.values()),
    members: Array.from(room.members.values()).map(member => ({
      playerId: member.playerId,
      connected: member.connected,
      host: member.playerId === room.hostPlayerId,
    })),
  };
}

function usedColors(room) {
  return Array.from(room.players.values()).map(player => String(player.color || '').toLowerCase()).filter(Boolean);
}

function broadcast(room) {
  io.to(`table:${room.code}`).emit('shared:state', snapshot(room));
}

function attach(socket, room, playerId) {
  socket.join(`table:${room.code}`);
  socket.data.tableCode = room.code;
  socket.data.playerId = playerId;
  room.members.set(playerId, { playerId, socketId: socket.id, connected: true });
}

io.on('connection', socket => {
  socket.on('shared:create', ({ player }, ack) => {
    try {
      if (!player?.id) return ack?.({ ok: false, error: 'A player is required.' });
      const code = roomCode();
      const room = {
        code,
        hostPlayerId: player.id,
        players: new Map([[player.id, player]]),
        members: new Map(),
      };
      rooms.set(code, room);
      attach(socket, room, player.id);
      const data = snapshot(room);
      ack?.({ ok: true, room: data, playerId: player.id, host: true });
      broadcast(room);
    } catch (error) {
      ack?.({ ok: false, error: error instanceof Error ? error.message : 'Could not create table.' });
    }
  });

  socket.on('shared:preview', ({ code }, ack) => {
    const normalized = String(code || '').trim();
    const room = rooms.get(normalized);
    if (!room) return ack?.({ ok: false, error: 'Table code not found.', colors: [] });
    ack?.({ ok: true, colors: usedColors(room) });
  });

  socket.on('shared:join', ({ code, player }, ack) => {
    const normalized = String(code || '').trim();
    const room = rooms.get(normalized);
    if (!room) return ack?.({ ok: false, error: 'Table code not found.' });
    if (!player?.id) return ack?.({ ok: false, error: 'A player is required.' });
    const color = String(player.color || '').toLowerCase();
    if (!color) return ack?.({ ok: false, error: 'Choose a player color.' });
    if (usedColors(room).includes(color)) return ack?.({ ok: false, error: 'That player color is already taken.' });

    room.players.set(player.id, player);
    attach(socket, room, player.id);
    const data = snapshot(room);
    ack?.({ ok: true, room: data, playerId: player.id, host: player.id === room.hostPlayerId });
    broadcast(room);
  });

  socket.on('shared:rejoin', ({ code, playerId, player }, ack) => {
    const room = rooms.get(String(code || '').trim());
    if (!room || !room.players.has(playerId)) return ack?.({ ok: false, error: 'Shared table expired.' });
    if (player) room.players.set(playerId, { ...room.players.get(playerId), ...player, id: playerId });
    attach(socket, room, playerId);
    const data = snapshot(room);
    ack?.({ ok: true, room: data, playerId, host: playerId === room.hostPlayerId });
    broadcast(room);
  });

  socket.on('shared:player:update', ({ code, playerId, player }) => {
    const room = rooms.get(String(code || '').trim());
    if (!room || socket.data.tableCode !== room.code || socket.data.playerId !== playerId || !player) return;
    room.players.set(playerId, { ...player, id: playerId });
    broadcast(room);
  });

  socket.on('shared:leave', ({ code, playerId }) => {
    const room = rooms.get(String(code || '').trim());
    if (!room || socket.data.playerId !== playerId) return;
    room.members.delete(playerId);
    room.players.delete(playerId);
    socket.leave(`table:${room.code}`);
    socket.data.tableCode = undefined;
    socket.data.playerId = undefined;

    if (room.hostPlayerId === playerId) {
      room.hostPlayerId = room.players.keys().next().value;
    }
    if (room.players.size === 0) rooms.delete(room.code);
    else broadcast(room);
  });

  socket.on('disconnect', () => {
    const room = rooms.get(socket.data.tableCode);
    const playerId = socket.data.playerId;
    if (!room || !playerId) return;
    const member = room.members.get(playerId);
    if (member) room.members.set(playerId, { ...member, connected: false, socketId: undefined });
    broadcast(room);
  });
});

httpServer.listen(port, hostname, () => {
  console.log(`> MTG Practice Table ready on http://${hostname}:${port}`);
});
