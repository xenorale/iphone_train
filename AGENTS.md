# Expo HAS CHANGED

Проект на Expo SDK 57 (React Native 0.86). Перед тем как писать код, читай
версионированные доки: https://docs.expo.dev/versions/v57.0.0/

Что важно помнить после переезда с 54:
- `ThemeProvider`, `DarkTheme`, `DefaultTheme` импортируются из `expo-router`,
  а не из `@react-navigation/native` — этой зависимости в проекте больше нет.
- `globalThis.fetch` — это реализация из `expo/fetch`.
