import { Image } from 'expo-image';
import { Dumbbell } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { GIFS, THUMBS } from '@/lib/gif-map';

export type ExerciseGifProps = {
  exerciseId: string;
  height?: number;
  radius?: number;
};

/**
 * Looping demonstration animation, bundled with the app so it works offline.
 * Falls back to the still thumbnail, then to an icon, so a missing asset never
 * leaves an empty box.
 */
export function ExerciseGif({ exerciseId, height = 260, radius = Radius.lg }: ExerciseGifProps) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);

  const gif = GIFS[exerciseId];
  const thumb = THUMBS[exerciseId];
  const source = !failed && gif ? gif : thumb;

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
          onError={() => setFailed(true)}
        />
      ) : (
        <View style={styles.empty}>
          <Dumbbell size={32} color={theme.textTertiary} strokeWidth={1.6} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%', overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  empty: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});
