'use client';

import React from 'react';
import { X, Volume2, Play } from 'lucide-react';
import { Deck, Word } from '@/types/database.types';
import { soundEngine } from '@/lib/audio/sound-synthesizer';

interface WordPreviewModalProps {
  deck: Deck;
  words: Word[];
  onClose: () => void;
  onStartGame: (deck: Deck) => void;
}

export function WordPreviewModal({ deck, words, onClose, onStartGame }: WordPreviewModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-white rounded-[36px] p-6 md:p-8 shadow-2xl border border-black/5 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-[#F3F4F6] text-[#FF4820]">
                Mission Intel
              </span>
              <span className="text-xs text-gray-400 font-mono">{words.length} Vocabulary Targets</span>
            </div>
            <h3 className="text-2xl font-extrabold text-[#121316] tracking-tight">{deck.title}</h3>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[#F3F4F6] hover:bg-gray-200 text-[#121316] flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Word List Scrollable Area */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
          {words.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              Loading vocabulary list...
            </div>
          ) : (
            words.map((word, idx) => (
              <div
                key={word.id || idx}
                className="group p-4 rounded-2xl bg-[#F3F4F6] hover:bg-[#EAEBED] border border-black/5 transition-all flex items-start justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-gray-400 w-5">
                      #{idx + 1}
                    </span>
                    <span className="font-extrabold text-lg text-[#121316] group-hover:text-[#FF4820] tracking-wide transition-colors">
                      {word.term}
                    </span>
                    {word.phonetic && (
                      <span className="text-xs font-mono text-gray-500 bg-white px-2 py-0.5 rounded-full border border-black/5">
                        {word.phonetic}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-emerald-700 pl-8">
                    {word.translation}
                  </p>
                  {word.example_sentence && (
                    <div className="pl-8 pt-1 text-xs text-gray-500 italic">
                      &quot;{word.example_sentence}&quot;
                      {word.example_translation && (
                        <span className="block text-gray-400 not-italic mt-0.5">
                          ↳ {word.example_translation}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Pronunciation audio button */}
                <button
                  onClick={() => soundEngine.speakWord(word.term)}
                  className="w-10 h-10 rounded-full bg-white hover:bg-[#FF4820] hover:text-white text-[#121316] border border-black/5 shadow-sm flex items-center justify-center transition-colors shrink-0"
                  title="Pronounce word"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-full bg-[#F3F4F6] hover:bg-gray-200 text-xs font-bold text-[#121316] transition-colors"
          >
            Close
          </button>

          <button
            onClick={() => {
              onClose();
              onStartGame(deck);
            }}
            className="px-7 py-3 rounded-full bg-[#FF4820] hover:bg-[#E63B14] text-xs font-bold text-white flex items-center gap-2 shadow-md shadow-[#FF4820]/30 transition-transform active:scale-95"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Start Game</span>
          </button>
        </div>
      </div>
    </div>
  );
}
