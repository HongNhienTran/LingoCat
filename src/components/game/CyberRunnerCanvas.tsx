'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Heart, Trophy, Gauge } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Deck, Word } from '@/types/database.types';
import { soundEngine } from '@/lib/audio/sound-synthesizer';

interface CyberRunnerProps {
  deck: Deck;
  words: Word[];
}

interface Gate {
  id: string;
  word: Word;
  lane: number; // 0: Left, 1: Center, 2: Right
  translation: string;
  isCorrect: boolean;
  z: number; // Distance depth
}

export type SpeedOption = 'slow' | 'normal' | 'fast';

export function CyberRunnerCanvas({ deck, words }: CyberRunnerProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [playerLane, setPlayerLane] = useState<number>(1); // 0, 1, 2
  const [hp, setHp] = useState<number>(3);
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isVictory, setIsVictory] = useState<boolean>(false);
  const [currentWord, setCurrentWord] = useState<Word | null>(null);

  // Speed Control State: 'slow' | 'normal' | 'fast'
  const [gameSpeed, setGameSpeed] = useState<SpeedOption>('slow');

  const gatesRef = useRef<Gate[]>([]);
  const animationFrameId = useRef<number | null>(null);
  const wordsQueueRef = useRef<Word[]>([...words]);

  // Speed Multiplier Calculations
  const speedMultipliers: Record<SpeedOption, number> = {
    slow: 0.8,    // 🐢 Slow comfortable pace
    normal: 1.3,  // ⚡ Normal pace
    fast: 2.0,    // 🚀 Fast challenge
  };

  const spawnIntervals: Record<SpeedOption, number> = {
    slow: 260,    // Longer gap between gates
    normal: 190,
    fast: 130,
  };

  const baseSpeed = 1.4;

  // Initialize Word Queue
  useEffect(() => {
    wordsQueueRef.current = [...words].sort(() => Math.random() - 0.5);
    if (wordsQueueRef.current.length > 0) {
      setCurrentWord(wordsQueueRef.current[0]);
    }
  }, [words]);

  // Handle Lane Switching Input
  const moveLeft = useCallback(() => {
    setPlayerLane((prev) => Math.max(0, prev - 1));
    soundEngine.playLaser();
  }, []);

  const moveRight = useCallback(() => {
    setPlayerLane((prev) => Math.min(2, prev + 1));
    soundEngine.playLaser();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        moveLeft();
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        moveRight();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveLeft, moveRight]);

  // Spawn Gate Group Routine
  const spawnGateGroup = useCallback(() => {
    if (wordsQueueRef.current.length === 0) {
      setIsVictory(true);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      return;
    }

    const targetWord = wordsQueueRef.current.shift();
    if (!targetWord) return;
    setCurrentWord(targetWord);

    const correctTranslation = targetWord.translation;
    const otherWords = words.filter((w) => w.id !== targetWord.id);
    const randoms = otherWords
      .sort(() => Math.random() - 0.5)
      .slice(0, 2)
      .map((w) => w.translation);

    const options = [correctTranslation, ...randoms].sort(() => Math.random() - 0.5);

    // Spawn 3 gates across 3 lanes at depth z = 900
    options.forEach((opt, laneIdx) => {
      gatesRef.current.push({
        id: Math.random().toString(),
        word: targetWord,
        lane: laneIdx,
        translation: opt,
        isCorrect: opt === correctTranslation,
        z: 900,
      });
    });
  }, [words]);

  // Main 60 FPS Infinite Runner Canvas Loop
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

    let frameCount = 0;

    const updateAndRender = () => {
      if (isGameOver || isVictory) return;
      frameCount++;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Cyberpunk Highway Gradient Background
      const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bgGradient.addColorStop(0, '#0B0F19');
      bgGradient.addColorStop(0.6, '#1E1B4B');
      bgGradient.addColorStop(1, '#311042');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Render 3D Perspective Road Lanes
      const horizonY = canvas.height * 0.45;
      const laneWidths = [canvas.width * 0.25, canvas.width * 0.5, canvas.width * 0.75];

      ctx.strokeStyle = 'rgba(34, 211, 238, 0.4)';
      ctx.lineWidth = 2;
      [0.15, 0.38, 0.62, 0.85].forEach((ratio) => {
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, horizonY);
        ctx.lineTo(canvas.width * ratio, canvas.height);
        ctx.stroke();
      });

      // Dynamic Spawn Interval based on selected Game Speed
      const interval = spawnIntervals[gameSpeed];
      if (frameCount % interval === 0 || gatesRef.current.length === 0) {
        spawnGateGroup();
      }

      const currentStepSpeed = baseSpeed * speedMultipliers[gameSpeed];

      // Update & Render Perspective Gates
      for (let i = gatesRef.current.length - 1; i >= 0; i--) {
        const g = gatesRef.current[i];
        g.z -= currentStepSpeed;

        // Perspective Math Scale
        const scale = 1 - g.z / 900;
        const gateY = horizonY + (canvas.height - horizonY) * scale;
        const targetX = laneWidths[g.lane];
        const gateX = canvas.width / 2 + (targetX - canvas.width / 2) * scale;
        const gateW = 130 * scale;
        const gateH = 85 * scale;

        if (g.z > 0 && scale > 0.05) {
          ctx.save();
          ctx.shadowColor = g.isCorrect ? '#22D3EE' : '#FF4820';
          ctx.shadowBlur = 15 * scale;

          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.strokeStyle = g.isCorrect ? '#22D3EE' : '#FF4820';
          ctx.lineWidth = 3 * scale;

          ctx.beginPath();
          ctx.roundRect(gateX - gateW / 2, gateY - gateH / 2, gateW, gateH, 14 * scale);
          ctx.fill();
          ctx.stroke();

          if (scale > 0.3) {
            ctx.font = `bold ${Math.max(11, Math.floor(14 * scale))}px "Plus Jakarta Sans", sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#121316';
            ctx.fillText(g.translation, gateX, gateY);
          }
          ctx.restore();
        }

        // Check Collision with Player when gate reaches z <= 20
        if (g.z <= 20) {
          if (g.lane === playerLane) {
            if (g.isCorrect) {
              soundEngine.playExplosion();
              soundEngine.speakWord(g.word.term);
              setScore((prev) => prev + 100 * (combo + 1));
              setCombo((prev) => prev + 1);
            } else {
              soundEngine.playError();
              setCombo(0);
              setHp((prev) => {
                const nextHp = Math.max(0, prev - 1);
                if (nextHp <= 0) setIsGameOver(true);
                return nextHp;
              });
            }
          }
          gatesRef.current.splice(i, 1);
        }
      }

      // Render Player Character (LingoCat Cyber Mascot)
      const playerX = laneWidths[playerLane];
      const playerY = canvas.height - 70;

      ctx.save();
      ctx.shadowColor = '#FF4820';
      ctx.shadowBlur = 20;

      ctx.fillStyle = '#FF4820';
      ctx.beginPath();
      ctx.arc(playerX, playerY, 26, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🐾', playerX, playerY);
      ctx.restore();

      animationFrameId.current = requestAnimationFrame(updateAndRender);
    };

    animationFrameId.current = requestAnimationFrame(updateAndRender);

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [isGameOver, isVictory, playerLane, combo, gameSpeed, spawnGateGroup]);

  return (
    <div className="relative w-full h-screen bg-[#0B0F19] text-white overflow-hidden select-none">
      {/* Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0 cursor-pointer" />

      {/* Top Runner HUD */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-[#0B0F19] to-transparent pointer-events-none">
        {/* Left: Back & Hearts */}
        <div className="flex items-center gap-4 pointer-events-auto">
          <button
            onClick={() => router.push('/')}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/10 px-3.5 py-1.5 rounded-full">
            {Array.from({ length: 3 }).map((_, idx) => (
              <Heart
                key={idx}
                className={`w-5 h-5 ${
                  idx < hp ? 'text-[#FF4820] fill-[#FF4820]' : 'text-gray-600 fill-gray-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Center Target Word */}
        {currentWord && (
          <div className="bg-white/90 text-[#121316] px-6 py-2 rounded-full border border-white font-extrabold text-sm shadow-xl flex items-center gap-2">
            <span className="text-[#FF4820]">Target:</span>
            <span className="text-base tracking-wide font-mono uppercase">{currentWord.term}</span>
          </div>
        )}

        {/* Right: Speed Control & Score */}
        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Speed Selector Pill */}
          <div className="flex bg-white/10 backdrop-blur-md p-1 rounded-full border border-white/20 text-xs font-bold">
            <button
              onClick={() => setGameSpeed('slow')}
              className={`px-3 py-1 rounded-full transition-all flex items-center gap-1 ${
                gameSpeed === 'slow' ? 'bg-[#FF4820] text-white shadow-sm' : 'text-gray-300 hover:text-white'
              }`}
            >
              <span>🐢 Slow</span>
            </button>
            <button
              onClick={() => setGameSpeed('normal')}
              className={`px-3 py-1 rounded-full transition-all flex items-center gap-1 ${
                gameSpeed === 'normal' ? 'bg-[#FF4820] text-white shadow-sm' : 'text-gray-300 hover:text-white'
              }`}
            >
              <span>⚡ Normal</span>
            </button>
            <button
              onClick={() => setGameSpeed('fast')}
              className={`px-3 py-1 rounded-full transition-all flex items-center gap-1 ${
                gameSpeed === 'fast' ? 'bg-[#FF4820] text-white shadow-sm' : 'text-gray-300 hover:text-white'
              }`}
            >
              <span>🚀 Fast</span>
            </button>
          </div>

          <div className="text-right">
            <div className="text-2xl font-black font-mono text-white">{score}</div>
            {combo > 1 && (
              <span className="text-[10px] font-bold text-white bg-[#FF4820] px-2.5 py-0.5 rounded-full">
                {combo}X BOOST
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Touch Control Buttons */}
      <div className="absolute bottom-6 left-0 right-0 z-30 flex items-center justify-between px-8 pointer-events-auto md:hidden">
        <button
          onClick={moveLeft}
          className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border border-white/40 text-white font-bold text-xl active:scale-95"
        >
          ◄
        </button>
        <button
          onClick={moveRight}
          className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border border-white/40 text-white font-bold text-xl active:scale-95"
        >
          ►
        </button>
      </div>

      {/* Victory / Defeat Overlay */}
      {(isGameOver || isVictory) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-white text-[#121316] rounded-[36px] p-8 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-3xl bg-[#FF4820] text-white flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 fill-white" />
            </div>

            <h2 className="text-3xl font-black">
              {isVictory ? 'RUNNER COMPLETED!' : 'CRASHED IN RUN!'}
            </h2>
            <p className="text-xs text-gray-500 mt-1 mb-6">
              {isVictory
                ? 'You dashed through all vocabulary gates with cyber speed 🏃'
                : 'You collided with incorrect definition gates.'}
            </p>

            <div className="text-3xl font-black font-mono text-[#FF4820] mb-6">{score} PTS</div>

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
