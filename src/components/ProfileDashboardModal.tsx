'use client';

import React from 'react';
import { X, User, Flame, Trophy, Award, Zap, CheckCircle2, Shield, Target, Crown, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { soundEngine } from '@/lib/audio/sound-synthesizer';

interface ProfileDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileDashboardModal({ isOpen, onClose }: ProfileDashboardModalProps) {
  const { profile, user } = useAuthStore();

  if (!isOpen) return null;

  const currentXP = profile?.total_xp || 0;
  const level = profile?.level || 1;
  const xpForNextLevel = level * 200;
  const progressPercent = Math.min(100, Math.floor(((currentXP % 200) / 200) * 100));

  const achievements = [
    {
      id: 'first_strike',
      title: 'First Strike',
      description: 'Completed your first vocabulary battle in arena',
      icon: Zap,
      unlocked: true,
      reward: 50,
    },
    {
      id: 'streak_3',
      title: 'Unstoppable Streak',
      description: 'Maintained a 3-day continuous learning streak',
      icon: Flame,
      unlocked: (profile?.streak_days || 1) >= 3,
      reward: 100,
    },
    {
      id: 'combo_20',
      title: 'Combo Master',
      description: 'Achieved a 20x combo streak in speed battle',
      icon: Target,
      unlocked: (profile?.highest_combo || 0) >= 20,
      reward: 150,
    },
    {
      id: 'master_100',
      title: 'Vocabulary Overlord',
      description: 'Mastered 100 words in LingoCat Arena',
      icon: Crown,
      unlocked: (profile?.total_games_played || 0) >= 10,
      reward: 300,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[88vh] bg-white rounded-[36px] p-6 md:p-8 shadow-2xl border border-black/5 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-black/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FF4820] to-orange-400 p-[2px] shadow-lg">
              <div className="w-full h-full rounded-[14px] bg-white flex items-center justify-center overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-[#121316]" />
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#121316] text-white">
                  Learner Dashboard
                </span>
                <span className="text-xs font-mono font-bold text-[#FF4820]">
                  Lv.{level} Commander
                </span>
              </div>
              <h3 className="text-2xl font-black text-[#121316] tracking-tight">
                {profile?.display_name || profile?.username || 'Commander LingoCat'}
              </h3>
            </div>
          </div>

          <button
            onClick={() => {
              soundEngine.playPowerUp();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-[#F3F4F6] hover:bg-gray-200 flex items-center justify-center text-[#121316] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">
          {/* Level & XP Progress Card */}
          <div className="p-5 rounded-3xl bg-[#121316] text-white shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-[10px] font-mono uppercase text-gray-400 tracking-wider">
                  Level Progress
                </span>
                <h4 className="text-xl font-black text-white font-mono">
                  {currentXP.toLocaleString()} <span className="text-xs text-[#FF4820]">/ {xpForNextLevel} XP</span>
                </h4>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-amber-400 font-bold">
                <Sparkles className="w-5 h-5 fill-amber-400" />
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-[#FF4820] to-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] font-mono text-gray-400 mt-1.5">
              <span>Current Level {level}</span>
              <span>{100 - progressPercent}% to Level {level + 1}</span>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-[#F3F4F6] border border-black/5 text-center">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Daily Streak
              </span>
              <div className="flex items-center justify-center gap-1 text-2xl font-black text-[#FF4820] font-mono mt-1">
                <Flame className="w-5 h-5 fill-[#FF4820]" />
                <span>{profile?.streak_days || 1}d</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#F3F4F6] border border-black/5 text-center">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Max Combo
              </span>
              <div className="text-2xl font-black text-[#121316] font-mono mt-1">
                {profile?.highest_combo || 0}X
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#F3F4F6] border border-black/5 text-center">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Total Battles
              </span>
              <div className="text-2xl font-black text-emerald-600 font-mono mt-1">
                {profile?.total_games_played || 0}
              </div>
            </div>
          </div>

          {/* Achievements & Badges Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase text-[#121316] tracking-tight">
                Achievements & Badges
              </span>
              <span className="text-[11px] font-mono text-gray-400">
                {achievements.filter((a) => a.unlocked).length} / {achievements.length} Unlocked
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {achievements.map((ach) => {
                const Icon = ach.icon;
                return (
                  <div
                    key={ach.id}
                    className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                      ach.unlocked
                        ? 'bg-white border-black/5 shadow-sm'
                        : 'bg-[#F9FAFB] border-black/5 opacity-60'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        ach.unlocked
                          ? 'bg-[#FF4820] text-white shadow-md'
                          : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-black text-[#121316]">{ach.title}</h5>
                        {ach.unlocked ? (
                          <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" /> Unlocked
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-gray-400">Locked</span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">
                        {ach.description}
                      </p>
                      <span className="text-[9px] font-mono font-bold text-amber-600 block mt-1">
                        +{ach.reward} XP Reward
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
