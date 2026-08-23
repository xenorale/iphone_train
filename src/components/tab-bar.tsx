import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { CalendarDays, Dumbbell, Settings, TrendingUp, Zap } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PressableScale } from './ui/pressable-scale';
import { Txt } from './ui/text';

const ICONS: Record<string, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
  index: Zap,
  program: CalendarDays,
  library: Dumbbell,
  progress: TrendingUp,
  settings: Settings,
};

const LABELS: Record<string, string> = {
  index: 'Сегодня',
  program: 'Программа',
  library: 'База',
  progress: 'Прогресс',
  settings: 'Ещё',
};

type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (event: { type: 'tabPress'; target: string; canPreventDefault: true }) => {
      defaultPrevented: boolean;
    };
    navigate: (name: string) => void;
  };
};

export function TabBar({ state, navigation }: TabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom > 0 ? insets.bottom - 4 : Spacing.three }]}>
      <BlurView intensity={40} tint="dark" style={[styles.bar, { borderColor: theme.border }]}>
        {state.routes.map((route, index) => {
          const Icon = ICONS[route.name] ?? Zap;
          const focused = state.index === index;
          const color = focused ? theme.accent : theme.textTertiary;

          return (
            <PressableScale
              key={route.key}
              haptic={false}
              pressedScale={0.88}
              style={styles.item}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  Haptics.selectionAsync();
                  navigation.navigate(route.name);
                }
              }}>
              <View style={[styles.iconWrap, focused && { backgroundColor: theme.accentMuted }]}>
                <Icon size={22} color={color} strokeWidth={focused ? 2.4 : 2} />
              </View>
              <Txt
                variant="micro"
                color={focused ? 'accent' : 'textTertiary'}
                numberOfLines={1}
                style={styles.label}>
                {LABELS[route.name] ?? route.name}
              </Txt>
            </PressableScale>
          );
        })}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: Spacing.five,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    backgroundColor: 'rgba(20,20,22,0.72)',
  },
  item: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: Spacing.one, paddingHorizontal: 2 },
  iconWrap: {
    width: 44,
    height: 30,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 10, lineHeight: 13, letterSpacing: 0.2, textTransform: 'none' },
});
