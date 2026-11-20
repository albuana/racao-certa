// "O que <animal> come?": só seca, só húmida ou as duas. Aparece depois de criar um cão ou gato
// (e na ficha, para mudar). Define que espaços de ração aparecem na ficha e como se dividem as calorias.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { BackButton, Body, Button, Screen, Title } from '../../components/ui';
import { useStore } from '../../store/AppStore';
import { colors, fonts } from '../../theme';

export const DIETS = [
  {
    id: 'dry',
    icon: 'grain',
    title: 'Só ração seca',
    text: 'Croquetes. É prática, dura mais tempo aberta e costuma ser a mais barata por dia. Deixa sempre água fresca à disposição.',
    result: 'Dizemos-te quantas gramas de seca dar por dia.',
  },
  {
    id: 'wet',
    icon: 'food-variant',
    title: 'Só comida húmida',
    text: 'Saquetas, latas ou patês. Tem muita água, o que ajuda os rins e as vias urinárias, mas fica mais cara e não pode ficar muito tempo na taça.',
    result: 'Dizemos-te quantas saquetas ou latas dar por dia.',
  },
  {
    id: 'mixed',
    icon: 'bowl-mix-outline',
    title: 'As duas (mista)',
    text: 'Por exemplo, 1 saqueta por dia e o resto em seca. Junta o melhor das duas e é muito comum, sobretudo nos gatos.',
    result: 'Dividimos as calorias do dia pelas duas: as saquetas primeiro e o resto em seca.',
  },
];

export default function Dieta() {
  const { id, depois } = useLocalSearchParams();
  const { animals, saveAnimal } = useStore();
  const animal = animals.find((a) => a.id === id);
  const [diet, setDiet] = useState(animal?.diet || null);
  if (!animal) return null;
  const female = animal.sex === 'f';

  const goOn = (value) => {
    saveAnimal({ ...animal, diet: value });
    // Depois de criar: segue para a ficha. A partir da ficha: volta.
    if (depois === 'ficha') router.replace({ pathname: '/animal/[id]', params: { id: animal.id } });
    else router.back();
  };

  return (
    <Screen
      footer={
        <View style={{ gap: 4 }}>
          <Button title="Continuar" disabled={!diet} onPress={() => goOn(diet)} />
          {depois === 'ficha' ? <Button variant="ghost" title="Ainda não sei" onPress={() => goOn(null)} /> : null}
        </View>
      }
    >
      {depois === 'ficha' ? null : <BackButton />}
      <View style={{ gap: 6 }}>
        <Title size={28}>O que {female ? 'a' : 'o'} {animal.name} come?</Title>
        <Body muted>Assim calculamos a quantidade certa e só mostramos as rações que interessam.</Body>
      </View>

      <View style={{ gap: 10 }}>
        {DIETS.map((d) => {
          const on = diet === d.id;
          return (
            <Pressable
              key={d.id}
              onPress={() => setDiet(d.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={{ gap: 6, padding: 16, borderRadius: 16, borderWidth: on ? 2 : 1, borderColor: on ? colors.navy : colors.borderStrong, backgroundColor: on ? colors.coralTint : colors.card }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <MaterialCommunityIcons name={d.icon} size={26} color={on ? colors.navy : colors.text} />
                <Text style={{ flex: 1, fontFamily: fonts.display, fontSize: 18, color: on ? colors.navy : colors.text }}>{d.title}</Text>
              </View>
              <Text style={{ fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.text }}>{d.text}</Text>
              <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: on ? colors.coralTintText : colors.textMuted }}>{d.result}</Text>
            </Pressable>
          );
        })}
      </View>
      <Body muted size={12}>Podes mudar quando quiseres na ficha, em “Alimentação”.</Body>
    </Screen>
  );
}
