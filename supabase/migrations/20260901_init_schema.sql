-- ====================================================================
-- LINGOCAT 🐾 - SUPABASE DATABASE INITIALIZATION SCRIPT (FINAL)
-- Tables, RLS Policies, Triggers, pgvector Smart Distractors & Seed Decks
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector"; -- Kích hoạt pgvector cho Smart Distractors & Semantic Search

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE game_type_enum AS ENUM ('meteor_defender', 'choice_blaster', 'cyber_runner', 'crossword_rush', 'pvp_arena');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE difficulty_level_enum AS ENUM ('beginner', 'intermediate', 'advanced', 'master');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES TABLE (Linked with Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    total_xp INTEGER DEFAULT 0 NOT NULL,
    level INTEGER DEFAULT 1 NOT NULL,
    streak_days INTEGER DEFAULT 1 NOT NULL,
    last_played_at TIMESTAMPTZ DEFAULT NOW(),
    highest_combo INTEGER DEFAULT 0 NOT NULL,
    total_games_played INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. DECKS TABLE (Bộ từ vựng chiến đấu)
CREATE TABLE IF NOT EXISTS public.decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'General' NOT NULL,
    difficulty difficulty_level_enum DEFAULT 'intermediate' NOT NULL,
    is_public BOOLEAN DEFAULT true NOT NULL,
    is_official BOOLEAN DEFAULT false NOT NULL,
    word_count INTEGER DEFAULT 0 NOT NULL,
    icon_name TEXT DEFAULT 'Sparkles',
    color_gradient TEXT DEFAULT 'from-cyan-500 to-blue-600',
    play_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. WORDS TABLE (Chi tiết từ vựng + pgvector Embeddings)
CREATE TABLE IF NOT EXISTS public.words (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
    term TEXT NOT NULL,
    phonetic TEXT,
    translation TEXT NOT NULL,
    example_sentence TEXT,
    example_translation TEXT,
    audio_url TEXT,
    image_url TEXT,
    distractors TEXT[] DEFAULT '{}', -- 3 đáp án sai dùng cho chế độ trắc nghiệm
    difficulty_level INTEGER DEFAULT 1,
    embedding vector(384), -- Vector ngữ nghĩa 384 chiều phục vụ tìm kiếm & sinh distractors tự động
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index HNSW tăng tốc độ tìm kiếm vector tương đồng ngữ nghĩa
CREATE INDEX IF NOT EXISTS words_embedding_hnsw_idx 
    ON public.words USING hnsw (embedding vector_cosine_ops);

-- 6. USER WORD PROGRESS (In-Game Adaptive SRS Tracking)
CREATE TABLE IF NOT EXISTS public.user_word_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    word_id UUID NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
    repetition_level INTEGER DEFAULT 0 NOT NULL, -- Cấp độ nhớ (0-5)
    ease_factor NUMERIC(4,2) DEFAULT 2.50 NOT NULL,
    interval_days INTEGER DEFAULT 1 NOT NULL,
    next_review_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    correct_count INTEGER DEFAULT 0 NOT NULL,
    wrong_count INTEGER DEFAULT 0 NOT NULL,
    last_tested_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, word_id)
);

-- 7. GAME SESSIONS (Lịch sử trận đấu)
CREATE TABLE IF NOT EXISTS public.game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    deck_id UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
    game_type game_type_enum DEFAULT 'meteor_defender' NOT NULL,
    score INTEGER DEFAULT 0 NOT NULL,
    max_combo INTEGER DEFAULT 0 NOT NULL,
    words_attempted INTEGER DEFAULT 0 NOT NULL,
    words_correct INTEGER DEFAULT 0 NOT NULL,
    accuracy_percentage NUMERIC(5,2) DEFAULT 0.00 NOT NULL,
    duration_seconds INTEGER DEFAULT 0 NOT NULL,
    xp_earned INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 8. ACHIEVEMENTS & USER ACHIEVEMENTS (Huy hiệu & Danh hiệu)
CREATE TABLE IF NOT EXISTS public.achievements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    xp_reward INTEGER DEFAULT 50 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, achievement_id)
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_word_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" 
    ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" 
    ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
    ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Decks Policies
