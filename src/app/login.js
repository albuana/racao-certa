import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, Text, View } from 'react-native';
import { LogoIcon } from '../components/Logo';
import { BackButton, Body, Button, Screen } from '../components/ui';
import { appleAvailable, authMessage, signInWithApple, signInWithGoogle } from '../lib/auth';
import { authEnabled } from '../lib/supabase';
import { useStore } from '../store/AppStore';
import { colors, fonts } from '../theme';

export default function Login() {
  const { account, continueAsGuest, completeSignIn } = useStore();
  const { from } = useLocalSearchParams();
  const fromProfile = from === 'perfil' && account?.mode === 'guest';
  const [busy, setBusy] = useState(null); // 'apple' | 'google'
  const [hasApple, setHasApple] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios') appleAvailable().then(setHasApple);
  }, []);

  const startGuest = () => {
    continueAsGuest();
    router.replace('/casa');
  };

  // Sem servidor de contas configurado (ver README › "Contas").
  const comingSoon = (what) => {
    Alert.alert(
      `${what} em breve`,
      'Por agora podes usar a app sem registo. Os teus dados ficam guardados neste telemóvel e não se perdem quando criares conta.',
      fromProfile
        ? [{ text: 'OK' }]
        : [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Continuar sem registo', onPress: startGuest },
          ]
    );
  };

  const signIn = async (provider) => {
    if (!authEnabled) return comingSoon(provider === 'apple' ? 'Entrar com a Apple' : 'Entrar com o Google');
    setBusy(provider);
    try {
      const user = provider === 'apple' ? await signInWithApple() : await signInWithGoogle();
      if (!user) return; // cancelou
      await completeSignIn(user, provider);
      router.replace('/');
    } catch (e) {
      Alert.alert('Não foi possível entrar', authMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const openEmail = (modo) => {
    if (!authEnabled) return comingSoon(modo === 'criar' ? 'Criar conta' : 'Entrar');
    router.push({ pathname: '/conta', params: { modo } });
  };

  return (
    <Screen
      scroll={false}
      edges={['top', 'bottom', 'left', 'right']}
      contentStyle={{ justifyContent: 'space-between', paddingHorizontal: 24 }}
    >
      {fromProfile ? <BackButton /> : null}

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22 }}>
        <LogoIcon size={120} />
        <Body muted size={16} style={{ textAlign: 'center', maxWidth: 290 }}>
          {fromProfile
            ? 'Cria conta para guardares os teus animais e os veres noutro telemóvel. O que já tens aqui não se perde.'
            : 'A dose certa para cada animal e o preço mais baixo para a tua carteira.'}
        </Body>
      </View>

      <View style={{ gap: 12 }}>
        {hasApple ? (
          <Button
            variant="black"
            icon="logo-apple"
            title={busy === 'apple' ? 'A entrar…' : 'Continuar com a Apple'}
            disabled={!!busy}
            onPress={() => signIn('apple')}
          />
        ) : null}
        <Button
          variant="outline"
          icon="logo-google"
          title={busy === 'google' ? 'A entrar…' : 'Continuar com o Google'}
          disabled={!!busy}
          onPress={() => signIn('google')}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 2 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.borderStrong }} />
          <Body muted size={13}>ou</Body>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.borderStrong }} />
        </View>
        <Button title="Criar conta com email" disabled={!!busy} onPress={() => openEmail('criar')} />
        {fromProfile ? null : (
          <>
            <Button variant="secondary" title="Continuar sem registo" disabled={!!busy} onPress={startGuest} />
            <Body muted size={12} style={{ textAlign: 'center' }}>
              Sem registo, os dados ficam só neste telemóvel. Podes criar conta mais tarde sem perder nada.
            </Body>
          </>
        )}
        <Pressable
          onPress={() => openEmail('entrar')}
          disabled={!!busy}
          accessibilityRole="button"
          style={{ alignSelf: 'center', padding: 10, minHeight: 44, justifyContent: 'center' }}
        >
          <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted }}>
            Já tens conta? <Text style={{ fontFamily: fonts.semibold, color: colors.navy }}>Entrar com email</Text>
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
