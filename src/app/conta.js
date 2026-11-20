// Criar conta ou entrar com email e palavra-passe.
// A confirmação e a recuperação usam um código de 6 dígitos enviado por email (sem links).

import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { LogoIcon } from '../components/Logo';
import { BackButton, Banner, Body, Button, Field, Screen, Title } from '../components/ui';
import {
  EMAIL_CODES,
  authMessage,
  confirmSignUpCode,
  resendSignUpCode,
  resetPasswordWithCode,
  sendPasswordReset,
  setNewPassword,
  signInWithEmail,
  signUpWithEmail,
} from '../lib/auth';
import { useStore } from '../store/AppStore';
import { colors, fonts } from '../theme';

const looksLikeEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const onlyDigits = (s) => s.replace(/\D/g, '').slice(0, 8);

// passos: 'criar' | 'entrar' | 'codigo' (confirmar conta) | 'recuperar' (pedir nova palavra-passe)
//         | 'nova' (escolher a palavra-passe nova, depois do link do email)
const TEXT = {
  criar: { title: 'Criar conta', body: 'Guarda os teus animais na conta e vê-os em qualquer telemóvel.' },
  entrar: { title: 'Entrar', body: 'Entra com o email e a palavra-passe da tua conta.' },
  codigo: { title: 'Confirma o email', body: '' },
  recuperar: { title: 'Nova palavra-passe', body: '' },
  nova: { title: 'Nova palavra-passe', body: 'Escolhe a palavra-passe nova para a tua conta.' },
};

function LinkButton({ onPress, children }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{ alignSelf: 'center', padding: 10, minHeight: 44, justifyContent: 'center' }}
    >
      <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.navy }}>{children}</Text>
    </Pressable>
  );
}

