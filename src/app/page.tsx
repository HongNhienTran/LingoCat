'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Zap,
  Sparkles,
  Flame,
  Trophy,
  Shield,
  BookOpen,
  Plus,
  Play,
  Layers,
  ArrowRight,
  Bot,
  Volume2,
  CheckCircle2,
  Search,
  Star
} from 'lucide-react';
import { Header } from '@/components/Header';
import { DeckCard } from '@/components/DeckCard';
import { WordPreviewModal } from '@/components/WordPreviewModal';
import { useDeckStore } from '@/stores/useDeckStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { Deck, Word } from '@/types/database.types';
import { soundEngine } from '@/lib/audio/sound-synthesizer';

export default function HomePage() {
  const router = useRouter();
  const { decks, selectedDeck, currentWords, fetchDecks, selectDeck } = useDeckStore();
  const { profile, isGuest, fetchProfile } = useAuthStore();

  const [previewDeck, setPreviewDeck] = useState<Deck | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiTopicPrompt, setAiTopicPrompt] = useState('');

  useEffect(() => {
    fetchProfile();
    fetchDecks();
  }, [fetchProfile, fetchDecks]);

  const categories = ['All', 'Academic', 'Technology', 'Conversational'];

  const filteredDecks = decks.filter((d) => {
    const matchCat = activeCategory === 'All' || d.category.toLowerCase() === activeCategory.toLowerCase();
    const matchSearch = searchQuery.trim() === '' || 
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchSearch;
  });

  const featuredDeck = decks[0];

  const handleStartGame = (deck: Deck) => {
    soundEngine.playPowerUp();
    router.push(`/game/${deck.id}`);
  };

  const handlePreviewWords = async (deck: Deck) => {
    await selectDeck(deck.id);
    setPreviewDeck(deck);
  };

  const handleSimulateAiGeneration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTopicPrompt.trim()) return;
    setIsGeneratingAI(true);
    soundEngine.playPowerUp();

    setTimeout(() => {
      setIsGeneratingAI(false);
      setAiTopicPrompt('');
      alert(`Successfully generated deck: "${aiTopicPrompt}"!`);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-[#121316] flex flex-col">
      {/* Top Minimalist Header */}
      <Header />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-16">
        
        {/* ========================================================================= */}
        {/* HERO SECTION */}
        {/* ========================================================================= */}
        <section className="relative w-full rounded-[40px] bg-white p-8 md:p-12 border border-black/5 shadow-sm overflow-hidden">
          
          {/* Top Row: Title + Reviews badge */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 relative z-20">
            {/* Left Big Heading with Badges */}
            <div className="max-w-xl">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#121316] leading-[1.1]">
                Super fast{' '}
                <span className="inline-flex items-center justify-center align-middle w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#E5E7EB] text-xl shadow-inner mx-1">
                  🪐
                </span>{' '}
                <span className="inline-flex items-center justify-center align-middle w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#121316] text-white text-xl shadow-sm mx-1">
                  ⚡
                </span>
                <br />
                vocabulary Blaster
              </h1>
            </div>

            {/* Right: Review Avatar Stack */}
            <div className="flex items-center gap-3 self-start">
              <div className="flex -space-x-2 overflow-hidden">
                <div className="inline-block h-8 w-8 rounded-full bg-[#FF4820] text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-white">
                  JD
                </div>
                <div className="inline-block h-8 w-8 rounded-full bg-[#121316] text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-white">
                  AL
                </div>
                <div className="inline-block h-8 w-8 rounded-full bg-gray-400 text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-white">
                  +
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[#121316]">
                  10k+ active learners
                </p>
                <div className="flex items-center gap-1 text-[11px] text-amber-500 font-bold">
                  <span>achieved</span>
                  <div className="flex">
                    {[1, 2, 3, 4].map((s) => (
                      <Star key={s} className="w-3 h-3 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Center Graphic & Asymmetric Rounded Curved Container */}
          <div className="relative w-full rounded-[36px] bg-[#E8E9ED] min-h-[420px] md:min-h-[480px] flex flex-col justify-between p-6 md:p-8 overflow-hidden">
            
            {/* Center Hero Artwork with Custom Mascot Banner */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
              <div className="relative w-full max-w-lg md:max-w-xl h-64 md:h-80 drop-shadow-2xl transition-transform duration-700 hover:scale-105">
                <Image
                  src="/images/Banner_Home.png"
                  alt="LingoCat Mascot Learning English"
                  fill
                  priority
                  className="object-contain drop-shadow-xl"
                  sizes="(max-width: 768px) 100vw, 600px"
                />
              </div>
            </div>

            {/* Top Right Floating Badge */}
            <div className="self-end relative z-10 hidden sm:block">
              <span className="text-xs font-bold text-gray-700 bg-white/90 backdrop-blur px-4 py-2 rounded-full border border-black/5 shadow-sm">
                Spaced Repetition (SRS) 🎯
              </span>
            </div>

            {/* Bottom Row inside Organic Surface */}
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mt-auto">
              
              {/* Bottom Left Model Info */}
              <div className="max-w-xs bg-white/90 backdrop-blur-md rounded-3xl p-5 border border-white/60 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-2xl font-extrabold text-[#121316]">
                    LC-01
                  </div>
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Hero Game Mode
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed mb-4">
                  Destroy obstacles through typing speed or multiple choice. Powered by spaced repetition and native audio.
                </p>

                {/* Coral Red Action Trigger Button */}
                {featuredDeck && (
                  <button
                    onClick={() => handleStartGame(featuredDeck)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF4820] hover:bg-[#E63B14] text-white text-xs font-bold shadow-md shadow-[#FF4820]/30 transition-transform active:scale-95 pointer-events-auto cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Play Hero Mode</span>
                  </button>
                )}
              </div>

              {/* Bottom Right Floating Deck Pill Card */}
              {featuredDeck && (
                <div
                  onClick={() => handlePreviewWords(featuredDeck)}
                  className="bg-white/95 backdrop-blur-md rounded-2xl p-3.5 border border-white/80 shadow-md flex items-center gap-3.5 cursor-pointer hover:scale-105 transition-all self-end pointer-events-auto"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#F3F4F6] flex items-center justify-center text-[#121316] font-bold">
                    <BookOpen className="w-5 h-5 text-[#FF4820]" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-[#121316] line-clamp-1">
                      {featuredDeck.title}
                    </div>
                    <p className="text-[10px] text-gray-500 font-medium">
                      {featuredDeck.word_count} words • IELTS Academic
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#F3F4F6] flex items-center justify-center text-gray-700 ml-2">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* DATA IMPORTER & DECK CREATOR SECTION */}
        {/* ========================================================================= */}
        <section id="importer" className="rounded-[36px] bg-white p-8 border border-black/5 shadow-sm">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F3F4F6] text-xs font-bold text-[#121316] mb-2">
                <Layers className="w-4 h-4 text-[#FF4820]" />
                <span>Bulk Data Importer & Scraper Pipeline</span>
              </div>
              <h3 className="text-2xl font-extrabold text-[#121316]">
                Import Scraped Vocabulary Decks
              </h3>
              <p className="text-xs text-gray-500 mt-1 max-w-lg">
                Quickly import scraped vocabulary lists (Oxford, TOEIC, IELTS) via JSON/CSV directly into Supabase with automatic distractor generation.
              </p>
            </div>

            {/* Quick Action Button */}
            <div className="flex items-center gap-3">
              <a
                href="#decks"
                className="px-6 py-3 rounded-full bg-[#121316] hover:bg-black text-white font-bold text-xs flex items-center gap-2 transition-all active:scale-95 shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-[#FF4820]" />
                <span>Explore Decks</span>
              </a>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* DECKS COLLECTION SECTION */}
        {/* ========================================================================= */}
        <section id="decks" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-[#121316] tracking-tight flex items-center gap-2.5">
                <span>Featured Vocabulary Decks</span>
                <span className="text-xs font-mono font-bold text-gray-400 bg-white px-2.5 py-1 rounded-full border border-black/5">
                  {filteredDecks.length} Decks
                </span>
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Select a deck to enter the arcade battle or review flashcards
              </p>
            </div>

            {/* Minimalist Filter Pill Tabs */}
            <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-full border border-black/5 overflow-x-auto shadow-sm">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                    activeCategory === cat
                      ? 'bg-[#121316] text-white shadow-sm'
                      : 'text-gray-500 hover:text-[#121316]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Decks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDecks.map((deck) => (
              <DeckCard
                key={deck.id}
                deck={deck}
                isSelected={selectedDeck?.id === deck.id}
                onSelect={(d) => selectDeck(d.id)}
                onStartGame={handleStartGame}
                onPreviewWords={handlePreviewWords}
              />
            ))}
          </div>
        </section>
      </main>

      {/* Word Preview Modal */}
      {previewDeck && (
        <WordPreviewModal
          deck={previewDeck}
          words={currentWords}
          onClose={() => setPreviewDeck(null)}
          onStartGame={handleStartGame}
        />
      )}
    </div>
  );
}
