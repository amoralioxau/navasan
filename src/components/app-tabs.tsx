import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import { useNavasanTheme } from '@/context/theme-context';

export default function AppTabs() {
  const { isDark, colors } = useNavasanTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'shift',

        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedText,

        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 16,

          height: 68,

          backgroundColor: colors.tabBackground,

          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: colors.border,

          borderRadius: 22,

          elevation: 8,

          shadowColor: '#000000',
          shadowOffset: {
            width: 0,
            height: 4,
          },
          shadowOpacity: isDark ? 0.28 : 0.08,
          shadowRadius: 12,

          paddingTop: 8,
          paddingBottom: 8,
        },

        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        },

        tabBarItemStyle: {
          borderRadius: 16,
          marginHorizontal: 3,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'داشبورد',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="index"
        options={{
          title: 'ژورنال',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="store"
        options={{
          title: 'فروشگاه',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cart-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="courses"
        options={{
          title: 'ماشین حساب',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calculator-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="analysis"
        options={{
          title: 'تحلیل',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="analytics-outline" size={size} color={color} />
          ),
        }}
      />

      {/* HIDDEN */}
      <Tabs.Screen name="subscription" options={{ href: null }} />
      <Tabs.Screen name="account" options={{ href: null }} />
      <Tabs.Screen name="more" options={{ href: null }} />
      <Tabs.Screen name="campaign" options={{ href: null }} />
      <Tabs.Screen name="user-profile" options={{ href: null }} />
      <Tabs.Screen name="forgot-password" options={{ href: null }} />
      <Tabs.Screen name="reset-password" options={{ href: null }} />
    </Tabs>
  );
}