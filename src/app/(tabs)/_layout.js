import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/tabs';
import { colors, fonts } from '../../theme';

function icon(name) {
  return function TabIcon({ color, focused, size }) {
    return <Ionicons name={focused ? name : `${name}-outline`} size={size ?? 22} color={color} />;
  };
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.coralDark,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="procurar" options={{ title: 'Procurar', tabBarIcon: icon('search') }} />
      <Tabs.Screen name="inicio" options={{ title: 'A minha casa', tabBarIcon: icon('home') }} />
      {/* Os animais estão no Início; este ecrã fica escondido do rodapé. */}
      <Tabs.Screen name="animais" options={{ href: null }} />
      {/* As rações da casa e os preços estão agora no Procurar. */}
      <Tabs.Screen name="precos" options={{ href: null }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: icon('person') }} />
    </Tabs>
  );
}
