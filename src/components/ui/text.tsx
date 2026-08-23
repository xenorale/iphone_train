import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant =
  | 'display'
  | 'title'
  | 'heading'
  | 'subtitle'
  | 'body'
  | 'bodyStrong'
  | 'label'
  | 'caption'
  | 'micro'
  | 'mono';

export type TxtProps = TextProps & {
  variant?: Variant;
  color?: ThemeColor;
  /** Use SF Pro Rounded — great for big numbers / stats. */
  rounded?: boolean;
  center?: boolean;
};

export function Txt({
  variant = 'body',
  color = 'text',
  rounded,
  center,
  style,
  ...rest
}: TxtProps) {
  const theme = useTheme();
  return (
    <Text
      style={[
        { color: theme[color] },
        styles[variant],
        rounded && { fontFamily: Fonts.rounded },
        center && styles.center,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  display: { fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.5 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.4 },
  heading: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.3 },
  subtitle: { fontSize: 18, lineHeight: 24, fontWeight: '600', letterSpacing: -0.2 },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '500' },
  bodyStrong: { fontSize: 16, lineHeight: 23, fontWeight: '700' },
  label: { fontSize: 14, lineHeight: 18, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 17, fontWeight: '500' },
  micro: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  mono: { fontSize: 13, lineHeight: 18, fontWeight: '600', fontFamily: Fonts.mono },
  center: { textAlign: 'center' },
});
