import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';
import { Avatar, BackButton, Body, Button, Card, Screen, Stat, Title } from '../../components/ui';
import { animalStats } from '../../lib/household';
import { ageText, formatEuro, formatNumber, neuterYesLabel, stageLabel, withAutoStage } from '../../lib/nutrition';
import { choosePhoto } from '../../lib/photos';
import { useStore } from '../../store/AppStore';
import { colors, fonts } from '../../theme';

export default function AnimalDetail() {
  const { id } = useLocalSearchParams();
  const { animals, customProducts, saveAnimal, removeAnimal, openBag } = useStore();
  const stored = animals.find((a) => a.id === id);
  if (!stored) return <Redirect href="/inicio" />;
  const animal = withAutoStage(stored);

  const s = animalStats(animal, customProducts);
  const female = animal.sex === 'f';
  const chips = [
    `${formatNumber(animal.weight, 1)} kg`,
    animal.birthDate ? ageText(animal.ageMonths) : null,
    stageLabel(animal),
    female ? 'Fêmea' : 'Macho',
    animal.neutered ? neuterYesLabel(animal.sex).replace('Sim, ', '').replace(/^./, (c) => c.toUpperCase()) : null,
    animal.species === 'dog' ? (animal.active ? 'Muito ativo' : 'Calmo') : animal.active ? 'Vai à rua' : 'Interior',
    animal.goal === 'lose' && animal.stage !== 'junior' ? 'Em dieta' : null,
  ].filter(Boolean);

  const totalDays = animal.bag && s.grams ? (animal.bag.kg * 1000) / s.grams : null;
  const fraction = totalDays && s.daysLeft != null ? Math.max(0, Math.min(1, s.daysLeft / totalDays)) : null;

  const askBag = () => {
    const sizes = [...new Set((s.product?.offers || []).map((o) => o.kg))].sort((a, b) => a - b).slice(0, 4);
    if (!sizes.length) sizes.push(1, 2, 3);
    Alert.alert('Abriste um saco novo?', 'Escolhe o tamanho para sabermos quando vai acabar.', [
      ...sizes.map((kg) => ({ text: `${formatNumber(kg, kg % 1 ? 1 : 0)} kg`, onPress: () => openBag(animal.id, kg) })),
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const confirmRemove = () =>
    Alert.alert(`Remover ${animal.name}?`, 'Não dá para desfazer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => {
          removeAnimal(animal.id);
          router.replace(animals.length > 1 ? '/inicio' : '/especie');
        },
      },
    ]);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <BackButton />
        <Pressable onPress={() => router.push({ pathname: '/animal/novo', params: { id: animal.id } })} accessibilityRole="button" style={{ padding: 10 }}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.navy }}>Editar</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View>
          <Avatar animal={animal} size={72} />
          <Pressable
            onPress={() =>
              choosePhoto(
                (uri) => saveAnimal({ ...stored, photoUri: uri }),
                stored.photoUri ? () => saveAnimal({ ...stored, photoUri: null }) : undefined
              )
            }
            accessibilityRole="button"
            accessibilityLabel={`Mudar foto de ${animal.name}`}
            style={{ position: 'absolute', right: -4, bottom: -4, width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: colors.bg, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="camera-outline" size={16} color={colors.white} />
          </Pressable>
        </View>
        <View style={{ flex: 1 }}>
          <Title size={30}>{animal.name}</Title>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {chips.map((c) => (
              <Text key={c} style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.text, backgroundColor: colors.card, borderColor: '#EED8D3', borderWidth: 1, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3, overflow: 'hidden' }}>
                {c}
              </Text>
            ))}
          </View>
        </View>
      </View>

      <Card style={{ padding: 18, borderRadius: 20 }}>
        <Body muted size={13}>Dose diária recomendada</Body>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 52, color: colors.coralDark }}>
            {s.grams ? `${formatNumber(s.grams)} g` : '—'}
          </Text>
          {s.kcal ? <Body muted size={14}>≈ {formatNumber(s.kcal)} kcal</Body> : null}
        </View>
        {s.grams ? (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <Stat label="Por refeição" value={`${formatNumber(s.perMeal)} g × ${s.meals}`} />
            <Stat label="Por mês" value={`${formatNumber((s.grams * 30) / 1000, 1)} kg`} />
          </View>
        ) : (
          <Body muted size={14} style={{ marginTop: 8 }}>Escolhe a ração para saber os gramas certos.</Body>
        )}
      </Card>

      <Card style={{ gap: 12, borderRadius: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Body muted size={12}>Ração atual</Body>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.text, marginTop: 2 }}>{s.product ? s.product.name : 'Nenhuma escolhida'}</Text>
            {s.product ? <Body muted size={12}>{formatNumber(s.product.kcalPerKg)} kcal/kg</Body> : null}
          </View>
          <Pressable onPress={() => router.push({ pathname: '/animal/novo', params: { id: animal.id } })} accessibilityRole="button" style={{ paddingVertical: 10, paddingLeft: 10 }}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.navy }}>{s.product ? 'Trocar' : 'Escolher'}</Text>
          </Pressable>
        </View>

        {s.product ? (
          animal.bag && fraction != null ? (
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Body size={13}>Saco de {formatNumber(animal.bag.kg, animal.bag.kg % 1 ? 1 : 0)} kg</Body>
                <Body muted size={13}>{s.daysLeft === 0 ? 'deve ter acabado' : `dura mais ${s.daysLeft} ${s.daysLeft === 1 ? 'dia' : 'dias'}`}</Body>
              </View>
              <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' }}>
                <View style={{ width: `${Math.round(fraction * 100)}%`, height: 8, backgroundColor: fraction < 0.15 ? colors.coral : colors.navy, borderRadius: 4 }} />
              </View>
              <Pressable onPress={askBag} accessibilityRole="button" style={{ alignSelf: 'flex-start', paddingVertical: 8 }}>
                <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.navy }}>Abri um saco novo</Text>
              </Pressable>
            </View>
          ) : (
            <Button variant="outline" icon="bag-handle-outline" title="Abri um saco novo" onPress={askBag} />
          )
        ) : null}

        {s.product ? (
          <View style={{ flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
            <View style={{ flex: 1 }}>
              <Body muted size={12}>Custo por dia</Body>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 18, color: colors.text }}>{formatEuro(s.costDay)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Body muted size={12}>Custo por mês</Body>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 18, color: colors.text }}>{s.costDay != null ? formatEuro(s.costDay * 30) : '—'}</Text>
            </View>
          </View>
        ) : null}
      </Card>

      {s.product ? (
        <Button title="Comparar preços desta ração" onPress={() => router.push({ pathname: '/comparar/[productId]', params: { productId: s.product.id } })} />
      ) : null}
      <Body muted size={12} style={{ textAlign: 'center' }}>Estimativa de referência. Confirma com o teu veterinário.</Body>
      <Button variant="ghost" title={`Remover ${animal.name}`} onPress={confirmRemove} />
    </Screen>
  );
}
