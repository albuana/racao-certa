import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { animalStats } from '../lib/household';
import { describeAnimal, formatNumber, stageLabel, withAutoStage } from '../lib/nutrition';
import { useStore } from '../store/AppStore';
import { colors, fonts } from '../theme';
import { Avatar, Card } from './ui';

export default function AnimalRow({ animal: raw }) {
  const animal = withAutoStage(raw);
  const { customProducts } = useStore();
  const s = animalStats(animal, customProducts);
  const meta = [`${formatNumber(animal.weight, 1)} kg`, describeAnimal(animal) || stageLabel(animal)].filter(Boolean).join(' · ');
  return (
    <Card
      onPress={() => router.push({ pathname: '/animal/[id]', params: { id: animal.id } })}
      accessibilityLabel={`${animal.name}, ${meta}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}
    >
      <Avatar animal={animal} size={48} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.text }}>{animal.name}</Text>
        <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 2 }}>{meta}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.text }}>
          {s.grams ? `${formatNumber(s.grams)} g` : '—'}
        </Text>
        <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
          {s.grams ? 'por dia' : 'sem ração'}
        </Text>
      </View>
    </Card>
  );
}
