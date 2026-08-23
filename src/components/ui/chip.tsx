import { StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PressableScale } from './pressable-scale';
import { Txt } from './text';

export type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
};

export function Chip({ label, selected, onPress, icon }: ChipProps) {
  const theme = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      pressedScale={0.94}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.accent : theme.backgroundElement,
          borderColor: selected ? theme.accent : theme.border,
        },
      ]}>
      <View style={styles.row}>
        {icon}
        <Txt variant="label" color={selected ? 'accentOn' : 'textSecondary'}>
          {label}
        </Txt>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
