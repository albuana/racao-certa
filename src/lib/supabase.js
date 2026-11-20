// Ligação ao Supabase (contas + sincronização da casa).
// Sem EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_KEY a app funciona só sem registo.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as ExpoCrypto from 'expo-crypto';
import { AppState } from 'react-native';

// O React Native não tem crypto.subtle: sem isto o login usa um código de verificação simples (aviso
// "WebCrypto API is not supported"). Com o expo-crypto passa a usar SHA-256, como deve ser.
if (!globalThis.crypto?.subtle?.digest) {
  const base = globalThis.crypto || {};
  globalThis.crypto = {
    ...base,
    getRandomValues: base.getRandomValues || ((arr) => ExpoCrypto.getRandomValues(arr)),
    subtle: {
      ...(base.subtle || {}),
      digest: (algorithm, data) => ExpoCrypto.digest(ExpoCrypto.CryptoDigestAlgorithm.SHA256, data),
    },
  };
}

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

export const authEnabled = Boolean(url && key);

export const supabase = authEnabled
  ? createClient(url, key, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  : null;

// Só renova a sessão enquanto a app está aberta.
if (supabase) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
