import { create } from 'zustand';
import { Word, GameType } from '@/types/database.types';
import { soundEngine } from '@/lib/audio/sound-synthesizer';

export interface GameMistake {
  word: Word;
  attemptedInput?: string;
  timestamp: number;
}

interface GameState {
  // Game session status
  isPlaying: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  isVictory: boolean;
  gameType: GameType;

  // Player battle stats
  hp: number; // 3 hearts
  maxHp: number;
  score: number;
  combo: number;
  maxCombo: number;
  feverCharge: number; // 0 to 100
  isFeverActive: boolean;

  // Power-ups
  isFreezeActive: boolean;
  shieldCount: number;

  // Wave System & Boss Fight
  currentWave: number;
  totalWaves: number;
  isBossWave: boolean;
  bossHp: number;
  maxBossHp: number;

  // Word stats
  wordsAttempted: number;
  wordsCorrect: number;
  mistakes: GameMistake[];
  masteredWords: Word[];

  // Active target for Typing mode
  activeTargetWordId: string | null;
  currentTypedBuffer: string;

  // Actions
  initGame: (type?: GameType) => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: (victory?: boolean) => void;

  // Power-up Actions
  activateFreeze: () => void;
  addShield: () => void;
  useShield: () => boolean;

  // Wave & Boss Actions
  setWave: (wave: number, isBoss?: boolean) => void;
  damageBoss: (damage: number) => void;

  // In-Game Events
  handleCorrectHit: (word: Word, scoreGain?: number) => void;
  handleWrongHit: (word: Word, attemptedInput?: string) => void;
  handleMissedWord: (word: Word) => void;
  setActiveTarget: (wordId: string | null, initialChar?: string) => void;
  updateTypedBuffer: (buffer: string) => void;
  activateFeverMode: () => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  isPlaying: false,
  isPaused: false,
  isGameOver: false,
  isVictory: false,
  gameType: 'meteor_defender',

  hp: 3,
  maxHp: 3,
  score: 0,
  combo: 0,
  maxCombo: 0,
  feverCharge: 0,
  isFeverActive: false,

  isFreezeActive: false,
  shieldCount: 0,

  currentWave: 1,
  totalWaves: 3,
  isBossWave: false,
  bossHp: 100,
  maxBossHp: 100,

  wordsAttempted: 0,
  wordsCorrect: 0,
  mistakes: [],
  masteredWords: [],

  activeTargetWordId: null,
  currentTypedBuffer: '',

  initGame: (type = 'meteor_defender') => {
    set({
      gameType: type,
      isPlaying: false,
      isPaused: false,
      isGameOver: false,
      isVictory: false,
      hp: 3,
      score: 0,
      combo: 0,
      maxCombo: 0,
      feverCharge: 0,
      isFeverActive: false,
      isFreezeActive: false,
      shieldCount: 0,
      currentWave: 1,
      totalWaves: 3,
      isBossWave: false,
      bossHp: 100,
      wordsAttempted: 0,
      wordsCorrect: 0,
      mistakes: [],
      masteredWords: [],
      activeTargetWordId: null,
      currentTypedBuffer: '',
    });
  },

  startGame: () => {
    set({
      isPlaying: true,
      isPaused: false,
      isGameOver: false,
      isVictory: false,
    });
  },

  pauseGame: () => set({ isPaused: true }),
  resumeGame: () => set({ isPaused: false }),

  endGame: (victory = false) => {
    set({
      isPlaying: false,
      isGameOver: !victory,
      isVictory: victory,
    });
  },

  activateFreeze: () => {
    soundEngine.playPowerUp();
    set({ isFreezeActive: true });
    setTimeout(() => {
      set({ isFreezeActive: false });
    }, 5000); // 5 seconds freeze
  },

  addShield: () => {
    soundEngine.playPowerUp();
    set((state) => ({ shieldCount: Math.min(3, state.shieldCount + 1) }));
  },

  useShield: () => {
    const current = get().shieldCount;
    if (current > 0) {
      soundEngine.playPowerUp();
      set({ shieldCount: current - 1 });
      return true;
    }
    return false;
  },

  setWave: (wave: number, isBoss = false) => {
    set({
      currentWave: wave,
      isBossWave: isBoss,
      bossHp: isBoss ? 100 : 0,
    });
  },

  damageBoss: (damage: number) => {
    set((state) => {
      const newHp = Math.max(0, state.bossHp - damage);
      const isBossDefeated = newHp <= 0;
      if (isBossDefeated) {
        soundEngine.playPowerUp();
      }
      return {
        bossHp: newHp,
      };
    });
  },

  handleCorrectHit: (word: Word, scoreGain = 100) => {
    const currentCombo = get().combo + 1;
    const comboMultiplier = Math.min(4, 1 + Math.floor(currentCombo / 5));
    const feverBonus = get().isFeverActive ? 2 : 1;
    const earnedScore = scoreGain * comboMultiplier * feverBonus;

    // SFX
    soundEngine.playExplosion();
    soundEngine.playCombo(currentCombo);
    soundEngine.speakWord(word.term);

    // If Boss wave, damage boss
    if (get().isBossWave) {
      get().damageBoss(25);
    }

    set((state) => {
      const nextFever = Math.min(100, state.feverCharge + 10);
      const shouldTriggerFever = nextFever >= 100 && !state.isFeverActive;

      if (shouldTriggerFever) {
        setTimeout(() => get().activateFeverMode(), 50);
      }

      return {
        score: state.score + earnedScore,
        combo: currentCombo,
        maxCombo: Math.max(state.maxCombo, currentCombo),
        feverCharge: shouldTriggerFever ? 0 : nextFever,
        wordsAttempted: state.wordsAttempted + 1,
        wordsCorrect: state.wordsCorrect + 1,
        masteredWords: [...state.masteredWords, word],
        activeTargetWordId: null,
        currentTypedBuffer: '',
      };
    });
  },

  handleWrongHit: (word: Word, attemptedInput = '') => {
    // Check if shield absorbs collision
    if (get().useShield()) {
      return;
    }

    soundEngine.playError();
    set((state) => {
      const newHp = Math.max(0, state.hp - 1);
      const isGameOver = newHp <= 0;
      if (isGameOver) {
        get().endGame(false);
      }
      return {
        hp: newHp,
        combo: 0,
        wordsAttempted: state.wordsAttempted + 1,
        mistakes: [...state.mistakes, { word, attemptedInput, timestamp: Date.now() }],
        currentTypedBuffer: '',
      };
    });
  },

  handleMissedWord: (word: Word) => {
    // Check if shield absorbs collision
    if (get().useShield()) {
      return;
    }

    soundEngine.playError();
    set((state) => {
      const newHp = Math.max(0, state.hp - 1);
      const isGameOver = newHp <= 0;
      if (isGameOver) {
        get().endGame(false);
      }
      return {
        hp: newHp,
        combo: 0,
        mistakes: [...state.mistakes, { word, timestamp: Date.now() }],
        activeTargetWordId: null,
        currentTypedBuffer: '',
      };
    });
  },

  setActiveTarget: (wordId: string | null, initialChar = '') => {
    set({
      activeTargetWordId: wordId,
      currentTypedBuffer: initialChar,
    });
  },

  updateTypedBuffer: (buffer: string) => {
    set({ currentTypedBuffer: buffer });
  },

  activateFeverMode: () => {
    soundEngine.playPowerUp();
    set({ isFeverActive: true, feverCharge: 0 });
    setTimeout(() => {
      set({ isFeverActive: false });
    }, 8000); // 8 seconds fever mode
  },

  resetGame: () => {
    get().initGame(get().gameType);
  },
}));
