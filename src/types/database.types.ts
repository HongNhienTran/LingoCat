export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type GameType = 'meteor_defender' | 'choice_blaster' | 'memory_matrix' | 'cyber_runner' | 'pvp_arena';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'master';

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  total_xp: number;
  level: number;
  streak_days: number;
  last_played_at: string;
  highest_combo: number;
  total_games_played: number;
  created_at: string;
  updated_at: string;
}

export interface Deck {
  id: string;
  creator_id: string | null;
  title: string;
  slug: string;
  description: string | null;
  category: string;
  difficulty: DifficultyLevel;
  is_public: boolean;
  is_official: boolean;
  word_count: number;
  icon_name: string;
  color_gradient: string;
  play_count: number;
  created_at: string;
  updated_at: string;
}

export interface Word {
  id: string;
  deck_id: string;
  term: string;
  phonetic: string | null;
  translation: string;
  example_sentence: string | null;
  example_translation: string | null;
  audio_url: string | null;
  image_url: string | null;
  distractors: string[];
  difficulty_level: number;
  created_at: string;
}

export interface UserWordProgress {
  id: string;
  user_id: string;
  word_id: string;
  repetition_level: number;
  ease_factor: number;
  interval_days: number;
  next_review_at: string;
  correct_count: number;
  wrong_count: number;
  last_tested_at: string;
}

export interface GameSession {
  id: string;
  user_id: string;
  deck_id: string;
  game_type: GameType;
  score: number;
  max_combo: number;
  words_attempted: number;
  words_correct: number;
  accuracy_percentage: number;
  duration_seconds: number;
  xp_earned: number;
  created_at: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp_reward: number;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  achievement?: Achievement;
}
