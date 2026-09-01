// Node.js script to bulk import scraped vocabulary data into Supabase
// Supports both single-deck format and multi-topic flat array (e.g. tu_vung_theo_chu_de.json)
// Usage: node scripts/import_scraped_data.js <path-to-json-file>

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local if present
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf-8');
  envConfig.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...values] = trimmed.split('=');
      if (key && values.length > 0) {
        let val = values.join('=').trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key.trim()] = val;
      }
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
  console.error('\n❌ Error: Missing NEXT_PUBLIC_SUPABASE_URL or API key in .env.local.');
  console.error('Please configure your real Supabase credentials in .env.local first.\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function slugify(text) {
  return (text || 'deck')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function detectCategory(topicName) {
  const t = topicName.toLowerCase();
  if (t.includes('công nghệ') || t.includes('kỹ năng')) return 'Technology';
  if (t.includes('kinh doanh') || t.includes('tài chính') || t.includes('pháp luật') || t.includes('giáo dục')) return 'Academic';
  if (t.includes('gia đình') || t.includes('cuộc sống') || t.includes('giao tiếp') || t.includes('tình yêu') || t.includes('cảm xúc') || t.includes('mua sắm') || t.includes('đồ ăn')) return 'Conversational';
  return 'General';
}

function pickGradient(index) {
  const gradients = [
    'from-rose-500 to-orange-500',
    'from-purple-500 to-indigo-600',
    'from-cyan-500 to-blue-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-pink-500',
    'from-fuchsia-500 to-rose-600',
    'from-blue-600 to-cyan-500',
  ];
  return gradients[index % gradients.length];
}

async function importMultiTopicArray(items) {
  console.log(`\n🔍 Detected multi-topic array with ${items.length} words total.`);
  
  // Group words by topic
  const grouped = {};
  items.forEach((item) => {
    const topic = (item.topic || 'Chủ đề chung').trim();
    if (!grouped[topic]) {
      grouped[topic] = [];
    }
    grouped[topic].push(item);
  });

  const topicNames = Object.keys(grouped);
  console.log(`📚 Found ${topicNames.length} unique topics to import.\n`);

  let totalImportedWords = 0;
  let deckIndex = 0;

  for (const topicName of topicNames) {
    deckIndex++;
    const wordsInTopic = grouped[topicName];
    const slug = slugify(topicName);
    const category = detectCategory(topicName);
    const colorGradient = pickGradient(deckIndex);

    console.log(`[${deckIndex}/${topicNames.length}] ⚡ Processing Deck: "${topicName}" (${wordsInTopic.length} words)...`);

    // 1. Create or update Deck
    const { data: deck, error: deckError } = await supabase
      .from('decks')
      .upsert(
        {
          title: topicName,
          slug,
          description: `Bộ từ vựng chủ đề ${topicName} với phát âm và ví dụ thực tế.`,
          category,
          difficulty: 'intermediate',
          is_public: true,
          is_official: true,
          word_count: wordsInTopic.length,
          color_gradient: colorGradient,
        },
        { onConflict: 'slug' }
      )
      .select()
      .single();

    if (deckError || !deck) {
      console.error(`❌ Error creating deck "${topicName}":`, deckError);
      continue;
    }

    // 2. Prepare words with smart distractors from the same topic
    const allTopicTranslations = wordsInTopic
      .map((w) => (w.meaning || w.translation || w.nghia || '').trim())
      .filter(Boolean);

    const formattedWords = wordsInTopic.map((w) => {
      const term = (w.word || w.term || w.tu_vung || '').trim().toUpperCase();
      let phonetic = (w.pronunciation || w.phonetic || w.phien_am || '').trim();
      if (phonetic && !phonetic.startsWith('/')) {
        phonetic = `/${phonetic}/`;
      }
      const translation = (w.meaning || w.translation || w.nghia || '').trim();

      // Generate 3 distractors from other words in the same topic
      const otherTranslations = allTopicTranslations.filter((t) => t !== translation);
      const shuffled = [...otherTranslations].sort(() => Math.random() - 0.5);
      let distractors = shuffled.slice(0, 3);
      while (distractors.length < 3) {
        distractors.push('Khác biệt', 'Không liên quan', 'Nghĩa đối lập');
      }
      distractors = distractors.slice(0, 3);

      return {
        deck_id: deck.id,
        term,
        phonetic: phonetic || null,
        translation,
        distractors,
        difficulty_level: 2,
      };
    });

    // Delete existing words for this deck to avoid duplicates if re-importing
    await supabase.from('words').delete().eq('deck_id', deck.id);

    const { error: wordsError } = await supabase.from('words').insert(formattedWords);

    if (wordsError) {
      console.error(`❌ Error inserting words for deck "${topicName}":`, wordsError);
    } else {
      totalImportedWords += formattedWords.length;
      console.log(`   ✅ Successfully imported ${formattedWords.length} words -> Deck ID: ${deck.id}`);
    }
  }

  console.log(`\n🎉 COMPLETED! Successfully created ${topicNames.length} Decks and imported ${totalImportedWords} words into Supabase!`);
  console.log(`👉 Refresh your browser at: http://localhost:3000 to see all new decks.\n`);
}

async function importSingleDeck(payload) {
  const deckInfo = payload.deck || {
    title: 'Scraped Vocabulary Deck',
    description: 'Imported from scraped data source.',
    category: 'General',
    difficulty: 'intermediate',
  };

  const words = payload.words || [];

  if (words.length === 0) {
    console.error('❌ Error: No vocabulary words found in JSON file.');
    process.exit(1);
  }

  console.log(`⚡ Creating/updating Deck: "${deckInfo.title}"...`);
  const slug = slugify(deckInfo.title);

  const { data: deck, error: deckError } = await supabase
    .from('decks')
    .upsert(
      {
        title: deckInfo.title,
        slug,
        description: deckInfo.description || 'Imported vocabulary deck',
        category: deckInfo.category || 'General',
        difficulty: deckInfo.difficulty || 'intermediate',
        is_public: true,
        is_official: false,
        word_count: words.length,
      },
      { onConflict: 'slug' }
    )
    .select()
    .single();

  if (deckError || !deck) {
    console.error('❌ Error creating deck:', deckError);
    process.exit(1);
  }

  const allTranslations = words
    .map((w) => (w.translation || w.meaning || w.nghia || '').trim())
    .filter(Boolean);

  const formattedWords = words.map((w) => {
    const term = (w.term || w.word || w.tu_vung || '').trim().toUpperCase();
    let phonetic = (w.phonetic || w.pronunciation || w.phien_am || '').trim();
    if (phonetic && !phonetic.startsWith('/')) {
      phonetic = `/${phonetic}/`;
    }
    const translation = (w.translation || w.meaning || w.nghia || '').trim();

    let distractors = w.distractors || [];
    if (!Array.isArray(distractors) || distractors.length === 0) {
      const otherTranslations = allTranslations.filter((t) => t !== translation);
      const shuffled = [...otherTranslations].sort(() => Math.random() - 0.5);
      distractors = shuffled.slice(0, 3);
      while (distractors.length < 3) {
        distractors.push('Khác biệt', 'Không liên quan', 'Nghĩa đối lập');
      }
      distractors = distractors.slice(0, 3);
    }

    return {
      deck_id: deck.id,
      term,
      phonetic: phonetic || null,
      translation,
      distractors,
      difficulty_level: w.difficulty_level || 1,
    };
  });

  await supabase.from('words').delete().eq('deck_id', deck.id);
  const { error: wordsError } = await supabase.from('words').insert(formattedWords);

  if (wordsError) {
    console.error('❌ Error inserting words:', wordsError);
    process.exit(1);
  }

  console.log(`\n🎉 SUCCESS! Successfully imported ${formattedWords.length} words into deck "${deck.title}".`);
  console.log(`👉 You can now play this deck in LingoCat at: http://localhost:3000/game/${deck.id}\n`);
}

async function main() {
  const filePath = process.argv[2] || path.resolve(__dirname, '../data/tu_vung_theo_chu_de.json');

  if (!fs.existsSync(filePath)) {
    console.error(`\n❌ Error: File not found at path: ${filePath}`);
    process.exit(1);
  }

  console.log(`\n📦 Reading scraped vocabulary from: ${filePath}...`);
  const rawData = fs.readFileSync(filePath, 'utf-8');
  const payload = JSON.parse(rawData);

  if (Array.isArray(payload)) {
    // Multi-topic flat array
    await importMultiTopicArray(payload);
  } else if (payload.words) {
    // Single deck object
    await importSingleDeck(payload);
  } else {
    console.error('❌ Error: Unrecognized JSON structure.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
