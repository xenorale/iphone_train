import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { GIFS } from '@/lib/gif-map';

export type ExerciseGifProps = {
  exerciseId: string;
  height?: number;
  radius?: number;
};

/** Looping demonstration animation, bundled with the app so it works offline. */
export function ExerciseGif({ exerciseId, height = 260, radius = Radius.lg }: ExerciseGifProps) {
  const theme = useTheme();
  const source = GIFS[exerciseId];

  return (
    <View
      style={[
        styles.box,
        { height, borderRadius: radius, backgroundColor: theme.backgroundElevated, borderColor: theme.border },
      ]}>
      {source ? (
        <Image
          source={source}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          transition={150}
          cachePolicy="memory-disk"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%', overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
});
