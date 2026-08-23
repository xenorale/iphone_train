import { StyleSheet, View, type ViewProps } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PressableScale } from './pressable-scale';

type Variant = 'surface' | 'elevated' | 'outline' | 'accent';

export type CardProps = ViewProps & {
  variant?: Variant;
  padding?: keyof typeof Spacing | 0;
  radius?: keyof typeof Radius;
  onPress?: () => void;
};

export function Card({
  variant = 'surface',
  padding = 'four',
  radius = 'lg',
  onPress,
  style,
  children,
  ...rest
}: CardProps) {
  const theme = useTheme();

  const bg: Record<Variant, string> = {
    surface: theme.backgroundElement,
    elevated: theme.backgroundElevated,
    outline: 'transparent',
    accent: theme.accentMuted,
  };

  const cardStyle = [
    {
      backgroundColor: bg[variant],
      borderRadius: Radius[radius],
      padding: padding === 0 ? 0 : Spacing[padding],
      borderWidth: variant === 'outline' || variant === 'accent' ? 1 : StyleSheet.hairlineWidth,
      borderColor:
        variant === 'accent'
          ? theme.accentMuted
          : variant === 'outline'
            ? theme.border
            : 'rgba(255,255,255,0.04)',
    },
    style,
  ];

  if (onPress) {
    return (
      <PressableScale onPress={onPress} pressedScale={0.98} style={cardStyle} {...rest}>
        {children}
      </PressableScale>
    );
  }

  return (
    <View style={cardStyle} {...rest}>
      {children}
    </View>
  );
}
