import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import AnimalRow from '../../components/AnimalRow';
import { Banner, Body, Screen, Title } from '../../components/ui';
import { householdTotals, nextToRunOut } from '../../lib/household';
import { formatEuro, formatNumber } from '../../lib/nutrition';
import { useStore } from '../../store/AppStore';
import { colors, fonts } from '../../theme';

function greeting() {
  const h = new Date().getHours();
  if (h < 6 || h >= 20) return 'Boa noite';
  if (h < 13) return 'Bom dia';
  return 'Boa tarde';
}

export default function Inicio() {
  const { animals, customProducts, house } = useStore();
  const totals = householdTotals(animals, customProducts);
  const alert = nextToRunOut(animals, customProducts);

  return (
    <Screen>
      <View>
        <Body muted size={14}>{greeting()}{house?.name ? ` · ${house.name}` : ''}</Body>
        <Title size={30}>Os teus animais</Title>
      </View>

      <View style={{ backgroundColor: colors.navy, borderRadius: 20, padding: 18, gap: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View>
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.onNavyMuted }}>Custo estimado da ração por mês</Text>
            <Text style={{ fontFamily: fonts.display, fontSize: 36, color: colors.white, marginTop: 2 }}>{formatEuro(totals.costMonth)}</Text>
          </View>
          <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.onNavyMuted, marginBottom: 6 }}>
            {formatEuro(totals.costDay)} por dia
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <NavyStat label="Comem por dia" value={`${formatNumber(totals.gramsDay)} g`} />
          <NavyStat label="Por mês" value={`${formatNumber(totals.kgMonth, 1)} kg`} />
        </View>
        {totals.missingPrice ? (
          <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.onNavyMuted }}>Há animais sem ração ou sem preço, não entram no custo.</Text>
        ) : null}
      </View>

      {alert ? (
        <Banner
          title={alert.stats.daysLeft === 0 ? `A ração de ${alert.animal.name} já deve ter acabado` : `A ração de ${alert.animal.name} acaba em ${alert.stats.daysLeft} ${alert.stats.daysLeft === 1 ? 'dia' : 'dias'}`}
          body={alert.stats.offer ? `Mais barata agora em ${alert.stats.offer.store}: ${formatEuro(alert.stats.offer.price / alert.stats.offer.kg)}/kg` : undefined}
          action="Ver preços"
          onAction={() => router.push({ pathname: '/comparar/[productId]', params: { productId: alert.stats.product.id } })}
        />
      ) : null}

      <View style={{ gap: 10 }}>
        {animals.map((a) => (
          <AnimalRow key={a.id} animal={a} />
        ))}
        <Pressable
          onPress={() => router.push('/especie')}
          accessibilityRole="button"
          style={({ pressed }) => ({ borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.dashed, borderRadius: 16, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: pressed ? colors.coralTint : 'transparent' })}
        >
          <Ionicons name="add" size={20} color={colors.navy} />
          <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.navy }}>Adicionar animal</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function NavyStat({ label, value }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.navySoft, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 }}>
      <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.onNavyMuted }}>{label}</Text>
      <Text style={{ fontFamily: fonts.semibold, fontSize: 17, color: colors.white, marginTop: 2 }}>{value}</Text>
    </View>
  );
}
