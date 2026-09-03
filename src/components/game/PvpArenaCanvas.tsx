'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Swords, Heart, ShieldAlert, Trophy, ArrowLeft, RefreshCw, Zap, Flame, User } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Deck, Word } from '@/types/database.types';
import { soundEngine } from '@/lib/audio/sound-synthesizer';
import { useAuthStore } from '@/stores/useAuthStore';
import { createClient } from '@/lib/supabase/client';

interface PvpArenaProps {
  deck: Deck;
  words: Word[];
}

interface Meteor {
  id: string;
  word: Word;
  x: number;
  y: number;
  speed: number;
  radius: number;
  isGlitch?: boolean;
  color: string;
}

export function PvpArenaCanvas({ deck, words }: PvpArenaProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { profile } = useAuthStore();

  // Matchmaking & Realtime State
  const [matchStatus, setMatchStatus] = useState<'searching' | 'connected' | 'ended'>('searching');
  const [opponentName, setOpponentName] = useState<string>('Opponent LexiBot 🐾');
  const [playerHp, setPlayerHp] = useState<number>(3);
  const [opponentHp, setOpponentHp] = useState<number>(3);
  const [playerScore, setPlayerScore] = useState<number>(0);
  const [opponentScore, setOpponentScore] = useState<number>(0);
  const [winner, setWinner] = useState<'player' | 'opponent' | null>(null);

  // Active Multiple Choice options for PvP
  const [activeMeteor, setActiveMeteor] = useState<Meteor | null>(null);
  const [choiceOptions, setChoiceOptions] = useState<string[]>([]);

  // Engine Refs
  const meteorsRef = useRef<Meteor[]>([]);
  const animationFrameId = useRef<number | null>(null);
  const channelRef = useRef<any>(null);
  const wordsQueueRef = useRef<Word[]>([...words]);

  // Connect to Supabase Realtime Channel
  useEffect(() => {
    const supabase = createClient();
    const roomChannel = supabase.channel('pvp_arena_global', {
      config: {
        broadcast: { self: false },
        presence: { key: profile?.display_name || 'Player' },
      },
    });

    channelRef.current = roomChannel;

    // Handle incoming broadcast events from Opponent
    roomChannel
      .on('broadcast', { event: 'pvp_hit' }, ({ payload }) => {
        setOpponentScore((prev) => prev + payload.scoreGain);
        soundEngine.playError(); // Glitch warning

        // Spawn a fast Glitch meteor on player's screen!
        if (canvasRef.current && payload.glitchWord) {
          meteorsRef.current.push({
            id: Math.random().toString(),
            word: payload.glitchWord,
            x: Math.random() * (canvasRef.current.width - 100) + 50,
            y: -40,
            speed: 2.2, // Fast glitch speed
            radius: 40,
            isGlitch: true,
            color: '#EF4444',
          });
        }
      })
      .on('broadcast', { event: 'pvp_hp_damage' }, ({ payload }) => {
        setOpponentHp(payload.remainingHp);
        if (payload.remainingHp <= 0) {
          setWinner('player');
          setMatchStatus('ended');
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const state = roomChannel.presenceState();
        const presences = Object.keys(state);
        if (presences.length >= 2) {
          setMatchStatus('connected');
          const oppKey = presences.find((k) => k !== (profile?.display_name || 'Player'));
          if (oppKey) setOpponentName(oppKey);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          roomChannel.track({ online_at: new Date().toISOString() });
          // Auto connect after 2.5s for demo resilience
          setTimeout(() => {
            setMatchStatus('connected');
          }, 2500);
        }
      });

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [profile?.display_name]);

  // Spawn Meteor Routine for PvP
  const spawnMeteor = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (wordsQueueRef.current.length === 0) {
      wordsQueueRef.current = [...words].sort(() => Math.random() - 0.5);
    }

    const nextWord = wordsQueueRef.current.shift();
    if (!nextWord) return;

    const meteorRadius = Math.max(36, Math.min(55, nextWord.term.length * 5 + 20));
    const spawnX = meteorRadius + Math.random() * (canvas.width - meteorRadius * 2);

    const newMeteor: Meteor = {
      id: Math.random().toString(),
      word: nextWord,
      x: spawnX,
      y: -meteorRadius,
      speed: 1.1,
      radius: meteorRadius,
      color: '#22D3EE',
    };

    meteorsRef.current.push(newMeteor);
  }, [words]);

  // Canvas Loop
  useEffect(() => {
    if (matchStatus !== 'connected') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    let frameCount = 0;

    const updateAndRender = () => {
      frameCount++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Cyberpunk Background
      ctx.fillStyle = '#0B0F19';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Spawn Meteors
      if (frameCount % 140 === 0) {
        spawnMeteor();
      }

      // Update & Render Meteors
      for (let i = meteorsRef.current.length - 1; i >= 0; i--) {
        const m = meteorsRef.current[i];
        m.y += m.speed;

        ctx.save();
        ctx.shadowColor = m.isGlitch ? '#EF4444' : '#22D3EE';
        ctx.shadowBlur = 15;

        // Card Pill
        const width = m.radius * 2.2;
        const height = 42;
        ctx.fillStyle = m.isGlitch ? '#FEF2F2' : '#FFFFFF';
        ctx.strokeStyle = m.isGlitch ? '#EF4444' : '#22D3EE';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.roundRect(m.x - width / 2, m.y - height / 2, width, height, 21);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = m.isGlitch ? '#DC2626' : '#121316';
        ctx.fillText(m.word.term, m.x, m.y);
        ctx.restore();

        // Boundary Collision
        if (m.y >= canvas.height - 60) {
          soundEngine.playError();
          setPlayerHp((prev) => {
            const nextHp = Math.max(0, prev - 1);
            if (nextHp <= 0) {
              setWinner('opponent');
              setMatchStatus('ended');
            }
            // Broadcast HP damage to Opponent
            if (channelRef.current) {
              channelRef.current.send({
                type: 'broadcast',
                event: 'pvp_hp_damage',
                payload: { remainingHp: nextHp },
              });
            }
            return nextHp;
          });
          meteorsRef.current.splice(i, 1);
        }
      }

      animationFrameId.current = requestAnimationFrame(updateAndRender);
    };

    animationFrameId.current = requestAnimationFrame(updateAndRender);

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [matchStatus, spawnMeteor]);

  // Choice Options Setup
  useEffect(() => {
    if (matchStatus !== 'connected') return;

    if (meteorsRef.current.length > 0 && !activeMeteor) {
      const target = meteorsRef.current[0];
      setActiveMeteor(target);

      const correct = target.word.translation;
      const options = [correct];
      const otherWords = words.filter((w) => w.id !== target.word.id);
      const randoms = otherWords
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((w) => w.translation);

      options.push(...randoms);
      setChoiceOptions(options.sort(() => Math.random() - 0.5));
    }
  }, [matchStatus, activeMeteor, words]);

  const handleSelectAnswer = (choice: string) => {
    if (!activeMeteor) return;

    if (choice === activeMeteor.word.translation) {
      soundEngine.playLaser();
      soundEngine.playExplosion();
      setPlayerScore((prev) => prev + 150);

      // Broadcast attack glitch meteor to opponent
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'pvp_hit',
          payload: {
            scoreGain: 150,
            glitchWord: activeMeteor.word,
          },
        });
      }

      meteorsRef.current = meteorsRef.current.filter((m) => m.id !== activeMeteor.id);
    } else {
      soundEngine.playError();
    }

    setActiveMeteor(null);
    setChoiceOptions([]);
  };

  return (
    <div className="relative w-full h-screen bg-[#0B0F19] text-white overflow-hidden select-none">
      {/* Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0 cursor-crosshair" />

      {/* Top 1v1 PvP Duel HUD */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-[#0B0F19] via-[#0B0F19]/80 to-transparent">
        {/* Player Stats */}
        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full">
          <div className="w-8 h-8 rounded-full bg-[#FF4820] flex items-center justify-center font-bold text-xs">
            🐾
          </div>
          <div>
            <div className="text-xs font-bold text-white">{profile?.display_name || 'You'}</div>
            <div className="flex items-center gap-1 mt-0.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <Heart
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i < playerHp ? 'text-[#FF4820] fill-[#FF4820]' : 'text-gray-600'
                  }`}
                />
              ))}
              <span className="text-xs font-mono font-bold text-amber-400 ml-2">
                {playerScore} pts
              </span>
            </div>
          </div>
        </div>

        {/* Center VS Badge */}
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-[#FF4820] text-white flex items-center justify-center font-black text-sm shadow-lg shadow-[#FF4820]/40 animate-pulse">
            VS
          </div>
          <span className="text-[10px] font-mono text-cyan-400 mt-1 uppercase font-bold">
            Realtime Broadcast
          </span>
        </div>

        {/* Opponent Stats */}
        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full text-right">
          <div>
            <div className="text-xs font-bold text-cyan-400">{opponentName}</div>
            <div className="flex items-center justify-end gap-1 mt-0.5">
              <span className="text-xs font-mono font-bold text-amber-400 mr-2">
                {opponentScore} pts
              </span>
              {Array.from({ length: 3 }).map((_, i) => (
                <Heart
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i < opponentHp ? 'text-cyan-400 fill-cyan-400' : 'text-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center font-bold text-xs">
            🤖
          </div>
        </div>
      </div>

      {/* Matchmaking Overlay */}
      {matchStatus === 'searching' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="text-center p-8 bg-[#121316] rounded-[36px] border border-white/20 max-w-sm">
            <RefreshCw className="w-10 h-10 text-[#FF4820] animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-extrabold text-white">Searching Opponent...</h3>
            <p className="text-xs text-gray-400 mt-1">Connecting via Supabase Realtime Channels</p>
          </div>
        </div>
      )}

      {/* Choice Buttons Bar */}
      {matchStatus === 'connected' && choiceOptions.length > 0 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-4">
          <div className="grid grid-cols-2 gap-2.5 bg-white/95 border border-black/5 rounded-[32px] p-3 shadow-2xl backdrop-blur-md">
            {choiceOptions.map((choice, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectAnswer(choice)}
                className="py-3.5 px-5 rounded-2xl bg-[#F3F4F6] hover:bg-gray-200 text-xs font-bold text-[#121316] transition-all active:scale-95 flex items-center justify-between"
              >
                <span className="truncate">{choice}</span>
                <span className="text-[10px] font-mono text-gray-400 px-1.5 py-0.5 rounded-full bg-white">
                  {idx + 1}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Match Result Overlay */}
      {matchStatus === 'ended' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-white text-[#121316] rounded-[36px] p-8 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-3xl bg-[#FF4820] text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#FF4820]/30">
              <Trophy className="w-8 h-8 fill-white" />
            </div>

            <h2 className="text-3xl font-black tracking-tight">
              {winner === 'player' ? 'VICTORY IN PVP ARENA!' : 'DEFEATED IN DUEL!'}
            </h2>
            <p className="text-xs text-gray-500 mt-1 mb-6">
              {winner === 'player'
                ? 'You outperformed your opponent in real-time speed battle 🏆'
                : 'Your opponent outpaced your defense in the arena.'}
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6 bg-[#F3F4F6] p-4 rounded-2xl">
              <div>
                <span className="text-[10px] font-bold uppercase text-gray-400">Your Score</span>
                <div className="text-xl font-mono font-black text-[#FF4820]">{playerScore}</div>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-gray-400">Opponent</span>
                <div className="text-xl font-mono font-black text-cyan-600">{opponentScore}</div>
              </div>
            </div>

            <button
              onClick={() => router.push('/')}
              className="w-full py-3.5 rounded-full bg-[#121316] text-white font-bold text-xs"
            >
              Back to Lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
