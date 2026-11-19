// Comparador: lojas ordenadas pelo custo por dia (ou €/kg), sem portes.
// Junta preços online (servidor de preços) e preços vistos nas lojas pelos
// utilizadores. Os supermercados principais aparecem sempre.
import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, Text, View } from 'react-native';
import { BackButton, Body, Button, Card, Screen, Segmented, Title } from '../../components/ui';
import { findProduct } from '../../data/products';
import { gramsOfProduct } from '../../lib/household';
import { priceSearchUrl, typicalKcalPerKg } from '../../lib/lookup';
import { formatEuro, formatNumber, withAutoStage } from '../../lib/nutrition';
import { fetchLivePrices, fetchSuggestions, livePricesEnabled, mergeOffers, pricesAreStale } from '../../lib/prices';
import { useStore } from '../../store/AppStore';
import { colors, fonts } from '../../theme';

function seenText(iso) {
  if (!iso) return '';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'visto na loja hoje';
  if (days === 1) return 'visto na loja ontem';
  return `visto na loja há ${days} dias`;
}

export default function Comparar() {
  const { productId } = useLocalSearchParams();
  const { animals, customProducts, updateProductOffers } = useStore();
  const [sort, setSort] = useState('all'); // 'all' | 'day'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const product = findProduct(productId, customProducts);
  const live = !!product?.custom && livePricesEnabled;

  const refresh = async () => {
    if (!product) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetchLivePrices(product);
      // Mantém preços vistos na loja que ainda não estejam no servidor.
      const localSeen = (product.offers || []).filter((o) => o.origin === 'store');
      updateProductOffers(product.id, mergeOffers(r.offers, localSeen), r.updatedAt);
    } catch (e) {
      setError(e?.message || 'Não foi possível obter os preços');
    } finally {
      setLoading(false);
    }
  };

  // Rações reais: vai buscar os preços se ainda não os tiver (ou se forem antigos).
  useEffect(() => {
    if (!live || !pricesAreStale(product)) return undefined;
    const t = setTimeout(refresh, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, live]);

  // Sugestões de rações mais baratas do mesmo tipo (para o primeiro animal que come esta ração).
  const eater = product ? animals.find((a) => gramsOfProduct(a, product.id, customProducts) > 0) : null;
  useEffect(() => {
    if (!livePricesEnabled || !product || !eater) return undefined;
    let alive = true;
    const a = withAutoStage(eater);
    fetchSuggestions({ species: a.species, type: product.type || 'dry', stage: a.stage, conditions: a.conditions || [] })
      .then((list) => alive && setSuggestions(list))
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, eater?.id]);

  if (!product) return <Redirect href="/precos" />;
  const openSearch = () => Linking.openURL(priceSearchUrl([product.brand, product.name, product.quantity].filter(Boolean).join(' '))).catch(() => {});

  // Gramas por dia de todos os animais que comem esta ração.
  let grams = 0;
  const names = [];
  for (const a of animals) {
    const g = gramsOfProduct(a, product.id, customProducts);
    if (g) {
      grams += g;
      names.push(a.name);
    }
  }

  const rows = (product.offers || [])
    .map((o) => {
      const perKg = o.price / o.kg;
      return { ...o, perKg, perDay: grams ? (grams / 1000) * perKg : null, lasts: grams ? Math.round((o.kg * 1000) / grams) : null };
    })
    .sort((a, b) => (a.perDay ?? a.perKg) - (b.perDay ?? b.perKg));

  const best = rows[0];
  const headerImage = product.imageUrl || (product.offers || []).find((o) => o.image)?.image || null;
  // Custo por dia de cada sugestão para os mesmos animais (mesmas calorias).
  // Calorias que esta ração dá por dia (a parte do plano que lhe cabe).
  const kcalDay = (grams * product.kcalPerKg) / 1000;
  const bestDay = best?.perDay ?? null;
  const alternatives = suggestions
    .filter((sg) => !rows.some((r) => r.store === sg.store && (r.title || '').toLowerCase() === sg.name.toLowerCase()))
    .map((sg) => {
      const kcalKg = typicalKcalPerKg({ type: sg.type || product.type, name: sg.name });
      const g = kcalDay ? kcalDay / (kcalKg / 1000) : null;
      return { ...sg, gramsDay: g, perDay: g ? (g / 1000) * sg.perKg : null, current: false };
    });

  // Lista única: esta ração nas várias lojas + outras rações do mesmo tipo.
  const mine = rows.map((r) => ({ ...r, name: product.name, image: r.image || product.imageUrl || null, gramsDay: grams || null, current: true }));
  let items;
  if (sort === 'day') {
    items = [...mine, ...alternatives].sort((a, b) => (a.perDay ?? a.perKg) - (b.perDay ?? b.perKg));
  } else {
    // "Todas": primeiro esta ração, depois as outras, alternando supermercados e lojas.
    const byStore = {};
    for (const a of alternatives) (byStore[a.store] ||= []).push(a);
    const queues = Object.values(byStore);
    const mixed = [];
    while (queues.some((q) => q.length)) for (const q of queues) if (q.length) mixed.push(q.shift());
    items = [...mine, ...mixed];
  }
  items = items.slice(0, 40);
  const cheapest = [...mine, ...alternatives].filter((x) => x.perDay != null).sort((a, b) => a.perDay - b.perDay)[0];



  const originLine = (r) => (r.origin === 'store' ? seenText(r.seenAt) : r.link ? 'online' : '');

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <BackButton />
        {headerImage ? <Image source={{ uri: headerImage }} resizeMode="contain" style={{ width: 56, height: 56, borderRadius: 10, backgroundColor: colors.white }} accessibilityLabel={`Foto de ${product.name}`} /> : null}
        <View style={{ flex: 1 }}>
          <Title size={22}>{product.name}</Title>
          <Body muted size={13}>
            {formatNumber(product.kcalPerKg)} kcal/kg{names.length ? ` · para ${names.join(' e ')} · ${formatNumber(grams)} g/dia` : ''}
          </Body>
        </View>
      </View>

      {loading ? (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <ActivityIndicator color={colors.navy} />
          <Body>A procurar o preço desta ração nas lojas…</Body>
        </Card>
      ) : null}
      {error ? (
        <Card style={{ gap: 10 }}>
          <Body muted>Não conseguimos obter os preços online agora ({error}).</Body>
          <Button variant="secondary" title="Tentar outra vez" onPress={refresh} />
        </Card>
      ) : null}

      {rows.length === 0 && !loading ? (
        <Card style={{ gap: 12 }}>
          <Body muted>{live && product.pricesUpdatedAt ? 'Ainda não encontrámos esta ração à venda online.' : 'Ainda não temos preços para esta ração.'}</Body>
          <Button variant="secondary" icon="storefront-outline" title="Ver preços na web" onPress={openSearch} />
        </Card>
      ) : null}

      {items.length > 0 ? (
        <>
          <Segmented
            value={sort}
            onChange={setSort}
            options={[
              { value: 'all', label: 'Todas' },
              { value: 'day', label: 'Mais barata por dia' },
            ]}
          />
          <Body muted size={12}>
            {sort === 'day'
              ? `Ordenadas pelo custo por dia${names.length ? ` para ${names.join(' e ')}` : ''}, com as mesmas calorias. Toca para ver na loja.`
              : 'Esta ração nas várias lojas e outras do mesmo tipo nos supermercados e lojas de animais. Toca para ver na loja.'}
          </Body>
          {sort === 'day' && cheapest && bestDay != null && !cheapest.current && bestDay - cheapest.perDay > 0.01 ? (
            <View style={{ backgroundColor: colors.alertBg, borderRadius: 14, padding: 14 }}>
              <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.coralTintText }}>
                Mudando para a mais barata poupas <Text style={{ fontFamily: fonts.semibold, color: colors.text }}>{formatEuro((bestDay - cheapest.perDay) * 30)} por mês</Text>.
              </Text>
            </View>
          ) : null}
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {items.map((it, i) => (
              <Pressable
                key={`${it.current ? 'c' : 'a'}-${it.store}-${it.name}-${it.kg}`}
                disabled={!it.link}
                onPress={() => it.link && Linking.openURL(it.link).catch(() => {})}
                accessibilityRole={it.link ? 'link' : undefined}
                accessibilityLabel={`${it.name}, ${it.store}`}
                style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: '#F7E9E6' }, pressed && { backgroundColor: colors.bg }]}
              >
                {it.image ? (
                  <Image source={{ uri: it.image }} resizeMode="contain" style={{ width: 52, height: 52, borderRadius: 8, backgroundColor: colors.white }} accessibilityLabel={`Foto de ${it.name}`} />
                ) : (
                  <View style={{ width: 52, height: 52, borderRadius: 8, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="storefront-outline" size={22} color={colors.textMuted} />
                  </View>
                )}
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {sort === 'day' && i === 0 ? <Text style={{ fontFamily: fonts.semibold, fontSize: 11, color: colors.text, backgroundColor: colors.coral, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' }}>Mais barata</Text> : null}
                    {it.current ? <Text style={{ fontFamily: fonts.semibold, fontSize: 11, color: colors.coralTintText, backgroundColor: colors.coralTint, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' }}>A tua ração</Text> : null}
                  </View>
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.text }} numberOfLines={2}>{it.name}</Text>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted }}>
                    {it.store} · {formatNumber(it.kg, it.kg % 1 ? 1 : 0)} kg · {formatEuro(it.price)}{it.gramsDay ? ` · ${formatNumber(it.gramsDay)} g/dia` : ''}
                  </Text>
                  {it.current && originLine(it) ? <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted }}>{originLine(it)}</Text> : null}
                </View>
                <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.coralDark }}>
                  {it.perDay != null ? `${formatEuro(it.perDay)}/dia` : `${formatEuro(it.perKg)}/kg`}
                </Text>
              </Pressable>
            ))}
          </Card>
        </>
      ) : null}

      {live ? (
        <View style={{ gap: 6 }}>
          <Body muted size={12}>
            Preços sem portes{product.pricesUpdatedAt ? ` · atualizados a ${new Date(product.pricesUpdatedAt).toLocaleString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}
          </Body>
          {!loading ? <Button variant="ghost" icon="refresh" title="Atualizar preços" onPress={refresh} /> : null}
        </View>
      ) : (
        <Body muted size={12}>Preços sem portes</Body>
      )}
    </Screen>
  );
}