CREATE POLICY "Decks are viewable by everyone if public or owned" 
    ON public.decks FOR SELECT 
    USING (is_public = true OR auth.uid() = creator_id);

CREATE POLICY "Users can insert decks" 
    ON public.decks FOR INSERT 
    WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their own decks" 
    ON public.decks FOR UPDATE 
    USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their own decks" 
    ON public.decks FOR DELETE 
    USING (auth.uid() = creator_id);

-- Words Policies
CREATE POLICY "Words are viewable if parent deck is readable" 
    ON public.words FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.decks 
            WHERE public.decks.id = words.deck_id 
            AND (public.decks.is_public = true OR public.decks.creator_id = auth.uid())
        )
    );

CREATE POLICY "Creators can insert words to their decks" 
    ON public.words FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.decks 
            WHERE public.decks.id = words.deck_id 
            AND public.decks.creator_id = auth.uid()
        )
    );

CREATE POLICY "Creators can update words in their decks" 
    ON public.words FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.decks 
            WHERE public.decks.id = words.deck_id 
            AND public.decks.creator_id = auth.uid()
        )
    );

CREATE POLICY "Creators can delete words in their decks" 
    ON public.words FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.decks 
            WHERE public.decks.id = words.deck_id 
            AND public.decks.creator_id = auth.uid()
        )
    );

-- User Word Progress Policies
CREATE POLICY "Users can view own word progress" 
    ON public.user_word_progress FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own word progress" 
    ON public.user_word_progress FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own word progress" 
    ON public.user_word_progress FOR UPDATE 
    USING (auth.uid() = user_id);

-- Game Sessions Policies
CREATE POLICY "Users can view own game sessions or leaderboards" 
    ON public.game_sessions FOR SELECT 
    USING (true);

CREATE POLICY "Users can insert own game session" 
    ON public.game_sessions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Achievements Policies
CREATE POLICY "Achievements viewable by everyone" 
    ON public.achievements FOR SELECT USING (true);

CREATE POLICY "Users can view their unlocked achievements" 
    ON public.user_achievements FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert unlocked achievements" 
    ON public.user_achievements FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- ====================================================================
-- PGVECTOR SMART DISTRACTORS FUNCTION (Tính năng AI Bẫy Thông Minh)
-- ====================================================================

-- Function tìm 3 đáp án bẫy gần nghĩa bằng Vector Cosine Similarity
CREATE OR REPLACE FUNCTION public.get_smart_distractors(
    target_word_id UUID,
    match_count INT DEFAULT 3
)
RETURNS TABLE (
    distractor_translation TEXT
) AS $$
DECLARE
    target_embedding vector(384);
    target_deck_id UUID;
BEGIN
    SELECT embedding, deck_id INTO target_embedding, target_deck_id
    FROM public.words
    WHERE id = target_word_id;

    -- Nếu từ có embedding vector -> Lấy các từ gần nghĩa nhất làm đáp án bẫy
    IF target_embedding IS NOT NULL THEN
        RETURN QUERY
        SELECT DISTINCT w.translation
        FROM public.words w
        WHERE w.id <> target_word_id
        AND w.translation IS NOT NULL
        ORDER BY w.embedding <=> target_embedding ASC
        LIMIT match_count;
    ELSE
        -- Fallback: Lấy ngẫu nhiên từ cùng Deck nếu chưa có vector
        RETURN QUERY
        SELECT DISTINCT w.translation
        FROM public.words w
        WHERE w.id <> target_word_id
        AND w.deck_id = target_deck_id
        ORDER BY RANDOM()
        LIMIT match_count;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- DATABASE TRIGGERS (Tự động hóa Profile, XP, Level, Streak)
-- ====================================================================

