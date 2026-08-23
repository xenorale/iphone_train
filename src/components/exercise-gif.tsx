import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ExerciseGifProps = {
  images: string[];
  height?: number;
  radius?: number;
  /** ms between frame swaps */
  interval?: number;
};

/**
 * Demonstration player. The public-domain dataset ships two frames (start/end of
 * the movement); we cross-fade between them on a loop to fake a smooth animation.
 * Swap `images` for a real GIF/WebP url later and expo-image plays it natively.
 */
export function ExerciseGif({ images, height = 260, radius = Radius.lg, interval = 1100 }: ExerciseGifProps) {
  const theme = useTheme();
  const frames = images.length ? images : [];
  const animated = frames.length >= 2;
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!animated) return;
    const id = setInterval(() => {
      opacity.value = withTiming(opacity.value > 0.5 ? 0 : 1, { duration: 480 });
    }, interval);
    return () => clearInterval(id);
  }, [animated, interval, opacity]);

  const topStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View
      style={[
        styles.box,
        { height, borderRadius: radius, backgroundColor: theme.backgroundElevated, borderColor: theme.border },
      ]}>
      {frames.length ? (
        <>
          {animated ? (
            <Image
              source={frames[1]}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={150}
              cachePolicy="memory-disk"
            />
          ) : null}
          <Animated.View style={[StyleSheet.absoluteFill, topStyle]}>
            <Image
              source={frames[0]}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={150}
              cachePolicy="memory-disk"
            />
          </Animated.View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%', overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
});
