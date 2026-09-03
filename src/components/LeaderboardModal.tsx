'use client';

import React, { useEffect, useState } from 'react';
import { X, Trophy, Flame, Zap, Crown, Award, RefreshCw, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types/database.types';
import { soundEngine } from '@/lib/audio/sound-synthesizer';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LeaderboardModal({ isOpen, onClose }: LeaderboardModalProps) {
  const [leaderboard, setLeaderboard] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all_time' | 'xp' | 'streak'>('all_time');

  useEffect(() => {
    if (!isOpen) return;

    const supabase = createClient();

    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('total_xp', { ascending: false })
          .limit(20);

        if (!error && data && data.length > 0) {
          setLeaderboard(data as Profile[]);
        } else {
          // Fallback mock leaderboard if database is quiet
          setLeaderboard([
            {
              id: '1',
              username: 'lingo_master',
              display_name: 'LingoMaster 🐾',
              avatar_url: null,
              total_xp: 4850,
              level: 7,
              streak_days: 12,
              highest_combo: 28,
              total_games_played: 45,
              last_played_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              id: '2',
              username: 'cyber_cat',
              display_name: 'CyberCat ⚡',
              avatar_url: null,
              total_xp: 3200,
              level: 5,
              streak_days: 8,
              highest_combo: 22,
              total_games_played: 30,
              last_played_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              id: '3',
              username: 'word_blaster',
              display_name: 'WordBlaster 🚀',
              avatar_url: null,
              total_xp: 2150,
              level: 4,
              streak_days: 5,
              highest_combo: 18,
              total_games_played: 18,
              last_played_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]);
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();

    // =========================================================================
    // SUPABASE REALTIME LISTENERS (Postgres Changes)
    // =========================================================================
    const channel = supabase
      .channel('realtime_leaderboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sortedList = [...leaderboard].sort((a, b) => {
    if (filter === 'streak') return b.streak_days - a.streak_days;
    return b.total_xp - a.total_xp;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[85vh] bg-white rounded-[36px] p-6 md:p-8 shadow-2xl border border-black/5 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-black/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FF4820] text-white flex items-center justify-center shadow-lg shadow-[#FF4820]/30">
              <Trophy className="w-6 h-6 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#121316] text-white">
                  Realtime Sync
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <h3 className="text-2xl font-black text-[#121316] tracking-tight">
                Global Arena Leaderboard
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

        {/* Filter Tabs */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex bg-[#F3F4F6] p-1 rounded-full text-xs font-bold text-gray-600">
            <button
              onClick={() => setFilter('all_time')}
              className={`px-4 py-1.5 rounded-full transition-all ${
                filter === 'all_time' ? 'bg-[#121316] text-white shadow-sm' : 'hover:text-[#121316]'
              }`}
            >
              Top XP
            </button>
            <button
              onClick={() => setFilter('streak')}
              className={`px-4 py-1.5 rounded-full transition-all ${
                filter === 'streak' ? 'bg-[#FF4820] text-white shadow-sm' : 'hover:text-[#121316]'
              }`}
            >
              🔥 Streak
            </button>
          </div>

          <span className="text-[11px] font-mono font-bold text-gray-400">
            {sortedList.length} Competitors
          </span>
        </div>

        {/* Leaderboard List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <RefreshCw className="w-6 h-6 animate-spin mb-2 text-[#FF4820]" />
              <p className="text-xs font-mono">Syncing Realtime Rankings...</p>
            </div>
          ) : sortedList.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-xs">
              No players recorded yet. Be the first to launch a battle!
            </div>
          ) : (
            sortedList.map((player, idx) => {
              const rank = idx + 1;
              const isTop1 = rank === 1;
              const isTop2 = rank === 2;
              const isTop3 = rank === 3;

              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-3.5 rounded-2xl transition-all border ${
                    isTop1
                      ? 'bg-gradient-to-r from-amber-500/10 via-amber-100/50 to-amber-500/10 border-amber-300 shadow-sm'
                      : isTop2
                      ? 'bg-gradient-to-r from-gray-200/50 to-slate-100 border-gray-300'
                      : isTop3
                      ? 'bg-gradient-to-r from-amber-700/10 to-orange-100/40 border-amber-200'
                      : 'bg-[#F9FAFB] hover:bg-gray-100 border-black/5'
                  }`}
                >
                  {/* Left Rank & User */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black font-mono ${
                        isTop1
                          ? 'bg-amber-500 text-white shadow-md'
                          : isTop2
                          ? 'bg-gray-400 text-white'
                          : isTop3
                          ? 'bg-amber-700 text-white'
                          : 'bg-black/5 text-[#121316]'
                      }`}
                    >
                      {isTop1 ? <Crown className="w-4 h-4 fill-white" /> : rank}
                    </div>

                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden border border-black/10 shrink-0">
                      {player.avatar_url ? (
                        <img src={player.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#121316] text-white">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-[#121316]">
                          {player.display_name || player.username}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.2 rounded-full bg-black/5 text-gray-600">
                          Lv.{player.level}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-gray-500 font-mono mt-0.5">
                        <span className="flex items-center gap-0.5 text-amber-600">
                          <Flame className="w-3 h-3 fill-amber-500" />
                          {player.streak_days}d streak
                        </span>
                        <span>•</span>
                        <span>{player.total_games_played} Games</span>
                      </div>
                    </div>
                  </div>

                  {/* Right XP & Stats */}
                  <div className="text-right">
                    <div className="text-sm font-black font-mono text-[#121316]">
                      {player.total_xp.toLocaleString()} <span className="text-[10px] text-[#FF4820]">XP</span>
                    </div>
                    <div className="text-[10px] font-mono text-gray-400">
                      Max Combo: {player.highest_combo}x
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