export default function Conta() {
  const { completeSignIn } = useStore();
  const params = useLocalSearchParams();
  const [step, setStep] = useState(['entrar', 'nova'].includes(params.modo) ? params.modo : 'criar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(params.erro ? String(params.erro) : '');
  const [notice, setNotice] = useState('');

  const cleanEmail = email.trim().toLowerCase();
  const emailOk = looksLikeEmail(cleanEmail);
  const codeOk = code.length >= 6;

  const go = (next) => {
    setError('');
    setNotice('');
    setCode('');
    setStep(next);
  };

  const run = async (fn) => {
    setError('');
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError(authMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const finish = async (user) => {
    await completeSignIn(user, 'email');
    router.replace('/');
  };

  const submitCreate = () =>
    run(async () => {
      const res = await signUpWithEmail(cleanEmail, password);
      if (res.needsCode) return go('codigo');
      await finish(res.user);
    });

  const submitLogin = () =>
    run(async () => {
      try {
        await finish(await signInWithEmail(cleanEmail, password));
      } catch (e) {
        // Conta criada mas ainda por confirmar: manda um código novo e pede-o.
        if (/email not confirmed/i.test(String(e?.message))) {
          await resendSignUpCode(cleanEmail);
          go('codigo');
          return;
        }
        throw e;
      }
    });

  const submitCode = () => run(async () => finish(await confirmSignUpCode(cleanEmail, code)));

  const resend = () =>
    run(async () => {
      if (step === 'recuperar') await sendPasswordReset(cleanEmail);
      else await resendSignUpCode(cleanEmail);
      setNotice(EMAIL_CODES ? 'Enviámos um código novo.' : 'Enviámos outro email.');
    });

  const forgot = () => {
    if (!emailOk) {
      setError('Escreve primeiro o teu email.');
      return;
    }
    run(async () => {
      await sendPasswordReset(cleanEmail);
      setPassword('');
      go('recuperar');
    });
  };

  // Sem códigos: depois de abrir o link do email, entra com o email e a palavra-passe já escritos.
  const confirmedLogin = () =>
    run(async () => {
      try {
        await finish(await signInWithEmail(cleanEmail, password));
      } catch (e) {
        if (/email not confirmed/i.test(String(e?.message))) {
          throw new Error('A conta ainda não está confirmada. Abre o email da Ração Certa e carrega no link.');
        }
        throw e;
      }
    });

  const submitNewPassword = () => run(async () => finish(await setNewPassword(password)));

  const submitRecover = () => run(async () => finish(await resetPasswordWithCode(cleanEmail, code, password)));

  const t = TEXT[step];
  const codeStep = step === 'codigo' || step === 'recuperar';

  return (
    <Screen>
      <BackButton onPress={codeStep ? () => go('entrar') : undefined} />
      <View style={{ gap: 10 }}>
        <LogoIcon size={56} />
        <Title size={30}>{t.title}</Title>
        {codeStep && !EMAIL_CODES ? (
          <Body muted>
            Enviámos um email para <Text style={{ fontFamily: fonts.semibold, color: colors.text }}>{cleanEmail}</Text>.
            {step === 'recuperar'
              ? ' Abre-o neste telemóvel e carrega no link para escolheres a palavra-passe nova.'
              : ' Abre-o e carrega no link de confirmação. Depois volta aqui e carrega em «Já confirmei, entrar».'}
          </Body>
        ) : codeStep ? (
          <Body muted>
            Enviámos um código para <Text style={{ fontFamily: fonts.semibold, color: colors.text }}>{cleanEmail}</Text>.
            {step === 'recuperar' ? ' Escreve-o aqui e escolhe a palavra-passe nova.' : ' Escreve-o aqui para confirmares a conta.'}
          </Body>
        ) : (
          <Body muted>{t.body}</Body>
        )}
      </View>

      {notice ? <Banner icon="mail-outline" title={notice} /> : null}

      <View style={{ gap: 14 }}>
        {codeStep && !EMAIL_CODES ? null : codeStep ? (
          <Field
            label="Código do email"
            value={code}
            onChangeText={(v) => setCode(onlyDigits(v))}
            placeholder="123456"
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            autoFocus
          />
        ) : (
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="nome@exemplo.pt"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
          />
        )}

        {step !== 'codigo' && !(step === 'recuperar' && !EMAIL_CODES) ? (
          <Field
            label={step === 'recuperar' || step === 'nova' ? 'Palavra-passe nova' : 'Palavra-passe'}
            value={password}
            onChangeText={setPassword}
            placeholder={step === 'entrar' ? '' : 'Pelo menos 8 caracteres'}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete={step === 'entrar' ? 'current-password' : 'new-password'}
            textContentType={step === 'entrar' ? 'password' : 'newPassword'}
          />
        ) : null}

        {error ? (
          <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.danger }} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}

        {step === 'criar' ? (
          <Button
            title={busy ? 'Um momento…' : 'Criar conta'}
            disabled={busy || !emailOk || password.length < 8}
            onPress={submitCreate}
          />
        ) : null}
        {step === 'entrar' ? (
          <>
            <Button title={busy ? 'Um momento…' : 'Entrar'} disabled={busy || !emailOk || !password} onPress={submitLogin} />
            <LinkButton onPress={forgot}>Esqueci-me da palavra-passe</LinkButton>
          </>
        ) : null}
        {step === 'codigo' && EMAIL_CODES ? (
          <Button title={busy ? 'Um momento…' : 'Confirmar'} disabled={busy || !codeOk} onPress={submitCode} />
        ) : null}
        {step === 'codigo' && !EMAIL_CODES ? (
          <Button title={busy ? 'Um momento…' : 'Já confirmei, entrar'} disabled={busy} onPress={confirmedLogin} />
        ) : null}
        {step === 'nova' ? (
          <Button
            title={busy ? 'Um momento…' : 'Guardar e entrar'}
            disabled={busy || password.length < 8}
            onPress={submitNewPassword}
          />
        ) : null}
        {step === 'recuperar' && EMAIL_CODES ? (
          <Button
            title={busy ? 'Um momento…' : 'Guardar e entrar'}
            disabled={busy || !codeOk || password.length < 8}
            onPress={submitRecover}
          />
        ) : null}
        {codeStep ? (
          <>
            <LinkButton onPress={resend}>{EMAIL_CODES ? 'Não recebi o código. Enviar outro' : 'Não recebi o email. Enviar outro'}</LinkButton>
            <Body muted size={13} style={{ textAlign: 'center' }}>
              {EMAIL_CODES
                ? 'Vê também na pasta de spam. O código vale durante 1 hora.'
                : 'Vê também na pasta de spam. O link vale durante 1 hora.'}
            </Body>
          </>
        ) : null}
      </View>

      {step === 'criar' || step === 'entrar' ? (
        <Pressable
          onPress={() => go(step === 'criar' ? 'entrar' : 'criar')}
          accessibilityRole="button"
          style={{ alignSelf: 'center', padding: 10, minHeight: 44 }}
        >
          <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted }}>
            {step === 'criar' ? 'Já tens conta? ' : 'Ainda não tens conta? '}
            <Text style={{ fontFamily: fonts.semibold, color: colors.navy }}>{step === 'criar' ? 'Entrar' : 'Criar conta'}</Text>
          </Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}
