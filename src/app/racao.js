// Seletor de ração: pesquisa, código de barras (procura o produto real nas
// bases abertas), sugestões por custo/dia e adicionar à mão.
// Devolve a escolha ao formulário via store.pickedProductId.

import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton, Body, Button, Chip, Field, Screen, Segmented, Title, styles as ui } from '../components/ui';
import { DEMO_PRICES_NOTICE, findByEan, productsFor } from '../data/products';
import { lookupBarcode, priceSearchUrl } from '../lib/lookup';
import { cheapestOffer, costPerDay, formatEuro, formatNumber, gramsPerDay, parseNumber, pricePerKg, stagesFor } from '../lib/nutrition';
import { useStore } from '../store/AppStore';
import { colors, fonts } from '../theme';

export default function RacaoPicker() {
  const params = useLocalSearchParams();
  const species = params.species === 'dog' ? 'dog' : 'cat';
  const stage = params.stage || null;
  const kcal = parseNumber(params.kcal);
  const name = params.name || (species === 'dog' ? 'o teu cão' : 'o teu gato');
  const { customProducts, setPickedProductId, addCustomProduct } = useStore();

  const [query, setQuery] = useState('');
  const [onlyStage, setOnlyStage] = useState(!!stage);
  const [type, setType] = useState(null); // null | 'dry' | 'wet'
  const [sort, setSort] = useState('popular'); // 'popular' | 'cheapest'
  const [scanning, setScanning] = useState(false);
  const [looking, setLooking] = useState(false);
  const [draft, setDraft] = useState(null); // ração a adicionar (vazia ou vinda do código de barras)

  const stageLabel = stage ? stagesFor(species, null).find((s) => s.id === stage)?.label : null;

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    let items = productsFor(species, customProducts).filter((p) => {
      if (q && !`${p.name} ${p.brand || ''}`.toLowerCase().includes(q)) return false;
      if (onlyStage && stage && p.stages?.length && !p.stages.includes(stage)) return false;
      if (type && p.type !== type) return false;
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
  }, [species, customProducts, query, onlyStage, stage, type, sort, kcal]);

  const choose = (id) => {
    setPickedProductId(id);
    router.back();
  };

  // Código lido (ou escrito): 1) catálogo da app, 2) bases abertas, 3) à mão.
  const onCode = async (code) => {
    setScanning(false);
    const known = findByEan(code, customProducts);
    if (known) return choose(known.id);
    setLooking(true);
    const found = await lookupBarcode(code);
    setLooking(false);
    if (found) {
      setDraft({ ...found, kcal: found.kcalPerKg ? String(found.kcalPerKg) : '' });
    } else {
      Alert.alert(
        'Não encontrámos esta ração',
        `O código ${code} não está nas bases de dados. Podes adicioná-la com o nome e as kcal/kg do rótulo.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Adicionar à mão', onPress: () => setDraft({ ean: code, name: '', kcal: '' }) },
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
          onSave={(p) => choose(addCustomProduct(p))}
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
        <Chip label="Seca" active={type === 'dry'} onPress={() => setType((t) => (t === 'dry' ? null : 'dry'))} />
        <Chip label="Húmida" active={type === 'wet'} onPress={() => setType((t) => (t === 'wet' ? null : 'wet'))} />
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
            onPress={() => choose(p.id)}
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
        {list.length === 0 ? <Body muted style={{ textAlign: 'center', paddingVertical: 20 }}>Nenhuma ração encontrada.</Body> : null}
      </View>

      <Body muted size={12} style={{ textAlign: 'center' }}>{DEMO_PRICES_NOTICE}</Body>

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
        placeholder="3800"
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
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar" style={{ alignSelf: 'flex-start', width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="close" size={24} color="#fff" />
        </Pressable>
        <View style={{ alignSelf: 'center', width: '85%', height: 160, borderWidth: 3, borderColor: colors.coral, borderRadius: 16 }} />
        <View style={{ gap: 10 }}>
          <Text style={{ color: '#fff', fontFamily: fonts.semibold, fontSize: 15, textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.55)', padding: 10, borderRadius: 12, overflow: 'hidden' }}>
            Aponta para o código de barras do saco, com boa luz
          </Text>
          <View style={{ backgroundColor: 'rgba(255,246,244,0.95)', borderRadius: 14, padding: 10 }}>{typeBox}</View>
        </View>
      </SafeAreaView>
    </View>
  );
}
