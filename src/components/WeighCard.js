// ⚖️ Peso e corpo: como no veterinário, pesar a cada 2–4 semanas e ver a condição corporal.
// A dose ajusta-se sozinha ao peso e à condição.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { BODY_CONDITIONS, bodyCondition, formatNumber, parseNumber } from '../lib/nutrition';
import { colors, fonts } from '../theme';
import BodyConditionPicker from './BodyConditionPicker';
import { Body, Button, Card } from './ui';

export const WEIGH_EVERY_DAYS = 21;

export function lastWeighIn(animal) {
  const list = animal.weighIns || [];
  return list.length ? list[list.length - 1] : null;
}

export function daysSinceWeighIn(animal) {
  const last = lastWeighIn(animal);
  const at = last?.at || animal.createdAt || animal.updatedAt;
  if (!at) return null;
  return Math.floor((Date.now() - new Date(at).getTime()) / 86400000);
}

export default function WeighCard({ animal, onSave }) {
  const female = animal.sex === 'f';
  const [open, setOpen] = useState(false);
  const [kg, setKg] = useState('');
  const [bcs, setBcs] = useState(bodyCondition(animal));
  const list = animal.weighIns || [];
  const days = daysSinceWeighIn(animal);
  const due = days == null || days >= WEIGH_EVERY_DAYS;
  const first = list.length >= 2 ? list[0] : null;
  const diff = first ? Math.round((parseNumber(animal.weight) - first.kg) * 100) / 100 : null;
  const cond = BODY_CONDITIONS.find((b) => b.id === bodyCondition(animal));
  const condLabel = female ? cond.labelF : cond.label;

  const save = () => {
    const w = parseNumber(kg);
    if (!w || w <= 0 || w > 120) return;
    onSave({ kg: w, bcs });
    setOpen(false);
    setKg('');
  };

  return (
    <Card style={{ gap: 10, borderRadius: 16, ...(due ? { borderColor: colors.coral } : {}) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Ionicons name="scale-outline" size={22} color={colors.navy} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.text }}>
            {formatNumber(parseNumber(animal.weight), 1)} kg · {condLabel}
          </Text>
          <Body muted size={12}>
            {days == null ? 'Ainda sem pesagens' : days === 0 ? 'Pesado hoje' : `Última pesagem há ${days} ${days === 1 ? 'dia' : 'dias'}`}
            {diff != null && Math.abs(diff) >= 0.05 ? ` · ${diff > 0 ? '+' : ''}${formatNumber(diff, 1)} kg desde ${new Date(first.at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}` : ''}
          </Body>
        </View>
      </View>

      {due && !open ? (
        <Body size={13} style={{ color: colors.coralTintText }}>
          Está na hora de pesar {female ? 'a' : 'o'} {animal.name}. Os veterinários pesam a cada 2 a 4 semanas e ajustam a dose.
        </Body>
      ) : null}

      {open ? (
        <View style={{ gap: 10 }}>
          <Body muted size={12}>Dica: pesa-te com {female ? 'ela' : 'ele'} ao colo e tira o teu peso.</Body>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TextInput
              value={kg}
              onChangeText={setKg}
              placeholder={formatNumber(parseNumber(animal.weight), 1)}
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              autoFocus
              accessibilityLabel="Peso em kg"
              style={{ flex: 1, minHeight: 48, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12, paddingHorizontal: 12, fontFamily: fonts.regular, fontSize: 16, color: colors.text, backgroundColor: colors.card }}
            />
            <Text style={{ fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted }}>kg</Text>
          </View>
          <BodyConditionPicker label={`Como está o corpo ${female ? 'dela' : 'dele'}?`} species={animal.species} female={female} value={bcs} onChange={setBcs} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button variant="ghost" title="Cancelar" onPress={() => setOpen(false)} style={{ flex: 1 }} />
            <Button title="Guardar" onPress={save} disabled={!(parseNumber(kg) > 0)} style={{ flex: 1 }} />
          </View>
        </View>
      ) : (
        <Pressable onPress={() => setOpen(true)} accessibilityRole="button" style={{ alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center' }}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.navy }}>⚖️ Pesar agora</Text>
        </Pressable>
      )}
    </Card>
  );
}
