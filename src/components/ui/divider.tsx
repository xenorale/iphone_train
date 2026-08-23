import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export function Divider({ spacing = 0 }: { spacing?: number }) {
  const theme = useTheme();
  return (
    <View
      style={[styles.line, { backgroundColor: theme.border, marginVertical: spacing }]}
    />
  );
}

const styles = StyleSheet.create({
  line: { height: StyleSheet.hairlineWidth, width: '100%' },
});
