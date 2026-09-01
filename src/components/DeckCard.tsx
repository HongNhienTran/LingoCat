'use client';

import React from 'react';
import { Play, BookOpen, Layers, Award, Sparkles, GraduationCap, Cpu, Compass } from 'lucide-react';
import { Deck } from '@/types/database.types';
import { soundEngine } from '@/lib/audio/sound-synthesizer';

interface DeckCardProps {
  deck: Deck;
  isSelected?: boolean;
  onSelect: (deck: Deck) => void;
  onStartGame: (deck: Deck) => void;
  onPreviewWords: (deck: Deck) => void;
}

export function DeckCard({ deck, isSelected, onSelect, onStartGame, onPreviewWords }: DeckCardProps) {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'GraduationCap':
        return <GraduationCap className="w-5 h-5 text-[#121316]" />;
      case 'Cpu':
        return <Cpu className="w-5 h-5 text-[#121316]" />;
      case 'Compass':
        return <Compass className="w-5 h-5 text-[#121316]" />;
      default:
        return <Sparkles className="w-5 h-5 text-[#121316]" />;
    }
  };

  const getDifficultyTag = (diff: string) => {
    switch (diff) {
      case 'beginner':
        return 'Beginner';
      case 'intermediate':
        return 'Intermediate';
      case 'advanced':
        return 'Advanced';
      default:
        return 'Master';
    }
  };

  return (
    <div
      onClick={() => onSelect(deck)}
      className={`group relative bg-white rounded-[32px] p-7 transition-all duration-300 cursor-pointer border flex flex-col justify-between ${
        isSelected
          ? 'border-[#FF4820] shadow-xl shadow-[#FF4820]/10 scale-[1.01]'
          : 'border-black/5 hover:border-black/15 shadow-sm hover:shadow-md'
      }`}
    >
      <div>
        {/* Top Badges & Icon */}
        <div className="flex items-center justify-between mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#F3F4F6] flex items-center justify-center group-hover:scale-105 transition-transform">
            {getIcon(deck.icon_name)}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-gray-500 bg-[#F3F4F6] px-3 py-1 rounded-full uppercase tracking-wider">
              {getDifficultyTag(deck.difficulty)}
            </span>
            {deck.is_official && (
              <span className="text-[11px] font-bold text-white bg-[#121316] px-2.5 py-1 rounded-full flex items-center gap-1">
                <Award className="w-3 h-3 text-[#FF4820]" />
                Official
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <h4 className="text-xl font-extrabold text-[#121316] group-hover:text-[#FF4820] transition-colors line-clamp-1 mb-2">
          {deck.title}
        </h4>

        {/* Description */}
        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-6">
          {deck.description || 'Interactive vocabulary deck with native audio pronunciations and practical examples.'}
        </p>
      </div>

      {/* Footer Info & Actions */}
      <div>
        <div className="flex items-center justify-between py-3 border-t border-gray-100 text-xs text-gray-400 mb-4">
          <div className="flex items-center gap-1.5 font-semibold text-[#121316]">
            <Layers className="w-4 h-4 text-gray-400" />
            <span>{deck.word_count || 10} Words</span>
          </div>
          <span className="font-mono text-[11px] text-gray-400">
            {deck.play_count.toLocaleString()} plays
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              soundEngine.playPowerUp();
              onPreviewWords(deck);
            }}
            className="flex-1 py-3 px-4 rounded-full bg-[#F3F4F6] hover:bg-gray-200 text-xs font-bold text-[#121316] flex items-center justify-center gap-1.5 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            <span>Word Intel</span>
          </button>

          {/* Round Play Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              soundEngine.playLaser(1000);
              onStartGame(deck);
            }}
            className="w-12 h-12 rounded-full bg-[#FF4820] hover:bg-[#E63B14] text-white flex items-center justify-center transition-all shadow-md shadow-[#FF4820]/30 group-hover:scale-105 active:scale-95 shrink-0"
            title="Start game"
          >
            <Play className="w-5 h-5 fill-white ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
