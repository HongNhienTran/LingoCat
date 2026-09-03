'use client';

import React from 'react';
import { Sparkles, ChevronDown, Swords, Zap, Crosshair, ArrowUpRight } from 'lucide-react';
import { soundEngine } from '@/lib/audio/sound-synthesizer';

export interface GameModeInfo {
  id: string;
  name: string;
  badge: string;
  status: 'active' | 'coming_soon';
  icon: string;
  tagline: string;
}

export const GAME_MODES: GameModeInfo[] = [
  {
    id: 'meteor_defender',
    name: 'Meteor Defender',
    badge: 'LC-01 (Hero)',
    status: 'active',
    icon: '🚀',
    tagline: 'Shoot falling space obstacles with fast typing & smart choices',
  },
  {
    id: 'cyber_runner',
    name: 'Cyber Runner',
    badge: 'LC-02 (Runner)',
    status: 'active',
    icon: '🏃',
    tagline: 'Dodge incorrect doors and dash through right definitions',
  },
  {
    id: 'crossword_blitz',
    name: 'Crossword Blitz',
    badge: 'LC-03',
    status: 'coming_soon',
    icon: '🧩',
    tagline: 'Timed speed spelling with celestial letter blocks',
  },
  {
    id: 'pvp_arena',
    name: '1v1 PvP Arena',
    badge: 'Realtime ⚔️',
    status: 'active',
    icon: '⚔️',
    tagline: 'Live multiplayer duel powered by Supabase Realtime',
  },
];

interface TopCapsuleNavProps {
  selectedGame: string;
  onSelectGame: (gameId: string) => void;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  selectedDifficulty: string;
  onSelectDifficulty: (diff: string) => void;
  onQuickPlay: () => void;
}

export function TopCapsuleNav({
  selectedGame,
  onSelectGame,
  selectedCategory,
  onSelectCategory,
  selectedDifficulty,
  onSelectDifficulty,
  onQuickPlay,
}: TopCapsuleNavProps) {
  const categories = ['All', 'Academic', 'Technology', 'Conversational', 'General'];
  const difficulties = ['All Levels', 'beginner', 'intermediate', 'advanced'];

  return (
    <nav className="w-full flex flex-col md:flex-row items-center justify-between gap-3 px-4 py-2.5 bg-white/70 backdrop-blur-xl border border-white/60 rounded-full shadow-sm">
      {/* Left: Game Mode Selector Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full">
        {GAME_MODES.map((game) => {
          const isActive = selectedGame === game.id;
          return (
            <button
              key={game.id}
              onClick={() => {
                soundEngine.playPowerUp();
                onSelectGame(game.id);
              }}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#121316] text-white shadow-sm'
                  : 'bg-transparent text-[#121316]/70 hover:bg-black/5 hover:text-[#121316]'
              }`}
            >
              <span>{game.icon}</span>
              <span>{game.name}</span>
              {game.status === 'coming_soon' && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-orange-100 text-[#FF4820] font-normal">
                  Soon
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Right Filters & Quick Action */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Category Pill Selector */}
        <div className="relative inline-flex items-center">
          <select
            value={selectedCategory}
            onChange={(e) => {
              soundEngine.playLaser();
              onSelectCategory(e.target.value);
            }}
            className="appearance-none bg-black/5 hover:bg-black/10 text-[#121316] text-xs font-semibold px-4 py-2 pr-8 rounded-full border border-black/5 focus:outline-none cursor-pointer transition-colors"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                Topic: {c}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-gray-500 absolute right-3 pointer-events-none" />
        </div>

        {/* Quick Battle Button */}
        <button
          onClick={() => {
            soundEngine.playLaser();
            onQuickPlay();
          }}
          className="px-5 py-2 rounded-full bg-[#FF4820] hover:bg-[#E03E1A] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
        >
          <span>Start Battle</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </nav>
  );
}
