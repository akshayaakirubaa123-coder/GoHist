import { StyleSheet, View } from 'react-native';
import Animated, { FadeOutDown, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale, SPRING } from '@/components/motion';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useReadAloud } from '@/hooks/use-read-aloud';
import { useTheme } from '@/hooks/use-theme';
import { formatSpeed } from '@/lib/read-aloud';

/**
 * The audiobook player, docked under every screen while something is loaded:
 * play and pause, skip back and forward a paragraph, speed, and voice.
 */
export function ReadAloudBar() {
  const { track, index, status, speed, gender, voiceNote, toggle, skip, cycleSpeed, setGender, close } =
    useReadAloud();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  if (!track) return null;

  const part = track.parts[index];
  const progress = track.parts.length > 1 ? index / (track.parts.length - 1) : 0;
  const playing = status === 'playing';

  return (
    <Animated.View
      entering={SlideInDown.springify().damping(SPRING.damping).stiffness(SPRING.stiffness)}
      exiting={FadeOutDown.duration(160)}>
      <ThemedView type="backgroundElement" style={[styles.bar, { paddingBottom: Math.max(insets.bottom, Spacing.two) }]}>
        <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
          <View style={[styles.progress, { width: `${progress * 100}%`, backgroundColor: theme.text }]} />
        </View>

        <View style={styles.header}>
          <View style={styles.titles}>
            <ThemedText type="smallBold" numberOfLines={1}>
              {track.title}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {part?.heading ?? 'Introduction'} · {index + 1} of {track.parts.length}
            </ThemedText>
          </View>
          <PressableScale onPress={close} accessibilityRole="button" accessibilityLabel="Stop listening" hitSlop={8}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              ✕
            </ThemedText>
          </PressableScale>
        </View>

        <View style={styles.controls}>
          <PressableScale
            onPress={cycleSpeed}
            accessibilityRole="button"
            accessibilityLabel={`Speed ${formatSpeed(speed)}. Tap to change.`}>
            <ThemedView type="backgroundSelected" style={styles.chip}>
              <ThemedText type="smallBold">{formatSpeed(speed)}</ThemedText>
            </ThemedView>
          </PressableScale>

          <View style={styles.transport}>
            <PressableScale onPress={() => skip(-1)} accessibilityRole="button" accessibilityLabel="Back a paragraph" hitSlop={8}>
              <ThemedText style={styles.icon}>⏮</ThemedText>
            </PressableScale>
            <PressableScale onPress={toggle} accessibilityRole="button" accessibilityLabel={playing ? 'Pause' : 'Play'}>
              <View style={[styles.playButton, { backgroundColor: theme.text }]}>
                <ThemedText style={[styles.playIcon, { color: theme.background }]}>{playing ? '❚❚' : '▶'}</ThemedText>
              </View>
            </PressableScale>
            <PressableScale onPress={() => skip(1)} accessibilityRole="button" accessibilityLabel="Forward a paragraph" hitSlop={8}>
              <ThemedText style={styles.icon}>⏭</ThemedText>
            </PressableScale>
          </View>

          <PressableScale
            onPress={() => setGender(gender === 'female' ? 'male' : 'female')}
            accessibilityRole="button"
            accessibilityLabel={`${gender === 'female' ? 'Female' : 'Male'} voice. Tap to switch.`}>
            <ThemedView type="backgroundSelected" style={styles.chip}>
              <ThemedText type="smallBold">{gender === 'female' ? 'Female' : 'Male'}</ThemedText>
            </ThemedView>
          </PressableScale>
        </View>

        {voiceNote ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
            {voiceNote}
          </ThemedText>
        ) : null}
      </ThemedView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  track: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progress: {
    height: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  titles: {
    flex: 1,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  icon: {
    fontSize: 22,
    lineHeight: 28,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: 700,
  },
  chip: {
    minWidth: 64,
    alignItems: 'center',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.three,
  },
  note: {
    fontStyle: 'italic',
  },
});
