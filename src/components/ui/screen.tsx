import { ReactNode } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
} from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Txt } from './text';

export type ScreenProps = {
  title?: string;
  subtitle?: string;
  headerRight?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
  /** Add bottom inset so content clears the floating tab bar. */
  tabBarSpacing?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  edges?: readonly Edge[];
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
};

export function Screen({
  title,
  subtitle,
  headerRight,
  children,
  scroll = true,
  tabBarSpacing = false,
  onRefresh,
  refreshing,
  edges = ['top'],
  contentContainerStyle,
}: ScreenProps) {
  const theme = useTheme();

  const header = title ? (
    <View style={styles.header}>
      <View style={styles.headerText}>
        {subtitle ? (
          <Txt variant="micro" color="accent">
            {subtitle}
          </Txt>
        ) : null}
        <Txt variant="display">{title}</Txt>
      </View>
      {headerRight}
    </View>
  ) : null;

  const padBottom = (tabBarSpacing ? BottomTabInset : 0) + Spacing.six;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={edges}>
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: padBottom },
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
                tintColor={theme.accent}
              />
            ) : undefined
          }>
          {header}
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, styles.content, { paddingBottom: padBottom }]}>
          {header}
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.five,
    gap: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  headerText: { gap: Spacing.one, flexShrink: 1 },
});
