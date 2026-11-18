import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { BackButton, Body, Button, Screen, StepHeader, Title } from '../components/ui';
import { useStore } from '../store/AppStore';
import { colors, fonts } from '../theme';

const OPTIONS = [
  { id: 'cat', label: 'Gato', icon: 'cat' },
  { id: 'dog', label: 'Cão', icon: 'dog' },
];

export default function Especie() {
  const { house, animals } = useStore();
  const [species, setSpecies] = useState('cat');
  const first = animals.length === 0;

  return (
    <Screen
      contentStyle={{ paddingHorizontal: 24 }}
      footer={<Button title="Continuar" onPress={() => router.push({ pathname: '/animal/novo', params: { species } })} />}
    >
      {first ? <StepHeader step={2} onBack={() => router.replace('/casa')} /> : <BackButton />}
      {house?.name ? <Body style={{ color: colors.navy, fontFamily: fonts.semibold }}>{house.name}</Body> : null}
      <Title size={30}>{first ? 'Adiciona o teu primeiro animal' : 'Que animal queres adicionar?'}</Title>
      {first ? <Body muted>Precisas de pelo menos um para começar. Podes juntar mais depois.</Body> : null}

      <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
        {OPTIONS.map((o) => {
          const on = species === o.id;
          return (
            <Pressable
              key={o.id}
              onPress={() => setSpecies(o.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={o.label}
              style={{
                flex: 1,
                height: 190,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                backgroundColor: on ? colors.coralTint : colors.card,
                borderWidth: on ? 2 : 1,
                borderColor: on ? colors.navy : colors.borderStrong,
              }}
            >
              <MaterialCommunityIcons name={o.icon} size={56} color={on ? colors.navy : colors.text} />
              <Text style={{ fontFamily: fonts.display, fontSize: 22, color: on ? colors.navy : colors.text }}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}
