import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, Text, View } from 'react-native';
import HouseNameInput, { houseFull, housePart } from '../../components/HouseNameInput';
import { LogoIcon } from '../../components/Logo';
import { Body, Button, Card, Screen, Title } from '../../components/ui';
import { authMessage } from '../../lib/auth';
import { choosePhoto } from '../../lib/photos';
import { authEnabled, supabase } from '../../lib/supabase';
import { useStore } from '../../store/AppStore';
import { colors, fonts } from '../../theme';

const PROVIDER = { apple: 'Conta Apple', google: 'Conta Google', email: 'Conta com email' };

function syncText(sync) {
  if (sync.status === 'syncing') return 'A sincronizar…';
  if (sync.status === 'error') return 'Sem ligação à conta. Tentamos outra vez quando mudares alguma coisa.';
  if (sync.status === 'ok' && sync.at) {
    const t = new Date(sync.at);
    return `Guardado na conta às ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
  }
  return 'Guardado na conta';
}

export default function Perfil() {
  const { account, house, setHouseName, animals, resetAll, signOut, deleteAccount, sync, updateAccount } = useStore();

  // Contas antigas: vai buscar o nome e a foto (Google) que ainda não estavam guardados.
  useEffect(() => {
    if (!supabase || !account?.userId || account.avatarUrl !== undefined) return;
    supabase.auth.getUser().then(({ data }) => {
      const meta = data?.user?.user_metadata || {};
      updateAccount({ avatarUrl: meta.avatar_url || meta.picture || null, name: account.name || meta.full_name || meta.name || null });
    });
  }, [account?.userId, account?.avatarUrl, account?.name, updateAccount]);

  const photo = account?.photoUri || account?.avatarUrl || null;
  const changePhoto = () =>
    choosePhoto((uri) => updateAccount({ photoUri: uri }), account?.photoUri ? () => updateAccount({ photoUri: null }) : undefined, {
      title: 'A tua foto',
      removeLabel: account?.avatarUrl ? 'Voltar à foto do Google' : 'Remover foto',
    });
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(false);
  const signedIn = Boolean(account?.userId);

  const startEdit = () => {
    setName(housePart(house?.name || ''));
    setEditing(true);
  };
  const saveName = () => {
    setHouseName(houseFull(name));
    setEditing(false);
  };

  const confirmReset = () =>
    Alert.alert('Apagar todos os dados?', 'Os animais e a casa deste telemóvel são apagados. Não dá para desfazer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          await resetAll();
          router.replace('/login');
        },
      },
    ]);

  const confirmSignOut = () =>
    Alert.alert('Terminar sessão?', 'Os teus animais ficam guardados na conta. Quando voltares a entrar, aparecem outra vez.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Terminar sessão',
        onPress: async () => {
          await signOut();
          router.replace('/login');
        },
      },
    ]);

  const confirmDeleteAccount = () =>
    Alert.alert(
      'Apagar a conta?',
      'A conta, a casa e todos os animais são apagados para sempre, neste e noutros telemóveis. Não dá para desfazer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar conta',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              router.replace('/login');
            } catch (e) {
              Alert.alert('Não foi possível apagar a conta', authMessage(e));
            }
          },
        },
      ]
    );

  return (
    <Screen>
      <Title size={30}>Perfil</Title>

      {signedIn ? (
        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Pressable onPress={changePhoto} accessibilityRole="button" accessibilityLabel="Mudar a tua foto">
              {photo ? (
                <Image source={{ uri: photo }} style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.coralTint }} accessibilityIgnoresInvertColors />
              ) : (
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.coralTint, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="person" size={30} color={colors.coralDark} />
                </View>
              )}
              <View style={{ position: 'absolute', right: -2, bottom: -2, width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.card, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="camera-outline" size={13} color={colors.white} />
              </View>
            </Pressable>
            <View style={{ flex: 1, gap: 2 }}>
              {account.name ? <Text style={{ fontFamily: fonts.semibold, fontSize: 17, color: colors.text }}>{account.name}</Text> : null}
              {account.email ? <Body size={14}>{account.email}</Body> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name={account.mode === 'apple' ? 'logo-apple' : account.mode === 'google' ? 'logo-google' : 'mail-outline'} size={14} color={colors.textMuted} />
                <Body muted size={13}>{PROVIDER[account.mode] || 'Conta'}</Body>
              </View>
            </View>
          </View>
          <Body muted size={13}>{syncText(sync)}</Body>
        </Card>
      ) : (
        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <LogoIcon size={40} />
            <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.text }}>Sem registo</Text>
          </View>
          <Body muted size={14}>
            {authEnabled
              ? 'Os teus dados estão só neste telemóvel. Cria conta para os guardares e veres noutro telemóvel. Não perdes nada do que já tens.'
              : 'Os teus dados estão só neste telemóvel. Em breve vais poder criar conta e sincronizar com a família.'}
          </Body>
          {authEnabled ? (
            <Button title="Criar conta ou entrar" onPress={() => router.push({ pathname: '/login', params: { from: 'perfil' } })} />
          ) : null}
        </Card>
      )}

      <Card style={{ gap: 12 }}>
        {editing ? (
          <>
            <HouseNameInput value={name} onChangeText={setName} autoFocus onSubmitEditing={() => name.trim() && saveName()} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button variant="ghost" title="Cancelar" onPress={() => setEditing(false)} style={{ flex: 1 }} />
              <Button variant="primary" title="Guardar" disabled={!name.trim()} onPress={saveName} style={{ flex: 1 }} />
            </View>
          </>
        ) : (
          <Pressable
            onPress={startEdit}
            accessibilityRole="button"
            accessibilityLabel="Editar nome da casa"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 20, color: colors.text }}>
                Casa {housePart(house?.name || '')}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="pencil" size={16} color={colors.coralDark} />
              <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.coralDark }}>Editar</Text>
            </View>
          </Pressable>
        )}
        <Body muted size={13}>
          {animals.length} {animals.length === 1 ? 'animal' : 'animais'} nesta casa
        </Body>
      </Card>

      <View style={{ gap: 8 }}>
        {signedIn ? (
          <>
            <Button variant="secondary" title="Terminar sessão" onPress={confirmSignOut} />
            <Button variant="ghost" title="Apagar conta" onPress={confirmDeleteAccount} />
          </>
        ) : (
          <Button variant="ghost" title="Apagar todos os dados" onPress={confirmReset} />
        )}
      </View>
    </Screen>
  );
}
