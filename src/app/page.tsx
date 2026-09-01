'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Sparkles, 
  ArrowUpRight, 
  ChevronLeft, 
  ChevronRight, 
  Volume2, 
  Gamepad2, 
  BookOpen, 
  Flame, 
  Trophy, 
  Layers, 
  Zap,
  Play,
  Crosshair
} from 'lucide-react';
import { SidebarNav } from '@/components/SidebarNav';
import { TopCapsuleNav, GAME_MODES, GameModeInfo } from '@/components/TopCapsuleNav';
import { WordPreviewModal } from '@/components/WordPreviewModal';
import { AuthModal } from '@/components/AuthModal';
import { useDeckStore } from '@/stores/useDeckStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { soundEngine } from '@/lib/audio/sound-synthesizer';
import { Deck, Word } from '@/types/database.types';

export default function HomePage() {
  const router = useRouter();
  const { decks, fetchDecks, isLoading } = useDeckStore();
  const { user, profile } = useAuthStore();

  const [selectedGameId, setSelectedGameId] = useState('meteor_defender');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All Levels');
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null);

  const [sidebarTab, setSidebarTab] = useState('home');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [previewWords, setPreviewWords] = useState<Word[]>([]);

  const carouselRef = useRef<HTMLDivElement>(null);

  // Fetch decks on mount
  useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);

  // Sync active deck when decks are loaded
  useEffect(() => {
    if (decks && decks.length > 0 && !activeDeck) {
      setActiveDeck(decks[0]);
    }
  }, [decks, activeDeck]);

  // Filter decks
  const filteredDecks = decks.filter((deck) => {
    const matchesCategory =
      selectedCategory === 'All' ||
      deck.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesDifficulty =
      selectedDifficulty === 'All Levels' ||
      deck.difficulty.toLowerCase() === selectedDifficulty.toLowerCase();
    return matchesCategory && matchesDifficulty;
  });

  const activeGame = GAME_MODES.find((g) => g.id === selectedGameId) || GAME_MODES[0];

  const handleStartGame = (deckId?: string) => {
    const targetId = deckId || activeDeck?.id || decks[0]?.id;
    if (targetId) {
      soundEngine.playLaser();
      router.push(`/game/${targetId}`);
    }
  };

  const handleOpenWordIntel = async (deck?: Deck) => {
    const targetDeck = deck || activeDeck || decks[0];
    if (!targetDeck) return;

    soundEngine.playPowerUp();
    setActiveDeck(targetDeck);

    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey =
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data } = await supabase
          .from('words')
          .select('*')
          .eq('deck_id', targetDeck.id);

        if (data && data.length > 0) {
          setPreviewWords(data as Word[]);
        } else {
          const { MOCK_WORDS } = await import('@/lib/mock-data');
          setPreviewWords(MOCK_WORDS[targetDeck.id] || MOCK_WORDS['11111111-1111-1111-1111-111111111111'] || []);
        }
      }
    } catch {
      const { MOCK_WORDS } = await import('@/lib/mock-data');
      setPreviewWords(MOCK_WORDS[targetDeck.id] || []);
    }

    setIsPreviewOpen(true);
  };

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -340 : 340;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="atmospheric-bg min-h-screen w-full flex flex-col items-center justify-center p-3 md:p-6 lg:p-8 select-none">
      {/* Outer Branding Bar (Matches Orizon Header) */}
      <div className="w-full max-w-[1520px] flex items-center justify-between px-6 py-2 text-xs font-bold text-gray-500 tracking-wider uppercase mb-1">
        <div className="flex items-center gap-2">
          <span className="text-[#121316]">LINGOCAT</span>
          <span className="text-gray-400">/</span>
          <span>ACTION VOCABULARY ARENA</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[#FF4820] flex items-center gap-1 font-mono">
            <Flame className="w-3.5 h-3.5 fill-[#FF4820]" />
            <span>500+ WORDS LOADED</span>
          </span>
          <span className="hidden sm:inline text-gray-400">ORIZON CAPSULE FRAME</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN CAPSULE FRAME CONTAINER (Fixed Viewport Capsule) */}
      {/* ========================================================================= */}
      <main className="w-full max-w-[1520px] h-[92vh] max-h-[960px] min-h-[720px] bg-white rounded-[44px] capsule-shadow border border-white/80 flex flex-col md:flex-row p-3 md:p-5 gap-3 md:gap-5 relative overflow-hidden">
        {/* Left Floating Sidebar Dock */}
        <SidebarNav
          activeTab={sidebarTab}
          setActiveTab={setSidebarTab}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenWordIntel={() => handleOpenWordIntel()}
        />

        {/* Right Main Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden gap-3 md:gap-4">
          {/* Top Capsule Navigation */}
          <TopCapsuleNav
            selectedGame={selectedGameId}
            onSelectGame={setSelectedGameId}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            selectedDifficulty={selectedDifficulty}
            onSelectDifficulty={setSelectedDifficulty}
            onQuickPlay={() => handleStartGame()}
          />

          {/* ===================================================================== */}
          {/* HERO CANVAS VIEWPORT */}
          {/* ===================================================================== */}
          <section className="flex-1 relative rounded-[36px] overflow-hidden bg-[#121316] text-white flex flex-col justify-between p-6 md:p-8 shadow-inner group">
            {/* Background Mascot Banner Image with Ambient Overlays */}
            <div className="absolute inset-0 z-0">
              <Image
                src="/images/Banner_Home.png"
                alt="LingoCat Arena Hero"
                fill
                priority
                className="object-cover object-center opacity-75 group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#121316] via-[#121316]/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#121316]/90 via-[#121316]/30 to-transparent" />
            </div>

            {/* Top Tagline & Badge inside Hero */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-xs font-bold text-white shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#FF4820] animate-pulse" />
                <span>{activeGame.badge}</span>
                <span className="text-white/60">•</span>
                <span className="text-white/90">{activeGame.name}</span>
              </div>

              {/* Action Chip */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[11px] font-mono text-gray-300">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>60 FPS Canvas Physics</span>
              </div>
            </div>

            {/* Hero Main Typography (Matches Orizon "New Way Of Living") */}
            <div className="relative z-10 my-auto max-w-xl">
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05] text-white drop-shadow-sm">
                New Way Of <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-orange-100 to-orange-400">
                  Learning
                </span>
              </h1>
              <p className="text-xs md:text-sm text-gray-300 mt-3 max-w-md line-clamp-2 leading-relaxed">
                {activeGame.tagline}. Master 500+ essential vocabulary words through pure real-time action gameplay.
              </p>
            </div>

            {/* =================================================================== */}
            {/* FLOATING HERO SUB-CARDS (Bottom Left & Bottom Right) */}
            {/* =================================================================== */}
            <div className="relative z-10 flex flex-col md:flex-row items-end justify-between gap-4 pt-4">
              {/* Bottom-Left Organic White Card (Matches Orizon "Find The Perfect Place") */}
              <div className="w-full md:w-80 p-5 rounded-[28px] bg-white text-[#121316] shadow-xl border border-white/90">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF4820]">
                  Arena Statistics
                </span>
                <h4 className="text-base font-extrabold text-[#121316] mt-0.5">
                  Find The Perfect Deck
                </h4>
                <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                  Choose from 25 topic decks. Adaptive SRS tracks every hit & miss.
                </p>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/5">
                  <div>
                    <span className="text-xl font-extrabold text-[#121316] tracking-tight">
                      500+
                    </span>
                    <span className="text-[10px] text-gray-400 block -mt-1 font-mono">
                      Active Targets
                    </span>
                  </div>

                  {/* Quick Preview trigger */}
                  <button
                    onClick={() => handleOpenWordIntel()}
                    className="px-3.5 py-1.5 rounded-full bg-[#F3F4F6] hover:bg-gray-200 text-xs font-bold text-[#121316] flex items-center gap-1.5 transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-[#FF4820]" />
                    <span>Intel</span>
                  </button>
                </div>
              </div>

              {/* Bottom-Right Frosted Glass Card (Matches Orizon "Lunar Oasis Villa") */}
              {activeDeck && (
                <div className="w-full md:w-96 p-5 rounded-[28px] glass-panel text-[#121316] shadow-2xl flex flex-col justify-between gap-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded-full bg-[#121316] text-white">
                          {activeDeck.category}
                        </span>
                        <span className="text-[10px] font-mono text-gray-700 font-bold capitalize">
                          {activeDeck.difficulty}
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-[#121316] mt-1 line-clamp-1">
                        {activeDeck.title}
                      </h3>
                      <p className="text-[11px] text-gray-700 mt-0.5 line-clamp-1">
                        {activeDeck.description || '20 Target words with native audio.'}
                      </p>
                    </div>

                    {/* Circular Big Play Button */}
                    <button
                      onClick={() => handleStartGame(activeDeck.id)}
                      className="w-12 h-12 rounded-full bg-[#FF4820] hover:bg-[#E03E1A] text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all shrink-0"
                      title="Launch Battle"
                    >
                      <Play className="w-5 h-5 fill-white ml-0.5" />
                    </button>
                  </div>

                  {/* Deck Specs Pill Grid */}
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#121316] pt-2 border-t border-black/10">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#FF4820]" />
                      <span>{activeDeck.word_count || 20} Words</span>
                    </div>

                    <button
                      onClick={() => soundEngine.speakWord(activeDeck.title)}
                      className="flex items-center gap-1 text-gray-700 hover:text-[#121316] text-[11px]"
                      title="Pronounce Topic"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Listen</span>
                    </button>

                    <button
                      onClick={() => handleOpenWordIntel(activeDeck)}
                      className="text-[#FF4820] hover:underline flex items-center gap-0.5 text-[11px]"
                    >
                      <span>Details</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ===================================================================== */}
          {/* BOTTOM INTERACTIVE DECK CAROUSEL (Kéo chọn bộ từ) */}
          {/* ===================================================================== */}
          <section className="h-44 shrink-0 flex flex-col justify-between py-1">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-tight uppercase text-[#121316]">
                  Select Battlefield Deck
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-black/5 text-gray-600">
                  {filteredDecks.length} Decks
                </span>
              </div>

              {/* Scroll buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => scrollCarousel('left')}
                  className="w-7 h-7 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-gray-700 transition-colors"
                  title="Scroll Left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => scrollCarousel('right')}
                  className="w-7 h-7 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-gray-700 transition-colors"
                  title="Scroll Right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Horizontal Drag/Scroll Container */}
            <div
              ref={carouselRef}
              className="flex items-center gap-3.5 overflow-x-auto custom-scrollbar pb-2 pt-1"
            >
              {filteredDecks.map((deck, idx) => {
                const isSelected = activeDeck?.id === deck.id;

                return (
                  <div
                    key={deck.id}
                    onClick={() => {
                      soundEngine.playLaser();
                      setActiveDeck(deck);
                    }}
                    className={`w-64 shrink-0 p-3.5 rounded-[24px] cursor-pointer transition-all duration-200 border ${
                      isSelected
                        ? 'bg-[#121316] text-white border-[#121316] shadow-md scale-[1.02]'
                        : 'bg-white hover:bg-gray-50 text-[#121316] border-black/5 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full ${
                          isSelected
                            ? 'bg-[#FF4820] text-white'
                            : 'bg-[#F3F4F6] text-[#FF4820]'
                        }`}
                      >
                        {deck.category}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold ${
                          isSelected ? 'text-gray-400' : 'text-gray-400'
                        }`}
                      >
                        #{idx + 1}
                      </span>
                    </div>

                    <h4
                      className={`text-sm font-extrabold line-clamp-1 ${
                        isSelected ? 'text-white' : 'text-[#121316]'
                      }`}
                    >
                      {deck.title}
                    </h4>

                    <p
                      className={`text-[10px] mt-0.5 line-clamp-1 ${
                        isSelected ? 'text-gray-400' : 'text-gray-500'
                      }`}
                    >
                      {deck.description || '20 Vocabulary items'}
                    </p>

                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-black/5">
                      <span
                        className={`text-[10px] font-bold font-mono ${
                          isSelected ? 'text-orange-300' : 'text-gray-600'
                        }`}
                      >
                        {deck.word_count || 20} Words
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartGame(deck.id);
                        }}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all ${
                          isSelected
                            ? 'bg-white text-[#121316] hover:bg-orange-100'
                            : 'bg-[#121316] text-white hover:bg-[#FF4820]'
                        }`}
                      >
                        <span>Play</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>

      {/* Word Intel Modal */}
      {isPreviewOpen && activeDeck && (
        <WordPreviewModal
          onClose={() => setIsPreviewOpen(false)}
          deck={activeDeck}
          words={previewWords}
          onStartGame={(deck) => {
            setIsPreviewOpen(false);
            handleStartGame(deck.id);
          }}
        />
      )}

      {/* Auth Modal */}
      {isAuthOpen && <AuthModal onClose={() => setIsAuthOpen(false)} />}
    </div>
  );
}
