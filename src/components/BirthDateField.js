// "Sabes a data de nascimento?" — escolhe a data e mostra a idade.
// Android: diálogo do sistema. iOS: roda numa janela com "Confirmar".

import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import { ageText, formatBirthDate, monthsSince, toISODate } from '../lib/nutrition';
import { colors, fonts } from '../theme';
import { Body, Button } from './ui';

function parseISO(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export default function BirthDateField({ value, onChange, stageName }) {
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const today = new Date();
  const minDate = new Date(today.getFullYear() - 30, 0, 1);
  const initial = parseISO(value) || new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initial,
        mode: 'date',
        maximumDate: today,
        minimumDate: minDate,
        onValueChange: (_, date) => {
          if (date) onChange(toISODate(date));
        },
      });
    } else {
      setDraft(initial);
      setIosOpen(true);
    }
  };

  const months = monthsSince(value);

  return (
    <View>
      {value ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12, padding: 12 }}>
          <Ionicons name="calendar-outline" size={22} color={colors.navy} />
          <Pressable style={{ flex: 1 }} onPress={open} accessibilityRole="button" accessibilityLabel={`Data de nascimento: ${formatBirthDate(value)}. Mudar`}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.text }}>Nasceu a {formatBirthDate(value)}</Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
              {ageText(months)}{stageName ? ` · fase ${stageName.toLowerCase()}` : ''}
            </Text>
          </Pressable>
          <Pressable onPress={() => onChange(null)} accessibilityRole="button" accessibilityLabel="Remover data de nascimento" hitSlop={8} style={{ padding: 6 }}>
            <Ionicons name="close-circle" size={22} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={open}
          accessibilityRole="button"
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.dashed, borderRadius: 12, padding: 12, backgroundColor: pressed ? colors.coralTint : 'transparent' })}
        >
          <Ionicons name="calendar-outline" size={22} color={colors.navy} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.navy }}>Sabes a data de nascimento?</Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 2 }}>Escolhemos a fase por ti (opcional).</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      )}

      {Platform.OS === 'ios' ? (
        <Modal visible={iosOpen} transparent animationType="slide" onRequestClose={() => setIosOpen(false)}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(46,42,42,0.4)' }} onPress={() => setIosOpen(false)} accessibilityLabel="Fechar" />
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 36, gap: 8 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 20, color: colors.text }}>Data de nascimento</Text>
            <Body muted size={13}>Se não souberes o dia certo, escolhe um aproximado.</Body>
            {draft ? (
              <DateTimePicker
                value={draft}
                mode="date"
                display="spinner"
                locale="pt-PT"
                maximumDate={today}
                minimumDate={minDate}
                themeVariant="light"
                textColor={colors.text}
                onValueChange={(_, d) => d && setDraft(d)}
              />
            ) : null}
            <Button
              title="Confirmar"
              onPress={() => {
                if (draft) onChange(toISODate(draft));
                setIosOpen(false);
              }}
            />
          </View>
        </Modal>
      ) : null}
    </View>
  );
}
