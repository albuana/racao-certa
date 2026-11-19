// Formulário para criar ou editar um animal.
// Parâmetros: species ('cat' | 'dog') para criar, id para editar.

import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import {
  Avatar,
  Body,
  Button,
  Field,
  Label,
  OptionGrid,
  Screen,
  Segmented,
  StepHeader,
  BackButton,
  Title,
} from '../../components/ui';
import BirthDateField from '../../components/BirthDateField';
import { findProduct } from '../../data/products';
import { choosePhoto } from '../../lib/photos';
import {
  DOG_SIZES,
  SPECIES,
  dailyKcal,
  describeAnimal,
  formatNumber,
  gramsPerDay,
  neuterQuestion,
  neuterYesLabel,
  parseNumber,
  monthsSince,
  stageFromAge,
  withAutoStage,
  stagesFor,
} from '../../lib/nutrition';
import { useStore } from '../../store/AppStore';
import { colors, fonts } from '../../theme';

export default function AnimalForm() {
  const params = useLocalSearchParams();
  const { animals, saveAnimal, customProducts, pickedProductId, setPickedProductId } = useStore();
  const editing = params.id ? animals.find((a) => a.id === params.id) : null;
  const onboarding = animals.length === 0;

  const [form, setForm] = useState(() =>
    editing
      ? { ...editing, weight: editing.weight != null ? String(editing.weight).replace('.', ',') : '' }
      : {
          species: params.species === 'dog' ? 'dog' : 'cat',
          name: '',
          weight: '',
          size: 'medium',
          birthDate: null,
          stage: 'adult',
          sex: 'f',
          neutered: true,
          active: false,
          goal: 'keep',
          meals: 2,
          productId: null,
          photoUri: null,
        }
  );
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const isDog = form.species === 'dog';
  const female = form.sex === 'f';

  // Quando se volta do seletor de ração, aplica a escolha.
  useFocusEffect(
    useCallback(() => {
      if (pickedProductId) {
        setForm((f) => ({ ...f, productId: pickedProductId }));
        setPickedProductId(null);
      }
    }, [pickedProductId, setPickedProductId])
  );

  // A idade (se for dada) escolhe a fase de vida automaticamente.
  // A data de nascimento (se for dada) escolhe a fase de vida automaticamente.
  const onBirth = (patch) => {
    const next = { ...form, ...patch };
    const auto = next.birthDate ? stageFromAge(next.species, next.size, monthsSince(next.birthDate)) : null;
    set({ ...patch, ...(auto ? { stage: auto } : {}) });
  };

  const stages = stagesFor(form.species, form.size);
  const animalForCalc = withAutoStage(form);
  const product = form.productId ? findProduct(form.productId, customProducts) : null;
  const kcal = dailyKcal(animalForCalc);
  const grams = product ? gramsPerDay(kcal, product.kcalPerKg) : null;
  const displayName = form.name.trim() || (isDog ? 'o teu cão' : 'o teu gato');

  const errors = useMemo(() => {
    const e = [];
    if (!form.name.trim()) e.push('o nome');
    const w = parseNumber(form.weight);
    if (!w || w <= 0 || w > 120) e.push('o peso');
    return e;
  }, [form.name, form.weight]);

  const save = () => {
    if (errors.length) {
      Alert.alert('Falta preencher', `Indica ${errors.join(' e ')}.`);
      return;
    }
    const id = saveAnimal({
      ...form,
      name: form.name.trim(),
      weight: parseNumber(form.weight),
      stage: animalForCalc.stage,
    });
    if (onboarding) router.replace('/inicio');
    else if (editing) router.back();
    else router.replace({ pathname: '/animal/[id]', params: { id } });
  };

  const openPicker = () =>
    router.push({
      pathname: '/racao',
      params: { species: form.species, stage: animalForCalc.stage, name: form.name.trim(), kcal: kcal ? String(Math.round(kcal)) : '' },
    });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen footer={<Button title={editing ? 'Guardar' : `Criar ${form.name.trim() || (isDog ? 'cão' : 'gato')}`} onPress={save} />}>
        {onboarding ? <StepHeader step={3} /> : <BackButton />}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Title size={28}>{editing ? `Editar ${editing.name}` : isDog ? 'O teu cão' : 'O teu gato'}</Title>
          <View style={{ backgroundColor: colors.coralTint, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.coralTintText }}>{SPECIES[form.species].label}</Text>
          </View>
        </View>

        {/* Foto */}
        <Pressable
          onPress={() => choosePhoto((uri) => set({ photoUri: uri }), form.photoUri ? () => set({ photoUri: null }) : undefined)}
          accessibilityRole="button"
          accessibilityLabel={form.photoUri ? 'Mudar foto' : 'Adicionar foto'}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
        >
          {form.photoUri ? (
            <Avatar animal={form} size={84} />
          ) : (
            <View style={{ width: 84, height: 84, borderRadius: 42, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.dashed, backgroundColor: colors.coralTint, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="camera-outline" size={30} color={colors.coralDark} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.text }}>{form.photoUri ? 'Mudar foto' : 'Adicionar foto'}</Text>
            <Body muted size={13}>Tira uma agora ou escolhe da galeria. É opcional.</Body>
          </View>
        </Pressable>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Field style={{ flex: 2 }} label="Nome" value={form.name} onChangeText={(name) => set({ name })} placeholder={isDog ? 'Bobi' : 'Luna'} maxLength={30} />
          <Field style={{ flex: 1 }} label="Peso (kg)" value={form.weight} onChangeText={(weight) => set({ weight })} placeholder="4,2" keyboardType="decimal-pad" />
        </View>

        {isDog ? (
          <OptionGrid
            label="Porte"
            value={form.size}
            onChange={(size) => onBirth({ size })}
            options={DOG_SIZES.map((s) => ({ value: s.id, label: s.label, hint: s.hint }))}
          />
        ) : null}

        <View>
          <BirthDateField
            value={form.birthDate}
            onChange={(birthDate) => onBirth({ birthDate })}
            stageName={stages.find((x) => x.id === animalForCalc.stage)?.label}
          />
          <View style={{ height: 14 }} />
          <OptionGrid
            label={form.birthDate ? 'Fase de vida (pela data de nascimento)' : 'Fase de vida'}
            disabled={!!form.birthDate}
            value={animalForCalc.stage}
            onChange={(stage) => set({ stage })}
            options={stages.map((s) => ({ value: s.id, label: s.label, hint: s.range }))}
          />
        </View>

        <Segmented
          label="Sexo"
          value={form.sex}
          onChange={(sex) => set({ sex })}
          options={[
            { value: 'm', label: 'Macho' },
            { value: 'f', label: 'Fêmea' },
          ]}
        />
        <Segmented
          label={neuterQuestion(form.sex)}
          value={form.neutered}
          onChange={(neutered) => set({ neutered })}
          options={[
            { value: true, label: neuterYesLabel(form.sex) },
            { value: false, label: 'Não' },
          ]}
        />
        <Segmented
          label={isDog ? 'Nível de atividade' : 'Estilo de vida'}
          value={form.active}
          onChange={(active) => set({ active })}
          options={isDog ? [{ value: false, label: 'Calmo' }, { value: true, label: 'Muito ativo' }] : [{ value: false, label: 'Interior' }, { value: true, label: 'Vai à rua' }]}
        />
        {animalForCalc.stage !== 'junior' ? (
          <Segmented
            label="Objetivo"
            value={form.goal}
            onChange={(goal) => set({ goal })}
            options={[
              { value: 'keep', label: 'Manter peso' },
              { value: 'lose', label: 'Perder peso' },
            ]}
          />
        ) : null}

        {/* Refeições por dia */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12, paddingVertical: 6, paddingRight: 6, paddingLeft: 14 }}>
          <Text style={{ fontFamily: fonts.regular, fontSize: 15, color: colors.text }}>Refeições por dia</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <StepperButton icon="remove" label="Menos uma refeição" onPress={() => set({ meals: Math.max(1, form.meals - 1) })} />
            <Text style={{ width: 28, textAlign: 'center', fontFamily: fonts.semibold, fontSize: 16, color: colors.text }}>{form.meals}</Text>
            <StepperButton icon="add" label="Mais uma refeição" onPress={() => set({ meals: Math.min(6, form.meals + 1) })} />
          </View>
        </View>

        {/* Ração */}
        <View>
          <Label>Ração</Label>
          <Pressable
            onPress={openPicker}
            accessibilityRole="button"
            accessibilityLabel={product ? `Ração: ${product.name}. Mudar` : 'Escolher ração'}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12, padding: 14 }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.regular, fontSize: 16, color: product ? colors.text : colors.textMuted }}>
                {product ? product.name : 'Escolher ração'}
              </Text>
              <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                {product ? `${formatNumber(product.kcalPerKg)} kcal/kg` : 'Pesquisa ou lê o código de barras'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Estimativa */}
        <View style={{ backgroundColor: colors.coralTint, borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.coralTintText }}>Estimativa para {displayName}</Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.coralTintText, marginTop: 2 }}>
              {[female ? 'Fêmea' : 'Macho', describeAnimal(animalForCalc)].filter(Boolean).join(' ')}
              {kcal ? ` · ≈ ${formatNumber(kcal)} kcal/dia` : ''}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 26, color: colors.coralDark }}>
              {grams ? `${formatNumber(grams)} g` : kcal ? `${formatNumber(kcal)} kcal` : '—'}
            </Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.coralTintText }}>
              {grams ? `${formatNumber(grams / form.meals)} g × ${form.meals}` : kcal ? 'escolhe a ração' : 'indica o peso'}
            </Text>
          </View>
        </View>
        <Body muted size={12} style={{ textAlign: 'center' }}>Estimativa de referência. Confirma com o teu veterinário.</Body>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function StepperButton({ icon, label, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 10, backgroundColor: pressed ? colors.coralTint : colors.bg, alignItems: 'center', justifyContent: 'center' })}
    >
      <Ionicons name={icon} size={20} color={colors.text} />
    </Pressable>
  );
}
