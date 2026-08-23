import { StyleSheet, View } from 'react-native';
import Svg, { Ellipse, G, Path, Rect } from 'react-native-svg';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Txt } from './ui';

/**
 * Front/back body diagram with the worked muscles lit up.
 *
 * Shapes are deliberately schematic — the goal is instant "what does this hit"
 * recognition at thumbnail size, not an anatomy plate.
 */

type Group =
  | 'delts' | 'pectorals' | 'biceps' | 'forearms' | 'abs' | 'obliques'
  | 'quads' | 'adductors' | 'abductors' | 'calves' | 'traps' | 'upperBack'
  | 'lats' | 'spine' | 'triceps' | 'glutes' | 'hamstrings' | 'neck';

/** Catalog `target` / secondary muscle → diagram groups. */
const TARGET_TO_GROUPS: Record<string, Group[]> = {
  abs: ['abs'],
  quads: ['quads'],
  lats: ['lats'],
  calves: ['calves'],
  pectorals: ['pectorals'],
  glutes: ['glutes'],
  hamstrings: ['hamstrings'],
  adductors: ['adductors'],
  triceps: ['triceps'],
  spine: ['spine'],
  'upper back': ['upperBack'],
  biceps: ['biceps'],
  delts: ['delts'],
  forearms: ['forearms'],
  traps: ['traps'],
  'serratus anterior': ['obliques'],
  abductors: ['abductors'],
  'levator scapulae': ['neck'],
  'cardiovascular system': [
    'quads', 'hamstrings', 'calves', 'glutes', 'abs', 'delts',
  ],
};

export type MuscleMapProps = {
  /** Catalog `muscle` (target) key. */
  target: string;
  /** Catalog `secondary` keys, drawn dimmer. */
  secondary?: string[];
  height?: number;
  showLabels?: boolean;
};

export function MuscleMap({ target, secondary = [], height = 150, showLabels = true }: MuscleMapProps) {
  const theme = useTheme();

  const primary = new Set(TARGET_TO_GROUPS[target] ?? []);
  const support = new Set<Group>();
  for (const s of secondary) {
    for (const g of TARGET_TO_GROUPS[s] ?? []) if (!primary.has(g)) support.add(g);
  }

  const fill = (g: Group) =>
    primary.has(g) ? theme.accent : support.has(g) ? theme.accentMuted : theme.backgroundSelected;

  return (
    <View style={styles.wrap}>
      <View style={styles.side}>
        <Svg width={height * 0.52} height={height} viewBox="0 0 100 200">
          <FrontBody fill={fill} outline={theme.border} />
        </Svg>
        {showLabels ? (
          <Txt variant="micro" color="textTertiary">
            спереди
          </Txt>
        ) : null}
      </View>
      <View style={styles.side}>
        <Svg width={height * 0.52} height={height} viewBox="0 0 100 200">
          <BackBody fill={fill} outline={theme.border} />
        </Svg>
        {showLabels ? (
          <Txt variant="micro" color="textTertiary">
            сзади
          </Txt>
        ) : null}
      </View>
    </View>
  );
}

type BodyProps = { fill: (g: Group) => string; outline: string };

function FrontBody({ fill, outline }: BodyProps) {
  return (
    <G stroke={outline} strokeWidth={0.8}>
      {/* head + neck */}
      <Ellipse cx={50} cy={14} rx={9} ry={11} fill={fill('neck')} />
      <Rect x={45} y={24} width={10} height={6} fill={fill('neck')} />

      {/* shoulders */}
      <Ellipse cx={29} cy={39} rx={9} ry={7.5} fill={fill('delts')} />
      <Ellipse cx={71} cy={39} rx={9} ry={7.5} fill={fill('delts')} />

      {/* chest */}
      <Path d="M39 33 h9 v15 q-6 4 -12 1 z" fill={fill('pectorals')} />
      <Path d="M61 33 h-9 v15 q6 4 12 1 z" fill={fill('pectorals')} />

      {/* abs + obliques */}
      <Rect x={43} y={51} width={14} height={26} rx={3} fill={fill('abs')} />
      <Path d="M40 51 q-4 12 0 24 l3 -2 v-22 z" fill={fill('obliques')} />
      <Path d="M60 51 q4 12 0 24 l-3 -2 v-22 z" fill={fill('obliques')} />

      {/* arms */}
      <Ellipse cx={25} cy={57} rx={6} ry={11} fill={fill('biceps')} />
      <Ellipse cx={75} cy={57} rx={6} ry={11} fill={fill('biceps')} />
      <Ellipse cx={22} cy={79} rx={5} ry={11} fill={fill('forearms')} />
      <Ellipse cx={78} cy={79} rx={5} ry={11} fill={fill('forearms')} />

      {/* hips + legs */}
      <Path d="M41 79 h18 l3 10 h-24 z" fill={fill('abductors')} />
      <Path d="M38 90 h10 v36 q-7 3 -12 -1 z" fill={fill('quads')} />
      <Path d="M62 90 h-10 v36 q7 3 12 -1 z" fill={fill('quads')} />
      <Path d="M48 90 h4 v30 h-4 z" fill={fill('adductors')} />
      <Ellipse cx={42} cy={148} rx={6} ry={13} fill={fill('calves')} />
      <Ellipse cx={58} cy={148} rx={6} ry={13} fill={fill('calves')} />
    </G>
  );
}

function BackBody({ fill, outline }: BodyProps) {
  return (
    <G stroke={outline} strokeWidth={0.8}>
      {/* head + neck */}
      <Ellipse cx={50} cy={14} rx={9} ry={11} fill={fill('neck')} />
      <Rect x={45} y={24} width={10} height={6} fill={fill('neck')} />

      {/* traps */}
      <Path d="M38 31 h24 l-6 14 h-12 z" fill={fill('traps')} />

      {/* shoulders */}
      <Ellipse cx={29} cy={39} rx={9} ry={7.5} fill={fill('delts')} />
      <Ellipse cx={71} cy={39} rx={9} ry={7.5} fill={fill('delts')} />

      {/* upper back + lats */}
      <Rect x={40} y={45} width={20} height={12} rx={2} fill={fill('upperBack')} />
      <Path d="M38 46 q-6 14 2 24 l8 -4 v-20 z" fill={fill('lats')} />
      <Path d="M62 46 q6 14 -2 24 l-8 -4 v-20 z" fill={fill('lats')} />

      {/* lower back */}
      <Rect x={44} y={70} width={12} height={12} rx={2} fill={fill('spine')} />

      {/* triceps + forearms */}
      <Ellipse cx={25} cy={57} rx={6} ry={11} fill={fill('triceps')} />
      <Ellipse cx={75} cy={57} rx={6} ry={11} fill={fill('triceps')} />
      <Ellipse cx={22} cy={79} rx={5} ry={11} fill={fill('forearms')} />
      <Ellipse cx={78} cy={79} rx={5} ry={11} fill={fill('forearms')} />

      {/* glutes + hamstrings + calves */}
      <Path d="M40 83 h20 q3 10 -4 13 h-12 q-7 -3 -4 -13 z" fill={fill('glutes')} />
      <Path d="M39 97 h10 v30 q-7 3 -11 -1 z" fill={fill('hamstrings')} />
      <Path d="M61 97 h-10 v30 q7 3 11 -1 z" fill={fill('hamstrings')} />
      <Ellipse cx={42} cy={148} rx={6} ry={13} fill={fill('calves')} />
      <Ellipse cx={58} cy={148} rx={6} ry={13} fill={fill('calves')} />
    </G>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.five },
  side: { alignItems: 'center', gap: 4 },
});
