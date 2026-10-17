/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Article } from './article.ts';
import {
  firstPartOfSection,
  nextSpeed,
  pickVoice,
  splitForSpeech,
  trackFromArticle,
  trackFromSummary,
  voiceGender,
  type DeviceVoice,
} from './read-aloud.ts';

const article: Article = {
  language: 'en',
  title: 'Fort Canning Park',
  url: 'https://en.wikipedia.org/wiki/Fort_Canning_Park',
  sections: [
    { level: 0, paragraphs: ['Fort Canning Hill is a hill in Singapore.'] },
    { heading: 'History', level: 1, paragraphs: ['It was known as Bukit Larangan.', 'Raffles built a house here.'] },
    { heading: 'Today', level: 1, paragraphs: ['It is a park.'] },
  ],
};

test('keeps short text whole and breaks long text between sentences', () => {
  assert.deepEqual(splitForSpeech('  One sentence.  '), ['One sentence.']);
  assert.deepEqual(splitForSpeech(''), []);
  const pieces = splitForSpeech('First one here. Second one here. Third one here.', 32);
  assert.deepEqual(pieces, ['First one here. Second one here.', 'Third one here.']);
});

test('breaks a sentence longer than the limit between words', () => {
  const pieces = splitForSpeech('alpha beta gamma delta epsilon', 12);
  assert.ok(pieces.every((piece) => piece.length <= 12), pieces.join('|'));
  assert.equal(pieces.join(' '), 'alpha beta gamma delta epsilon');
});

test('reads the title, then each heading before its section', () => {
  const track = trackFromArticle('Fort Canning', article, 'en');
  assert.deepEqual(
    track.parts.map((part) => part.text),
    [
      'Fort Canning',
      'Fort Canning Hill is a hill in Singapore.',
      'History',
      'It was known as Bukit Larangan.',
      'Raffles built a house here.',
      'Today',
      'It is a park.',
    ],
  );
  assert.equal(firstPartOfSection(track, 0), 0);
  assert.equal(firstPartOfSection(track, 1), 2);
  assert.equal(firstPartOfSection(track, 2), 5);
  assert.equal(track.parts[3].heading, 'History');
});

test('reads a card summary after the place name, in the summary language', () => {
  const track = trackFromSummary('Raffles Hotel', 'A colonial-style hotel.', 'en');
  assert.equal(track.language, 'en');
  assert.deepEqual(track.parts.map((part) => part.text), ['Raffles Hotel', 'A colonial-style hotel.']);
});

test('steps through speeds and wraps around', () => {
  assert.equal(nextSpeed(1), 1.25);
  assert.equal(nextSpeed(2), 0.75);
  assert.equal(nextSpeed(0.75), 1);
});

const voices: DeviceVoice[] = [
  { identifier: 'com.apple.voice.compact.en-US.Samantha', name: 'Samantha', language: 'en-US' },
  { identifier: 'com.apple.voice.compact.en-GB.Daniel', name: 'Daniel', language: 'en-GB' },
  { identifier: 'com.apple.speech.synthesis.voice.Fred', name: 'Fred', language: 'en-US' },
  { identifier: 'com.apple.ttsbundle.siri_male_es-ES_compact', name: 'Siri Voice 2', language: 'es-ES' },
  { identifier: 'ta-in-x-tag-local', name: 'ta-in-x-tag-local', language: 'ta-IN' },
  { identifier: 'en-us-x-iom-local', name: 'en-us-x-iom-local', language: 'en-US', quality: 'Enhanced' },
];

test('tells female and male voices apart where the phone or the voice name says', () => {
  assert.equal(voiceGender(voices[0]), 'female');
  assert.equal(voiceGender(voices[1]), 'male');
  assert.equal(voiceGender(voices[3]), 'male');
  assert.equal(voiceGender(voices[4]), undefined);
  assert.equal(voiceGender(voices[5]), 'male');
  assert.equal(voiceGender({ identifier: 'com.apple.ttsbundle.siri_female_en-US', name: 'x', language: 'en-US' }), 'female');
});

test('picks a voice of the chosen gender for the language, or falls back to the default', () => {
  assert.equal(pickVoice(voices, 'en', 'female').voice?.name, 'Samantha');
  // The enhanced Android voice sounds better than the compact iOS one.
  assert.equal(pickVoice(voices, 'en', 'male').voice?.identifier, 'en-us-x-iom-local');
  assert.equal(pickVoice(voices, 'es', 'male').matchedGender, true);
  assert.deepEqual(pickVoice(voices, 'es', 'female'), { voice: undefined, matchedGender: false });
  assert.deepEqual(pickVoice(voices, 'ta', 'female'), { voice: undefined, matchedGender: false });
});
