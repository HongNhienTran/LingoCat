'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, RotateCcw, ArrowLeft, Trophy, Flame, ShieldAlert } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Deck, Word } from '@/types/database.types';
import { soundEngine } from '@/lib/audio/sound-synthesizer';
import { useGameStore } from '@/stores/useGameStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { createClient } from '@/lib/supabase/client';

interface Meteor {
  id: string;
  word: Word;
  x: number;
  y: number;
  speed: number;
  radius: number;
  isTargeted: boolean;
  typedChars: number;
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
}

interface LaserBeam {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  alpha: number;
  color: string;
}

interface MeteorDefenderProps {
  deck: Deck;
  words: Word[];
}

export function MeteorDefenderCanvas({ deck, words }: MeteorDefenderProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const {
    hp,
    score,
    combo,
    maxCombo,
    isGameOver,
    isVictory,
    wordsAttempted,
    wordsCorrect,
    mistakes,
    initGame,
    startGame,
    handleCorrectHit,
    handleWrongHit,
    handleMissedWord,
    endGame,
    resetGame,
  } = useGameStore();

  const { addXP } = useAuthStore();

  // Mode: 'typing' | 'choice'
  const [gameMode, setGameMode] = useState<'typing' | 'choice'>('typing');
  const [activeChoiceOptions, setActiveChoiceOptions] = useState<string[]>([]);
  const [targetMeteorForChoice, setTargetMeteorForChoice] = useState<Meteor | null>(null);

  // References for Animation Frame loop
  const meteorsRef = useRef<Meteor[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const lasersRef = useRef<LaserBeam[]>([]);
  const animationFrameId = useRef<number | null>(null);
  const wordsQueueRef = useRef<Word[]>([...words]);
  const spawnTimerRef = useRef<number>(0);

  // Initialize and start game
  useEffect(() => {
    initGame('meteor_defender');
    startGame();
    wordsQueueRef.current = [...words].sort(() => Math.random() - 0.5);
    meteorsRef.current = [];
    particlesRef.current = [];
    lasersRef.current = [];
  }, [words, initGame, startGame]);

  // Handle victory confetti & XP update
  useEffect(() => {
    if (isVictory) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#FF4820', '#121316', '#10b981', '#f59e0b'],
      });
      const earnedXP = score + 50;
      addXP(earnedXP, maxCombo);

      // Log session to Supabase in background
      try {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) {
            supabase.from('game_sessions').insert({
              user_id: user.id,
              deck_id: deck.id,
              game_type: 'meteor_defender',
              score,
              max_combo: maxCombo,
              words_attempted: wordsAttempted,
              words_correct: wordsCorrect,
              accuracy_percentage: wordsAttempted > 0 ? (wordsCorrect / wordsAttempted) * 100 : 0,
              xp_earned: earnedXP,
            }).then(() => {});
          }
        });
      } catch {}
    }
  }, [isVictory, score, maxCombo, wordsAttempted, wordsCorrect, addXP, deck.id]);

  // Particle creator helper
  const spawnExplosion = useCallback((x: number, y: number, color: string) => {
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1.5;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        color,
        size: Math.random() * 3 + 2,
      });
    }
  }, []);

  // Update choices for Choice Mode
  useEffect(() => {
    if (gameMode === 'choice' && meteorsRef.current.length > 0) {
      const sorted = [...meteorsRef.current].sort((a, b) => b.y - a.y);
      const lowest = sorted[0];
      setTargetMeteorForChoice(lowest);

      const correctAnswer = lowest.word.translation;
      const distractors = lowest.word.distractors && lowest.word.distractors.length > 0
        ? lowest.word.distractors
        : ['Alternative Definition', 'Different Meaning', 'Not Related'];
      
      const allChoices = [correctAnswer, ...distractors.slice(0, 3)].sort(() => Math.random() - 0.5);
      setActiveChoiceOptions(allChoices);
    }
  }, [gameMode]);

  // Keyboard handler for Typing Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGameOver || isVictory) return;
      const key = e.key.toUpperCase();

      if (gameMode === 'typing') {
        if (key.length !== 1 || !/[A-Z]/.test(key)) return;

        let target = meteorsRef.current.find((m) => m.isTargeted);

        if (target) {
          const expectedChar = target.word.term.charAt(target.typedChars).toUpperCase();
          if (key === expectedChar) {
            target.typedChars += 1;
            soundEngine.playLaser(800 + target.typedChars * 80);

            lasersRef.current.push({
              startX: window.innerWidth / 2,
              startY: window.innerHeight - 80,
              targetX: target.x,
              targetY: target.y,
              alpha: 1,
              color: '#FF4820',
            });

            if (target.typedChars >= target.word.term.length) {
              spawnExplosion(target.x, target.y, '#FF4820');
              handleCorrectHit(target.word);
              meteorsRef.current = meteorsRef.current.filter((m) => m.id !== target?.id);

              if (meteorsRef.current.length === 0 && wordsQueueRef.current.length === 0) {
                endGame(true);
              }
            }
          } else {
            handleWrongHit(target.word, key);
          }
        } else {
          const match = meteorsRef.current.find(
            (m) => m.word.term.charAt(0).toUpperCase() === key
          );
          if (match) {
            match.isTargeted = true;
            match.typedChars = 1;
            soundEngine.playLaser(800);

            lasersRef.current.push({
              startX: window.innerWidth / 2,
              startY: window.innerHeight - 80,
              targetX: match.x,
              targetY: match.y,
              alpha: 1,
              color: '#FF4820',
            });

            if (match.typedChars >= match.word.term.length) {
              spawnExplosion(match.x, match.y, '#FF4820');
              handleCorrectHit(match.word);
              meteorsRef.current = meteorsRef.current.filter((m) => m.id !== match.id);

              if (meteorsRef.current.length === 0 && wordsQueueRef.current.length === 0) {
                endGame(true);
              }
            }
          } else {
            soundEngine.playError();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameMode, isGameOver, isVictory, handleCorrectHit, handleWrongHit, spawnExplosion, endGame]);

  // Choice mode click handler
  const handleSelectChoice = (chosenTranslation: string) => {
    if (!targetMeteorForChoice || isGameOver || isVictory) return;

    if (chosenTranslation === targetMeteorForChoice.word.translation) {
      spawnExplosion(targetMeteorForChoice.x, targetMeteorForChoice.y, '#10b981');
      lasersRef.current.push({
        startX: window.innerWidth / 2,
        startY: window.innerHeight - 80,
        targetX: targetMeteorForChoice.x,
        targetY: targetMeteorForChoice.y,
        alpha: 1,
        color: '#10b981',
      });
      handleCorrectHit(targetMeteorForChoice.word);
      meteorsRef.current = meteorsRef.current.filter((m) => m.id !== targetMeteorForChoice.id);

      if (meteorsRef.current.length === 0 && wordsQueueRef.current.length === 0) {
        endGame(true);
      } else {
        const sorted = [...meteorsRef.current].sort((a, b) => b.y - a.y);
        if (sorted.length > 0) {
          const next = sorted[0];
          setTargetMeteorForChoice(next);
          const correctAnswer = next.word.translation;
          const distractors = next.word.distractors?.length > 0 ? next.word.distractors : ['Different', 'Incorrect', 'Alternative'];
          setActiveChoiceOptions([correctAnswer, ...distractors.slice(0, 3)].sort(() => Math.random() - 0.5));
        }
      }
    } else {
      handleWrongHit(targetMeteorForChoice.word, chosenTranslation);
    }
  };

  // Main Canvas Render Loop (60 FPS)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Clean Modern Off-White Canvas Background
      ctx.fillStyle = '#F3F4F6';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Minimalist Grid Pattern
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.03)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Spawn Meteors periodically
      spawnTimerRef.current += dt;
      if (spawnTimerRef.current > 3.0 && wordsQueueRef.current.length > 0 && meteorsRef.current.length < 5) {
        spawnTimerRef.current = 0;
        const nextWord = wordsQueueRef.current.shift()!;
        const radius = Math.max(36, nextWord.term.length * 6 + 18);
        const minX = radius + 20;
        const maxX = canvas.width - radius - 20;
        const x = Math.random() * (maxX - minX) + minX;

        meteorsRef.current.push({
          id: Math.random().toString(36).substring(7),
          word: nextWord,
          x,
          y: -radius,
          speed: Math.random() * 20 + 35,
          radius,
          isTargeted: false,
          typedChars: 0,
          color: '#121316',
        });
      }

      // Update & Draw Meteors
      for (let i = meteorsRef.current.length - 1; i >= 0; i--) {
        const m = meteorsRef.current[i];
        m.y += m.speed * dt;

        if (m.y + m.radius >= canvas.height - 100) {
          spawnExplosion(m.x, m.y, '#FF4820');
          handleMissedWord(m.word);
          meteorsRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(m.x, m.y);

        // Shadow & Border
        ctx.shadowColor = m.isTargeted ? 'rgba(255, 72, 32, 0.35)' : 'rgba(0, 0, 0, 0.08)';
        ctx.shadowBlur = m.isTargeted ? 16 : 8;
        ctx.shadowOffsetY = 4;

        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = m.isTargeted ? '#FF4820' : 'rgba(0, 0, 0, 0.08)';
        ctx.lineWidth = m.isTargeted ? 2.5 : 1.5;

        const pillWidth = Math.max(110, m.word.term.length * 15 + 30);
        const pillHeight = 48;
        ctx.beginPath();
        ctx.roundRect(-pillWidth / 2, -pillHeight / 2, pillWidth, pillHeight, 24);
        ctx.fill();
        ctx.stroke();

        // Text rendering
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const term = m.word.term.toUpperCase();
        const typedPart = term.slice(0, m.typedChars);
        const remainingPart = term.slice(m.typedChars);

        ctx.font = 'bold 15px monospace';
        const totalWidth = ctx.measureText(term).width;
        let startX = -totalWidth / 2;

        if (typedPart) {
          ctx.fillStyle = '#FF4820';
          ctx.fillText(typedPart, startX + ctx.measureText(typedPart).width / 2, -4);
          startX += ctx.measureText(typedPart).width;
        }

        ctx.fillStyle = '#121316';
        ctx.fillText(remainingPart, startX + ctx.measureText(remainingPart).width / 2, -4);

        // Subtext / Translation hint
        ctx.font = '500 11px sans-serif';
        ctx.fillStyle = '#6B7280';
        const subtext = m.word.phonetic || m.word.translation;
        ctx.fillText(subtext, 0, 14);

        ctx.restore();
      }

      // Update & Draw Lasers
      for (let i = lasersRef.current.length - 1; i >= 0; i--) {
        const l = lasersRef.current[i];
        l.alpha -= dt * 4;
        if (l.alpha <= 0) {
          lasersRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.strokeStyle = l.color;
        ctx.lineWidth = 3.5 * l.alpha;
        ctx.globalAlpha = l.alpha;

        ctx.beginPath();
        ctx.moveTo(l.startX, l.startY);
        ctx.lineTo(l.targetX, l.targetY);
        ctx.stroke();
        ctx.restore();
      }

      // Update & Draw Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= dt * 2;
        if (p.alpha <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Bottom Turret Base
      const turretX = canvas.width / 2;
      const turretY = canvas.height - 40;

      ctx.save();
      ctx.fillStyle = '#121316';
      ctx.beginPath();
      ctx.arc(turretX, turretY + 20, 48, Math.PI, 0);
      ctx.fill();

      ctx.fillStyle = '#FF4820';
      ctx.beginPath();
      ctx.arc(turretX, turretY + 10, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (!isGameOver && !isVictory) {
        animationFrameId.current = requestAnimationFrame(render);
      }
    };

    animationFrameId.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [isGameOver, isVictory, handleMissedWord, spawnExplosion]);

  return (
    <div className="relative w-full h-screen bg-[#F3F4F6] overflow-hidden select-none">
      {/* 60 FPS HTML5 Game Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />

      {/* Top Game HUD */}
      <div className="absolute top-6 left-6 right-6 z-20 flex items-center justify-between pointer-events-none">
        {/* Left: Exit & Health Hearts */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            onClick={() => router.push('/')}
            className="w-11 h-11 rounded-full bg-white border border-black/5 text-[#121316] flex items-center justify-center shadow-sm hover:shadow transition-all"
            title="Return to Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1.5 bg-white border border-black/5 rounded-full px-4 py-2.5 shadow-sm">
            {[1, 2, 3].map((heartIndex) => (
              <Heart
                key={heartIndex}
                className={`w-5 h-5 transition-all duration-300 ${
                  heartIndex <= hp
                    ? 'text-[#FF4820] fill-[#FF4820] scale-100'
                    : 'text-gray-300 fill-gray-200 scale-90 opacity-40'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Center: Score & Combo Multiplier */}
        <div className="flex flex-col items-center">
          <div className="text-3xl font-black tracking-tight text-[#121316] font-mono">
            {score.toLocaleString()}
          </div>
          {combo > 1 && (
            <div className="flex items-center gap-1 text-[11px] font-bold text-white bg-[#FF4820] px-3 py-0.5 rounded-full mt-1 shadow-sm animate-bounce">
              <Flame className="w-3 h-3 fill-white" />
              <span>COMBO {combo}X</span>
            </div>
          )}
        </div>

        {/* Right: Mode Switcher */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex bg-white p-1 rounded-full border border-black/5 shadow-sm">
            <button
              onClick={() => setGameMode('typing')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                gameMode === 'typing'
                  ? 'bg-[#121316] text-white shadow-sm'
                  : 'text-gray-500 hover:text-[#121316]'
              }`}
            >
              Typing Speed
            </button>
            <button
              onClick={() => setGameMode('choice')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                gameMode === 'choice'
                  ? 'bg-[#FF4820] text-white shadow-sm'
                  : 'text-gray-500 hover:text-[#121316]'
              }`}
            >
              Multiple Choice
            </button>
          </div>
        </div>
      </div>

      {/* Choice Mode Bottom Control Bar */}
      {gameMode === 'choice' && activeChoiceOptions.length > 0 && !isGameOver && !isVictory && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-4 pointer-events-auto">
          <div className="grid grid-cols-2 gap-2.5 bg-white/95 border border-black/5 rounded-[32px] p-3 shadow-2xl backdrop-blur-md">
            {activeChoiceOptions.map((choice, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectChoice(choice)}
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

      {/* Victory Modal */}
      {isVictory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in-95 duration-200">
          <div className="w-full max-w-lg bg-white rounded-[36px] p-8 shadow-2xl border border-black/5 text-center relative overflow-hidden">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-[#FF4820] text-white mb-4 shadow-xl shadow-[#FF4820]/30 animate-bounce">
              <Trophy className="w-8 h-8 fill-white" />
            </div>

            <h2 className="text-3xl font-extrabold text-[#121316] tracking-tight mb-1">
              PERFECT VICTORY!
            </h2>
            <p className="text-xs text-gray-500 mb-6">
              You cleared all vocabulary obstacles and defended the LingoCat Arena 🐾
            </p>

            {/* Score Grid */}
            <div className="grid grid-cols-3 gap-3 bg-[#F3F4F6] p-4 rounded-2xl mb-6">
              <div>
                <span className="text-[11px] text-gray-400 uppercase font-bold">Score</span>
                <div className="text-xl font-black text-[#121316] font-mono">{score}</div>
              </div>
              <div>
                <span className="text-[11px] text-gray-400 uppercase font-bold">Max Combo</span>
                <div className="text-xl font-black text-[#FF4820] font-mono">{maxCombo}X</div>
              </div>
              <div>
                <span className="text-[11px] text-gray-400 uppercase font-bold">XP Earned</span>
                <div className="text-xl font-black text-emerald-600 font-mono">+{score + 50}</div>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  resetGame();
                  wordsQueueRef.current = [...words].sort(() => Math.random() - 0.5);
                  startGame();
                }}
                className="py-3.5 px-4 rounded-full bg-[#F3F4F6] hover:bg-gray-200 text-xs font-bold text-[#121316] transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Play Again</span>
              </button>

              <button
                onClick={() => router.push('/')}
                className="py-3.5 px-4 rounded-full bg-[#FF4820] hover:bg-[#E63B14] text-xs font-bold text-white transition-all shadow-md shadow-[#FF4820]/30"
              >
                <span>Back to Lobby</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {isGameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in-95 duration-200">
          <div className="w-full max-w-lg bg-white rounded-[36px] p-8 shadow-2xl border border-black/5 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-rose-100 mb-4">
              <ShieldAlert className="w-8 h-8 text-rose-500" />
            </div>

            <h2 className="text-3xl font-extrabold text-[#121316] tracking-tight mb-1">
              BASE DEFENSE BREACHED!
            </h2>
            <p className="text-xs text-gray-500 mb-6">
              Vocabulary meteors breached your defense perimeter
            </p>

            {/* Mistakes Review */}
            {mistakes.length > 0 && (
              <div className="mb-6 text-left bg-[#F3F4F6] p-4 rounded-2xl max-h-40 overflow-y-auto">
                <span className="text-[11px] uppercase font-bold text-rose-600 tracking-wider block mb-2">
                  Words to review ({mistakes.length}):
                </span>
                <div className="space-y-1.5">
                  {mistakes.map((m, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs text-gray-700">
                      <span className="font-bold text-[#121316]">{m.word.term}</span>
                      <span className="text-gray-500">{m.word.translation}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  resetGame();
                  wordsQueueRef.current = [...words].sort(() => Math.random() - 0.5);
                  startGame();
                }}
                className="py-3.5 px-4 rounded-full bg-[#121316] text-xs font-bold text-white transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retry Now</span>
              </button>

              <button
                onClick={() => router.push('/')}
                className="py-3.5 px-4 rounded-full bg-[#F3F4F6] hover:bg-gray-200 text-xs font-bold text-[#121316] transition-colors"
              >
                Back to Lobby
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
