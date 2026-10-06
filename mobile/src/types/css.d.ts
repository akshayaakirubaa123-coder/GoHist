// Lets TypeScript accept CSS imports (used for web fonts). Expo's own
// generated expo-env.d.ts declares this too, but only after `expo start` runs.
declare module '*.css';