-- 1. Trigger tạo Profile tự động khi người dùng đăng ký
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_name TEXT;
BEGIN
    default_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'user_name',
        split_part(NEW.email, '@', 1),
        'LingoCat_' || SUBSTRING(NEW.id::TEXT, 1, 6)
    );

    INSERT INTO public.profiles (id, username, display_name, avatar_url, total_xp, level, streak_days)
    VALUES (
        NEW.id,
        LOWER(REGEXP_REPLACE(default_name, '[^a-zA-Z0-9_]', '_', 'g')) || '_' || SUBSTRING(NEW.id::TEXT, 1, 4),
        default_name,
        NEW.raw_user_meta_data->>'avatar_url',
        0,
        1,
        1
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Trigger tính toán XP, Level, Streak khi hoàn thành ván đấu
CREATE OR REPLACE FUNCTION public.handle_game_session_completed()
RETURNS TRIGGER AS $$
DECLARE
    curr_xp INT;
    new_xp INT;
    calculated_level INT;
    prev_played_date DATE;
    current_play_date DATE;
    current_streak INT;
BEGIN
    SELECT total_xp, streak_days, last_played_at::DATE
    INTO curr_xp, current_streak, prev_played_date
    FROM public.profiles
    WHERE id = NEW.user_id;

    new_xp := COALESCE(curr_xp, 0) + NEW.xp_earned;
    calculated_level := GREATEST(1, FLOOR(SQRT(new_xp / 100)) + 1);
    current_play_date := CURRENT_DATE;

    IF prev_played_date IS NULL THEN
        current_streak := 1;
    ELSIF current_play_date = prev_played_date THEN
        -- Cùng ngày giữ nguyên
    ELSIF current_play_date = prev_played_date + INTERVAL '1 day' THEN
        current_streak := current_streak + 1;
    ELSE
        current_streak := 1;
    END IF;

    UPDATE public.profiles
    SET 
        total_xp = new_xp,
        level = calculated_level,
        streak_days = current_streak,
        last_played_at = NOW(),
        highest_combo = GREATEST(highest_combo, NEW.max_combo),
        total_games_played = total_games_played + 1,
        updated_at = NOW()
    WHERE id = NEW.user_id;

    UPDATE public.decks
    SET play_count = play_count + 1
    WHERE id = NEW.deck_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_game_session_insert ON public.game_sessions;
CREATE TRIGGER on_game_session_insert
    AFTER INSERT ON public.game_sessions
    FOR EACH ROW EXECUTE FUNCTION public.handle_game_session_completed();

-- 3. Trigger tự động đếm số lượng từ trong Deck
CREATE OR REPLACE FUNCTION public.update_deck_word_count()
RETURNS TRIGGER AS $$
DECLARE
    target_deck_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_deck_id := OLD.deck_id;
    ELSE
        target_deck_id := NEW.deck_id;
    END IF;

    UPDATE public.decks
    SET word_count = (SELECT COUNT(*) FROM public.words WHERE deck_id = target_deck_id),
        updated_at = NOW()
    WHERE id = target_deck_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_word_count_change ON public.words;
CREATE TRIGGER on_word_count_change
    AFTER INSERT OR DELETE ON public.words
    FOR EACH ROW EXECUTE FUNCTION public.update_deck_word_count();

-- ====================================================================
-- STORAGE BUCKETS (Cấu hình tự động)
-- ====================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES 
    ('vocab-audios', 'vocab-audios', true),
    ('vocab-images', 'vocab-images', true),
    ('user-avatars', 'user-avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$ BEGIN
    CREATE POLICY "Public Read vocab-audios" ON storage.objects FOR SELECT USING (bucket_id = 'vocab-audios');
    CREATE POLICY "Public Read vocab-images" ON storage.objects FOR SELECT USING (bucket_id = 'vocab-images');
    CREATE POLICY "Public Read user-avatars" ON storage.objects FOR SELECT USING (bucket_id = 'user-avatars');
    CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('vocab-audios', 'vocab-images', 'user-avatars'));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ====================================================================
-- SEED INITIAL DECKS (Khởi tạo sẵn 3 bộ từ vựng phong phú)
-- ====================================================================

-- 1. Achievements
INSERT INTO public.achievements (id, title, description, icon, xp_reward)
VALUES 
    ('first_strike', 'First Strike', 'Completed your first vocabulary battle', 'Zap', 50),
    ('streak_3', 'Unstoppable Streak', 'Maintained a 3-day learning streak', 'Flame', 100),
    ('combo_20', 'Combo Master', 'Achieved a 20x combo streak in game', 'Target', 150),
    ('master_100', 'Vocabulary Overlord', 'Mastered 100 words in LingoCat', 'Crown', 300)
ON CONFLICT (id) DO NOTHING;

-- 2. Deck 1: IELTS Core Power Words
DO $$
DECLARE
    deck1_id UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
    INSERT INTO public.decks (id, title, slug, description, category, difficulty, is_public, is_official, icon_name, color_gradient)
    VALUES (
        deck1_id,
        'IELTS Core Power Words (Band 7.5+)',
        'ielts-core-power-words',
        'Academic high-frequency vocabulary for IELTS Writing & Speaking.',
        'Academic',
        'advanced',
        true,
        true,
        'GraduationCap',
        'from-purple-500 to-indigo-600'
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.words (deck_id, term, phonetic, translation, example_sentence, example_translation, distractors, difficulty_level)
    VALUES
        (deck1_id, 'ABANDON', '/əˈbæn.dən/', 'Từ bỏ, ruồng bỏ', 'They had to abandon the sinking ship.', 'Họ phải từ bỏ con tàu đang chìm.', ARRAY['Duy trì', 'Xây dựng', 'Khen ngợi'], 2),
        (deck1_id, 'AMBIGUOUS', '/æmˈbɪɡ.ju.əs/', 'Mơ hồ, nước đôi, khó hiểu', 'His reply to my question was somewhat ambiguous.', 'Câu trả lời của anh ấy có phần mơ hồ.', ARRAY['Rõ ràng', 'Dứt khoát', 'Chân thành'], 3),
        (deck1_id, 'COMPREHENSIVE', '/ˌkɒm.prɪˈhen.sɪv/', 'Toàn diện, bao quát', 'The university offers a comprehensive study program.', 'Trường đại học cung cấp một chương trình học toàn diện.', ARRAY['Sơ sài', 'Ngắn gọn', 'Cục bộ'], 3),
        (deck1_id, 'DIVERSE', '/daɪˈvɜːs/', 'Đa dạng, phong phú', 'New York is a very culturally diverse city.', 'New York là một thành phố rất đa dạng về văn hóa.', ARRAY['Đơn điệu', 'Hạn hẹp', 'Lặp lại'], 2),
        (deck1_id, 'ELABORATE', '/iˈlæb.ər.ət/', 'Phức tạp, tỉ mỉ, công phu', 'They made elaborate preparations for the festival.', 'Họ đã chuẩn bị rất công phu cho lễ hội.', ARRAY['Đơn giản', 'Tùy tiện', 'Tạm thời'], 3),
        (deck1_id, 'FEASIBLE', '/ˈfiː.zə.bəl/', 'Khả thi, có thể thực hiện', 'It is not feasible to build the bridge in one month.', 'Không khả thi để xây cây cầu đó trong một tháng.', ARRAY['Bất khả thi', 'Vô lý', 'Nguy hiểm'], 3),
        (deck1_id, 'INNOVATIVE', '/ˈɪn.ə.və.tɪv/', 'Đột phá, đổi mới sáng tạo', 'The company is famous for its innovative tech products.', 'Công ty nổi tiếng với các sản phẩm công nghệ đột phá sáng tạo.', ARRAY['Lạc hậu', 'Rập khuôn', 'Bảo thủ'], 2),
        (deck1_id, 'PRECISE', '/prɪˈsaɪs/', 'Chính xác, tỉ mỉ', 'Scientists need precise measurements for this experiment.', 'Các nhà khoa học cần các phép đo chính xác cho thí nghiệm này.', ARRAY['Ước chừng', 'Mơ hồ', 'Sai lệch'], 2),
        (deck1_id, 'RESILIENT', '/rɪˈzɪl.jənt/', 'Kiên cường, phục hồi nhanh', 'Children are often remarkably resilient after tough events.', 'Trẻ em thường kiên cường và phục hồi sau biến cố.', ARRAY['Yếu đuối', 'Dễ vỡ', 'Tuyệt vọng'], 3),
        (deck1_id, 'SUSTAINABLE', '/səˈsteɪ.nə.bəl/', 'Bền vững, lâu dài', 'We must focus on sustainable economic development.', 'Chúng ta phải tập trung vào phát triển kinh tế bền vững.', ARRAY['Tạm bợ', 'Tiêu hao', 'Gây hại'], 2)
    ON CONFLICT DO NOTHING;
END $$;

-- 3. Deck 2: Cyberpunk & Tech Frontiers
DO $$
DECLARE
    deck2_id UUID := '22222222-2222-2222-2222-222222222222';
BEGIN
    INSERT INTO public.decks (id, title, slug, description, category, difficulty, is_public, is_official, icon_name, color_gradient)
    VALUES (
        deck2_id,
        'Cyberpunk & Tech Frontiers',
        'cyberpunk-and-tech-frontiers',
        'Essential tech, programming, and artificial intelligence vocabulary.',
        'Technology',
        'intermediate',
        true,
        true,
        'Cpu',
        'from-cyan-500 to-emerald-500'
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.words (deck_id, term, phonetic, translation, example_sentence, example_translation, distractors, difficulty_level)
    VALUES
        (deck2_id, 'ALGORITHM', '/ˈæl.ɡə.rɪ.ðəm/', 'Thuật toán', 'The search engine uses a sophisticated ranking algorithm.', 'Công cụ tìm kiếm sử dụng thuật toán xếp hạng tinh vi.', ARRAY['Phần cứng', 'Bàn phím', 'Dữ liệu thô'], 1),
        (deck2_id, 'AUTHENTICATION', '/ɔːˌθen.tɪˈkeɪ.ʃən/', 'Xác thực danh tính', 'Two-factor authentication adds an extra layer of security.', 'Xác thực hai yếu tố bổ sung thêm một lớp bảo mật.', ARRAY['Mã hóa', 'Đăng xuất', 'Cài đặt'], 2),
        (deck2_id, 'BANDWIDTH', '/ˈbænd.wɪtθ/', 'Băng thông mạng', 'Streaming 4K video requires high bandwidth.', 'Xem video 4K trực tuyến đòi hỏi băng thông cao.', ARRAY['Dung lượng pin', 'Màn hình', 'Âm lượng'], 2),
        (deck2_id, 'ENCRYPTION', '/ɪnˈkrɪp.ʃən/', 'Mã hóa dữ liệu bảo mật', 'End-to-end encryption keeps your messages private.', 'Mã hóa đầu cuối giữ cho tin nhắn của bạn được bảo mật.', ARRAY['Sao lưu', 'Xóa bỏ', 'Giải mã công khai'], 2),
        (deck2_id, 'FRAMEWORK', '/ˈfreɪm.wɜːk/', 'Khung phần mềm / Nền tảng', 'Next.js is a powerful React framework for web apps.', 'Next.js là một khung làm việc React mạnh mẽ cho ứng dụng web.', ARRAY['Trình duyệt', 'Dây cáp', 'Hệ điều hành'], 2),
        (deck2_id, 'LATENCY', '/ˈleɪ.tən.si/', 'Độ trễ truyền tải dữ liệu', 'Low latency is crucial for real-time multiplayer games.', 'Độ trễ thấp là yếu tố sống còn cho game đối kháng nhiều người chơi.', ARRAY['Tốc độ tải', 'Băng thông', 'Độ phân giải'], 3),
        (deck2_id, 'QUANTUM', '/ˈkwɒn.təm/', 'Lượng tử', 'Quantum computing will revolutionize cryptography.', 'Điện toán lượng tử sẽ tạo nên cuộc cách mạng trong mật mã học.', ARRAY['Cổ điển', 'Hữu cơ', 'Từ tính'], 4),
        (deck2_id, 'VULNERABILITY', '/ˌvʌl.nər.əˈbɪl.ə.ti/', 'Lỗ hổng bảo mật', 'Security researchers found a critical zero-day vulnerability.', 'Các chuyên gia bảo mật phát hiện một lỗ hổng zero-day nghiêm trọng.', ARRAY['Tường lửa vững chắc', 'Bản vá an toàn', 'Quyền quản trị'], 3)
    ON CONFLICT DO NOTHING;
END $$;
