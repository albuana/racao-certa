// Entrar com a Apple, com o Google ou com email + palavra-passe (Supabase Auth).
// Cada função devolve o utilizador ({ id, email }) ou null se a pessoa cancelou.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

// Os emails do Supabase trazem um código de 6 dígitos (EXPO_PUBLIC_EMAIL_CODES=1, precisa de SMTP próprio
// e dos modelos de server/supabase/emails.md) ou o link de origem (por omissão).
export const EMAIL_CODES = process.env.EXPO_PUBLIC_EMAIL_CODES === '1';

// Página "Conta confirmada" no servidor de preços, para onde vai o link do email.
const API = (process.env.EXPO_PUBLIC_PRICES_API_URL || '').replace(/\/+$/, '');
const CONFIRMED_URL = API ? `${API}/confirmado` : undefined;

// Endereço de regresso à app. Passa pelo servidor (/auth/voltar), porque o Supabase não aceita
// os endereços exp://IP:porta do Expo Go; o servidor reencaminha logo para a app.
function appReturnUrls() {
  const app = Linking.createURL('auth-callback');
  return { app, redirectTo: API ? `${API}/auth/voltar?to=${encodeURIComponent(app)}` : app };
}

// Marca que se pediu um link de recuperação (para o auth-callback saber o que fazer).
export const RESET_KEY = 'racaocerta:reset-pedido';

// Mensagens do Supabase em português.
export function authMessage(error) {
  const m = String(error?.message || error || '');
  if (/invalid login credentials/i.test(m)) return 'Email ou palavra-passe errados.';
  if (/already registered|already exists/i.test(m)) return 'Já existe uma conta com este email. Entra em vez de criar.';
  if (/email not confirmed/i.test(m)) return 'Ainda não confirmaste o email. Abre a mensagem que te enviámos.';
  if (/password.*(at least|characters|weak)/i.test(m)) return 'A palavra-passe tem de ter pelo menos 8 caracteres.';
  if (/invalid.*email|email.*invalid/i.test(m)) return 'Este email não parece válido.';
  if (/token.*(expired|invalid)|otp.*(expired|invalid)|expired/i.test(m)) return 'Código errado ou expirado. Confirma ou pede um novo.';
  if (/rate limit|too many|security purposes/i.test(m)) return 'Muitas tentativas seguidas. Espera um minuto e tenta outra vez.';
  if (/network|fetch/i.test(m)) return 'Sem ligação à internet. Tenta outra vez.';
  return m || 'Algo correu mal. Tenta outra vez.';
}

export async function appleAvailable() {
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function signInWithApple() {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  let credential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (e) {
    if (e?.code === 'ERR_REQUEST_CANCELED') return null;
    throw e;
  }
  if (!credential.identityToken) throw new Error('A Apple não devolveu a identificação.');
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) throw error;
  return data.user;
}

export async function signInWithGoogle() {
  const { app, redirectTo } = appReturnUrls();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } },
  });
  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(data.url, app);
  if (result.type !== 'success') return null;

  const { queryParams } = Linking.parse(result.url);
  if (queryParams?.error_description || queryParams?.error) {
    throw new Error(String(queryParams.error_description || queryParams.error));
  }
  const code = queryParams?.code;
  if (!code) throw new Error('O Google não devolveu o código de entrada.');
  const { data: session, error: exchangeError } = await supabase.auth.exchangeCodeForSession(String(code));
  if (exchangeError) throw exchangeError;
  return session.user;
}

// Devolve { user } se entrou logo, ou { needsCode: true } se tem de escrever o código do email.
export async function signUpWithEmail(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: CONFIRMED_URL ? { emailRedirectTo: CONFIRMED_URL } : undefined,
  });
  if (error) throw error;
  if (!data.session) return { needsCode: true };
  return { user: data.user };
}

export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

// Confirma a conta com o código que chegou por email.
export async function confirmSignUpCode(email, code) {
  const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
  if (error) throw error;
  return data.user;
}

export async function resendSignUpCode(email) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: CONFIRMED_URL ? { emailRedirectTo: CONFIRMED_URL } : undefined,
  });
  if (error) throw error;
}

// Esqueci-me da palavra-passe: envia um código por email.
export async function sendPasswordReset(email) {
  // Com link: abre a app (auth-callback), que pede a palavra-passe nova.
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: EMAIL_CODES ? undefined : appReturnUrls().redirectTo,
  });
  if (error) throw error;
  if (!EMAIL_CODES) await AsyncStorage.setItem(RESET_KEY, email);
}

// Com o código do email, entra e muda a palavra-passe.
export async function resetPasswordWithCode(email, code, newPassword) {
  const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'recovery' });
  if (error) throw error;
  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) throw updateError;
  return data.user;
}

// Link do email de recuperação: troca o código do link por uma sessão.
export async function exchangeLinkCode(code) {
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
  return data.user;
}

// Já com sessão (vinda do link): grava a palavra-passe nova.
export async function setNewPassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  return data.user;
}
