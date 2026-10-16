import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { languageName } from '@/lib/languages';
import { nextSpeed, pickVoice, type DeviceVoice, type Track, type VoiceGender } from '@/lib/read-aloud';

const STORAGE_KEY = 'gohist.readAloud';

type Status = 'playing' | 'paused';
type Settings = { speed: number; gender: VoiceGender };

type ReadAloudContextValue = {
  /** What's loaded in the player, if anything. */
  track?: Track;
  /** The part being read, or where playback will pick up. */
  index: number;
  status: Status;
  speed: number;
  gender: VoiceGender;
  /** Set when the chosen voice isn't installed for this language, so another one is reading. */
  voiceNote?: string;
  /** Starts reading `track` from part `start`. */
  play: (track: Track, start?: number) => void;
  toggle: () => void;
  /** Moves back or forward by `delta` parts. */
  skip: (delta: number) => void;
  cycleSpeed: () => void;
  setGender: (gender: VoiceGender) => void;
  close: () => void;
};

const ReadAloudContext = createContext<ReadAloudContextValue>({
  index: 0,
  status: 'paused',
  speed: 1,
  gender: 'female',
  play: () => {},
  toggle: () => {},
  skip: () => {},
  cycleSpeed: () => {},
  setGender: () => {},
  close: () => {},
});

let audioModeSet = false;

/**
 * Lets speech keep going with the screen locked or another app open, and with
 * the iPhone's silent switch on, like an audiobook. On Android the phone's
 * speech engine keeps reading while the app is in the background.
 */
async function prepareAudio() {
  if (audioModeSet || Platform.OS === 'web') return;
  audioModeSet = true;
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    // Turn other audio down rather than stopping it, like navigation directions do.
    interruptionMode: 'duckOthers',
  }).catch(() => {
    audioModeSet = false;
  });
}

/**
 * Reads place histories aloud with the phone's own text-to-speech voices, so
 * it works offline and costs nothing. Holds what's playing across screens.
 */
export function ReadAloudProvider({ children }: { children: ReactNode }) {
  const [track, setTrack] = useState<Track>();
  const [index, setIndex] = useState(0);
  const [status, setStatusState] = useState<Status>('paused');
  const [settings, setSettings] = useState<Settings>({ speed: 1, gender: 'female' });
  const [voiceNote, setVoiceNote] = useState<string>();

  // Speech callbacks fire long after they're set up, so they read these rather than state.
  const trackRef = useRef<Track | undefined>(undefined);
  const indexRef = useRef(0);
  const statusRef = useRef<Status>('paused');
  const settingsRef = useRef(settings);
  // Bumped whenever playback restarts or stops, so callbacks from older speech are ignored.
  const generation = useRef(0);
  // iOS can pause mid-sentence; elsewhere pausing stops and resumes from the start of the part.
  const pausedNatively = useRef(false);
  const voices = useRef<DeviceVoice[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (!saved) return;
        const parsed = JSON.parse(saved) as Partial<Settings>;
        const next = {
          speed: typeof parsed.speed === 'number' ? parsed.speed : 1,
          gender: parsed.gender === 'male' ? 'male' : 'female',
        } as const;
        settingsRef.current = next;
        setSettings(next);
      })
      .catch(() => {});
    return () => {
      Speech.stop();
    };
  }, []);

  const setStatus = (next: Status) => {
    statusRef.current = next;
    setStatusState(next);
  };

  const moveTo = (next: number) => {
    indexRef.current = next;
    setIndex(next);
  };

  const speakFrom = async (current: Track, start: number) => {
    const run = ++generation.current;
    pausedNatively.current = false;
    moveTo(start);
    setStatus('playing');
    await Speech.stop();
    await prepareAudio();
    if (voices.current.length === 0) {
      voices.current = await Speech.getAvailableVoicesAsync().catch(() => []);
    }
    if (run !== generation.current) return;

    const { speed, gender } = settingsRef.current;
    const { voice, matchedGender } = pickVoice(voices.current, current.language, gender);
    setVoiceNote(
      matchedGender
        ? undefined
        : `This phone has no ${gender} voice for ${languageName(current.language)}, so its default voice is reading. You can add voices in your phone's settings.`,
    );

    // Everything is queued with the phone at once, so it keeps reading even if the app is paused in the background.
    current.parts.slice(start).forEach((part, offset) => {
      const partIndex = start + offset;
      const isLast = partIndex === current.parts.length - 1;
      Speech.speak(part.text, {
        language: current.language,
        voice: voice?.identifier,
        rate: speed,
        useApplicationAudioSession: true,
        onStart: () => {
          if (run === generation.current) moveTo(partIndex);
        },
        onDone: () => {
          if (isLast && run === generation.current) {
            // Finished: rewind so the next tap on play starts over.
            generation.current++;
            moveTo(0);
            setStatus('paused');
          }
        },
        onError: () => {
          if (run !== generation.current) return;
          generation.current++;
          setStatus('paused');
        },
      });
    });
  };

  const stopSpeech = () => {
    generation.current++;
    pausedNatively.current = false;
    Speech.stop();
  };

  const play = (next: Track, start = 0) => {
    trackRef.current = next;
    setTrack(next);
    speakFrom(next, start);
  };

  const toggle = () => {
    const current = trackRef.current;
    if (!current) return;
    if (statusRef.current === 'playing') {
      setStatus('paused');
      if (Platform.OS === 'ios') {
        pausedNatively.current = true;
        Speech.pause();
      } else {
        stopSpeech();
      }
    } else if (pausedNatively.current) {
      pausedNatively.current = false;
      setStatus('playing');
      Speech.resume();
    } else {
      speakFrom(current, indexRef.current);
    }
  };

  const skip = (delta: number) => {
    const current = trackRef.current;
    if (!current) return;
    const next = Math.min(Math.max(indexRef.current + delta, 0), current.parts.length - 1);
    if (statusRef.current === 'playing') {
      speakFrom(current, next);
    } else {
      stopSpeech();
      moveTo(next);
    }
  };

  const changeSettings = (next: Settings) => {
    settingsRef.current = next;
    setSettings(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
    // A new speed or voice applies from the part being read now.
    const current = trackRef.current;
    if (current && statusRef.current === 'playing') speakFrom(current, indexRef.current);
    else if (pausedNatively.current) stopSpeech();
  };

  const close = () => {
    stopSpeech();
    trackRef.current = undefined;
    setTrack(undefined);
    setStatus('paused');
    setVoiceNote(undefined);
    moveTo(0);
  };

  return (
    <ReadAloudContext.Provider
      value={{
        track,
        index,
        status,
        speed: settings.speed,
        gender: settings.gender,
        voiceNote,
        play,
        toggle,
        skip,
        cycleSpeed: () => changeSettings({ ...settingsRef.current, speed: nextSpeed(settingsRef.current.speed) }),
        setGender: (gender) => changeSettings({ ...settingsRef.current, gender }),
        close,
      }}>
      {children}
    </ReadAloudContext.Provider>
  );
}

export function useReadAloud() {
  return useContext(ReadAloudContext);
}
