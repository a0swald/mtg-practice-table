import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import next from 'next';
import { Server } from 'socket.io';

const dev = !process.argv.includes('--production');
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = Number(process.env.PORT || 3100);
const dataDir = process.env.MTG_DATA_DIR || '/app/data';
const remoteFile = path.join(dataDir, 'remote-access.json');
const gateFile = path.join(dataDir, 'access-gate.json');
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();
await app.prepare();

async function jsonFile(file) { try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return null; } }
function requestHost(req) { return String(req.headers['x-forwarded-host'] || req.headers.host || '').split(':')[0].toLowerCase(); }
function cookie(req, name) { const raw = String(req.headers.cookie || ''); const item = raw.split(';').map(v => v.trim()).find(v => v.startsWith(`${name}=`)); return item ? decodeURIComponent(item.slice(name.length + 1)) : ''; }
function accessToken(gate) { return createHash('sha256').update(`mtg-access:${gate.salt}:${gate.pinHash}`).digest('hex'); }
async function publicContext(req) {
  const remote = await jsonFile(remoteFile); const gate = await jsonFile(gateFile);
  const publicHost = remote?.domain ? `${remote.domain}.duckdns.org`.toLowerCase() : '';
  const isPublic = Boolean(publicHost && requestHost(req) === publicHost);
  const unlocked = !gate?.enabled || cookie(req, 'mtg_public_access') === accessToken(gate);
  return { isPublic, unlocked };
}

const httpServer = createServer(async (req, res) => {
  const { isPublic, unlocked } = await publicContext(req);
  const url = String(req.url || '/');
  if (isPublic && (url.startsWith('/api/remote-access') || (url.startsWith('/api/access-gate') && !url.startsWith('/api/access-gate/unlock')))) {
    res.writeHead(403, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: 'Host settings are available from local Umbrel access only.' })); return;
  }
  const allowed = url.startsWith('/access') || url.startsWith('/api/access-gate/unlock') || url.startsWith('/_next/') || url === '/favicon.ico';
  if (isPublic && !unlocked && !allowed && !url.startsWith('/socket.io')) { res.writeHead(302, { location: '/access' }); res.end(); return; }
  handle(req, res);
});

const io = new Server(httpServer, { path: '/socket.io', allowRequest: async (req, callback) => { try { const { isPublic, unlocked } = await publicContext(req); callback(null, !isPublic || unlocked); } catch { callback(null, false); } } });
const rooms = new Map();
function roomCode() { for (let attempt = 0; attempt < 100; attempt += 1) { const code = String(1000 + Math.floor(Math.random() * 9000)); if (!rooms.has(code)) return code; } throw new Error('Could not allocate table code.'); }
function snapshot(room) { return { code: room.code, hostPlayerId: room.hostPlayerId, players: Array.from(room.players.values()), members: Array.from(room.members.values()).map(member => ({ playerId: member.playerId, connected: member.connected, host: member.playerId === room.hostPlayerId })) }; }
function usedColors(room) { return Array.from(room.players.values()).map(player => String(player.color || '').toLowerCase()).filter(Boolean); }
function broadcast(room) { io.to(`table:${room.code}`).emit('shared:state', snapshot(room)); }
function attach(socket, room, playerId) { socket.join(`table:${room.code}`); socket.data.tableCode = room.code; socket.data.playerId = playerId; room.members.set(playerId, { playerId, socketId: socket.id, connected: true }); }
io.on('connection', socket => {
  socket.on('shared:create', ({ player }, ack) => { try { if (!player?.id) return ack?.({ ok:false,error:'A player is required.' }); const code=roomCode(); const room={code,hostPlayerId:player.id,players:new Map([[player.id,player]]),members:new Map()}; rooms.set(code,room); attach(socket,room,player.id); const data=snapshot(room); ack?.({ok:true,room:data,playerId:player.id,host:true}); broadcast(room); } catch(error){ ack?.({ok:false,error:error instanceof Error?error.message:'Could not create table.'}); } });
  socket.on('shared:preview', ({code},ack)=>{const room=rooms.get(String(code||'').trim()); if(!room)return ack?.({ok:false,error:'Table code not found.',colors:[]}); ack?.({ok:true,colors:usedColors(room)});});
  socket.on('shared:join',({code,player},ack)=>{const room=rooms.get(String(code||'').trim()); if(!room)return ack?.({ok:false,error:'Table code not found.'}); if(!player?.id)return ack?.({ok:false,error:'A player is required.'}); const color=String(player.color||'').toLowerCase(); if(!color)return ack?.({ok:false,error:'Choose a player color.'}); if(usedColors(room).includes(color))return ack?.({ok:false,error:'That player color is already taken.'}); room.players.set(player.id,player); attach(socket,room,player.id); const data=snapshot(room); ack?.({ok:true,room:data,playerId:player.id,host:player.id===room.hostPlayerId}); broadcast(room);});
  socket.on('shared:rejoin',({code,playerId,player},ack)=>{const room=rooms.get(String(code||'').trim()); if(!room||!room.players.has(playerId))return ack?.({ok:false,error:'Shared table expired.'}); if(player)room.players.set(playerId,{...room.players.get(playerId),...player,id:playerId}); attach(socket,room,playerId); const data=snapshot(room); ack?.({ok:true,room:data,playerId,host:playerId===room.hostPlayerId}); broadcast(room);});
  socket.on('shared:player:update',({code,playerId,player})=>{const room=rooms.get(String(code||'').trim()); if(!room||socket.data.tableCode!==room.code||socket.data.playerId!==playerId||!player)return; room.players.set(playerId,{...player,id:playerId}); broadcast(room);});
  socket.on('shared:leave',({code,playerId})=>{const room=rooms.get(String(code||'').trim()); if(!room||socket.data.playerId!==playerId)return; room.members.delete(playerId); room.players.delete(playerId); socket.leave(`table:${room.code}`); socket.data.tableCode=undefined; socket.data.playerId=undefined; if(room.hostPlayerId===playerId)room.hostPlayerId=room.players.keys().next().value; if(room.players.size===0)rooms.delete(room.code); else broadcast(room);});
  socket.on('disconnect',()=>{const room=rooms.get(socket.data.tableCode); const playerId=socket.data.playerId; if(!room||!playerId)return; const member=room.members.get(playerId); if(member)room.members.set(playerId,{...member,connected:false,socketId:undefined}); broadcast(room);});
});
httpServer.listen(port,hostname,()=>console.log(`> MTG Practice Table ready on http://${hostname}:${port}`));
