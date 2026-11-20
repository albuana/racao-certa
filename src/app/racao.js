// Escolher a ração de um animal: opções com preço em todas as lojas (da mais barata por dia)
// e, fechado, o que o animal já experimentou com a nota 👍/👎.
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Scanner from '../components/Scanner';
import { BackButton, Body, Button, Chip, Field, Screen, Title, styles as ui } from '../components/ui';
import { findByEan, findProduct } from '../data/products';
import { inferConditions, inferStagesFor, lookupBarcode, priceSearchUrl, searchProducts, typicalKcalPerKg } from '../lib/lookup';
import { HEALTH_CONDITIONS, cheapestOffer, formatEuro, formatNumber, parseNumber, stagesFor } from '../lib/nutrition';
import { fetchSuggestions } from '../lib/prices';
import { planIds } from '../lib/household';
import { groupResults, sameProduct, searchStores } from '../lib/search';
import { useStore } from '../store/AppStore';
import { colors, fonts } from '../theme';

export default function RacaoPicker() {
  const params = useLocalSearchParams();
  const species = params.species === 'dog' ? 'dog' : 'cat';
  const stage = params.stage || null;
  const kcal = parseNumber(params.kcal);
  const animalId = params.animalId || null;
  const who = params.name || (species === 'dog' ? 'o teu cão' : 'o teu gato');
  const { animals, customProducts, setPickedProductId, addCustomProduct, recordFood, rateFood } = useStore();
  const animal = animalId ? animals.find((a) => a.id === animalId) : null;
  const animalConditions = String(params.conditions || '').split(',').filter(Boolean);

  // Espaço do plano a preencher: 'dry' (seca) ou 'wet' (húmida).
  const slot = params.slot === 'wet' || params.slot === 'dry' ? params.slot : null;
  const [type, setType] = useState(slot || 'dry');
  const [onlyStage, setOnlyStage] = useState(!!stage && animalConditions.length === 0);
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState(''); // pesquisa feita (Enter / lupa)
  const [results, setResults] = useState({ key: '', groups: [], error: false });
  const [showHistory, setShowHistory] = useState(false);
  const [sizeSel, setSizeSel] = useState(null); // null = todos; número = kg; 'var' = vários tamanhos / sem peso
  const [scanning, setScanning] = useState(false);
  const [looking, setLooking] = useState(false);
  const [draft, setDraft] = useState(null); // ração a adicionar à mão (último recurso)

  // Opções com preço em todas as lojas: pesquisa livre (todas as lojas da web) ou sugestões para este animal.
  const key = `${submitted}|${species}|${type}|${onlyStage ? stage || '' : ''}|${animalConditions.join(',')}`;
  useEffect(() => {
    let alive = true;
    const load = submitted
      ? searchStores(submitted, { species, type })
      : fetchSuggestions({ species, type, stage: onlyStage ? stage : '', conditions: animalConditions }).then(groupResults);
    load
      .then((groups) => alive && setResults({ key, groups, error: false }))
      .catch(() => alive && setResults({ key, groups: [], error: true }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const loading = results.key !== key;
  const [sizeFor, setSizeFor] = useState(key);
  if (sizeFor !== key) {
    setSizeFor(key);
    setSizeSel(null);
  }

  // Histórico deste animal (as mais recentes primeiro), com a nota 👍/👎.
  const ids = animal ? planIds(animal, customProducts) : {};
  const seen = animal?.foodHistory || [];
  const current = [ids.dryId, ids.wetId].filter((id) => id && !seen.some((h) => h.productId === id)).map((id) => ({ productId: id, at: animal.updatedAt, rating: null, note: '' }));
  const history = [...seen, ...current]
    .map((h) => ({ ...h, product: findProduct(h.productId, customProducts) }))
    .filter((h) => h.product)
    .sort((a, b) => String(b.at).localeCompare(String(a.at)));
  const disliked = new Set(history.filter((h) => h.rating === 'down').map((h) => h.product.name.toLowerCase()));

  // Custo por dia para este animal: energia típica da ração → gramas por dia → €/kg.
  const options = (results.key === key ? results.groups : [])
    .filter((g) => !type || g.type === type)
    // Sem problemas de saúde na ficha: nada de dietas veterinárias (a não ser que se procure pelo nome).
    .filter((g) => animalConditions.length || submitted || !inferConditions(g.name).length)
    // Um cartão por loja: a mesma ração em duas lojas são dois cartões.
    .flatMap((g) => {
      const kcalKg = typicalKcalPerKg({ type: g.type, name: g.name, stage });
      const grams = kcal ? kcal / (kcalKg / 1000) : null;
      return g.offers.map((o) => {
        const perKg = o.perKg || (o.kg ? o.price / o.kg : null);
        return { ...g, offer: o, cardKey: `${g.key}|${o.store}`, perKg, kcalKg, perDay: grams && perKg ? (grams / 1000) * perKg : null };
      });
    })
    .sort((a, b) => (a.perDay ?? (a.perKg ? a.perKg / 30 : 1e9)) - (b.perDay ?? (b.perKg ? b.perKg / 30 : 1e9)));

  // Tamanhos dos sacos que existem nas opções (juntando os quase iguais, ±4%).
  const kgOf = (x) => (x.offer.kg > 0 && !x.offer.desde ? x.offer.kg : null);
  const near = (a, b) => Math.abs(a - b) / Math.max(a, b) <= 0.04;
  const sizes = [];
  let variousCount = 0;
  for (const x of options) {
    const k = kgOf(x);
    if (!k) {
      variousCount += 1;
      continue;
    }
    const found = sizes.find((sz) => near(sz.kg, k));
    if (found) found.count += 1;
    else sizes.push({ kg: k, count: 1 });
  }
  sizes.sort((a, b) => a.kg - b.kg);
  const shown = options.filter((x) => {
    if (sizeSel === null) return true;
    if (sizeSel === 'var') return !kgOf(x);
    const k = kgOf(x);
    return k && near(k, sizeSel);
  });
  const sizeText = (kg) => (kg >= 1 ? `${formatNumber(kg, kg % 1 ? 1 : 0)} kg` : `${formatNumber(kg * 1000)} g`);

  // Verifica se a ração serve para este animal (fase de vida e problemas de saúde). Se não, pergunta.
  const confirmFit = (p, proceed) => {
    const text = `${p.brand || ''} ${p.name} ${(p.tags || []).join(' ')}`;
    const pStages = p.stages?.length ? p.stages : inferStagesFor(text);
    const pConds = p.conditions?.length ? p.conditions : inferConditions(text);
    const labels = stagesFor(species, null);
    const lab = (id) => (labels.find((x) => x.id === id)?.label || id).toLowerCase();
    const issues = [];
    if (stage && pStages.length && pStages.length < 4 && !pStages.includes(stage)) {
      issues.push(`É para ${[...new Set(pStages.filter((x) => x !== 'mature' || !pStages.includes('senior')).map(lab))].join(' / ')} e ${who} é ${lab(stage)}.`);
    }
    const missing = animalConditions.filter((c) => !pConds.includes(c));
    if (missing.length) {
      const names = missing.map((c) => HEALTH_CONDITIONS.find((h) => h.id === c)?.label.toLowerCase() || c).join(' e ');
      issues.push(`Não é própria para problema ${names}, que ${who} tem.`);
    }
    if (disliked.has(String(p.name).toLowerCase())) issues.push(`Marcaste que ${who} não gostou desta.`);
    if (!issues.length) return proceed();
    Alert.alert('Esta ração pode não ser a indicada', `${p.name}\n\n• ${issues.join('\n• ')}\n\nQueres continuar na mesma?`, [
      { text: 'Escolher outra', style: 'cancel' },
      { text: 'Continuar', onPress: proceed },
    ]);
  };

  const finish = (id) => {
    if (animalId) recordFood(animalId, id);
    setPickedProductId(slot ? { id, slot } : id);
    router.back();
  };

  // Escolher uma opção: guarda a ração com os preços de todas as lojas onde a vimos.
  const pickGroup = (g) => {
    const existing = customProducts.find((p) => p.name.toLowerCase() === g.name.toLowerCase());
    if (existing) return confirmFit(existing, () => finish(existing.id));
    const text = `${g.brand || ''} ${g.name}`;
    confirmFit({ name: g.name, brand: g.brand, stages: inferStagesFor(text), conditions: inferConditions(text) }, async () => {
      // Energia do rótulo (energia metabolizável), se esta ração estiver na base aberta; senão fica a estimativa.
      setLooking(true);
      const label = await Promise.race([
        searchProducts(g.name).catch(() => []),
        new Promise((r) => setTimeout(() => r([]), 5000)),
      ]);
      setLooking(false);
      const real = label.find((p) => !p.kcalEstimated && p.kcalPerKg && sameProduct({ name: `${p.brand || ''} ${p.name}`, type: p.type }, { name: g.name, type: g.type }));
      const id = addCustomProduct({
        name: g.name,
        brand: g.brand || '',
        species,
        stages: inferStagesFor(text),
        conditions: inferConditions(text),
        type: g.type || type,
        kcalPerKg: real ? real.kcalPerKg : g.kcalKg,
        kcalEstimated: !real,
        ean: real?.ean || undefined,
        quantity: g.kg ? `${g.kg} kg` : '',
        imageUrl: g.image || null,
        tags: real ? [] : ['Energia estimada'],
        offers: [g.offer, ...g.offers.filter((o) => o !== g.offer)]
          .filter((o) => o && (o.kg || o.perKg))
          .map((o) => ({ store: o.store, kg: o.kg || (o.perKg ? o.price / o.perKg : null), price: o.price, link: o.link, origin: 'site' })),
        pricesUpdatedAt: new Date().toISOString(),
      });
      finish(id);
    });
  };

  const search = (text = query) => {
    const q = text.trim();
    setSubmitted(q.length >= 2 ? q : '');
  };

  // Código lido (ou escrito): procura o nome e mostra os preços dessa ração em todas as lojas.
  const onCode = async (code) => {
    setScanning(false);
    const known = findByEan(code, customProducts);
    if (known) return confirmFit(known, () => finish(known.id));
    setLooking(true);
    const found = await lookupBarcode(code).catch(() => null);
    setLooking(false);
    if (found) {
      const text = [found.brand, found.name].filter(Boolean).join(' ').replace(/\s+/g, ' ').slice(0, 70);
      setQuery(text);
      search(text);
    } else {
      Alert.alert('Não encontrámos esta ração', `O código ${code} não está na base de dados. Escreve o nome da ração na pesquisa.`, [
        { text: 'Adicionar à mão', onPress: () => setDraft({ ean: code, name: '', kcal: '' }) },
        { text: 'OK', style: 'cancel' },
      ]);
    }
  };

  if (scanning) return <Scanner onClose={() => setScanning(false)} onCode={onCode} />;

  const stageLabel = stage ? stagesFor(species, null).find((s) => s.id === stage)?.label : null;
  const condLabel = animalConditions.map((c) => HEALTH_CONDITIONS.find((h) => h.id === c)?.label.toLowerCase() || c).join(' e ');

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <BackButton />
        <Title size={24} style={{ flex: 1 }}>{params.name ? `Ração para ${params.name}` : 'Escolher ração'}</Title>
      </View>

      {looking ? (
        <View style={[ui.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
          <ActivityIndicator color={colors.navy} />
          <Body>Um momento…</Body>
        </View>
      ) : null}

      {draft ? (
        <AddProductForm
          initial={draft}
          species={species}
          stage={stage}
          onCancel={() => setDraft(null)}
          onSave={(p) => finish(addCustomProduct({ ...p, conditions: inferConditions(p.name).length ? inferConditions(p.name) : animalConditions }))}
        />
      ) : null}

      {/* Pesquisa */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Ionicons name="search" size={18} color={colors.textMuted} style={{ position: 'absolute', left: 14, zIndex: 1 }} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => search()}
            returnKeyType="search"
            placeholder="Procurar marca ou nome"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Procurar ração"
            style={[ui.input, { paddingLeft: 42, paddingRight: query ? 40 : 14 }]}
          />
          {query ? (
            <Pressable
              onPress={() => {
                setQuery('');
                setSubmitted('');
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Limpar pesquisa"
              style={{ position: 'absolute', right: 12 }}
            >
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          onPress={() => setScanning(true)}
          accessibilityRole="button"
          accessibilityLabel="Ler código de barras"
          style={({ pressed }) => ({ width: 50, height: 50, borderRadius: 12, backgroundColor: pressed ? colors.navyDark : colors.navy, alignItems: 'center', justifyContent: 'center' })}
        >
          <MaterialCommunityIcons name="barcode-scan" size={24} color={colors.white} />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {stageLabel ? <Chip label={stageLabel} active={onlyStage} onPress={() => setOnlyStage((v) => !v)} /> : null}
        <Chip label="Seca" active={type === 'dry'} onPress={() => setType('dry')} />
        <Chip label="Húmida" active={type === 'wet'} onPress={() => setType('wet')} />
      </View>
      {condLabel ? <Body muted size={12}>Só rações para problema {condLabel}, como está na ficha de {who}.</Body> : null}

      {/* Já experimentou (fechado; abre-se para ver) */}
      {history.length ? (
        <View style={[ui.card, { padding: 0, overflow: 'hidden' }]}>
          <Pressable
            onPress={() => setShowHistory((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showHistory }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, minHeight: 52 }}
          >
            <Ionicons name="time-outline" size={20} color={colors.navy} />
            <Text style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.text }}>
              Já experimentou ({history.length})
            </Text>
            <Ionicons name={showHistory ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
          </Pressable>
          {showHistory
            ? history.map((h) => (
                <HistoryRow
                  key={h.productId}
                  item={h}
                  onChoose={() => confirmFit(h.product, () => finish(h.product.id))}
                  onRate={(rating) => rateFood(animalId, h.productId, { rating: h.rating === rating ? null : rating })}
                  onNote={(note) => rateFood(animalId, h.productId, { note })}
                />
              ))
            : null}
        </View>
      ) : null}

      {/* Opções com preço, de todas as lojas */}
      <View style={{ gap: 2 }}>
        <Text style={{ fontFamily: fonts.displaySemi, fontSize: 19, color: colors.text }}>
          {submitted ? `Resultados para “${submitted}”` : `Opções para ${who}`}
        </Text>
        <Body muted size={13}>Da mais barata por dia para {who}, em todas as lojas. Toca para escolher; o ícone abre a loja.</Body>
      </View>

      {!loading && sizes.length > 1 ? (
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.text }}>Tamanho do saco</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
            <Chip label={`Todos (${options.length})`} active={sizeSel === null} onPress={() => setSizeSel(null)} />
            {sizes.map((sz) => (
              <Chip key={sz.kg} label={`${sizeText(sz.kg)} (${sz.count})`} active={typeof sizeSel === 'number' && near(sizeSel, sz.kg)} onPress={() => setSizeSel(sz.kg)} />
            ))}
            {variousCount ? <Chip label={`Vários tamanhos (${variousCount})`} active={sizeSel === 'var'} onPress={() => setSizeSel('var')} /> : null}
          </ScrollView>
        </View>
      ) : null}

      {loading ? (
        <View style={{ alignItems: 'center', gap: 10, paddingVertical: 24 }}>
          <ActivityIndicator color={colors.navy} />
          <Body muted size={14}>A ver os preços nas lojas…</Body>
        </View>
      ) : results.error ? (
        <Body muted>Não foi possível ver os preços agora. Confirma a internet e tenta outra vez.</Body>
      ) : shown.length === 0 ? (
        <Body muted>Não encontrámos opções{submitted ? ' com esse nome' : ''}. Experimenta só a marca, por exemplo “Royal Canin”.</Body>
      ) : (
        <View style={{ gap: 10 }}>
          {shown.slice(0, 40).map((g, i) => (
            <OptionCard
              key={g.cardKey}
              group={g}
              cheapest={i === 0 && g.perDay != null}
              disliked={disliked.has(g.name.toLowerCase())}
              onPress={() => pickGroup(g)}
            />
          ))}
        </View>
      )}

      <Pressable onPress={() => setDraft({ ean: '', name: query.trim(), kcal: '' })} accessibilityRole="button" style={{ alignSelf: 'center', padding: 10, minHeight: 44, justifyContent: 'center' }}>
        <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted }}>
          Não encontras? <Text style={{ fontFamily: fonts.semibold, color: colors.navy }}>Adicionar à mão</Text>
        </Text>
      </Pressable>
    </Screen>
  );
}

// Uma opção (uma loja): foto, nome, loja, tamanho e preço do saco; à direita o custo por dia.
// Tocar no cartão escolhe a ração; o ícone abre a página da loja.
function OptionCard({ group, cheapest, disliked, onPress }) {
  const o = group.offer;
  const size = o.kg && !o.desde ? `${formatNumber(o.kg, o.kg % 1 ? 1 : 0)} kg` : 'vários tamanhos';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Escolher ${group.name} da ${o.store}`}
      style={({ pressed }) => [ui.card, { padding: 12, opacity: disliked ? 0.6 : 1 }, pressed && { backgroundColor: colors.bg }, cheapest && { borderColor: colors.coral }]}
    >
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <View style={{ width: 60, height: 60, borderRadius: 10, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {group.image ? <Image source={{ uri: group.image }} style={{ width: 56, height: 56 }} resizeMode="contain" /> : <Ionicons name="image-outline" size={22} color={colors.textMuted} />}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          {cheapest || disliked ? (
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {cheapest ? <Tag text="Mais barata" /> : null}
              {disliked ? <Tag text="Não gostou" muted /> : null}
            </View>
          ) : null}
          <Text numberOfLines={2} style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.text }}>{group.name}</Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted }}>
            <Text style={{ fontFamily: fonts.semibold, color: colors.text }}>{o.store}</Text> · {size} · {o.desde ? 'desde ' : ''}
            <Text style={{ fontFamily: fonts.semibold, color: colors.text }}>{formatEuro(o.price)}</Text>
            {o.portes ? ` · ${o.portes}` : ''}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 18, color: colors.coralDark }}>
              {group.perDay != null ? formatEuro(group.perDay) : group.perKg ? formatEuro(group.perKg) : '—'}
            </Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted }}>{group.perDay != null ? 'por dia' : 'por kg'}</Text>
          </View>
          {o.link ? (
            <Pressable onPress={() => Linking.openURL(o.link).catch(() => {})} hitSlop={10} accessibilityRole="link" accessibilityLabel={`Abrir na ${o.store}`}>
              <Ionicons name="open-outline" size={18} color={colors.navy} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function Tag({ text, muted }) {
  return (
    <Text style={{ fontFamily: fonts.semibold, fontSize: 11, color: muted ? colors.textMuted : colors.coralTintText, backgroundColor: muted ? colors.segmentBg : colors.coralTint, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' }}>
      {text}
    </Text>
  );
}

// Uma ração que o animal já comeu: escolher outra vez, 👍/👎 e uma nota.
function HistoryRow({ item, onChoose, onRate, onNote }) {
  const [note, setNote] = useState(item.note || '');
  const p = item.product;
  const offer = cheapestOffer(p);
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: colors.border, padding: 12, gap: 8, opacity: item.rating === 'down' ? 0.7 : 1 }}>
      <Pressable onPress={onChoose} accessibilityRole="button" accessibilityLabel={`Escolher outra vez ${p.name}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <ProductThumb product={p} size={44} />
        <View style={{ flex: 1 }}>
          <Text numberOfLines={2} style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.text }}>{p.name}</Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted }}>
            {offer ? `${offer.store} · ${formatEuro(offer.price)}` : 'sem preço'}
            {item.at ? ` · ${new Date(item.at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}` : ''}
          </Text>
        </View>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.navy }}>Escolher</Text>
      </Pressable>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {[
          { id: 'up', icon: 'thumbs-up', label: 'Gostou' },
          { id: 'down', icon: 'thumbs-down', label: 'Não gostou' },
        ].map((r) => {
          const on = item.rating === r.id;
          return (
            <Pressable
              key={r.id}
              onPress={() => onRate(r.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, minHeight: 36, borderRadius: 18, borderWidth: 1, borderColor: on ? colors.navy : colors.borderStrong, backgroundColor: on ? colors.coralTint : colors.card }}
            >
              <Ionicons name={on ? r.icon : `${r.icon}-outline`} size={14} color={colors.navy} />
              <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.navy }}>{r.label}</Text>
            </Pressable>
          );
        })}
        <TextInput
          value={note}
          onChangeText={setNote}
          onEndEditing={() => note !== (item.note || '') && onNote(note.trim())}
          placeholder="Nota (ex.: vomitou)"
          placeholderTextColor={colors.textMuted}
          maxLength={80}
          returnKeyType="done"
          accessibilityLabel="Nota sobre esta ração"
          style={{ flex: 1, minHeight: 36, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, fontFamily: fonts.regular, fontSize: 13, color: colors.text, backgroundColor: colors.card }}
        />
      </View>
    </View>
  );
}

