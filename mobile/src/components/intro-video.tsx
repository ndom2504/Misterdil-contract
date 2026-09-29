import { useEventListener } from 'expo';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/lib/theme';

const INTRO = require('../../assets/videos/intro4.mp4');
// Never keep people waiting on a video that fails to load or stalls.
const MAX_DURATION_MS = 9000;

export function IntroVideo({ onReady, onDone }: { onReady: () => void; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(1)).current;
  const finished = useRef(false);
  const player = useVideoPlayer(INTRO, (instance) => {
    instance.loop = false;
    instance.play();
  });

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onReady();
    Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => onDone());
  }, [onDone, onReady, opacity]);

  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'readyToPlay') onReady();
    if (status === 'error') finish();
  });
  useEventListener(player, 'playToEnd', finish);

  useEffect(() => {
    const timer = setTimeout(finish, MAX_DURATION_MS);
    return () => clearTimeout(timer);
  }, [finish]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.container, { opacity }]}>
      <StatusBar hidden />
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      <Pressable
        onPress={finish}
        hitSlop={12}
        accessibilityRole="button"
        style={[styles.skip, { top: insets.top + 12 }]}>
        <Text style={styles.skipText}>Passer</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.navy, zIndex: 10 },
  skip: {
    position: 'absolute',
    right: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(11, 31, 58, 0.55)',
  },
  skipText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
});
