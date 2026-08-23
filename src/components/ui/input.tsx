import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type InputProps = TextInputProps & {
  left?: React.ReactNode;
  right?: React.ReactNode;
};

export function Input({ left, right, style, ...rest }: InputProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}>
      {left}
      <TextInput
        placeholderTextColor={theme.textTertiary}
        style={[styles.input, { color: theme.text }, style]}
        selectionColor={theme.accent}
        {...rest}
      />
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    height: 50,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: { flex: 1, fontSize: 16, fontWeight: '500', height: '100%' },
});
