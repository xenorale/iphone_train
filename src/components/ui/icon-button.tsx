import { StyleSheet } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PressableScale } from './pressable-scale';

export type IconButtonProps = {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'surface' | 'accent' | 'ghost';
  size?: number;
};

export function IconButton({ children, onPress, variant = 'surface', size = 44 }: IconButtonProps) {
  const theme = useTheme();
  const bg =
    variant === 'accent'
      ? theme.accent
      : variant === 'ghost'
        ? 'transparent'
        : theme.backgroundElement;

  return (
    <PressableScale
      onPress={onPress}
      pressedScale={0.9}
      style={[
        styles.btn,
        {
          width: size,
          height: size,
          borderRadius: Radius.md,
          backgroundColor: bg,
          borderWidth: variant === 'surface' ? StyleSheet.hairlineWidth : 0,
          borderColor: theme.border,
        },
      ]}>
      {children}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  btn: { alignItems: 'center', justifyContent: 'center' },
});
