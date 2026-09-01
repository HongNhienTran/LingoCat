'use client';

import React, { useState } from 'react';
import { X, Mail, Lock, LogIn, UserPlus, PlayCircle, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';

interface AuthModalProps {
  onClose: () => void;
}

export function AuthModal({ onClose }: AuthModalProps) {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { fetchProfile } = useAuthStore();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const supabase = createClient();

      if (tab === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName || 'Learner',
            },
          },
        });

        if (error) throw error;
        if (data.user) {
          await fetchProfile();
          onClose();
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        if (data.user) {
          await fetchProfile();
          onClose();
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'OAuth connection error';
      setErrorMsg(message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-[36px] p-6 md:p-8 shadow-2xl border border-black/5 overflow-hidden">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 text-gray-500 hover:text-black rounded-full bg-[#F3F4F6] flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#FF4820] text-white mb-3 shadow-md shadow-[#FF4820]/30">
            <Zap className="w-6 h-6 fill-white" />
          </div>
          <h3 className="text-2xl font-extrabold text-[#121316] tracking-tight">
            {tab === 'signin' ? 'Welcome Back' : 'Create Profile'}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Sync vocabulary progress and leaderboards across all devices
          </p>
        </div>

        {/* Tabs */}
        <div className="flex bg-[#F3F4F6] p-1.5 rounded-full mb-6">
          <button
            onClick={() => { setTab('signin'); setErrorMsg(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-full transition-all ${
              tab === 'signin'
                ? 'bg-white text-[#121316] shadow-sm'
                : 'text-gray-500 hover:text-[#121316]'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setTab('signup'); setErrorMsg(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-full transition-all ${
              tab === 'signup'
                ? 'bg-white text-[#121316] shadow-sm'
                : 'text-gray-500 hover:text-[#121316]'
            }`}
          >
            Sign Up
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-600 font-medium">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          {tab === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Display Name</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex"
                  className="w-full px-4 py-3 pl-10 bg-[#F3F4F6] border border-black/5 rounded-2xl text-xs text-[#121316] placeholder-gray-400 focus:outline-none focus:border-[#FF4820] transition-colors"
                />
                <UserPlus className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Email</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-4 py-3 pl-10 bg-[#F3F4F6] border border-black/5 rounded-2xl text-xs text-[#121316] placeholder-gray-400 focus:outline-none focus:border-[#FF4820] transition-colors"
              />
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 pl-10 bg-[#F3F4F6] border border-black/5 rounded-2xl text-xs text-[#121316] placeholder-gray-400 focus:outline-none focus:border-[#FF4820] transition-colors"
              />
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-full bg-[#121316] hover:bg-black text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : tab === 'signin' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Enter System</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Account</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100" />
          </div>
          <span className="relative px-3 bg-white text-[11px] text-gray-400 uppercase tracking-widest font-semibold">
            Or
          </span>
        </div>

        {/* Social / Guest Action */}
        <div className="space-y-2">
          <button
            onClick={handleGoogleLogin}
            type="button"
            className="w-full py-3 px-4 rounded-full bg-[#F3F4F6] hover:bg-gray-200 border border-black/5 text-xs font-bold text-[#121316] flex items-center justify-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.3 8.8 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
              />
              <path
                fill="#FBBC05"
                d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.6 7.2C.6 9.2 0 11.5 0 14s.6 4.8 1.6 6.8l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.2 0-5.8-2.3-6.7-5.3L1.6 16c1.9 3.8 5.8 6.4 10.4 6.4z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <button
            onClick={onClose}
            type="button"
            className="w-full py-2 px-4 rounded-full text-xs font-semibold text-gray-500 hover:text-[#121316] transition-colors flex items-center justify-center gap-1.5"
          >
            <PlayCircle className="w-3.5 h-3.5" />
            <span>Play as Guest</span>
          </button>
        </div>
      </div>
    </div>
  );
}
