// Lista as rações que a casa usa, com o preço mais baixo de cada uma.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Body, Button, Card, Screen, Title } from '../../components/ui';
import { DEMO_PRICES_NOTICE } from '../../data/products';
import { animalStats } from '../../lib/household';
import { formatEuro, formatNumber } from '../../lib/nutrition';
import { useStore } from '../../store/AppStore';
import { colors, fonts } from '../../theme';

export default function Precos() {
  const { animals, customProducts } = useStore();

  // Agrupa por ração: quem a come e quantos gramas por dia no total.
  const groups = {};
  for (const a of animals) {
    const s = animalStats(a, customProducts);
    if (!s.product) continue;
    const g = (groups[s.product.id] ||= { product: s.product, offer: s.offer, grams: 0, names: [] });
    g.grams += s.grams || 0;
    g.names.push(a.name);
  }
  const list = Object.values(groups);

  return (
    <Screen>
      <Title size={30}>Preços</Title>
      <Body muted>As rações da tua casa e onde estão mais baratas agora.</Body>
      {list.length === 0 ? (
        <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 24 }}>
          <Body muted style={{ textAlign: 'center' }}>Escolhe a ração de um animal para comparar preços.</Body>
          <Button variant="secondary" title="Ver animais" onPress={() => router.push('/animais')} />
        </Card>
      ) : (
        list.map(({ product, offer, grams, names }) => (
          <Card
            key={product.id}
            onPress={() => router.push({ pathname: '/comparar/[productId]', params: { productId: product.id } })}
            accessibilityLabel={`Comparar preços de ${product.name}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.text }}>{product.name}</Text>
              <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
                Para {names.join(' e ')} · {formatNumber(grams)} g/dia
              </Text>
              <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 6 }}>
                {offer ? (
                  <>
                    Mais barato: <Text style={{ fontFamily: fonts.semibold, color: colors.text }}>{offer.store}</Text> ·{' '}
                    <Text style={{ fontFamily: fonts.semibold, color: colors.coralDark }}>{formatEuro((grams / 1000) * (offer.price / offer.kg))}/dia</Text>
                  </>
                ) : (
                  'Sem preços registados'
                )}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Card>
        ))
      )}
      <Body muted size={12} style={{ textAlign: 'center' }}>{DEMO_PRICES_NOTICE}</Body>
    </Screen>
  );
}
