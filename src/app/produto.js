// Ficha de uma ração: todas as lojas (mais barata primeiro), ⭐ favorita, 🔔 alerta de preço,
// 📉 histórico e 💡 alternativas mais baratas.

import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';
import PriceChart from '../components/PriceChart';
import ProductCard, { priceLabel, sizeText } from '../components/ProductCard';
import { BackButton, Body, Button, Card, Screen, Title, styles as ui } from '../components/ui';
import { allowNotifications } from '../lib/notify';
import { formatEuro, parseNumber } from '../lib/nutrition';
import { getGroup, reportWrongPrice, searchStores } from '../lib/search';
import { useStore } from '../store/AppStore';
import { colors, fonts } from '../theme';

// Palavras que dizem para quem é a ração (para procurar parecidas).
function profileWords(name = '') {
  const t = name.toLowerCase();
  const out = [];
  if (/kitten|junior|júnior|baby|puppy|cachorro/.test(t)) out.push('júnior');
  else if (/senior|sénior|7\+|ageing|mature|11\+/.test(t)) out.push('sénior');
  if (/steril|castrad|esteriliz|neutered/.test(t)) out.push('esterilizado');
  for (const [re, w] of [[/renal|kidney/, 'renal'], [/urin/, 'urinary'], [/light|weight|obes|satiety/, 'light'], [/hairball|bolas de pelo/, 'hairball'], [/sensib|digest|gastro/, 'sensível']]) {
    if (re.test(t)) out.push(w);
  }
  return out;
}

// Comparação justa entre rações de tamanhos diferentes: €/kg.
const perKg = (g) => g.best?.perKg || (g.kg ? g.best.price / g.kg : null);

