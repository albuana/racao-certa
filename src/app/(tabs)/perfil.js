import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Body, Button, Card, Field, Screen, Title } from '../../components/ui';
import { useStore } from '../../store/AppStore';
import { colors, fonts } from '../../theme';

export default function Perfil() {
  const { account, house, setHouseName, animals, resetAll } = useStore();
  const [name, setName] = useState(house?.name || '');

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

  return (
    <Screen>
      <Title size={30}>Perfil</Title>

      <Card style={{ gap: 6 }}>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.text }}>
          {account?.mode === 'guest' ? 'Sem registo' : 'Conta'}
        </Text>
        <Body muted size={14}>
          {account?.mode === 'guest'
            ? 'Os teus dados estão só neste telemóvel. Em breve vais poder criar conta e sincronizar com a família.'
            : 'Sessão iniciada.'}
        </Body>
      </Card>

      <Card style={{ gap: 12 }}>
        <Field label="Nome da casa" value={name} onChangeText={setName} maxLength={40} />
        <Button
          variant="secondary"
          title="Guardar nome"
          disabled={!name.trim() || name.trim() === house?.name}
          onPress={() => setHouseName(name.trim())}
        />
        <Body muted size={13}>{animals.length} {animals.length === 1 ? 'animal' : 'animais'} nesta casa</Body>
      </Card>

      <View style={{ gap: 8 }}>
        <Body muted size={12}>
          As doses são estimativas de referência e não substituem o conselho do veterinário. Os preços não incluem portes.
        </Body>
        <Button variant="ghost" title="Apagar todos os dados" onPress={confirmReset} />
      </View>
    </Screen>
  );
}
