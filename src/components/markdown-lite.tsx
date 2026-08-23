import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Txt } from './ui/text';

/** Renders **bold** spans inside a line. */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <Txt variant="body">
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <Txt key={i} variant="bodyStrong">
            {p.slice(2, -2)}
          </Txt>
        ) : (
          <Txt key={i} variant="body">
            {p}
          </Txt>
        ),
      )}
    </Txt>
  );
}

/** Minimal markdown for AI output: headings (**...**), bullets (-), numbered, paragraphs. */
export function MarkdownLite({ text }: { text: string }) {
  const theme = useTheme();
  const lines = text.split('\n').map((l) => l.trimEnd());

  return (
    <View style={{ gap: Spacing.two }}>
      {lines.map((line, i) => {
        const t = line.trim();
        if (!t) return <View key={i} style={{ height: 2 }} />;

        const headingMatch = t.match(/^\*\*(.+?)\*\*:?$/);
        if (headingMatch || t.startsWith('#')) {
          const label = headingMatch ? headingMatch[1] : t.replace(/^#+\s*/, '');
          return (
            <Txt key={i} variant="micro" color="accent" style={{ marginTop: i === 0 ? 0 : Spacing.two }}>
              {label.toUpperCase()}
            </Txt>
          );
        }

        const bullet = t.match(/^[-•]\s+(.*)$/);
        if (bullet) {
          return (
            <View key={i} style={styles.bulletRow}>
              <View style={[styles.dot, { backgroundColor: theme.accent }]} />
              <View style={{ flex: 1 }}>
                <Inline text={bullet[1]} />
              </View>
            </View>
          );
        }

        const numbered = t.match(/^(\d+)\.\s+(.*)$/);
        if (numbered) {
          return (
            <View key={i} style={styles.bulletRow}>
              <Txt variant="label" color="accent">
                {numbered[1]}.
              </Txt>
              <View style={{ flex: 1 }}>
                <Inline text={numbered[2]} />
              </View>
            </View>
          );
        }

        return <Inline key={i} text={t} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bulletRow: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
});
