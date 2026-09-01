'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { MeteorDefenderCanvas } from '@/components/game/MeteorDefenderCanvas';
import { useDeckStore } from '@/stores/useDeckStore';
import { MOCK_DECKS, MOCK_WORDS } from '@/lib/mock-data';
import { Deck, Word } from '@/types/database.types';
import { createClient } from '@/lib/supabase/client';

export default function GamePage({ params }: { params: Promise<{ deckId: string }> }) {
  const resolvedParams = use(params);
  const deckId = resolvedParams.deckId;
  const router = useRouter();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDeckAndWords() {
      try {
        setLoading(true);
        const supabase = createClient();
        const { data: deckData } = await supabase
          .from('decks')
          .select('*')
          .eq('id', deckId)
          .single();

        const { data: wordsData } = await supabase
          .from('words')
          .select('*')
          .eq('deck_id', deckId);

        if (deckData && wordsData && wordsData.length > 0) {
          setDeck(deckData as Deck);
          setWords(wordsData as Word[]);
        } else {
          const fallbackDeck = MOCK_DECKS.find((d) => d.id === deckId) || MOCK_DECKS[0];
          const fallbackWords = MOCK_WORDS[deckId] || MOCK_WORDS[MOCK_DECKS[0].id] || [];
          setDeck(fallbackDeck);
          setWords(fallbackWords);
        }
      } catch {
        const fallbackDeck = MOCK_DECKS.find((d) => d.id === deckId) || MOCK_DECKS[0];
        const fallbackWords = MOCK_WORDS[deckId] || MOCK_WORDS[MOCK_DECKS[0].id] || [];
        setDeck(fallbackDeck);
        setWords(fallbackWords);
      } finally {
        setLoading(false);
      }
    }

    loadDeckAndWords();
  }, [deckId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F3F4F6] text-[#121316]">
        <div className="w-12 h-12 border-4 border-[#FF4820] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-mono text-[#FF4820] font-bold">Initializing LingoCat Arena 🐾...</p>
      </div>
    );
  }

  if (!deck || words.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F3F4F6] text-[#121316] p-6 text-center">
        <p className="text-lg font-bold text-rose-500 mb-4">No vocabulary found for this deck!</p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-2.5 rounded-full bg-[#121316] text-white text-xs font-bold"
        >
          Back to Lobby
        </button>
      </div>
    );
  }

  return <MeteorDefenderCanvas deck={deck} words={words} />;
}
