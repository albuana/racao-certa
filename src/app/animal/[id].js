import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import FeedingPlan from '../../components/FeedingPlan';
import WeighCard from '../../components/WeighCard';
import { Avatar, BackButton, Body, Button, Card, Screen, Title } from '../../components/ui';
import { animalStats, planIds } from '../../lib/household';
import { feedingGuide, isOther } from '../../lib/otherAnimals';
import { ageText, conditionLabel, describeAnimal, doseLooksHigh, speciesWord, formatEuro, formatNumber, neuterYesLabel, stageLabel, withAutoStage } from '../../lib/nutrition';
import { fitIssues } from '../../lib/fit';
import { findProduct } from '../../data/products';
import { fetchLivePrices, livePricesEnabled, pricesAreStale } from '../../lib/prices';
import { useStore } from '../../store/AppStore';
import { colors, fonts } from '../../theme';

export default function AnimalDetail() {
  const { id } = useLocalSearchParams();
  const { animals, customProducts, saveAnimal, removeAnimal, openBag, updateProductOffers, updateProduct, pickedProductId, setPickedProductId } = useStore();
  const stored = animals.find((a) => a.id === id);
  // Ao voltar do seletor de ração, guarda a nova ração neste animal.
  useFocusEffect(
    useCallback(() => {
      if (pickedProductId && stored) {
        const pid = typeof pickedProductId === 'object' ? pickedProductId.id : pickedProductId;
        const picked = findProduct(pid, customProducts);
        const slot = typeof pickedProductId === 'object' ? pickedProductId.slot : picked?.type === 'wet' ? 'wet' : 'dry';
        const ids = planIds(stored, customProducts);
        saveAnimal({
          ...stored,
          productId: null,
          dryProductId: slot === 'dry' ? pid : ids.dryId,
          wetProductId: slot === 'wet' ? pid : ids.wetId,
        });
        setPickedProductId(null);
      }
    }, [pickedProductId, stored, saveAnimal, setPickedProductId, customProducts])
  );

  // Vai buscar os preços das rações do plano às lojas se ainda não os tiver (para mostrar o custo).
  const ids = stored ? planIds(stored, customProducts) : { dryId: null, wetId: null };
  useEffect(() => {
    let alive = true;
    for (const pid of [ids.dryId, ids.wetId]) {
      const p = pid ? findProduct(pid, customProducts) : null;
      if (!livePricesEnabled || !p?.custom || !pricesAreStale(p)) continue;
      fetchLivePrices(p)
        .then((r) => alive && updateProductOffers(p.id, r.offers, r.updatedAt))
        .catch(() => {});
    }
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.dryId, ids.wetId]);

  if (!stored) return <Redirect href="/inicio" />;
  const animal = withAutoStage(stored);

  const s = animalStats(animal, customProducts);
  const issueList = [s.dry?.product, s.wet?.product]
    .filter(Boolean)
    .map((p) => ({ product: p, issues: fitIssues(p, animal) }))
    .filter((x) => x.issues.length);
  const dryP = ids.dryId ? findProduct(ids.dryId, customProducts) : null;
  const wetP = ids.wetId ? findProduct(ids.wetId, customProducts) : null;
  const removeSlot = (slot) => saveAnimal({ ...stored, productId: null, dryProductId: slot === 'dry' ? null : ids.dryId, wetProductId: slot === 'wet' ? null : ids.wetId });
  const openPicker = (slot) =>
    router.push({
      pathname: '/racao',
      params: { slot: slot || (dryP ? 'wet' : 'dry'), animalId: animal.id, kind: animal.kind || '', species: animal.species, stage: animal.stage, conditions: (animal.conditions || []).join(','), name: animal.name, kcal: s.kcal ? String(Math.round(s.kcal)) : '' },
    });
  const other = isOther(animal);
  const guide = other ? feedingGuide(animal) : null;
  const chips = other ? [speciesWord(animal), animal.weight ? `${formatNumber(animal.weight, 1)} kg` : null, describeAnimal(animal)].filter(Boolean) : [
    `${formatNumber(animal.weight, 1)} kg`,
    animal.birthDate ? ageText(animal.ageMonths) : null,
    stageLabel(animal),
    speciesWord(animal),
    animal.neutered ? neuterYesLabel(animal.sex).replace('Sim, ', '').replace(/^./, (c) => c.toUpperCase()) : null,
    animal.species === 'dog' ? (animal.active ? 'Muito ativo' : 'Calmo') : animal.active ? 'Vai à rua' : 'Interior',
    animal.goal === 'lose' && animal.stage !== 'junior' ? 'Em dieta' : null,
    ...(animal.conditions || []).map(conditionLabel),
  ].filter(Boolean);

  const totalDays = animal.bag && s.dry ? (animal.bag.kg * 1000) / s.dry.grams : null;
  const fraction = totalDays && s.daysLeft != null ? Math.max(0, Math.min(1, s.daysLeft / totalDays)) : null;

  const askBag = () => {
    const sizes = [...new Set((s.dry?.product?.offers || []).map((o) => o.kg))].sort((a, b) => a - b).slice(0, 4);
    if (!sizes.length) sizes.push(1, 2, 3);
    Alert.alert('Abriste um saco novo?', 'Escolhe o tamanho para sabermos quando vai acabar.', [
      ...sizes.map((kg) => ({ text: `${formatNumber(kg, kg % 1 ? 1 : 0)} kg`, onPress: () => openBag(animal.id, kg) })),
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const confirmRemove = () =>
    Alert.alert(`Remover ${animal.name}?`, 'Não dá para desfazer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => {
          removeAnimal(animal.id);
          router.replace('/inicio');
        },
      },
    ]);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <BackButton />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View>
          <Avatar animal={animal} size={72} />
        </View>
        <View style={{ flex: 1 }}>
          <Title size={30}>{animal.name}</Title>
          <Pressable
            onPress={() => router.push({ pathname: '/animal/novo', params: { id: animal.id, ver: '1' } })}
            accessibilityRole="button"
            accessibilityLabel={`Ver a ficha de ${animal.name}`}
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}
          >
            {chips.map((c) => (
              <Text key={c} style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.text, backgroundColor: colors.card, borderColor: '#EED8D3', borderWidth: 1, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3, overflow: 'hidden' }}>
                {c}
              </Text>
            ))}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20, backgroundColor: colors.coralTint }}>
              <Ionicons name="eye-outline" size={14} color={colors.navy} />
              <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.navy }}>Ver ficha</Text>
            </View>
          </Pressable>
        </View>
      </View>

      {other ? (
        /* Outros animais: recomendação da espécie (não há fórmula de energia como nos cães e gatos) */
        <Card style={{ padding: 18, borderRadius: 20, gap: 8 }}>
          <Body muted size={13}>Quanto dar</Body>
          <Text style={{ fontFamily: fonts.display, fontSize: 26, color: colors.coralDark }}>{guide?.headline}</Text>
          {(guide?.lines || []).map((l) => (
            <Text key={l} style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.text, lineHeight: 20 }}>• {l}</Text>
          ))}
          <Body muted size={12}>Recomendação geral para a espécie. Confirma com um veterinário de exóticos.</Body>
        </Card>
      ) : (
      <>
      {/* Resumo do dia: calorias e custo do plano completo */}
      <Card style={{ padding: 18, borderRadius: 20, gap: 8 }}>
        <Body muted size={13}>Energia por dia</Body>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 44, color: colors.coralDark }}>{s.kcal ? `${formatNumber(s.kcal)} kcal` : '—'}</Text>
          {s.costDay != null ? (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 18, color: colors.text }}>{formatEuro(s.costDay)}/dia</Text>
              <Body muted size={12}>{formatEuro(s.costDay * 30)}/mês</Body>
            </View>
          ) : null}
        </View>
        <Body muted size={12}>
          {s.dry || s.wet ? 'As calorias dividem-se pelas rações do plano abaixo.' : 'Escolhe a ração seca e/ou húmida para saberes as quantidades.'}
          {(s.dry || s.wet) && s.costDay == null ? ' Ainda falta o preço de alguma ração.' : ''}
        </Body>
        {(s.dry && doseLooksHigh(s.dry.grams, animal.weight, 'dry', animal.stage)) || (s.wet && !s.dry && doseLooksHigh(s.wet.grams, animal.weight, 'wet', animal.stage)) ? (
          <Body size={13} style={{ color: colors.coralDark }}>Este valor parece alto. Confirma o peso ({formatNumber(animal.weight, 1)} kg) e a energia das rações.</Body>
        ) : null}
      </Card>

      <WeighCard
        animal={stored}
        onSave={({ kg, bcs }) => {
          const before = animalStats(stored, customProducts);
          const next = {
            ...stored,
            weight: kg,
            bcs,
            goal: bcs === 'over' ? 'lose' : 'keep',
            weighIns: [...(stored.weighIns || []), { at: new Date().toISOString(), kg, bcs }].slice(-60),
          };
          saveAnimal(next);
          const after = animalStats(next, customProducts);
          const b = before.dry?.grams;
          const a = after.dry?.grams;
          if (b && a && Math.abs(a - b) >= 1) {
            Alert.alert('Dose atualizada', `A ração seca de ${stored.name} passa de ${formatNumber(b)} g para ${formatNumber(a)} g por dia.`);
          }
        }}
      />

      </>
      )}

      {issueList.map(({ product, issues }) => (
        <View key={product.id} style={{ backgroundColor: colors.alertBg, borderColor: colors.alertBorder, borderWidth: 1, borderRadius: 14, padding: 12, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="warning-outline" size={18} color={colors.coralDark} />
            <Text style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: colors.text }}>{product.name} pode não ser a indicada</Text>
          </View>
          {issues.map((t) => (
            <Text key={t} style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.coralTintText }}>• {t}</Text>
          ))}
          <Pressable onPress={() => openPicker(product.type === 'wet' ? 'wet' : 'dry')} accessibilityRole="button" style={{ alignSelf: 'flex-start', backgroundColor: colors.text, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginTop: 4 }}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.white }}>Ver rações indicadas</Text>
          </Pressable>
        </View>
      ))}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.text }}>Alimentação</Text>
        {!other ? (
          <Pressable onPress={() => router.push({ pathname: '/animal/dieta', params: { id: animal.id } })} accessibilityRole="button" hitSlop={8} style={{ minHeight: 36, justifyContent: 'center' }}>
            <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.navy }}>
              {stored.diet === 'dry' ? 'Só seca' : stored.diet === 'wet' ? 'Só húmida' : stored.diet === 'mixed' ? 'Seca e húmida' : 'O que come?'} · mudar
            </Text>
          </Pressable>
        ) : null}
      </View>
      <FeedingPlan
        stats={s}
        products={{ dry: dryP, wet: wetP }}
        wetPerDay={stored.wetPerDay ?? 1}
        meals={s.meals}
        slotTitles={
          other
            ? { dry: 'Comida', wet: null }
            : stored.diet === 'dry'
              ? { dry: 'Ração seca', wet: wetP ? 'Comida húmida' : null }
              : stored.diet === 'wet'
                ? { dry: dryP ? 'Ração seca' : null, wet: 'Comida húmida' }
                : undefined
        }
        hideEnergy={other}
        onPick={openPicker}
        onEditKcal={(p, kcalPerKg) => updateProduct(p.id, { kcalPerKg, kcalEstimated: false, tags: (p.tags || []).filter((t) => t !== 'Energia estimada') })}
        onRemove={removeSlot}
        onWetChange={(n) => saveAnimal({ ...stored, wetPerDay: n })}
        onCompare={(p) => router.push({ pathname: '/comparar/[productId]', params: { productId: p.id } })}
      />

      {s.dry ? (
        <Card style={{ gap: 8, borderRadius: 16 }}>
          {animal.bag && fraction != null ? (
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Body size={13}>Saco de ração seca de {formatNumber(animal.bag.kg, animal.bag.kg % 1 ? 1 : 0)} kg</Body>
                <Body muted size={13}>{s.daysLeft === 0 ? 'deve ter acabado' : `dura mais ${s.daysLeft} ${s.daysLeft === 1 ? 'dia' : 'dias'}`}</Body>
              </View>
              <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' }}>
                <View style={{ width: `${Math.round(fraction * 100)}%`, height: 8, backgroundColor: fraction < 0.15 ? colors.coral : colors.navy, borderRadius: 4 }} />
              </View>
              <Pressable onPress={askBag} accessibilityRole="button" style={{ alignSelf: 'flex-start', paddingVertical: 8 }}>
                <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.navy }}>Abri um saco novo</Text>
              </Pressable>
            </View>
          ) : (
            <Button variant="outline" icon="bag-handle-outline" title="Abri um saco novo de ração seca" onPress={askBag} />
          )}
        </Card>
      ) : null}

      <Body muted size={12} style={{ textAlign: 'center' }}>Estimativa de referência. Confirma com o teu veterinário.</Body>
      <Button variant="ghost" title={`Remover ${animal.name}`} onPress={confirmRemove} />
    </Screen>
  );
}
