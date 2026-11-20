// Nome da casa: "Casa" fica fixo e só se escreve o resto (ex.: Casa · Alba).
import { Text, TextInput, View } from 'react-native';
import { colors, fonts } from '../theme';
import { Label } from './ui';

// "Casa Alba" → "Alba"; "Alba" → "Alba".
export function housePart(name = '') {
  return String(name).replace(/^\s*casa\s+/i, '').trim();
}

// "Alba" → "Casa Alba".
export function houseFull(part = '') {
  const p = housePart(part);
  return p ? `Casa ${p}` : '';
}

export default function HouseNameInput({ value, onChangeText, autoFocus, placeholder = 'da Rita', onSubmitEditing }) {
  return (
    <View>
      <Label>Nome da casa</Label>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.text }}>Casa</Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          autoFocus={autoFocus}
          maxLength={34}
          returnKeyType="done"
          onSubmitEditing={onSubmitEditing}
          accessibilityLabel="Nome da casa, depois de Casa"
          style={{ flex: 1, minHeight: 52, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12, backgroundColor: colors.card, paddingHorizontal: 14, fontFamily: fonts.semibold, fontSize: 16, color: colors.text }}
        />
      </View>
    </View>
  );
}
