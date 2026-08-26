'use client';

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { io, type Socket } from 'socket.io-client';

type UtilityPlayer = {
  id: string;
  name: string;
  color: string;
  backgroundImageUrl?: string;
  backgroundCardName?: string;
  life: number;
  poison: number;
  energy: number;
  experience: number;
  storm: number;
  commanderTax: number;
  sick: boolean;
  orientation?: 'auto' | 0 | 90 | 180 | 270;
  commanderDamage: Record<string, number>;
};

type UtilityState = {
  players: UtilityPlayer[];
  startingLife: number;
  activePlayerId?: string;
  monarchId?: string;
  initiativeId?: string;
  seconds: number;
  running: boolean;
  turn: number;
  started: boolean;
};

type RoomMember = { playerId: string; connected: boolean; host: boolean };
export type SharedRoom = { code: string; hostPlayerId?: string; players: UtilityPlayer[]; members: RoomMember[] };
export type SharedSession = { code: string; playerId: string; host: boolean };

type Ack = { ok: boolean; error?: string; room?: SharedRoom; playerId?: string; host?: boolean };
const SESSION_KEY = 'mtg-practice-shared-table-v1';

function newId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export function useSharedUtilityTable(state: UtilityState | undefined, setState: Dispatch<SetStateAction<UtilityState | undefined>>) {
  const socketRef = useRef<Socket | null>(null);
  const stateRef = useRef(state);
  const lastSentRef = useRef('');
  const [session, setSession] = useState<SharedSession | null>(null);
  const [room, setRoom] = useState<SharedRoom | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { stateRef.current = state; }, [state]);

  function applyRoom(nextRoom: SharedRoom) {
    setRoom(nextRoom);
    setState(current => current ? { ...current, players: nextRoom.players } : current);
  }

  useEffect(() => {
    const socket = io({ path: '/socket.io' });
    socketRef.current = socket;

    socket.on('shared:state', (nextRoom: SharedRoom) => applyRoom(nextRoom));
    socket.on('connect', () => {
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw) as SharedSession;
        const player = stateRef.current?.players.find(item => item.id === saved.playerId);
        socket.emit('shared:rejoin', { ...saved, player }, (ack: Ack) => {
          if (!ack.ok || !ack.room || !ack.playerId) {
            localStorage.removeItem(SESSION_KEY);
            return;
          }
          const next = { code: ack.room.code, playerId: ack.playerId, host: Boolean(ack.host) };
          setSession(next);
          applyRoom(ack.room);
        });
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [setState]);

  useEffect(() => {
    if (!session || !state || !socketRef.current?.connected) return;
    const player = state.players.find(item => item.id === session.playerId);
    if (!player) return;
    const serialized = JSON.stringify(player);
    if (serialized === lastSentRef.current) return;
    lastSentRef.current = serialized;
    socketRef.current.emit('shared:player:update', { code: session.code, playerId: session.playerId, player });
  }, [session, state]);

  async function host(name?: string) {
    const socket = socketRef.current;
    const base = stateRef.current?.players[0];
    if (!socket || !base) return;
    setBusy(true); setError('');
    const player = { ...base, name: name?.trim() || base.name };
    socket.emit('shared:create', { player }, (ack: Ack) => {
      setBusy(false);
      if (!ack.ok || !ack.room || !ack.playerId) { setError(ack.error || 'Could not host table.'); return; }
      const next = { code: ack.room.code, playerId: ack.playerId, host: true };
      localStorage.setItem(SESSION_KEY, JSON.stringify(next));
      setSession(next);
      applyRoom(ack.room);
    });
  }

  async function join(code: string, name: string) {
    const socket = socketRef.current;
    const base = stateRef.current?.players[0];
    if (!socket || !base) return;
    const normalized = code.replace(/\D/g, '').slice(0, 4);
    if (normalized.length !== 4) { setError('Enter the 4-digit table code.'); return; }
    setBusy(true); setError('');
    const player = { ...base, id: newId(), name: name.trim() || base.name, commanderDamage: {} };
    socket.emit('shared:join', { code: normalized, player }, (ack: Ack) => {
      setBusy(false);
      if (!ack.ok || !ack.room || !ack.playerId) { setError(ack.error || 'Could not join table.'); return; }
      const next = { code: ack.room.code, playerId: ack.playerId, host: Boolean(ack.host) };
      localStorage.setItem(SESSION_KEY, JSON.stringify(next));
      setSession(next);
      applyRoom(ack.room);
    });
  }

  function leave() {
    if (session) socketRef.current?.emit('shared:leave', { code: session.code, playerId: session.playerId });
    const own = stateRef.current?.players.find(player => player.id === session?.playerId);
    if (own) setState(current => current ? { ...current, players: [own] } : current);
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setRoom(null);
    setError('');
    lastSentRef.current = '';
  }

  const roster = useMemo(() => room?.players.map(player => {
    const member = room.members.find(item => item.playerId === player.id);
    return { ...player, connected: Boolean(member?.connected), host: Boolean(member?.host), you: player.id === session?.playerId };
  }) ?? [], [room, session?.playerId]);

  return { session, room, roster, busy, error, host, join, leave, clearError: () => setError('') };
}
