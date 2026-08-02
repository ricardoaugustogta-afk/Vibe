import { Tabs } from 'expo-router';
import { Map as MapIcon, Plus, User } from 'lucide-react-native';
import { useI18n } from '@/contexts/LanguageContext';
import { COLORS } from '@/lib/theme';

export default function TabLayout() {
  const { t } = useI18n();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary[600],
        tabBarInactiveTintColor: COLORS.neutral[400],
        tabBarStyle: {
          backgroundColor: COLORS.neutral[0],
          borderTopWidth: 0,
          elevation: 0,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter-Medium',
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tab.map'),
          tabBarIcon: ({ color, size }) => <MapIcon color={color} size={size} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: t('tab.create'),
          tabBarIcon: ({ color, size }) => <Plus color={color} size={size} strokeWidth={2.4} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tab.profile'),
          tabBarIcon: ({ color, size }) => <User color={color} size={size} strokeWidth={2.2} />,
        }}
      />
    </Tabs>
  );
}
