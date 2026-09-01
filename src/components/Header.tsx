'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Volume2, VolumeX, Flame, User, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { soundEngine } from '@/lib/audio/sound-synthesizer';
import { AuthModal } from './AuthModal';

export function Header() {
  const { profile, isGuest, signOut } = useAuthStore();
  const [isMuted, setIsMuted] = useState(soundEngine.getIsMuted());
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleToggleSound = () => {
    const nextMuted = soundEngine.toggleMute();
    setIsMuted(nextMuted);
    if (!nextMuted) {
      soundEngine.playPowerUp();
    }
  };

  return (
    <>
      <header className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-4 transition-all">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Circular Search + Nav Links */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => {
                const searchEl = document.getElementById('search-deck-input');
                searchEl?.focus();
              }}
              className="w-10 h-10 rounded-full bg-[#121316] text-white flex items-center justify-center hover:bg-black transition-transform active:scale-95 shadow-sm"
              title="Search vocabulary decks"
            >
              <Search className="w-4 h-4" />
            </button>

            <nav className="hidden md:flex items-center gap-6 text-[13px] font-medium text-[#4B5563]">
              <Link href="#decks" className="hover:text-[#121316] transition-colors">
                Decks
              </Link>
              <Link href="#mini-games" className="hover:text-[#121316] transition-colors">
                Mini-Games
              </Link>
              <Link href="#importer" className="hover:text-[#121316] transition-colors">
                Import Decks
              </Link>
              <Link href="#ranking" className="hover:text-[#121316] transition-colors">
                Leaderboard
              </Link>
            </nav>
          </div>

          {/* Center: Brand Logo with LingoCat Image & Text */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative w-9 h-9 rounded-2xl overflow-hidden shadow-sm border border-black/5 group-hover:scale-105 transition-transform bg-white">
              <Image
                src="/images/Logo.png"
                alt="LingoCat Logo"
                fill
                priority
                className="object-cover"
                sizes="36px"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tight leading-none flex items-center">
                <span className="text-[#374151]">Lingo</span>
                <span className="text-[#FF4820]">Cat</span>
                <span className="text-[10px] ml-1 px-1.5 py-0.2 rounded-full bg-[#FF4820]/10 text-[#FF4820] font-bold">
                  🐾
                </span>
              </span>
              <span className="text-[9px] font-medium text-gray-400 -mt-0.5 tracking-wider hidden sm:block">
                Learn English, build your world
              </span>
            </div>
          </Link>

          {/* Right: Sound Toggle + CTA Pill + User Profile Capsule */}
          <div className="flex items-center gap-3">
            {/* Audio Pill */}
            <button
              onClick={handleToggleSound}
              className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-full bg-white border border-black/5 hover:border-black/15 text-[#121316] text-xs font-semibold shadow-sm transition-all"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-rose-500" />
              ) : (
                <Volume2 className="w-4 h-4 text-[#FF4820]" />
              )}
              <span className="text-[11px] text-gray-500">{isMuted ? 'Muted' : 'Audio'}</span>
            </button>

            {/* CTA Pill button */}
            <button
              onClick={() => {
                const el = document.getElementById('decks');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-4 py-2 rounded-full bg-white border border-black/5 hover:border-black/15 text-xs font-semibold text-[#121316] shadow-sm hover:shadow transition-all"
            >
              Start Learning
            </button>

            {/* Profile / Auth Button */}
            {isGuest ? (
              <button
                onClick={() => setShowAuthModal(true)}
                className="w-10 h-10 rounded-full bg-[#121316] text-white flex items-center justify-center hover:bg-black transition-all active:scale-95 shadow-sm relative group"
                title="Sign in / Sign up"
              >
                <User className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#FF4820] border-2 border-white" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 pl-3 pr-1 py-1 rounded-full bg-white border border-black/5 shadow-sm">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-amber-600 mr-1">
                    <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>{profile?.streak_days || 1}d</span>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-[#121316] text-white flex items-center justify-center text-xs font-bold">
                    {profile?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                </div>
                <button
                  onClick={signOut}
                  className="text-xs text-gray-400 hover:text-[#FF4820] font-medium transition-colors"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </>
  );
}
