// 🔍 Procurar: onde está a ração mais barata, em todas as lojas.
// Seca: preço por saco. Húmida: preço por lata/saqueta.

import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import ProductCard from '../../components/ProductCard';
import Scanner from '../../components/Scanner';
import { Body, Chip, Screen, Title, styles as ui } from '../../components/ui';
import { animalStats } from '../../lib/household';
import { lookupBarcode } from '../../lib/lookup';
import { formatEuro } from '../../lib/nutrition';
import { searchEnabled, searchStores } from '../../lib/search';
import { useFavoritePrices } from '../../lib/useFavoritePrices';
import { useStore } from '../../store/AppStore';
import { colors, fonts } from '../../theme';

const SPECIES = [
  { value: null, label: 'Todos' },
  { value: 'cat', label: 'Gato' },
  { value: 'dog', label: 'Cão' },
];
const TYPES = [
  { value: null, label: 'Seca e húmida' },
  { value: 'dry', label: 'Seca' },
  { value: 'wet', label: 'Húmida' },
];

function SectionTitle({ children, right }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
      <Text style={{ fontFamily: fonts.displaySemi, fontSize: 19, color: colors.text }}>{children}</Text>
      {right}
    </View>
  );
}

export default function Procurar() {
  const { favorites = [], toggleFavorite, updateFavorite, animals, customProducts } = useStore();
  const [query, setQuery] = useState('');
  const [species, setSpecies] = useState(null);
  const [type, setType] = useState(null);
  const [results, setResults] = useState(null); // null = ainda não pesquisou
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const { refresh, refreshing } = useFavoritePrices(favorites, updateFavorite);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const favKeys = useMemo(() => new Set(favorites.map((f) => f.key)), [favorites]);

  // Rações que os animais da casa comem (atalho para pesquisar).
  const houseFoods = useMemo(() => {
    const seen = new Map();
    for (const a of animals) {
      const s = animalStats(a, customProducts);
      for (const part of [s.dry, s.wet]) {
        if (!part?.product || seen.has(part.product.id)) continue;
        seen.set(part.product.id, { product: part.product, names: [a.name] });
      }
    }
    return [...seen.values()];
  }, [animals, customProducts]);

  const run = async (text = query, filters = { species, type }) => {
    const q = text.trim();
    if (q.length < 2) return;
    setBusy(true);
    setError('');
    try {
      setResults(await searchStores(q, filters));
    } catch (e) {
      setError(/abort/i.test(String(e?.name || e)) ? 'As lojas estão a demorar. Tenta outra vez.' : 'Não foi possível pesquisar agora. Confirma a internet e tenta outra vez.');
      setResults([]);
    } finally {
      setBusy(false);
    }
  };

  const searchFor = (text) => {
    setQuery(text);
    run(text);
  };

  const onFilter = (next) => {
    const f = { species, type, ...next };
    if (next.species !== undefined) setSpecies(next.species);
    if (next.type !== undefined) setType(next.type);
    if (results) run(query, f);
  };

  const onCode = async (code) => {
    setScanning(false);
    setBusy(true);
    try {
      const p = await lookupBarcode(code);
      if (!p) {
        setBusy(false);
        setError('Não encontrámos esse código. Escreve o nome da ração.');
        return;
      }
      const text = [p.brand, p.name].filter(Boolean).join(' ').replace(/\s+/g, ' ').slice(0, 70);
      setQuery(text);
      await run(text, { species: p.species || species, type: p.type || type });
    } catch {
      setBusy(false);
      setError('Não foi possível ler esse código agora.');
    }
  };

  const open = (group) => router.push({ pathname: '/produto', params: { key: group.key } });
  const clear = () => {
    setQuery('');
    setResults(null);
    setError('');
  };

  if (!searchEnabled) {
    return (
      <Screen>
        <Title size={30}>Procurar</Title>
        <Body muted>Falta ligar o servidor de preços (EXPO_PUBLIC_PRICES_API_URL no .env.local).</Body>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ gap: 4 }}>
        <Title size={30}>Procurar</Title>
        <Body muted size={14}>O preço mais baixo em supermercados e lojas de animais.</Body>
      </View>

      {/* Pesquisa */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Ionicons name="search" size={18} color={colors.textMuted} style={{ position: 'absolute', left: 14, zIndex: 1 }} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => run()}
            placeholder="Que ração procuras?"
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Que ração procuras?"
            style={[ui.input, { paddingLeft: 40, paddingRight: query ? 40 : 14 }]}
          />
          {query ? (
            <Pressable onPress={clear} hitSlop={8} accessibilityRole="button" accessibilityLabel="Limpar pesquisa" style={{ position: 'absolute', right: 12 }}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          onPress={() => setScanning(true)}
          accessibilityRole="button"
          accessibilityLabel="Ler código de barras"
          style={({ pressed }) => ({ width: 52, borderRadius: 14, backgroundColor: pressed ? colors.navyDark : colors.navy, alignItems: 'center', justifyContent: 'center' })}
        >
          <Ionicons name="barcode-outline" size={24} color={colors.white} />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {SPECIES.map((s) => (
          <Chip key={`s${s.label}`} label={s.label} active={species === s.value} onPress={() => onFilter({ species: s.value })} />
        ))}
        <View style={{ width: 1, backgroundColor: colors.border, marginHorizontal: 2 }} />
        {TYPES.map((t) => (
          <Chip key={`t${t.label}`} label={t.label} active={type === t.value} onPress={() => onFilter({ type: t.value })} />
        ))}
      </ScrollView>

      {busy ? (
        <View style={{ alignItems: 'center', gap: 10, paddingVertical: 28 }}>
          <ActivityIndicator color={colors.navy} />
          <Body muted size={14}>A ver os preços em todas as lojas…</Body>
        </View>
      ) : null}

      {error ? <Body style={{ color: colors.danger }}>{error}</Body> : null}

      {/* Resultados */}
      {!busy && results ? (
        results.length ? (
          <View style={{ gap: 10 }}>
            <Body muted size={13}>
              {results.length} {results.length === 1 ? 'ração' : 'rações'} · ordenadas pelas que dá para comparar em mais lojas
            </Body>
            {results.map((g) => (
              <ProductCard key={g.key} group={g} favorite={favKeys.has(g.key)} onPress={() => open(g)} onToggleFavorite={() => toggleFavorite(g)} />
            ))}
          </View>
        ) : !error ? (
          <Body muted>Não encontrámos nada. Experimenta só a marca e a gama, por exemplo “Royal Canin Sterilised”.</Body>
        ) : null
      ) : null}

      {/* Sem pesquisa: favoritas e rações da casa */}
      {!busy && !results ? (
        <View style={{ gap: 12 }}>
          <SectionTitle right={refreshing ? <ActivityIndicator size="small" color={colors.textMuted} /> : null}>⭐ Favoritas</SectionTitle>
          {favorites.length ? (
            favorites.map((f) => (
              <Pressable
                key={f.key}
                onPress={() => router.push({ pathname: '/produto', params: { key: f.key } })}
                accessibilityRole="button"
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: pressed ? colors.bg : colors.card })}
              >
                <View style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {f.image ? <Image source={{ uri: f.image }} style={{ width: 48, height: 48 }} resizeMode="contain" /> : <Ionicons name="star" size={22} color={colors.coral} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={2} style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.text }}>{f.name}</Text>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
                    {f.best ? (
                      <>
                        <Text style={{ fontFamily: fonts.semibold, color: colors.coralDark }}>{formatEuro(f.best.unitValue)}</Text>
                        {f.type === 'wet' ? ' /unid.' : ''} · {f.best.store}
                      </>
                    ) : (
                      'Sem preço ainda'
                    )}
                    {f.target ? `  ·  🔔 ${formatEuro(f.target)}` : ''}
                  </Text>
                </View>
                {f.target && f.best && f.best.unitValue <= f.target ? (
                  <View style={{ backgroundColor: colors.coralTint, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.coralTintText }}>Baixou!</Text>
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                )}
              </Pressable>
            ))
          ) : (
            <Body muted size={14}>Toca na ⭐ de uma ração para a guardares aqui e veres o preço de todas de uma vez.</Body>
          )}

          {houseFoods.length ? (
            <>
              <SectionTitle>🐾 Rações da tua casa</SectionTitle>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {houseFoods.map(({ product }) => (
                  <Chip key={product.id} label={product.name.length > 34 ? `${product.name.slice(0, 33)}…` : product.name} onPress={() => searchFor(product.name)} />
                ))}
              </View>
            </>
          ) : null}

          <SectionTitle>Pesquisas rápidas</SectionTitle>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {['Royal Canin Sterilised', 'Purina One', 'Felix saquetas', 'Whiskas', 'Advance', 'Hill’s Science Plan', 'Ração renal gato', 'Pedigree'].map((t) => (
              <Chip key={t} label={t} onPress={() => searchFor(t)} />
            ))}
          </View>
        </View>
      ) : null}

      <Body muted size={12} style={{ textAlign: 'center' }}>
        Preços dos sites das lojas, sem portes. Continente, Pingo Doce, Auchan, Kiwoko, Tiendanimal, Zooplus, Miscota e mais.
      </Body>

      <Modal visible={scanning} animationType="slide" onRequestClose={() => setScanning(false)}>
        <Scanner onClose={() => setScanning(false)} onCode={onCode} />
      </Modal>
    </Screen>
  );
}