function ProductThumb({ product, size = 60 }) {
  if (product.imageUrl) {
    return <Image source={{ uri: product.imageUrl }} resizeMode="contain" style={{ width: size, height: size + 8, borderRadius: 12, backgroundColor: colors.white }} accessibilityLabel={`Foto de ${product.name}`} />;
  }
  return (
    <View style={{ width: size, height: size + 8, borderRadius: 12, backgroundColor: colors.bg, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.dashed, alignItems: 'center', justifyContent: 'center' }}>
      <MaterialCommunityIcons name={product.type === 'wet' ? 'food-variant' : 'sack'} size={28} color="#B8A9A6" />
    </View>
  );
}

function AddProductForm({ initial, species, stage, onCancel, onSave }) {
  const [f, setF] = useState({ name: initial.name || '', kcal: initial.kcal || '', store: '', kg: '', price: '' });
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const fromBarcode = !!initial.imageUrl || (!!initial.ean && !!initial.name);

  const save = () => {
    const kcalPerKg = parseNumber(f.kcal);
    if (!f.name.trim() || !kcalPerKg || kcalPerKg < 500 || kcalPerKg > 6000) {
      Alert.alert('Falta informação', 'Indica o nome e a energia (kcal/kg) que vem no rótulo.');
      return;
    }
    const kg = parseNumber(f.kg);
    const price = parseNumber(f.price);
    onSave({
      name: f.name.trim(),
      brand: initial.brand || '',
      species,
      stages: stage ? [stage] : [],
      type: kcalPerKg < 2000 ? 'wet' : 'dry',
      kcalPerKg,
      ean: initial.ean || null,
      imageUrl: initial.imageUrl || null,
      tags: [],
      offers: f.store.trim() && kg > 0 && price > 0 ? [{ store: f.store.trim(), kg, price }] : [],
    });
  };

  const searchPrices = () => {
    const q = [initial.brand && !f.name.toLowerCase().includes(initial.brand.toLowerCase()) ? initial.brand : '', f.name, initial.quantity].filter(Boolean).join(' ');
    Linking.openURL(priceSearchUrl(q || f.name)).catch(() => {});
  };

  return (
    <View style={[ui.card, { gap: 12, borderColor: colors.navy, borderWidth: 1.5 }]}>
      {fromBarcode ? (
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <ProductThumb product={{ name: f.name, imageUrl: initial.imageUrl }} size={64} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.coralDark }}>ENCONTRADA PELO CÓDIGO DE BARRAS</Text>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.text, marginTop: 2 }}>{f.name}</Text>
            <Body muted size={12}>{[initial.brand, initial.quantity].filter(Boolean).join(' · ')}</Body>
          </View>
        </View>
      ) : (
        <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.text }}>Nova ração</Text>
      )}

      <Field label="Nome" value={f.name} onChangeText={(name) => set({ name })} placeholder="Marca e variedade" />
      <Field
        label={initial.kcalPerKg ? 'Energia (kcal/kg)' : 'Energia (kcal/kg, vem no rótulo)'}
        value={f.kcal}
        onChangeText={(kcal) => set({ kcal })}
        placeholder="ex.: 3800"
        keyboardType="number-pad"
      />
      {fromBarcode && !initial.kcalPerKg ? <Body muted size={12}>A base de dados não tem a energia desta ração. Vê no saco, em “Energia metabolizável”.</Body> : null}

      <View style={{ backgroundColor: colors.bg, borderRadius: 12, padding: 12, gap: 10 }}>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.text }}>Onde está mais barata?</Text>
        <Button variant="secondary" icon="storefront-outline" title="Procurar preços nas lojas" onPress={searchPrices} disabled={!f.name.trim()} />
        <Body muted size={12}>Abre uma pesquisa de preços. Depois escreve aqui o melhor que encontraste (sem portes).</Body>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Field style={{ flex: 1.4 }} label="Loja" value={f.store} onChangeText={(store) => set({ store })} placeholder="Continente" />
          <Field style={{ flex: 1 }} label="Saco (kg)" value={f.kg} onChangeText={(kg) => set({ kg })} placeholder="2" keyboardType="decimal-pad" />
          <Field style={{ flex: 1 }} label="Preço (€)" value={f.price} onChangeText={(price) => set({ price })} placeholder="10,99" keyboardType="decimal-pad" />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button variant="outline" title="Cancelar" onPress={onCancel} style={{ flex: 1 }} />
        <Button title="Usar esta" onPress={save} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

// Leitor em ecrã inteiro (sem Modal, para funcionar bem em iOS e Android).
