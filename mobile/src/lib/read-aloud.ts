import type { Article } from './article.ts';
import type { LanguageCode } from './languages.ts';

/** One stretch of text the phone reads in a single go. */
export type SpokenPart = {
  text: string;
  /** Index of the section this part belongs to, for "play from this section". */
  section: number;
  /** The heading of that section, shown in the player while it plays. */
  heading?: string;
};

/** Something to listen to, like one chapter of an audiobook. */
export type Track = {
  /** Stays the same for the same text, so the player can tell what's already loaded. */
  id: string;
  title: string;
  /** Language the text is written in, which picks the voice. */
  language: LanguageCode;
  parts: SpokenPart[];
};

export type VoiceGender = 'female' | 'male';

/** Playback speeds the player steps through. */
export const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;

/** The next speed after `current`, going back to the slowest after the fastest. */
export function nextSpeed(current: number): number {
  const index = SPEEDS.findIndex((speed) => speed > current);
  return index === -1 ? SPEEDS[0] : SPEEDS[index];
}

/** "1×", "1.25×" and so on. */
export function formatSpeed(speed: number): string {
  return `${speed}×`;
}

// Phones refuse very long utterances (Android's limit is about 4,000 characters),
// and shorter ones make skipping back and forward feel precise.
const MAX_PART_LENGTH = 1200;

/**
 * Splits text into pieces no longer than `max`, breaking between sentences
 * where possible and between words otherwise.
 */
