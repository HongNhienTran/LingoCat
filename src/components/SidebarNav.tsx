'use client';

import React from 'react';
import { 
  Home, 
  Gamepad2, 
  BookOpen, 
  Trophy, 
  Volume2, 
  VolumeX, 
  Sun, 
  Moon,
  User
} from 'lucide-react';
import { soundEngine } from '@/lib/audio/sound-synthesizer';
import { useAuthStore } from '@/stores/useAuthStore';

interface SidebarNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAuth: () => void;
  onOpenWordIntel?: () => void;
  onOpenLeaderboard?: () => void;
  onOpenProfile?: () => void;
}

export function SidebarNav({ 
  activeTab, 
  setActiveTab, 
  onOpenAuth, 
  onOpenWordIntel,
  onOpenLeaderboard,
  onOpenProfile
}: SidebarNavProps) {
  const [isMuted, setIsMuted] = React.useState(false);
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const { user, profile } = useAuthStore();

  const toggleAudio = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  const navItems = [
    { id: 'home', icon: Home, label: 'Lobby Home' },
    { id: 'games', icon: Gamepad2, label: 'Battle Modes' },
    { id: 'intel', icon: BookOpen, label: 'Vocabulary Intel', action: onOpenWordIntel },
    { id: 'ranking', icon: Trophy, label: 'Leaderboard', action: onOpenLeaderboard },
  ];

  return (
    <aside className="w-14 shrink-0 flex flex-col items-center justify-between py-5 bg-white/70 backdrop-blur-xl border border-white/60 rounded-full shadow-sm">
      {/* Top Navigation Icons */}
      <div className="flex flex-col items-center gap-3">
        {/* Brand Cat Icon */}
        <button
          onClick={() => {
            soundEngine.playLaser();
            setActiveTab('home');
          }}
          className="w-10 h-10 rounded-full bg-[#121316] text-white flex items-center justify-center hover:scale-105 transition-transform shadow-md group relative"
          title="LingoCat Arena"
        >
          <span className="text-base group-hover:rotate-12 transition-transform">🐾</span>
          <span className="sr-only">LingoCat</span>
        </button>

        <div className="w-6 h-[1px] bg-black/10 my-1" />

        {/* Action Tabs */}
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                soundEngine.playPowerUp();
                if (item.action) {
                  item.action();
                } else {
                  setActiveTab(item.id);
                }
              }}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                isActive
                  ? 'bg-[#FF4820] text-white shadow-sm scale-105'
                  : 'text-[#121316]/70 hover:text-[#121316] hover:bg-black/5'
              }`}
              title={item.label}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </div>

      {/* Center User Capsule */}
      <div className="my-2">
        <button
          onClick={() => {
            soundEngine.playPowerUp();
            if (user) {
              onOpenProfile?.();
            } else {
              onOpenAuth();
            }
          }}
          className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#FF4820] to-orange-400 p-[2px] shadow-sm hover:scale-105 transition-transform"
          title={user ? profile?.display_name || 'Profile Dashboard' : 'Sign in / Profile'}
        >
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-4 h-4 text-[#121316]" />
            )}
          </div>
        </button>
      </div>

      {/* Bottom Utility Controls */}
      <div className="flex flex-col items-center gap-2.5">
        {/* Audio Toggle */}
        <button
          onClick={toggleAudio}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
            isMuted ? 'bg-red-100 text-rose-600' : 'text-[#121316]/70 hover:text-[#121316] hover:bg-black/5'
          }`}
          title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>

        {/* Theme Toggle (Visual) */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="w-8 h-8 rounded-full text-[#121316]/70 hover:text-[#121316] hover:bg-black/5 flex items-center justify-center transition-colors"
          title="Toggle Theme"
        >
          {isDarkMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
        </button>
      </div>
    </aside>
  );
}