export default function Produto() {
  const { key } = useLocalSearchParams();
  const { favorites = [], toggleFavorite, updateFavorite } = useStore();
  const fav = favorites.find((f) => f.key === key) || null;
  const { width } = useWindowDimensions();

  // A ração vem da última pesquisa ou, se for favorita, do que ficou guardado.
  // Fica fixa enquanto o ecrã está aberto (as outras pesquisas não a mudam).
  const [group] = useState(() => {
    const fromSearch = getGroup(key);
    if (fromSearch) return fromSearch;
    if (!fav) return null;
    const offers = (fav.offers || (fav.best ? [fav.best] : [])).map((o) => ({ ...o, unitValue: o.unitValue ?? o.price }));
    return { key: fav.key, name: fav.name, brand: fav.brand, image: fav.image, type: fav.type, species: fav.species, kg: fav.kg, offers, best: offers[0] || null, pack: null };
  });

  const [target, setTarget] = useState(fav?.target ? String(fav.target).replace('.', ',') : '');
  const [alts, setAlts] = useState(null);
  const [hidden, setHidden] = useState([]); // ofertas marcadas como erradas neste ecrã

  const reportOffer = (o) =>
    Alert.alert('Preço errado?', `${o.store}: ${formatEuro(o.price)}. Vamos esconder este preço para toda a gente até ser verificado.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Está errado',
        style: 'destructive',
        onPress: () => {
          setHidden((h) => [...h, `${o.store}|${o.price}`]);
          reportWrongPrice(o).catch(() => {});
        },
      },
    ]);

  // 💡 Alternativas: o mesmo animal, o mesmo tipo e a mesma fase, mais baratas por kg.
  useEffect(() => {
    if (!group?.best) return;
    let alive = true;
    const animal = group.species === 'dog' ? 'cão' : 'gato';
    const q = `${group.type === 'wet' ? 'comida húmida' : 'ração'} ${animal} ${profileWords(group.name).join(' ')}`.trim();
    searchStores(q, { type: group.type, species: group.species, remember: 'keep' })
      .then((list) => {
        if (!alive) return;
        const mine = perKg(group);
        // Tem de servir para o mesmo: júnior/sénior, esterilizado e o mesmo problema de saúde.
        const want = profileWords(group.name);
        const fits = (g) => want.every((w) => profileWords(g.name).includes(w));
        const cheaper = list
          .filter((g) => g.key !== group.key && fits(g) && perKg(g) && mine && perKg(g) < mine * 0.95)
          .sort((a, b) => perKg(a) - perKg(b))
          .slice(0, 3);
        setAlts({ list: cheaper, mine });
      })
      .catch(() => alive && setAlts({ list: [], mine: null }));
    return () => {
      alive = false;
    };
  }, [group]);

  if (!group || !group.best) {
    return (
      <Screen>
        <BackButton />
        <Title size={24}>Ração não encontrada</Title>
        <Body muted>Volta a pesquisar para veres os preços.</Body>
      </Screen>
    );
  }

  const isFav = !!fav;
  const wet = group.type === 'wet';
  const saveTarget = async () => {
    const value = parseNumber(target);
    if (!isFav) toggleFavorite(group);
    // Espera o estado da favorita existir antes de gravar o alvo.
    setTimeout(() => updateFavorite(group.key, { target: value > 0 ? value : null, notifiedPrice: null }), 0);
    if (value > 0) await allowNotifications();
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <BackButton />
        <Pressable
          onPress={() => toggleFavorite(group)}
          accessibilityRole="button"
          accessibilityLabel={isFav ? 'Tirar das favoritas' : 'Guardar nas favoritas'}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, minHeight: 44 }}
        >
          <Ionicons name={isFav ? 'star' : 'star-outline'} size={22} color={isFav ? colors.coral : colors.navy} />
          <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.navy }}>{isFav ? 'Favorita' : 'Guardar'}</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <View style={{ width: 96, height: 96, borderRadius: 16, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {group.image ? <Image source={{ uri: group.image }} style={{ width: 90, height: 90 }} resizeMode="contain" /> : <Ionicons name="image-outline" size={30} color={colors.textMuted} />}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Title size={20}>{group.name}</Title>
          <Body muted size={13}>{[wet ? 'Húmida' : 'Seca', sizeText(group)].filter(Boolean).join(' · ')}</Body>
        </View>
      </View>

      <View style={{ backgroundColor: colors.navy, borderRadius: 18, padding: 16, gap: 4 }}>
        <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.onNavyMuted }}>Mais barata agora</Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 34, color: colors.white }}>
          {group.best.desde ? 'desde ' : ''}
          {formatEuro(group.best.unitValue)}
        </Text>
        <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: colors.white }}>
          {priceLabel(group)} · {group.best.store}
        </Text>
        {wet && group.pack?.count > 1 ? (
          <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.onNavyMuted }}>Embalagem: {formatEuro(group.best.price)}</Text>
        ) : null}
      </View>

      {/* Todas as lojas */}
      <Text style={{ fontFamily: fonts.displaySemi, fontSize: 19, color: colors.text }}>Em todas as lojas</Text>
      <View style={{ gap: 8 }}>
        {group.offers.filter((o) => !hidden.includes(`${o.store}|${o.price}`)).map((o, i) => (
          <View key={`${o.store}-${i}`} style={{ gap: 2 }}>
          <Pressable
            onPress={() => o.link && Linking.openURL(o.link)}
            disabled={!o.link}
            accessibilityRole="link"
            accessibilityLabel={`${o.store}, ${formatEuro(o.unitValue)}. Abrir na loja`}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: i === 0 ? colors.coral : colors.border, backgroundColor: pressed ? colors.bg : colors.card })}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.text }}>{o.store}</Text>
              <Text numberOfLines={1} style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted }}>
                {o.desde ? 'Vários tamanhos · ' : ''}
                {wet && o.pack?.count > 1 ? `${formatEuro(o.price)} a embalagem · ` : ''}
                {o.perKg ? `${formatEuro(o.perKg)}/kg` : ''}
                {o.portes ? ` · ${o.portes}` : ''}
              </Text>
            </View>
            {i === 0 ? (
              <View style={{ backgroundColor: colors.coralTint, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontFamily: fonts.semibold, fontSize: 11, color: colors.coralTintText }}>Mais barata</Text>
              </View>
            ) : null}
            <Text style={{ fontFamily: fonts.display, fontSize: 18, color: i === 0 ? colors.coralDark : colors.text }}>
              {o.desde ? 'desde ' : ''}
              {formatEuro(o.unitValue)}
            </Text>
            {o.link ? <Ionicons name="open-outline" size={16} color={colors.textMuted} /> : null}
          </Pressable>
          <Pressable onPress={() => reportOffer(o)} accessibilityRole="button" accessibilityLabel={`Preço errado na ${o.store}?`} hitSlop={6} style={{ alignSelf: 'flex-end', paddingVertical: 4, paddingHorizontal: 6 }}>
            <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, textDecorationLine: 'underline' }}>Preço errado?</Text>
          </Pressable>
          </View>
        ))}
      </View>

      {/* 🔔 Alerta de preço */}
      <Card style={{ gap: 10 }}>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.text }}>🔔 Avisa-me quando baixar</Text>
        <Body muted size={13}>
          Escolhe o preço {wet ? 'por lata/saqueta' : 'por saco'}. Vemos os preços sempre que abres a app e avisamos-te quando chegar lá.
        </Body>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TextInput
            value={target}
            onChangeText={setTarget}
            placeholder={`ex.: ${formatEuro(Math.floor(group.best.unitValue * 0.9 * 100) / 100)}`}
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            returnKeyType="done"
            accessibilityLabel="Preço para o alerta, em euros"
            style={[ui.input, { flex: 1 }]}
          />
          <Button title={fav?.target ? 'Mudar' : 'Avisar'} onPress={saveTarget} disabled={!(parseNumber(target) > 0)} style={{ paddingHorizontal: 18 }} />
        </View>
        {fav?.target ? (
          <Pressable onPress={() => { setTarget(''); updateFavorite(group.key, { target: null }); }} accessibilityRole="button" style={{ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.navy }}>Alerta ativo: {formatEuro(fav.target)} · Desligar</Text>
          </Pressable>
        ) : null}
      </Card>

      {/* 📉 Histórico */}
      <Card style={{ gap: 10 }}>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.text }}>📉 Histórico de preço</Text>
        {isFav ? (
          <PriceChart history={fav.history || []} width={Math.min(width - 72, 420)} />
        ) : (
          <Body muted size={13}>Guarda nas favoritas (⭐) para começarmos a registar o preço mais baixo de cada dia.</Body>
        )}
      </Card>

      {/* 💡 Alternativas */}
      <Text style={{ fontFamily: fonts.displaySemi, fontSize: 19, color: colors.text }}>💡 Parecidas e mais baratas</Text>
      {!alts ? (
        <ActivityIndicator color={colors.navy} />
      ) : alts.list.length ? (
        <View style={{ gap: 10 }}>
          <Body muted size={13}>Para o mesmo animal e a mesma fase, comparadas pelo preço por kg.</Body>
          {alts.list.map((g) => (
            <View key={g.key} style={{ gap: 4 }}>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.coralDark }}>
                {Math.round((1 - perKg(g) / alts.mine) * 100)}% mais barata por kg
              </Text>
              <ProductCard group={g} onPress={() => router.push({ pathname: '/produto', params: { key: g.key } })} />
            </View>
          ))}
          <Body muted size={12}>Confirma a composição com o veterinário antes de mudar, sobretudo em dietas de saúde.</Body>
        </View>
      ) : (
        <Body muted size={14}>Não encontrámos parecidas mais baratas. Esta já é uma boa escolha.</Body>
      )}
    </Screen>
  );
}
