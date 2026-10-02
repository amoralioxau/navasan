import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

const SETTINGS_STORAGE_KEY = 'navasan_settings_v1';

type ThemeContextType = {
  isDark: boolean;
  darkMode: boolean;
  setDarkMode: (value: boolean) => Promise<void>;
  toggleTheme: () => Promise<void>;
  colors: {
    background: string;
    card: string;
    cardSecondary: string;
    border: string;
    text: string;
    secondaryText: string;
    mutedText: string;
    primary: string;
    primarySoft: string;
    input: string;
    tabBackground: string;
    divider: string;
    danger: string;
    success: string;
  };
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function NavasanThemeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [darkMode, setDarkModeState] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);

        if (stored) {
          const parsed = JSON.parse(stored);

          if (typeof parsed.darkMode === 'boolean') {
            setDarkModeState(parsed.darkMode);
          }
        }
      } catch (error) {
        console.log('Theme load error:', error);
      } finally {
        setLoaded(true);
      }
    };

    loadTheme();
  }, []);

  const setDarkMode = async (value: boolean) => {
    setDarkModeState(value);

    try {
      const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);

      let currentSettings: Record<string, unknown> = {};

      if (stored) {
        try {
          currentSettings = JSON.parse(stored);
        } catch {
          currentSettings = {};
        }
      }

      await AsyncStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({
          ...currentSettings,
          darkMode: value,
        }),
      );
    } catch (error) {
      console.log('Theme save error:', error);
    }
  };

  const toggleTheme = async () => {
    await setDarkMode(!darkMode);
  };

  const colors = useMemo(
    () => ({
      background: darkMode ? '#0B0F14' : '#F8FAFC',
      card: darkMode ? '#111827' : '#FFFFFF',
      cardSecondary: darkMode ? '#172033' : '#F1F5F9',
      border: darkMode ? '#1E293B' : '#E2E8F0',
      text: darkMode ? '#FFFFFF' : '#0F172A',
      secondaryText: darkMode ? '#CBD5E1' : '#475569',
      mutedText: darkMode ? '#94A3B8' : '#64748B',
      primary: '#2563EB',
      primarySoft: darkMode ? '#172554' : '#EFF6FF',
      input: darkMode ? '#0F172A' : '#FFFFFF',
      tabBackground: darkMode ? '#111827' : '#FFFFFF',
      divider: darkMode ? '#1E293B' : '#E2E8F0',
      danger: '#EF4444',
      success: '#22C55E',
    }),
    [darkMode],
  );

  const value = useMemo(
    () => ({
      isDark: darkMode,
      darkMode,
      setDarkMode,
      toggleTheme,
      colors,
    }),
    [darkMode, colors],
  );

  if (!loaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useNavasanTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      'useNavasanTheme must be used inside NavasanThemeProvider',
    );
  }

  return context;
}