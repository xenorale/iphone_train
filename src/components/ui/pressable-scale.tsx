import * as Haptics from 'expo-haptics';
import { Pressable, type PressableProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PressableScaleProps = PressableProps & {
  /** Scale applied while pressed. */
  pressedScale?: number;
  /** Fire a light haptic on press-in. Default true. */
  haptic?: boolean;
};

/**
 * Pressable with a springy scale + optional haptic — the building block for
 * every tappable surface so the app feels tactile and premium.
 */
export function PressableScale({
  pressedScale = 0.96,
  haptic = true,
  onPressIn,
  onPressOut,
  style,
  children,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      style={[animatedStyle, style as object]}
      onPressIn={(e) => {
        scale.value = withTiming(pressedScale, { duration: 90 });
        if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withTiming(1, { duration: 140 });
        onPressOut?.(e);
      }}
      {...rest}>
      {children as React.ReactNode}
    </AnimatedPressable>
  );
}
