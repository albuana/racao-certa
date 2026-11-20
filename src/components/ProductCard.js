// Cartão de uma ração nos resultados: foto, nome, preço mais baixo (por saco ou por unidade) e loja.
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, Pressable, Text, View } from 'react-native';
import { formatEuro, formatNumber } from '../lib/nutrition';
import { savingPct } from '../lib/search';
import { colors, fonts } from '../theme';

export function sizeText(group) {
  if (group.type === 'wet' && group.pack) {
    return group.pack.count > 1 ? `${group.pack.count} × ${formatNumber(group.pack.unitG)} g` : `${formatNumber(group.pack.unitG)} g`;
  }
  if (group.kg) return group.kg >= 1 ? `${formatNumber(group.kg, Number.isInteger(group.kg) ? 0 : 1)} kg` : `${formatNumber(group.kg * 1000)} g`;
  return group.best?.desde ? 'vários tamanhos' : '';
}

export function priceLabel(group) {
  if (group.type === 'wet' && group.pack) return 'por lata/saqueta';
  return group.best?.desde ? 'o saco mais pequeno' : 'por saco';
}

export default function ProductCard({ group, favorite, onPress, onToggleFavorite }) {
  const best = group.best;
  const others = group.offers.length - 1;
  const pct = savingPct(group);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${group.name}, ${formatEuro(best.unitValue)} no ${best.store}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        gap: 12,
        padding: 12,
        borderRadius: 16,
        backgroundColor: pressed ? colors.bg : colors.card,
        borderWidth: 1,
        borderColor: colors.border,
      })}
    >
      <View style={{ width: 76, height: 76, borderRadius: 12, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {group.image ? (
          <Image source={{ uri: group.image }} style={{ width: 72, height: 72 }} resizeMode="contain" accessibilityIgnoresInvertColors />
        ) : (
          <Ionicons name="image-outline" size={26} color={colors.textMuted} />
        )}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={2} style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.text }}>
          {group.name}
        </Text>
        <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted }}>
          {[group.type === 'wet' ? 'Húmida' : 'Seca', sizeText(group)].filter(Boolean).join(' · ')}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
          {best.desde ? <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted }}>desde</Text> : null}
          <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.coralDark }}>{formatEuro(best.unitValue)}</Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted }}>{priceLabel(group)}</Text>
        </View>
        <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.text }}>
          {best.store}
          {others > 0 ? (
            <Text style={{ fontFamily: fonts.regular, color: colors.textMuted }}>
              {`  ·  +${others} ${others === 1 ? 'loja' : 'lojas'}`}
              {pct >= 5 ? `  ·  poupas até ${pct}%` : ''}
            </Text>
          ) : null}
        </Text>
      </View>
      {onToggleFavorite ? (
        <Pressable
          onPress={onToggleFavorite}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={favorite ? 'Tirar das favoritas' : 'Guardar nas favoritas'}
          style={{ padding: 4, alignSelf: 'flex-start' }}
        >
          <Ionicons name={favorite ? 'star' : 'star-outline'} size={22} color={favorite ? colors.coral : colors.textMuted} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}
