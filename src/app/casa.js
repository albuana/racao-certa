import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import HouseNameInput, { houseFull, housePart } from '../components/HouseNameInput';
import { Body, Button, Screen, StepHeader, Title } from '../components/ui';
import { useStore } from '../store/AppStore';
import { colors } from '../theme';


export default function Casa() {
  const { house, setHouseName, animals } = useStore();
  const [name, setName] = useState(housePart(house?.name || ''));
  const valid = name.trim().length > 0;

  const next = () => {
    if (!valid) return;
    setHouseName(houseFull(name));
    if (animals.length) {
      if (router.canDismiss()) router.dismissAll();
      router.replace('/procurar');
    } else router.push('/animal/novo');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen footer={<Button title="Continuar" onPress={next} disabled={!valid} />} contentStyle={{ paddingHorizontal: 24 }}>
        <StepHeader step={1} total={2} onBack={() => router.replace('/login')} />
        <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: colors.coralTint, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="home-outline" size={28} color={colors.navy} />
        </View>
        <Title size={30}>Como se chama a tua casa?</Title>
        <Body muted>
          A casa junta os teus animais e as pessoas que cuidam deles. Mais tarde podes convidar a família.
        </Body>
        <HouseNameInput value={name} onChangeText={setName} onSubmitEditing={next} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
