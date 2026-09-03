'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, RotateCcw, ArrowLeft, Trophy, Flame, ShieldAlert, Snowflake, Shield, Zap, Swords } from 'lucide-react';
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
  isGold?: boolean;
}

interface PowerUpItem {
  id: string;
  type: 'freeze' | 'shield' | 'nuke';
  x: number;
  y: number;
  speed: number;
  icon: string;
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
    isFreezeActive,
    shieldCount,
    isFeverActive,
    currentWave,
    totalWaves,
    isBossWave,
    bossHp,
    initGame,
    startGame,
    handleCorrectHit,
    handleWrongHit,
    handleMissedWord,
    activateFreeze,
    addShield,
    endGame,
    resetGame,
    setWave,
  } = useGameStore();

  const { addXP } = useAuthStore();

  // Mode: 'typing' | 'choice'
  const [gameMode, setGameMode] = useState<'typing' | 'choice'>('typing');
  const [activeChoiceOptions, setActiveChoiceOptions] = useState<string[]>([]);
  const [targetMeteorForChoice, setTargetMeteorForChoice] = useState<Meteor | null>(null);

  // References for Animation Frame loop
  const meteorsRef = useRef<Meteor[]>([]);
  const powerUpsRef = useRef<PowerUpItem[]>([]);
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
    powerUpsRef.current = [];
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
        colors: ['#FF4820', '#121316', '#22D3EE', '#F59E0B'],
      });

      const earnedXP = score + 50;
      addXP(earnedXP);

      const updateSupabase = async () => {
        try {
          const supabase = createClient();
          const { data: userData } = await supabase.auth.getUser();
          if (userData?.user) {
            await supabase.from('game_sessions').insert({
              user_id: userData.user.id,
              deck_id: deck.id,
              game_type: 'meteor_defender',
              score,
              max_combo: maxCombo,
              words_attempted: wordsAttempted,
              words_correct: wordsCorrect,
              accuracy_percentage: wordsAttempted > 0 ? (wordsCorrect / wordsAttempted) * 100 : 100,
              xp_earned: earnedXP,
            });
          }
        } catch {}
      };
      updateSupabase();
    }
  }, [isVictory, score, maxCombo, wordsAttempted, wordsCorrect, deck.id, addXP]);

  // Trigger Nuke Effect
  const triggerNuke = useCallback(() => {
    soundEngine.playExplosion();
    // Spawn nuke particles
    const canvas = canvasRef.current;
    if (canvas) {
      for (let i = 0; i < 80; i++) {
        particlesRef.current.push({
          x: canvas.width / 2,
          y: canvas.height / 2,
          vx: (Math.random() - 0.5) * 18,
          vy: (Math.random() - 0.5) * 18,
          alpha: 1,
          color: '#FF4820',
          size: Math.random() * 8 + 3,
        });
      }
    }

    // Destroy all current meteors
    meteorsRef.current.forEach((m) => {
      handleCorrectHit(m.word, 50);
    });
    meteorsRef.current = [];
  }, [handleCorrectHit]);

  // Create Explosion Particles
  const createExplosion = useCallback((x: number, y: number, color = '#FF4820') => {
    for (let i = 0; i < 24; i++) {
      const angle = (Math.PI * 2 * i) / 24;
      const speed = Math.random() * 4 + 2;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        color,
        size: Math.random() * 4 + 2,
      });
    }
  }, []);

  // Spawn Power-Up Capsule when Gold Meteor is destroyed
  const spawnPowerUp = useCallback((x: number, y: number) => {
    const types: ('freeze' | 'shield' | 'nuke')[] = ['freeze', 'shield', 'nuke'];
    const selectedType = types[Math.floor(Math.random() * types.length)];
    const icons = { freeze: '❄️', shield: '🛡️', nuke: '💣' };

    powerUpsRef.current.push({
      id: Math.random().toString(),
      type: selectedType,
      x,
      y,
      speed: 1.5,
      icon: icons[selectedType],
    });
  }, []);

  // Spawn Meteor Routine
  const spawnMeteor = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (wordsQueueRef.current.length === 0) {
      if (meteorsRef.current.length === 0) {
        endGame(true);
      }
      return;
    }

    const nextWord = wordsQueueRef.current.shift();
    if (!nextWord) return;

    const isGold = Math.random() < 0.15; // 15% chance for Gold Meteor
    const meteorRadius = Math.max(36, Math.min(60, nextWord.term.length * 5 + 20));
    const margin = meteorRadius + 20;
    const spawnX = margin + Math.random() * (canvas.width - margin * 2);

    meteorsRef.current.push({
      id: Math.random().toString(),
      word: nextWord,
      x: spawnX,
      y: -meteorRadius,
      speed: Math.random() * 0.5 + 0.8 + (isGold ? 0.3 : 0),
      radius: meteorRadius,
      isTargeted: false,
      typedChars: 0,
      color: isGold ? '#F59E0B' : '#FFFFFF',
      isGold,
    });
  }, [endGame]);

  // Main 60 FPS Canvas Game Loop
  useEffect(() => {
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

    const updateAndRender = () => {
      if (isGameOver || isVictory) return;

      // Clear Canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Starfield Parallax Effect
      ctx.fillStyle = 'rgba(18, 19, 22, 0.95)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Render Freeze Blue Screen Glow if Freeze is Active
      if (isFreezeActive) {
        ctx.fillStyle = 'rgba(34, 211, 238, 0.08)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#22D3EE';
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
      }

      // Spawn Meteors Timer
      spawnTimerRef.current += 1;
      const spawnInterval = isFreezeActive ? 220 : 130;
      if (spawnTimerRef.current > spawnInterval) {
        spawnMeteor();
        spawnTimerRef.current = 0;
      }

      const cannonX = canvas.width / 2;
      const cannonY = canvas.height - 40;

      // Update & Render Laser Beams
      lasersRef.current.forEach((laser, idx) => {
        ctx.save();
        ctx.globalAlpha = laser.alpha;
        ctx.strokeStyle = isFeverActive ? '#EC4899' : laser.color;
        ctx.lineWidth = isFeverActive ? 6 : 3;
        ctx.shadowColor = laser.color;
        ctx.shadowBlur = 12;

        ctx.beginPath();
        ctx.moveTo(laser.startX, laser.startY);
        ctx.lineTo(laser.targetX, laser.targetY);
        ctx.stroke();
        ctx.restore();

        laser.alpha -= 0.05;
        if (laser.alpha <= 0) {
          lasersRef.current.splice(idx, 1);
        }
      });

      // Update & Render Meteors
      const speedMultiplier = isFreezeActive ? 0.3 : 1;

      for (let i = meteorsRef.current.length - 1; i >= 0; i--) {
        const m = meteorsRef.current[i];
        m.y += m.speed * speedMultiplier;

        // Render Meteor Pill Card
        ctx.save();
        ctx.shadowColor = m.isGold ? 'rgba(245, 158, 11, 0.6)' : m.isTargeted ? 'rgba(255, 72, 32, 0.5)' : 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = m.isTargeted || m.isGold ? 20 : 10;

        // Card Capsule Background
        const cardWidth = m.radius * 2.2;
        const cardHeight = 44;
        const cardX = m.x - cardWidth / 2;
        const cardY = m.y - cardHeight / 2;

        ctx.fillStyle = m.isGold ? '#FEF3C7' : m.isTargeted ? '#FFF1F0' : '#FFFFFF';
        ctx.strokeStyle = m.isGold ? '#F59E0B' : m.isTargeted ? '#FF4820' : '#E5E7EB';
        ctx.lineWidth = m.isTargeted || m.isGold ? 3 : 1.5;

        // Draw Rounded Pill Card
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 22);
        ctx.fill();
        ctx.stroke();

        // Render Word Term Text
        ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const term = m.word.term;
        const typedPart = term.substring(0, m.typedChars);
        const remainingPart = term.substring(m.typedChars);

        if (m.typedChars > 0) {
          ctx.fillStyle = '#FF4820';
          const typedWidth = ctx.measureText(typedPart).width;
          const totalWidth = ctx.measureText(term).width;
          const startX = m.x - totalWidth / 2;

          ctx.textAlign = 'left';
          ctx.fillText(typedPart, startX, m.y);
          ctx.fillStyle = '#121316';
          ctx.fillText(remainingPart, startX + typedWidth, m.y);
        } else {
          ctx.fillStyle = m.isGold ? '#B45309' : '#121316';
          ctx.fillText(term, m.x, m.y);
        }

        ctx.restore();

        // Check Bottom Boundary Collision
        if (m.y >= canvas.height - 60) {
          createExplosion(m.x, m.y, '#EF4444');
          handleMissedWord(m.word);
          meteorsRef.current.splice(i, 1);
        }
      }

      // Update & Render Dropped Power-Up Capsules
      for (let p = powerUpsRef.current.length - 1; p >= 0; p--) {
        const item = powerUpsRef.current[p];
        item.y += item.speed;

        ctx.save();
        ctx.shadowColor = 'rgba(34, 211, 238, 0.6)';
        ctx.shadowBlur = 12;

        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#22D3EE';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(item.x, item.y, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.icon, item.x, item.y);
        ctx.restore();

        // Check if power-up reaches bottom or is clicked
        if (item.y >= canvas.height - 40) {
          powerUpsRef.current.splice(p, 1);
        }
      }

      // Update & Render Particles
      particlesRef.current.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.02;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (p.alpha <= 0) {
          particlesRef.current.splice(idx, 1);
        }
      });

      // Render Bottom Turret Cannon
      ctx.save();
      ctx.fillStyle = '#121316';
      ctx.beginPath();
      ctx.arc(cannonX, cannonY + 20, 36, 0, Math.PI, true);
      ctx.fill();

      // Cannon Barrel
      ctx.fillStyle = '#FF4820';
      ctx.fillRect(cannonX - 6, cannonY - 15, 12, 25);
      ctx.restore();

      animationFrameId.current = requestAnimationFrame(updateAndRender);
    };

    animationFrameId.current = requestAnimationFrame(updateAndRender);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [
    isGameOver,
    isVictory,
    isFreezeActive,
    isFeverActive,
    spawnMeteor,
    createExplosion,
    handleMissedWord,
  ]);

  // Handle Typing Mode Input
  useEffect(() => {
    if (gameMode !== 'typing' || isGameOver || isVictory) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      if (key.length !== 1 || !/[A-Z]/.test(key)) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      let target = meteorsRef.current.find((m) => m.isTargeted);

      if (!target) {
        target = meteorsRef.current.find((m) => m.word.term.startsWith(key));
        if (target) {
          target.isTargeted = true;
        }
      }

      if (target) {
        const expectedChar = target.word.term[target.typedChars];
        if (key === expectedChar) {
          target.typedChars += 1;
          soundEngine.playLaser();

          lasersRef.current.push({
            startX: canvas.width / 2,
            startY: canvas.height - 40,
            targetX: target.x,
            targetY: target.y,
            alpha: 1,
            color: target.isGold ? '#F59E0B' : '#FF4820',
          });

          if (target.typedChars >= target.word.term.length) {
            createExplosion(target.x, target.y, target.isGold ? '#F59E0B' : '#FF4820');
            if (target.isGold) {
              spawnPowerUp(target.x, target.y);
            }
            handleCorrectHit(target.word);
            meteorsRef.current = meteorsRef.current.filter((m) => m.id !== target.id);
          }
        } else {
          handleWrongHit(target.word, key);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameMode, isGameOver, isVictory, createExplosion, spawnPowerUp, handleCorrectHit, handleWrongHit]);

  // Handle Choice Mode Target Selection
  useEffect(() => {
    if (gameMode !== 'choice' || isGameOver || isVictory) return;

    if (meteorsRef.current.length > 0 && !targetMeteorForChoice) {
      const activeMeteor = meteorsRef.current[0];
      setTargetMeteorForChoice(activeMeteor);

      const correct = activeMeteor.word.translation;
      const options = [correct];

      if (activeMeteor.word.distractors && activeMeteor.word.distractors.length > 0) {
        options.push(...activeMeteor.word.distractors.slice(0, 3));
      } else {
        const otherWords = words.filter((w) => w.id !== activeMeteor.word.id);
        const randomDistractors = otherWords
          .sort(() => Math.random() - 0.5)
          .slice(0, 3)
          .map((w) => w.translation);
        options.push(...randomDistractors);
      }

      setActiveChoiceOptions(options.sort(() => Math.random() - 0.5));
    }
  }, [gameMode, isGameOver, isVictory, targetMeteorForChoice, words]);

  const handleSelectChoice = (selectedTranslation: string) => {
    if (!targetMeteorForChoice) return;
    const canvas = canvasRef.current;

    if (selectedTranslation === targetMeteorForChoice.word.translation) {
      soundEngine.playLaser();
      if (canvas) {
        lasersRef.current.push({
          startX: canvas.width / 2,
          startY: canvas.height - 40,
          targetX: targetMeteorForChoice.x,
          targetY: targetMeteorForChoice.y,
          alpha: 1,
          color: '#FF4820',
        });
      }
      createExplosion(targetMeteorForChoice.x, targetMeteorForChoice.y);
      handleCorrectHit(targetMeteorForChoice.word);
      meteorsRef.current = meteorsRef.current.filter((m) => m.id !== targetMeteorForChoice.id);
    } else {
      handleWrongHit(targetMeteorForChoice.word, selectedTranslation);
    }

    setTargetMeteorForChoice(null);
    setActiveChoiceOptions([]);
  };

  // Launch Revenge Match (Focus ONLY on missed words)
  const handleLaunchRevengeMatch = () => {
    if (mistakes.length === 0) return;
    const revengeWords = mistakes.map((m) => m.word);

    resetGame();
    wordsQueueRef.current = [...revengeWords].sort(() => Math.random() - 0.5);
    meteorsRef.current = [];
    powerUpsRef.current = [];
    particlesRef.current = [];
    lasersRef.current = [];
    startGame();
  };

  return (
    <div className="relative w-full h-screen bg-[#121316] overflow-hidden select-none">
      {/* 2D Canvas Container */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0 cursor-crosshair" />

      {/* Top HUD Header */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4 pointer-events-none">
        {/* Left: Back Button & HP Hearts */}
        <div className="flex items-center gap-4 pointer-events-auto">
          <button
            onClick={() => router.push('/')}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all"
            title="Back to Lobby"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Hearts & Shield Indicator */}
          <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/10 px-3.5 py-1.5 rounded-full">
            {Array.from({ length: 3 }).map((_, idx) => (
              <Heart
                key={idx}
                className={`w-5 h-5 transition-all ${
                  idx < hp
                    ? 'text-[#FF4820] fill-[#FF4820] scale-100'
                    : 'text-gray-600 fill-gray-800 scale-90 opacity-40'
                }`}
              />
            ))}
            {shieldCount > 0 && (
              <div className="flex items-center gap-1 ml-1 text-cyan-400 font-bold text-xs">
                <Shield className="w-4 h-4 fill-cyan-400 text-cyan-400" />
                <span>+{shieldCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Center: Score & Power-up Active Status */}
        <div className="flex flex-col items-center">
          <div className="text-3xl font-black tracking-tight text-white font-mono drop-shadow-md">
            {score.toLocaleString()}
          </div>
          <div className="flex items-center gap-2 mt-1">
            {combo > 1 && (
              <div className="flex items-center gap-1 text-[11px] font-bold text-white bg-[#FF4820] px-3 py-0.5 rounded-full shadow-sm animate-bounce">
                <Flame className="w-3 h-3 fill-white" />
                <span>COMBO {combo}X</span>
              </div>
            )}
            {isFreezeActive && (
              <div className="flex items-center gap-1 text-[11px] font-bold text-white bg-cyan-500 px-3 py-0.5 rounded-full shadow-sm animate-pulse">
                <Snowflake className="w-3 h-3 text-white" />
                <span>CRYO FREEZE</span>
              </div>
            )}
            {isFeverActive && (
              <div className="flex items-center gap-1 text-[11px] font-bold text-white bg-fuchsia-600 px-3 py-0.5 rounded-full shadow-sm animate-pulse">
                <Zap className="w-3 h-3 fill-white" />
                <span>FEVER 3X</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Game Mode Switcher & Power-up Quick Bar */}
        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Nuke Button */}
          <button
            onClick={triggerNuke}
            className="px-3.5 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1 shadow-md transition-all active:scale-95"
            title="Quantum Nuke (Clear Screen)"
          >
            <span>💣 Nuke</span>
          </button>

          {/* Mode Switcher */}
          <div className="flex bg-white/10 backdrop-blur-md p-1 rounded-full border border-white/20">
            <button
              onClick={() => setGameMode('typing')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                gameMode === 'typing' ? 'bg-[#FF4820] text-white shadow-sm' : 'text-gray-300 hover:text-white'
              }`}
            >
              Typing Speed
            </button>
            <button
              onClick={() => setGameMode('choice')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                gameMode === 'choice' ? 'bg-[#FF4820] text-white shadow-sm' : 'text-gray-300 hover:text-white'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in zoom-in-95 duration-200">
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

            {/* Mistakes Review & Revenge Match */}
            {mistakes.length > 0 && (
              <div className="mb-6 text-left bg-orange-50 border border-orange-200 p-4 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] uppercase font-bold text-[#FF4820]">
                    Weak Words ({mistakes.length}):
                  </span>
                  <button
                    onClick={handleLaunchRevengeMatch}
                    className="px-3 py-1 rounded-full bg-[#FF4820] text-white text-xs font-bold flex items-center gap-1 shadow-sm hover:scale-105 transition-transform"
                  >
                    <Swords className="w-3.5 h-3.5" />
                    <span>Revenge Match ⚔️</span>
                  </button>
                </div>
                <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in zoom-in-95 duration-200">
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

            {/* Mistakes Review & Revenge Match */}
            {mistakes.length > 0 && (
              <div className="mb-6 text-left bg-rose-50 border border-rose-200 p-4 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] uppercase font-bold text-rose-600">
                    Missed Words ({mistakes.length}):
                  </span>
                  <button
                    onClick={handleLaunchRevengeMatch}
                    className="px-3.5 py-1.5 rounded-full bg-[#FF4820] text-white text-xs font-bold flex items-center gap-1 shadow-md hover:scale-105 transition-transform"
                  >
                    <Swords className="w-3.5 h-3.5" />
                    <span>Revenge Match ⚔️</span>
                  </button>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
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
