// Seletor de ração: pesquisa, código de barras (procura o produto real nas
// bases abertas), sugestões por custo/dia e adicionar à mão.
// Devolve a escolha ao formulário via store.pickedProductId.

import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton, Body, Button, Chip, Field, Screen, Segmented, Title, styles as ui } from '../components/ui';
import { findByEan, productsFor } from '../data/products';
import { ensureEnergy, inferConditions, inferStages, inferStagesFor, typicalKcalPerKg, lookupBarcode, priceSearchUrl, searchProducts } from '../lib/lookup';
import { HEALTH_CONDITIONS, cheapestOffer, costPerDay, formatEuro, formatNumber, gramsPerDay, parseNumber, pricePerKg, stagesFor } from '../lib/nutrition';
import { fetchLivePrices, fetchSuggestions, livePricesEnabled } from '../lib/prices';
import { useStore } from '../store/AppStore';
import { colors, fonts } from '../theme';

export default function RacaoPicker() {
  const params = useLocalSearchParams();
  const species = params.species === 'dog' ? 'dog' : 'cat';
  const stage = params.stage || null;
  const kcal = parseNumber(params.kcal);
  const name = params.name || (species === 'dog' ? 'o teu cão' : 'o teu gato');
  const { customProducts, setPickedProductId, addCustomProduct, updateProductOffers } = useStore();

  const [query, setQuery] = useState('');
  const animalConditions = String(params.conditions || '').split(',').filter(Boolean);
  const [conds, setConds] = useState(animalConditions); // problemas de saúde ativos no filtro
  const [onlyStage, setOnlyStage] = useState(!!stage && animalConditions.length === 0);
  // Espaço do plano a preencher: 'dry' (seca) ou 'wet' (húmida). Define o filtro inicial.
  const slot = params.slot === 'wet' || params.slot === 'dry' ? params.slot : null;
  const [type, setType] = useState(slot); // null | 'dry' | 'wet'
  const [sort, setSort] = useState('popular'); // 'popular' | 'cheapest'
  const [scanning, setScanning] = useState(false);
  const [looking, setLooking] = useState(false);
  const [draft, setDraft] = useState(null); // ração a adicionar à mão (último recurso)
  const [online, setOnline] = useState({ q: '', items: [] });
  const trimmed = query.trim();

  // Pesquisa na base aberta de rações enquanto se escreve (com pequena pausa).
  useEffect(() => {
    if (trimmed.length < 3) return undefined;
    let alive = true;
    const t = setTimeout(async () => {
      const items = await searchProducts(trimmed);
      if (alive) setOnline({ q: trimmed, items });
    }, 500);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [trimmed]);
  // Filtros de fase (Júnior, Sénior…) e tipo (Seca = grãos, Húmida) aplicam-se a tudo:
  // rações da app e resultados da pesquisa.
  const productConditions = (p) => (p.conditions?.length ? p.conditions : inferConditions(`${p.name} ${(p.tags || []).join(' ')}`));
  const matchesFilters = (p) => {
    if (conds.length) {
      // Dietas para problemas de saúde: a idade não conta.
      const pc = productConditions(p);
      if (!conds.every((c) => pc.includes(c))) return false;
    } else if (onlyStage && stage) {
      const st = p.stages?.length ? p.stages : inferStages(p.name);
      if (!st.includes(stage)) return false;
    }
    if (type && p.type !== type) return false;
    return true;
  };

  const onlineLoading = trimmed.length >= 3 && online.q !== trimmed;
  // Rações dos supermercados para este animal (fase, problema de saúde, seca/húmida).
  const [market, setMarket] = useState({ key: '', items: [] });
  const marketKey = `${species}|${type || 'dry'}|${conds.length ? '' : onlyStage ? stage || '' : ''}|${conds.join(',')}`;
  useEffect(() => {
    if (!livePricesEnabled) return undefined;
    let alive = true;
    const [sp, tp, st, cd] = marketKey.split('|');
    fetchSuggestions({ species: sp, type: tp, stage: st, conditions: cd ? cd.split(',') : [] })
      .then((items) => alive && setMarket({ key: marketKey, items }))
      .catch(() => alive && setMarket({ key: marketKey, items: [] }));
    return () => {
      alive = false;
    };
  }, [marketKey]);
  const marketLoading = livePricesEnabled && market.key !== marketKey;
  const marketItems = (market.key === marketKey ? market.items : [])
    .filter((m) => !trimmed || `${m.brand} ${m.name}`.toLowerCase().includes(trimmed.toLowerCase()))
    .map((m) => {
      const kcalKg = typicalKcalPerKg({ type: m.type || type || 'dry', name: m.name, stage });
      const g = kcal ? kcal / (kcalKg / 1000) : null;
      return { ...m, kcalPerKg: kcalKg, perDay: g ? (g / 1000) * m.perKg : null };
    });
  // "Todas": como os supermercados as mostram, alternando lojas. "Mais barata por dia": ordenadas pelo custo.
  if (sort === 'cheapest') marketItems.sort((a, b) => (a.perDay ?? a.perKg) - (b.perDay ?? b.perKg));
  else {
    const byStore = {};
    for (const m of marketItems) (byStore[m.store] ||= []).push(m);
    const queues = Object.values(byStore);
    marketItems.length = 0;
    while (queues.some((q) => q.length)) for (const q of queues) if (q.length) marketItems.push(q.shift());
  }

  // Verifica se a ração serve para este animal (fase de vida e problemas de saúde).
  // Se não servir, pergunta antes de continuar.
  const confirmFit = (p, proceed) => {
    const text = `${p.brand || ''} ${p.name} ${(p.tags || []).join(' ')}`;
    const pStages = p.stages?.length ? p.stages : inferStagesFor(text);
    const pConds = p.conditions?.length ? p.conditions : inferConditions(text);
    const who = params.name || (species === 'dog' ? 'o teu cão' : 'o teu gato');
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
    if (!issues.length) return proceed();
    Alert.alert('Esta ração pode não ser a indicada', `${p.name}\n\n• ${issues.join('\n• ')}\n\nQueres continuar na mesma?`, [
      { text: 'Escolher outra', style: 'cancel' },
      { text: 'Continuar', onPress: proceed },
    ]);
  };

  // Escolher uma ração vista num supermercado: guarda-a com esse preço.
  const pickMarket = (m) => {
    const name = m.brand && !m.name.toLowerCase().includes(m.brand.toLowerCase()) ? `${m.brand} ${m.name}` : m.name;
    const text = `${m.brand} ${m.name}`;
    confirmFit({ name, brand: m.brand, stages: inferStagesFor(text), conditions: inferConditions(text) }, () => addMarket(m, name, text));
  };
  const addMarket = (m, name, text) => {
    const id = addCustomProduct({
      name,
      brand: m.brand || '',
      species,
      stages: inferStagesFor(text),
      conditions: inferConditions(text),
      type: m.type || type || 'dry',
      kcalPerKg: m.kcalPerKg,
      kcalEstimated: true,
      quantity: `${m.kg} kg`,
      imageUrl: m.image || null,
      tags: ['Energia estimada'],
      offers: [{ store: m.store, kg: m.kg, price: m.price, link: m.link, origin: 'site' }],
      pricesUpdatedAt: null,
    });
    choose(id);
  };

  const onlineItems =
    online.q === trimmed
      ? online.items.filter((p) => !findByEan(p.ean, customProducts) && (!p.species || p.species === species) && matchesFilters(p)).slice(0, 12)
      : [];

  // Guarda um produto da base aberta como ração da app e escolhe-o.
  const pickOnline = (p) => {
    const existing = p.ean ? findByEan(p.ean, customProducts) : null;
    if (existing) return confirmFit(existing, () => choose(existing.id));
    confirmFit(p, () => addOnline(p));
  };
  const addOnline = (p) => {
    const id = addCustomProduct({
        name: p.name,
        brand: p.brand,
        species,
        stages: p.stages?.length ? p.stages : inferStagesFor(`${p.brand || ''} ${p.name}`),
        conditions: p.conditions?.length ? p.conditions : inferConditions(`${p.brand || ''} ${p.name}`),
        type: p.type,
        kcalPerKg: p.kcalPerKg,
        kcalEstimated: p.kcalEstimated,
        ean: p.ean,
        imageUrl: p.imageUrl,
        quantity: p.quantity,
        tags: p.kcalEstimated ? ['Energia estimada'] : [],
        offers: [],
    });
    // Vai buscar os preços das lojas em segundo plano (o custo aparece logo que chegarem).
    if (livePricesEnabled) {
      fetchLivePrices(p)
        .then((r) => updateProductOffers(id, r.offers, r.updatedAt))
        .catch((e) => console.warn('Preços indisponíveis', e?.message));
    }
    choose(id);
  };

  const stageLabel = stage ? stagesFor(species, null).find((s) => s.id === stage)?.label : null;

  const list = (() => {
    const q = query.trim().toLowerCase();
    let items = productsFor(species, customProducts).filter((p) => {
      if (q && !`${p.name} ${p.brand || ''}`.toLowerCase().includes(q)) return false;
      if (!matchesFilters(p)) return false;
      return true;
    });
    items = items.map((p) => {
      const offer = cheapestOffer(p);
      const grams = kcal ? gramsPerDay(kcal, p.kcalPerKg) : null;
      return { ...p, offer, perKg: pricePerKg(offer), perDay: costPerDay(grams, offer) };
    });
    if (sort === 'cheapest') {
      items.sort((a, b) => (a.perDay ?? a.perKg ?? Infinity) - (b.perDay ?? b.perKg ?? Infinity));
    }
    return items;
  })();

  const choose = (id) => {
    setPickedProductId(slot ? { id, slot } : id);
    router.back();
  };

  // Código lido (ou escrito): 1) catálogo da app, 2) bases abertas, 3) à mão.
  const onCode = async (code) => {
    setScanning(false);
    const known = findByEan(code, customProducts);
    if (known) return confirmFit(known, () => choose(known.id));
    setLooking(true);
    const found = await lookupBarcode(code);
    if (found) {
      // Tudo automático: nome, foto e energia (da base, de um produto semelhante ou típica).
      const complete = await ensureEnergy(found, stage);
      setLooking(false);
      pickOnline(complete);
    } else {
      setLooking(false);
      Alert.alert(
        'Não encontrámos esta ração',
        `O código ${code} ainda não está na base de dados. Escreve o nome da ração na pesquisa e escolhe-a da lista.`,
        [
          { text: 'Adicionar à mão', onPress: () => setDraft({ ean: code, name: '', kcal: '' }) },
          { text: 'OK', style: 'cancel' },
        ]
      );
    }
  };

  if (scanning) {
    return <Scanner onClose={() => setScanning(false)} onCode={onCode} />;
  }

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <BackButton />
        <Title size={24} style={{ flex: 1 }}>{params.name ? `Ração para ${params.name}` : 'Escolher ração'}</Title>
      </View>

      {looking ? (
        <View style={[ui.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
          <ActivityIndicator color={colors.navy} />
          <Body>A procurar o produto pelo código de barras…</Body>
        </View>
      ) : null}

      {draft ? (
        <AddProductForm
          initial={draft}
          species={species}
          stage={stage}
          onCancel={() => setDraft(null)}
          onSave={(p) => choose(addCustomProduct({ ...p, conditions: inferConditions(p.name).length ? inferConditions(p.name) : conds }))}
        />
      ) : null}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Ionicons name="search" size={18} color={colors.textMuted} style={{ position: 'absolute', left: 14, zIndex: 1 }} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Marca ou nome"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Pesquisar ração"
            style={[ui.input, { paddingLeft: 42 }]}
          />
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
        <Chip label="Seca (grãos)" active={type === 'dry'} onPress={() => setType((t) => (t === 'dry' ? null : 'dry'))} />
        <Chip label="Húmida" active={type === 'wet'} onPress={() => setType((t) => (t === 'wet' ? null : 'wet'))} />
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted }}>Problema de saúde</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
          {HEALTH_CONDITIONS.map((c) => {
            const on = conds.includes(c.id);
            return <Chip key={c.id} label={c.label} active={on} onPress={() => setConds((x) => (on ? x.filter((y) => y !== c.id) : [...x, c.id]))} />;
          })}
        </ScrollView>
        {conds.length ? <Body muted size={12}>Rações para {conds.map((c) => HEALTH_CONDITIONS.find((h) => h.id === c)?.label.toLowerCase()).join(' e ')}, para qualquer idade. Segue a indicação do veterinário.</Body> : null}
      </View>

      <Segmented
        value={sort}
        onChange={setSort}
        options={[
          { value: 'popular', label: 'Todas' },
          { value: 'cheapest', label: kcal ? 'Mais barata por dia' : 'Mais barata/kg' },
        ]}
      />
      {sort === 'cheapest' && kcal ? <Body muted size={13}>Custo diário para {name}, com a dose certa de cada ração.</Body> : null}

      <View style={{ gap: 10 }}>
        {list.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => confirmFit(p, () => choose(p.id))}
            accessibilityRole="button"
            accessibilityLabel={`Escolher ${p.name}`}
            style={({ pressed }) => [ui.card, { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 }, pressed && { backgroundColor: colors.bg }]}
          >
            <ProductThumb product={p} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.text }}>{p.name}</Text>
              <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                {formatNumber(p.kcalPerKg)} kcal/kg{p.tags?.length ? ` · ${p.tags.join(', ')}` : ''}{p.custom ? ' · adicionada por ti' : ''}
              </Text>
              {p.offer ? (
                <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 6 }}>
                  {sort === 'cheapest' && p.perDay != null ? (
                    <Text style={{ fontFamily: fonts.semibold, color: colors.coralDark }}>{formatEuro(p.perDay)}/dia</Text>
                  ) : (
                    <>desde <Text style={{ fontFamily: fonts.semibold, color: colors.text }}>{formatEuro(p.perKg)}/kg</Text>{p.offer.store ? ` em ${p.offer.store}` : ''}</>
                  )}
                </Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        ))}
        {list.length === 0 && !onlineLoading && onlineItems.length === 0 ? (
          <Body muted style={{ textAlign: 'center', paddingVertical: 20 }}>Nenhuma ração encontrada.</Body>
        ) : null}
      </View>

      {livePricesEnabled ? (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.text }}>Nos supermercados</Text>
            {marketLoading ? <ActivityIndicator size="small" color={colors.navy} /> : null}
          </View>
          <Body muted size={12}>
            {conds.length ? 'Rações para este problema de saúde' : onlyStage && stageLabel ? `Rações ${stageLabel.toLowerCase()}` : 'Rações'} {type === 'wet' ? 'húmidas' : 'secas'}{sort === 'cheapest' ? `, da mais barata por dia${kcal ? ` para ${name}` : ''}` : ' do Continente, Auchan e Pingo Doce'}. Toca para ver no site.
          </Body>
          {marketItems.slice(0, 15).map((m) => (
            <View key={`${m.store}-${m.name}-${m.kg}`} style={[ui.card, { padding: 10, gap: 10 }]}>
              {/* Tocar no produto abre a página do supermercado */}
              <Pressable
                onPress={() => m.link && Linking.openURL(m.link).catch(() => {})}
                disabled={!m.link}
                accessibilityRole="link"
                accessibilityLabel={`Ver ${m.name} no site do ${m.store}`}
                style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12 }, pressed && { opacity: 0.7 }]}
              >
                <ProductThumb product={{ name: m.name, imageUrl: m.image, type: m.type }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.text }}>{m.name}</Text>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                    {m.store} · {formatNumber(m.kg, m.kg % 1 ? 1 : 0)} kg · {formatEuro(m.price)} · {formatEuro(m.perKg)}/kg
                  </Text>
                  {m.perDay != null ? <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.coralDark, marginTop: 4 }}>{formatEuro(m.perDay)}/dia</Text> : null}
                </View>
                {m.link ? <Ionicons name="open-outline" size={18} color={colors.textMuted} /> : null}
              </Pressable>
              <Button variant="secondary" title="Escolher esta ração" onPress={() => pickMarket(m)} style={{ minHeight: 44 }} />
            </View>
          ))}
          {!marketLoading && marketItems.length === 0 ? (
            <Body muted size={13}>Não encontrámos rações destas nos supermercados online. Experimenta pesquisar pelo nome ou tirar um filtro.</Body>
          ) : null}
        </View>
      ) : null}

      {query.trim().length >= 3 ? (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted }}>Mais rações com este nome</Text>
            {onlineLoading ? <ActivityIndicator size="small" color={colors.navy} /> : null}
          </View>
          {onlineItems.map((p) => (
            <Pressable
              key={p.ean || p.name}
              onPress={() => pickOnline(p)}
              accessibilityRole="button"
              accessibilityLabel={`Escolher ${p.name}`}
              style={({ pressed }) => [ui.card, { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 }, pressed && { backgroundColor: colors.bg }]}
            >
              <ProductThumb product={p} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.text }}>{p.name}</Text>
                <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                  {[p.brand, p.quantity].filter(Boolean).join(' · ')}
                </Text>
                <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
                  {formatNumber(p.kcalPerKg)} kcal/kg{p.kcalEstimated ? ' (estimada pela composição)' : ''}
                </Text>
              </View>
              <Ionicons name="add-circle-outline" size={22} color={colors.navy} />
            </Pressable>
          ))}
          {!onlineLoading && onlineItems.length === 0 ? (
            <Body muted size={13}>Sem resultados na base de dados para “{query.trim()}”.</Body>
          ) : null}
        </View>
      ) : null}

      <Body muted size={12} style={{ textAlign: 'center' }}>Preços sem portes</Body>

      {!draft ? (
        <Button variant="ghost" icon="add-circle-outline" title="Não encontras? Adiciona à mão" onPress={() => setDraft({ name: '', kcal: '' })} />
      ) : null}
    </Screen>
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
function Scanner({ onClose, onCode }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [typed, setTyped] = useState('');
  const handled = useRef(false);

  const submitTyped = () => {
    const code = typed.replace(/\D/g, '');
    if (code.length >= 8) onCode(code);
    else Alert.alert('Código incompleto', 'Escreve os números por baixo das barras (8 a 13 dígitos).');
  };

  const typeBox = (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <TextInput
        value={typed}
        onChangeText={setTyped}
        placeholder="Ou escreve o código"
        placeholderTextColor={colors.textMuted}
        keyboardType="number-pad"
        returnKeyType="done"
        onSubmitEditing={submitTyped}
        maxLength={14}
        accessibilityLabel="Escrever código de barras"
        style={[ui.input, { flex: 1 }]}
      />
      <Button title="OK" onPress={submitTyped} style={{ paddingHorizontal: 18 }} />
    </View>
  );

  if (!permission) return <View style={{ flex: 1, backgroundColor: '#000' }} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 16, backgroundColor: colors.bg }}>
        <Title size={24}>Ler o código de barras</Title>
        <Body muted>Precisamos da câmara para ler o código de barras do saco.</Body>
        <Button
          title="Permitir câmara"
          onPress={async () => {
            const res = await requestPermission();
            if (!res.granted && !res.canAskAgain) {
              Alert.alert('Câmara bloqueada', 'Ativa a câmara para a Ração Certa (ou para o Expo Go) nas Definições do telemóvel.', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Abrir Definições', onPress: () => Linking.openSettings() },
              ]);
            }
          }}
        />
        {typeBox}
        <Button variant="ghost" title="Cancelar" onPress={onClose} />
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] }}
        onBarcodeScanned={({ data }) => {
          if (handled.current || !data) return;
          handled.current = true;
          onCode(String(data));
        }}
      />
      <SafeAreaView style={{ flex: 1, justifyContent: 'space-between', padding: 20 }}>
        {/* Topo: fechar e escrever o código (fica acima do teclado) */}
        <View style={{ gap: 10 }}>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar" style={{ alignSelf: 'flex-start', width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
          <View style={{ backgroundColor: 'rgba(255,246,244,0.95)', borderRadius: 14, padding: 10 }}>{typeBox}</View>
        </View>
        <View style={{ alignSelf: 'center', width: '85%', height: 160, borderWidth: 3, borderColor: colors.coral, borderRadius: 16 }} />
        <Text style={{ color: '#fff', fontFamily: fonts.semibold, fontSize: 15, textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.55)', padding: 10, borderRadius: 12, overflow: 'hidden' }}>
          Aponta para o código de barras do saco, com boa luz
        </Text>
      </SafeAreaView>
    </View>
  );
}
