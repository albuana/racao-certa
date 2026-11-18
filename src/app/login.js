import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Alert, Platform, Pressable, Text, View } from 'react-native';
import { Body, Button, Screen, Title } from '../components/ui';
import { useStore } from '../store/AppStore';
import { colors, fonts } from '../theme';

export default function Login() {
  const { continueAsGuest } = useStore();

  const startGuest = () => {
    continueAsGuest();
    router.replace('/casa');
  };

  // O login real (Apple, Google, email) liga-se quando houver servidor.
  // Ver README › "Ligar contas".
  const comingSoon = (what) => {
    Alert.alert(
      `${what} em breve`,
      'Por agora podes usar a app sem registo. Os teus dados ficam guardados neste telemóvel e não se perdem quando criares conta.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Continuar sem registo', onPress: startGuest },
      ]
    );
  };

  return (
    <Screen
      scroll={false}
      edges={['top', 'bottom', 'left', 'right']}
      contentStyle={{ justifyContent: 'space-between', paddingHorizontal: 24 }}
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 }}>
        <View style={{ width: 88, height: 88, borderRadius: 26, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="paw" size={46} color={colors.white} />
        </View>
        <Title size={38} style={{ textAlign: 'center' }}>Ração Certa</Title>
        <Body muted size={16} style={{ textAlign: 'center', maxWidth: 290 }}>
          A dose certa para cada animal e o preço mais baixo para a tua carteira.
        </Body>
      </View>

      <View style={{ gap: 12 }}>
        {Platform.OS === 'ios' ? (
          <Button variant="black" icon="logo-apple" title="Continuar com a Apple" onPress={() => comingSoon('Entrar com a Apple')} />
        ) : null}
        <Button variant="outline" icon="logo-google" title="Continuar com o Google" onPress={() => comingSoon('Entrar com o Google')} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 2 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: '#EED8D3' }} />
          <Body muted size={13}>ou</Body>
          <View style={{ flex: 1, height: 1, backgroundColor: '#EED8D3' }} />
        </View>
        <Button title="Criar conta com email" onPress={() => comingSoon('Criar conta')} />
        <Button variant="secondary" title="Continuar sem registo" onPress={startGuest} />
        <Body muted size={12} style={{ textAlign: 'center' }}>
          Os dados ficam só neste telemóvel. Podes criar conta mais tarde sem perder nada.
        </Body>
        <Pressable onPress={() => comingSoon('Entrar')} accessibilityRole="button" style={{ alignSelf: 'center', padding: 8 }}>
          <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted }}>
            Já tens conta? <Text style={{ fontFamily: fonts.semibold, color: colors.navy }}>Entrar</Text>
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
