// Comparador: lojas ordenadas pelo custo por dia (ou €/kg), sem portes.
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { BackButton, Body, Card, Screen, Segmented, Title } from '../../components/ui';
import { DEMO_PRICES_NOTICE, findProduct } from '../../data/products';
import { animalStats } from '../../lib/household';
import { formatEuro, formatNumber } from '../../lib/nutrition';
import { useStore } from '../../store/AppStore';
import { colors, fonts } from '../../theme';

export default function Comparar() {
  const { productId } = useLocalSearchParams();
  const { animals, customProducts } = useStore();
  const [sort, setSort] = useState('day');
  const product = findProduct(productId, customProducts);
  if (!product) return <Redirect href="/precos" />;

  // Gramas por dia de todos os animais que comem esta ração.
  let grams = 0;
  const names = [];
  for (const a of animals) {
    if (a.productId !== product.id) continue;
    const s = animalStats(a, customProducts);
    if (s.grams) {
      grams += s.grams;
      names.push(a.name);
    }
  }

  const rows = (product.offers || [])
    .map((o) => {
      const perKg = o.price / o.kg;
      return { ...o, perKg, perDay: grams ? (grams / 1000) * perKg : null, lasts: grams ? Math.round((o.kg * 1000) / grams) : null };
    })
    .sort((a, b) => (sort === 'day' ? (a.perDay ?? a.perKg) - (b.perDay ?? b.perKg) : a.perKg - b.perKg));

  const best = rows[0];
  const worst = rows[rows.length - 1];
  const yearlySaving = best && worst && best.perDay != null && rows.length > 1 ? (worst.perDay - best.perDay) * 365 : null;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <BackButton />
        <View style={{ flex: 1 }}>
          <Title size={22}>{product.name}</Title>
          <Body muted size={13}>
            {formatNumber(product.kcalPerKg)} kcal/kg{names.length ? ` · para ${names.join(' e ')} · ${formatNumber(grams)} g/dia` : ''}
          </Body>
        </View>
      </View>

      {rows.length === 0 ? (
        <Card>
          <Body muted>Ainda não há preços para esta ração.</Body>
        </Card>
      ) : (
        <>
          <Segmented
            value={sort}
            onChange={setSort}
            options={[
              { value: 'day', label: 'Custo por dia' },
              { value: 'kg', label: '€/kg' },
            ]}
          />

          <View style={{ backgroundColor: colors.navy, borderRadius: 18, padding: 16, gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.text, backgroundColor: colors.coral, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' }}>Mais barato</Text>
              {best.lasts ? <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.onNavyMuted }}>dura {best.lasts} dias</Text> : null}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.semibold, fontSize: 18, color: colors.white }}>{best.store}</Text>
                <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.onNavyMuted, marginTop: 2 }}>
                  Saco {formatNumber(best.kg, best.kg % 1 ? 1 : 0)} kg · {formatEuro(best.price)} · {formatEuro(best.perKg)}/kg
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontFamily: fonts.display, fontSize: 28, color: colors.white }}>{best.perDay != null ? formatEuro(best.perDay) : formatEuro(best.perKg)}</Text>
                <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.onNavyMuted }}>{best.perDay != null ? 'por dia' : 'por kg'}</Text>
              </View>
            </View>
          </View>

          {rows.length > 1 ? (
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              {rows.slice(1).map((r, i) => (
                <View key={`${r.store}-${r.kg}`} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: '#F7E9E6' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.text }}>{r.store}</Text>
                    <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                      Saco {formatNumber(r.kg, r.kg % 1 ? 1 : 0)} kg · {formatEuro(r.price)} · {formatEuro(r.perKg)}/kg
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.text }}>{r.perDay != null ? `${formatEuro(r.perDay)}/dia` : `${formatEuro(r.perKg)}/kg`}</Text>
                    {r.lasts ? <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 }}>dura {r.lasts} dias</Text> : null}
                  </View>
                </View>
              ))}
            </Card>
          ) : null}

          {yearlySaving != null && yearlySaving > 0.5 ? (
            <View style={{ backgroundColor: colors.alertBg, borderRadius: 14, padding: 14 }}>
              <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.coralTintText }}>
                Comprando na mais barata poupas <Text style={{ fontFamily: fonts.semibold, color: colors.text }}>{formatEuro(yearlySaving)} por ano</Text> face à mais cara.
              </Text>
            </View>
          ) : null}
        </>
      )}

      <Body muted size={12}>{DEMO_PRICES_NOTICE}</Body>
    </Screen>
  );
}
