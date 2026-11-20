// Destino das ligações que voltam à app (link de recuperação da palavra-passe, Google).
// Se foi pedido um link de recuperação, troca o código por sessão e pede a palavra-passe nova.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { authMessage, exchangeLinkCode, RESET_KEY } from '../lib/auth';
import { colors } from '../theme';

export default function AuthCallback() {
  const { code, error_description: linkError } = useLocalSearchParams();

  useEffect(() => {
    (async () => {
      const resetEmail = await AsyncStorage.getItem(RESET_KEY).catch(() => null);
      if (!resetEmail || (!code && !linkError)) {
        router.replace('/');
        return;
      }
      await AsyncStorage.removeItem(RESET_KEY).catch(() => {});
      try {
        if (linkError) throw new Error(String(linkError));
        await exchangeLinkCode(String(code));
        router.replace({ pathname: '/conta', params: { modo: 'nova' } });
      } catch (e) {
        router.replace({ pathname: '/conta', params: { modo: 'entrar', erro: authMessage(e) } });
      }
    })();
  }, [code, linkError]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.navy} />
    </View>
  );
}