export function splitForSpeech(text: string, max = MAX_PART_LENGTH): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= max) return [trimmed];

  const sentences = trimmed.match(/[^.!?。！？]+[.!?。！？]*["'”’)\]]*\s*/g) ?? [trimmed];
  const pieces: string[] = [];
  let current = '';
  const flush = () => {
    if (current.trim()) pieces.push(current.trim());
    current = '';
  };
  for (const sentence of sentences) {
    if ((current + sentence).trim().length <= max) {
      current += sentence;
      continue;
    }
    flush();
    if (sentence.trim().length <= max) {
      current = sentence;
      continue;
    }
    // One sentence longer than the limit: break it between words.
    for (const word of sentence.split(/(?<=\s)/)) {
      if ((current + word).trim().length > max) flush();
      current += word;
    }
  }
  flush();
  return pieces;
}

/** A place's card summary, ready to read aloud. */
export function trackFromSummary(title: string, summary: string, language: LanguageCode): Track {
  return {
    id: `summary:${language}:${title}`,
    title,
    language,
    parts: [
      { text: title, section: 0 },
      ...splitForSpeech(summary).map((text) => ({ text, section: 0 })),
    ],
  };
}

/**
 * A whole Wikipedia article, ready to read aloud. Each heading is read before
 * its section, the way a narrator announces a chapter. `language` is the
 * language the text is in now, which differs from the article's own when it
 * was translated on the phone.
 */
export function trackFromArticle(title: string, article: Article, language: LanguageCode): Track {
  const parts: SpokenPart[] = [{ text: title, section: 0 }];
  article.sections.forEach((section, index) => {
    if (section.heading) parts.push({ text: section.heading, section: index, heading: section.heading });
    for (const paragraph of section.paragraphs) {
      for (const text of splitForSpeech(paragraph)) parts.push({ text, section: index, heading: section.heading });
    }
  });
  return { id: `article:${language}:${article.language}:${article.title}`, title, language, parts };
}

/** The first part of a section, so playback can start there. */
export function firstPartOfSection(track: Track, section: number): number {
  const index = track.parts.findIndex((part) => part.section >= section);
  return index === -1 ? 0 : index;
}

/** The voice details the player needs; matches what expo-speech reports. */
export type DeviceVoice = { identifier: string; name: string; language: string; quality?: string };

// Phones don't say whether a voice sounds female or male, so these are the
// names of common built-in voices. A voice that isn't listed is left unknown.
const FEMALE_NAMES = new Set([
  'samantha', 'ava', 'allison', 'susan', 'zoe', 'nicky', 'karen', 'moira', 'tessa', 'fiona', 'kate',
  'serena', 'veena', 'catherine', 'martha', 'victoria', 'siri female', 'monica', 'mónica', 'paulina',
  'marisol', 'angelica', 'amelie', 'amélie', 'audrey', 'aurelie', 'aurélie', 'marie', 'anna', 'petra',
  'helena', 'alice', 'federica', 'paola', 'joana', 'luciana', 'catarina', 'fernanda', 'ellen', 'claire',
  'kyoko', 'o-ren', 'tingting', 'ting-ting', 'sinji', 'mei-jia', 'meijia', 'yu-shu', 'lekha', 'kiyara',
  'vani', 'laila', 'mariam', 'lana', 'sara', 'nora', 'yelda', 'milena', 'zuzana', 'ioana', 'melina',
  'carmit', 'damayanti', 'kanya', 'linh', 'yuna', 'ewa', 'tünde', 'sora',
]);
const MALE_NAMES = new Set([
  'daniel', 'alex', 'tom', 'aaron', 'arthur', 'gordon', 'oliver', 'rishi', 'lee', 'evan',
  'nathan', 'noel', 'siri male', 'jorge', 'diego', 'juan', 'carlos', 'thomas', 'nicolas', 'jacques',
  'yannick', 'markus', 'martin', 'viktor', 'luca', 'eddy', 'felipe', 'xander', 'otoya', 'hattori',
  'li-mu', 'maged', 'majed', 'tarik', 'aman', 'neel',
]);

// Google's Android voices are named like "en-us-x-tpf-local"; the three letters after "x" pick the voice.
const GOOGLE_VOICES: Record<string, VoiceGender> = {
  'en-us-x-iob': 'female', 'en-us-x-iog': 'female', 'en-us-x-sfg': 'female', 'en-us-x-tpc': 'female',
  'en-us-x-tpf': 'female', 'en-us-x-iol': 'male', 'en-us-x-iom': 'male', 'en-us-x-tpd': 'male',
  'en-gb-x-gba': 'female', 'en-gb-x-gbc': 'female', 'en-gb-x-gbg': 'female', 'en-gb-x-gbb': 'male',
  'en-gb-x-gbd': 'male', 'en-gb-x-rjs': 'male',
  'en-au-x-afa': 'female', 'en-au-x-aua': 'female', 'en-au-x-auc': 'female', 'en-au-x-aub': 'male',
  'en-au-x-aud': 'male',
  'en-in-x-ahp': 'female', 'en-in-x-cxx': 'female', 'en-in-x-ene': 'female', 'en-in-x-end': 'male',
};

/**
 * Whether a voice sounds female or male, as far as can be told. iOS Siri voices
 * and older Android voices put it in their identifier; otherwise the voice is
 * looked up in a list of well-known iOS and Google voices.
 */
export function voiceGender(voice: DeviceVoice): VoiceGender | undefined {
  const id = voice.identifier.toLowerCase();
  if (/(^|[^a-z])female/.test(id)) return 'female';
  if (/(^|[^a-z])male/.test(id)) return 'male';
  const google = /^[a-z]{2,3}-[a-z]{2}-x-[a-z]{3}/.exec(id);
  if (google && GOOGLE_VOICES[google[0]]) return GOOGLE_VOICES[google[0]];
  const name = voice.name.toLowerCase().replace(/\s*\(.*\)\s*$/, '').trim();
  if (FEMALE_NAMES.has(name)) return 'female';
  if (MALE_NAMES.has(name)) return 'male';
  return undefined;
}

function baseLanguage(code: string): string {
  return code.toLowerCase().split(/[-_]/)[0];
}

/** Voices that can read `language`, best sounding first. */
export function voicesFor(voices: DeviceVoice[], language: LanguageCode): DeviceVoice[] {
  return voices
    .filter((voice) => baseLanguage(voice.language) === baseLanguage(language))
    .sort((a, b) => Number(b.quality === 'Enhanced') - Number(a.quality === 'Enhanced'));
}

/**
 * The voice to read `language` in, preferring the chosen gender. Returns
 * undefined (use the phone's default voice) when no voice of that gender is
 * installed for the language, along with whether the gender could be matched.
 */
export function pickVoice(
  voices: DeviceVoice[],
  language: LanguageCode,
  gender: VoiceGender,
): { voice?: DeviceVoice; matchedGender: boolean } {
  const candidates = voicesFor(voices, language);
  // iOS novelty voices (Bells, Zarvox...) and Eloquence voices (Grandpa, Rocko...) tire over a whole article.
  const usable = candidates.filter((voice) => !/speech\.synthesis\.voice|eloquence/i.test(voice.identifier));
  const match = usable.find((voice) => voiceGender(voice) === gender);
  return match ? { voice: match, matchedGender: true } : { voice: undefined, matchedGender: false };
}
