// Formulário para criar ou editar um animal.
// Parâmetros: species ('cat' | 'dog') para criar, id para editar.

import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Alert, KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import {
  Avatar,
  Body,
  Button,
  Chip,
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
import BodyConditionPicker from '../../components/BodyConditionPicker';
import { planIds } from '../../lib/household';
import { choosePhoto } from '../../lib/photos';
import {
  DOG_SIZES,
  bodyCondition,
  HEALTH_CONDITIONS,
  SPECIES,
  neuterQuestion,
  neuterYesLabel,
  parseNumber,
  recommendedMeals,
  monthsSince,
  stageFromAge,
  withAutoStage,
  stagesFor,
} from '../../lib/nutrition';
import { useStore } from '../../store/AppStore';
import { colors, fonts } from '../../theme';

export default function AnimalForm() {
  const params = useLocalSearchParams();
  const { animals, saveAnimal, customProducts } = useStore();
  const editing = params.id ? animals.find((a) => a.id === params.id) : null;
  const onboarding = animals.length === 0;

  const [form, setForm] = useState(() =>
    editing
      ? {
          ...editing,
          ...(() => {
            const ids = planIds(editing, customProducts);
            return { dryProductId: ids.dryId, wetProductId: ids.wetId, productId: null };
          })(),
          weight: editing.weight != null ? String(editing.weight).replace('.', ',') : '',
        }
      : {
          species: params.species === 'dog' ? 'dog' : 'cat',
          name: '',
          weight: '',
          size: 'medium',
          birthDate: null,
          conditions: [],
          stage: 'adult',
          sex: 'f',
          neutered: true,
          active: false,
          goal: 'keep',
          meals: 2,
          dryProductId: null,
          wetProductId: null,
          wetPerDay: 1,
          photoUri: null,
        }
  );
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  // Refeições: segue a recomendação (idade, porte) até a pessoa mudar à mão.
  const [mealsTouched, setMealsTouched] = useState(!!editing);
  // ?ver=1: a mesma ficha, só para ver (sem editar); "Editar" passa ao modo de edição.
  const [readOnly, setReadOnly] = useState(!!editing && params.ver === '1');
  const isDog = form.species === 'dog';
  const female = form.sex === 'f';

  // A idade (se for dada) escolhe a fase de vida automaticamente.
  // A data de nascimento (se for dada) escolhe a fase de vida automaticamente.
  const onBirth = (patch) => {
    const next = { ...form, ...patch };
    const auto = next.birthDate ? stageFromAge(next.species, next.size, monthsSince(next.birthDate)) : null;
    set({ ...patch, ...(auto ? { stage: auto } : {}) });
  };

  const stages = stagesFor(form.species, form.size);
  const animalForCalc = withAutoStage(form);
  const rec = recommendedMeals(form);
  const meals = mealsTouched ? form.meals : rec.value;

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
    const kgNow = parseNumber(form.weight);
    const prevKg = editing ? parseNumber(editing.weight) : null;
    const weighIns = !editing || Math.abs(kgNow - prevKg) >= 0.01
      ? [...(form.weighIns || []), { at: new Date().toISOString(), kg: kgNow, bcs: bodyCondition(form) }].slice(-60)
      : form.weighIns || [];
    const id = saveAnimal({
      ...form,
      weighIns,
      meals,
      createdAt: form.createdAt || new Date().toISOString(),
      name: form.name.trim(),
      weight: kgNow,
      stage: animalForCalc.stage,
      productId: null,
    });
    if (onboarding) finishOnboarding({ pathname: '/animal/[id]', params: { id } });
    else if (editing) router.back();
    else router.replace({ pathname: '/animal/[id]', params: { id } });
  };

  // Fim do início: limpa os ecrãs para trás (login, casa) para não se voltar a eles sem querer.
  const finishOnboarding = (to) => {
    if (router.canDismiss()) router.dismissAll();
    router.replace(to);
  };

  // Mudar entre gato e cão: o porte só existe nos cães e a fase volta a ser calculada.
  const setSpecies = (species) => onBirth({ species, size: form.size || 'medium' });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        footer={
          readOnly ? (
            <Button icon="create-outline" title={`Editar ficha`} onPress={() => setReadOnly(false)} />
          ) : (
          <View style={{ gap: 4 }}>
            <Button title={editing ? 'Guardar' : `Criar ${form.name.trim() || (isDog ? 'cão' : 'gato')}`} onPress={save} />
            {onboarding ? <Button variant="ghost" title="Saltar por agora" onPress={() => finishOnboarding('/procurar')} /> : null}
          </View>
          )
        }
      >
        {onboarding ? (
          <StepHeader step={2} total={2} onBack={() => (router.canGoBack() ? router.back() : router.replace('/casa'))} />
        ) : (
          <BackButton />
        )}

        <View style={{ gap: 4 }}>
          <Title size={28}>{readOnly ? `Ficha de ${editing.name}` : editing ? `Editar ${editing.name}` : onboarding ? 'Adiciona um animal' : 'Novo animal'}</Title>
          {onboarding ? (
            <Body muted size={14}>Assim calculamos quanto deve comer e avisamos quando a ração está a acabar.</Body>
          ) : null}
        </View>

        <View pointerEvents={readOnly ? 'none' : 'auto'} style={{ gap: 16 }}>
        {/* Gato ou cão (só ao criar) */}
        {!editing ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[
              { id: 'cat', icon: 'cat' },
              { id: 'dog', icon: 'dog' },
            ].map((o) => {
              const on = form.species === o.id;
              return (
                <Pressable
                  key={o.id}
                  onPress={() => setSpecies(o.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={SPECIES[o.id].label}
                  style={{ flex: 1, minHeight: 64, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: on ? colors.coralTint : colors.card, borderWidth: on ? 2 : 1, borderColor: on ? colors.navy : colors.borderStrong }}
                >
                  <MaterialCommunityIcons name={o.icon} size={30} color={on ? colors.navy : colors.text} />
                  <Text style={{ fontFamily: fonts.display, fontSize: 18, color: on ? colors.navy : colors.text }}>{SPECIES[o.id].label}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {/* Foto (no modo ver, só a foto) */}
        {readOnly ? (
          <Avatar animal={form} size={84} />
        ) : (
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
        )}

        <SectionTitle>Nome e peso</SectionTitle>
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

        <SectionTitle>Idade</SectionTitle>
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

        <SectionTitle>Dia a dia</SectionTitle>
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
        {/* Condição corporal: é assim que o veterinário ajusta a dose */}
        <BodyConditionPicker
          label={`Como está o corpo ${female ? 'dela' : 'dele'}?`}
          species={form.species}
          female={female}
          value={bodyCondition(form)}
          onChange={(bcs) => set({ bcs, goal: bcs === 'over' ? 'lose' : 'keep' })}
        />
        {bodyCondition(form) === 'over' && animalForCalc.stage === 'junior' ? (
          <Body muted size={12}>Nos júnior não se corta a comida: fala com o veterinário sobre o peso.</Body>
        ) : null}

        {/* Problemas de saúde */}
        <SectionTitle>Saúde</SectionTitle>
        <View>
          <Label>Problemas de saúde (opcional)</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {HEALTH_CONDITIONS.map((c) => {
              const on = (form.conditions || []).includes(c.id);
              return (
                <Chip
                  key={c.id}
                  label={c.label}
                  active={on}
                  onPress={() => set({ conditions: on ? form.conditions.filter((x) => x !== c.id) : [...(form.conditions || []), c.id] })}
                />
              );
            })}
          </View>
          {(form.conditions || []).length ? (
            <Body muted size={12} style={{ marginTop: 8 }}>Vamos mostrar primeiro as rações próprias para isto. Segue sempre a dieta indicada pelo veterinário.</Body>
          ) : null}
        </View>

        {/* Refeições por dia (recomendação ao lado, como curiosidade) */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12, paddingVertical: 6, paddingRight: 6, paddingLeft: 14 }}>
          <Text style={{ fontFamily: fonts.regular, fontSize: 15, color: colors.text }}>Refeições por dia</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <StepperButton icon="remove" label="Menos uma refeição" onPress={() => { setMealsTouched(true); set({ meals: Math.max(1, meals - 1) }); }} />
            <Text style={{ width: 28, textAlign: 'center', fontFamily: fonts.semibold, fontSize: 16, color: colors.text }}>{meals}</Text>
            <StepperButton icon="add" label="Mais uma refeição" onPress={() => { setMealsTouched(true); set({ meals: Math.min(6, meals + 1) }); }} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, backgroundColor: colors.coralTint, borderRadius: 12, padding: 12, marginTop: -6 }}>
          <Text style={{ fontSize: 15 }}>💡</Text>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.coralTintText }}>
              {rec.reason}
            </Text>
            {meals < rec.min || meals > rec.max ? (
              <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.coralTintText }}>
                Escolheste {meals}. A quantidade do dia é a mesma; só muda a forma como se divide.
              </Text>
            ) : null}
          </View>
        </View>

        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function SectionTitle({ children }) {
  return (
    <Text style={{ fontFamily: fonts.displaySemi, fontSize: 18, color: colors.text, marginTop: 8, marginBottom: -4 }} accessibilityRole="header">
      {children}
    </Text>
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
