// Node.js script to bulk import scraped vocabulary data into Supabase
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
        // Remove quotes if any
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

async function importData() {
  const filePath = process.argv[2] || path.resolve(__dirname, '../data/sample_scraped_vocab.json');

  if (!fs.existsSync(filePath)) {
    console.error(`\n❌ Error: File not found at path: ${filePath}`);
    process.exit(1);
  }

  console.log(`\n📦 Reading scraped vocabulary from: ${filePath}...`);
  const rawData = fs.readFileSync(filePath, 'utf-8');
  const payload = JSON.parse(rawData);

  const deckInfo = payload.deck || {
    title: 'Custom Scraped Deck',
    description: 'Imported from scraped data source.',
    category: 'General',
    difficulty: 'intermediate',
  };

  const words = payload.words || (Array.isArray(payload) ? payload : []);

  if (words.length === 0) {
    console.error('❌ Error: No vocabulary words found in JSON file.');
    process.exit(1);
  }

  console.log(`⚡ Creating/updating Deck: "${deckInfo.title}"...`);
  const slug = (deckInfo.title || 'deck').toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const { data: deck, error: deckError } = await supabase
    .from('decks')
    .upsert(
      {
        title: deckInfo.title,
        slug,
        description: deckInfo.description,
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

  console.log(`✅ Deck created with ID: ${deck.id}`);
  console.log(`🚀 Inserting ${words.length} words into Supabase...`);

  // Prepare batch insert
  const formattedWords = words.map((w, index) => {
    let distractors = w.distractors || [];
    if (distractors.length === 0) {
      const otherWords = words.filter((_, i) => i !== index);
      distractors = otherWords.slice(0, 3).map((ow) => ow.translation);
      while (distractors.length < 3) {
        distractors.push('Khác biệt', 'Không đúng', 'Nghĩa khác');
      }
      distractors = distractors.slice(0, 3);
    }

    return {
      deck_id: deck.id,
      term: (w.term || '').trim().toUpperCase(),
      phonetic: w.phonetic || null,
      translation: (w.translation || '').trim(),
      example_sentence: w.example_sentence || null,
      example_translation: w.example_translation || null,
      audio_url: w.audio_url || null,
      image_url: w.image_url || null,
      distractors,
      difficulty_level: w.difficulty_level || 1,
    };
  });

  const { data: insertedWords, error: wordsError } = await supabase
    .from('words')
    .insert(formattedWords)
    .select();

  if (wordsError) {
    console.error('❌ Error inserting words:', wordsError);
    process.exit(1);
  }

  console.log(`\n🎉 SUCCESS! Successfully imported ${insertedWords.length} words into deck "${deck.title}".`);
  console.log(`👉 You can now play this deck in LingoCat at: http://localhost:3000/game/${deck.id}\n`);
}

importData().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
