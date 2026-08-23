import { ActivityIndicator, StyleSheet, View, type ViewStyle } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PressableScale } from './pressable-scale';
import { Txt } from './text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
};

const heights: Record<Size, number> = { sm: 40, md: 50, lg: 58 };

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  disabled,
  fullWidth = true,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const bg: Record<Variant, string> = {
    primary: theme.accent,
    secondary: theme.backgroundElevated,
    ghost: 'transparent',
    danger: theme.dangerMuted,
  };
  const fg: Record<Variant, keyof ReturnType<typeof useTheme>> = {
    primary: 'accentOn',
    secondary: 'text',
    ghost: 'accent',
    danger: 'danger',
  };

  return (
    <PressableScale
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      pressedScale={0.97}
      style={[
        styles.base,
        {
          height: heights[size],
          backgroundColor: bg[variant],
          borderColor: variant === 'ghost' ? theme.border : 'transparent',
          borderWidth: variant === 'ghost' ? 1 : 0,
          opacity: isDisabled ? 0.5 : 1,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}>
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={theme[fg[variant]]} />
        ) : (
          <>
            {icon}
            <Txt
              variant={size === 'lg' ? 'subtitle' : 'bodyStrong'}
              color={fg[variant]}>
              {title}
            </Txt>
          </>
        )}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
  },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
