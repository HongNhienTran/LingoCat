import { create } from 'zustand';
import { Deck, Word } from '@/types/database.types';
import { MOCK_DECKS, MOCK_WORDS } from '@/lib/mock-data';
import { createClient } from '@/lib/supabase/client';

interface DeckState {
  decks: Deck[];
  selectedDeck: Deck | null;
  currentWords: Word[];
  isLoading: boolean;
  error: string | null;
  fetchDecks: () => Promise<void>;
  selectDeck: (deckId: string) => Promise<void>;
  createCustomDeck: (deck: Partial<Deck>, words: Partial<Word>[]) => Promise<Deck | null>;
}

export const useDeckStore = create<DeckState>((set, get) => ({
  decks: MOCK_DECKS,
  selectedDeck: MOCK_DECKS[0],
  currentWords: MOCK_WORDS[MOCK_DECKS[0].id] || [],
  isLoading: false,
  error: null,

  fetchDecks: async () => {
    try {
      set({ isLoading: true, error: null });
      const supabase = createClient();
      const { data, error } = await supabase
        .from('decks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        // Use Mock data if Supabase DB is empty or unconfigured
        set({ decks: MOCK_DECKS });
      } else {
        set({ decks: data as Deck[] });
      }
    } catch {
      set({ decks: MOCK_DECKS });
    } finally {
      set({ isLoading: false });
    }
  },

  selectDeck: async (deckId: string) => {
    const foundDeck = get().decks.find((d) => d.id === deckId) || MOCK_DECKS[0];
    set({ selectedDeck: foundDeck, isLoading: true });

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('words')
        .select('*')
        .eq('deck_id', deckId);

      if (error || !data || data.length === 0) {
        const fallbackWords = MOCK_WORDS[deckId] || MOCK_WORDS[MOCK_DECKS[0].id] || [];
        set({ currentWords: fallbackWords });
      } else {
        set({ currentWords: data as Word[] });
      }
    } catch {
      const fallbackWords = MOCK_WORDS[deckId] || MOCK_WORDS[MOCK_DECKS[0].id] || [];
      set({ currentWords: fallbackWords });
    } finally {
      set({ isLoading: false });
    }
  },

  createCustomDeck: async (deckData, wordsData) => {
    try {
      set({ isLoading: true });
      const supabase = createClient();
      const { data: deck, error } = await supabase
        .from('decks')
        .insert({
          title: deckData.title,
          slug: (deckData.title || 'deck').toLowerCase().replace(/\s+/g, '-'),
          description: deckData.description,
          category: deckData.category || 'Custom',
          difficulty: deckData.difficulty || 'intermediate',
          is_public: deckData.is_public ?? true,
          color_gradient: deckData.color_gradient || 'from-blue-600 to-indigo-600',
        })
        .select()
        .single();

      if (error || !deck) {
        throw error || new Error('Failed to create deck');
      }

      if (wordsData.length > 0) {
        const wordsToInsert = wordsData.map((w) => ({
          ...w,
          deck_id: deck.id,
        }));
        await supabase.from('words').insert(wordsToInsert);
      }

      await get().fetchDecks();
      return deck as Deck;
    } catch {
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
}));
