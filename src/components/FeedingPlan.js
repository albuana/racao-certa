// Plano de alimentação: um espaço para ração SECA e outro para HÚMIDA.
// A húmida conta-se em saquetas/latas por dia; a seca completa as calorias.

import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Image, Pressable, Text, TextInput, View } from 'react-native';
import { formatEuro, formatNumber, parseNumber } from '../lib/nutrition';
import { colors, fonts } from '../theme';
import { Body } from './ui';

function Thumb({ product }) {
  const uri = product?.imageUrl || (product?.offers || []).find((o) => o.image)?.image;
  if (uri) return <Image source={{ uri }} resizeMode="contain" style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: colors.white }} accessibilityLabel={`Foto de ${product.name}`} />;
  return (
    <View style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="nutrition-outline" size={20} color={colors.textMuted} />
    </View>
  );
}

// Energia da ração: estimada até a pessoa a confirmar com o rótulo ("Energia metabolizável", em kcal/kg).
function EnergyLine({ product, onEditKcal }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  if (!onEditKcal) {
    return (
      <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
        {formatNumber(product.kcalPerKg)} kcal/kg{product.kcalEstimated ? ' (estimada)' : ''}
      </Text>
    );
  }
  if (editing) {
    const save = () => {
      let n = parseNumber(value);
      if (n && n < 10) n *= 1000; // escreveu 3,9 (kcal/g)
      if (n && n < 100) n *= 10; // escreveu 390 (kcal/100 g)
      if (n >= 500 && n <= 6000) onEditKcal(product, Math.round(n));
      setEditing(false);
    };
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder="ex.: 3900"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          autoFocus
          returnKeyType="done"
          onSubmitEditing={save}
          accessibilityLabel="Energia metabolizável do rótulo, em kcal por kg"
          style={{ flex: 1, minHeight: 36, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 8, paddingHorizontal: 8, fontFamily: fonts.regular, fontSize: 14, color: colors.text, backgroundColor: colors.card }}
        />
        <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted }}>kcal/kg</Text>
        <Pressable onPress={save} accessibilityRole="button" hitSlop={6} style={{ paddingHorizontal: 8, minHeight: 36, justifyContent: 'center' }}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.navy }}>OK</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <Pressable onPress={() => { setValue(product.kcalEstimated ? '' : String(product.kcalPerKg)); setEditing(true); }} accessibilityRole="button" hitSlop={4} style={{ marginTop: 2 }}>
      <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted }}>
        {formatNumber(product.kcalPerKg)} kcal/kg
        {product.kcalEstimated ? (
          <Text style={{ fontFamily: fonts.semibold, color: colors.navy }}> · estimada, confirmar no rótulo</Text>
        ) : (
          <Text> · do rótulo ✓</Text>
        )}
      </Text>
    </Pressable>
  );
}

function Round({ icon, label, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 10, backgroundColor: pressed ? colors.coralTint : colors.bg, alignItems: 'center', justifyContent: 'center' })}
    >
      <Ionicons name={icon} size={18} color={colors.text} />
    </Pressable>
  );
}

// stats: resultado de animalStats/splitPlan; products: { dry, wet } (rações escolhidas)
export default function FeedingPlan({ stats, products, wetPerDay, meals, onPick, onRemove, onWetChange, onCompare, onEditKcal, showCosts = true }) {
  const slots = [
    { slot: 'dry', title: 'Ração seca', product: products.dry, part: stats?.dry },
    { slot: 'wet', title: 'Comida húmida', product: products.wet, part: stats?.wet },
  ];
  const both = !!(products.dry && products.wet);

  return (
    <View style={{ gap: 10 }}>
      {slots.map(({ slot, title, product, part }) => (
        <View key={slot} style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 14, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted }}>{title}</Text>
            {product && onRemove ? (
              <Pressable onPress={() => onRemove(slot)} accessibilityRole="button" accessibilityLabel={`Tirar ${title.toLowerCase()}`} hitSlop={8}>
                <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted }}>Tirar</Text>
              </Pressable>
            ) : null}
          </View>

          {product ? (
            <>
              <Pressable onPress={() => onPick(slot)} accessibilityRole="button" accessibilityLabel={`${product.name}. Trocar`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Thumb product={product} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.text }} numberOfLines={2}>{product.name}</Text>
                  <EnergyLine product={product} onEditKcal={onEditKcal} />
                </View>
                <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.navy }}>Trocar</Text>
              </Pressable>

              {part ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bg, borderRadius: 12, padding: 10 }}>
                  {slot === 'wet' ? (
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: fonts.semibold, fontSize: 17, color: colors.text }}>
                        {formatNumber(part.sachets, part.sachets % 1 ? 1 : 0)} {part.sachets >= 1.05 || part.sachets < 0.95 ? 'saquetas' : 'saqueta'} de {part.sachetG} g/dia
                      </Text>
                      <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted }}>
                        {formatNumber(part.grams)} g · {formatNumber(part.kcal)} kcal{showCosts && part.costDay != null ? ` · ${formatEuro(part.costDay)}/dia` : ''}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: fonts.semibold, fontSize: 17, color: colors.text }}>
                        {formatNumber(part.grams)} g/dia · {formatNumber(part.perMeal)} g por refeição
                      </Text>
                      <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted }}>
                        {formatNumber(part.kcal)} kcal · {meals} refeições{showCosts && part.costDay != null ? ` · ${formatEuro(part.costDay)}/dia` : ''}
                      </Text>
                    </View>
                  )}
                  {slot === 'wet' && both && onWetChange ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Round icon="remove" label="Menos uma saqueta por dia" onPress={() => onWetChange(Math.max(0.5, (wetPerDay ?? 1) - 0.5))} />
                      <Round icon="add" label="Mais uma saqueta por dia" onPress={() => onWetChange(Math.min(8, (wetPerDay ?? 1) + 0.5))} />
                    </View>
                  ) : null}
                </View>
              ) : null}

              {onCompare && showCosts ? (
                <Pressable onPress={() => onCompare(product)} accessibilityRole="button" style={{ alignSelf: 'flex-start', paddingVertical: 4 }}>
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.navy }}>
                    {part?.costDay != null ? 'Comparar preços e alternativas' : 'Ver preços nas lojas'}
                  </Text>
                </Pressable>
              ) : null}
            </>
          ) : (
            <Pressable
              onPress={() => onPick(slot)}
              accessibilityRole="button"
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.dashed, borderRadius: 12, padding: 12, backgroundColor: pressed ? colors.coralTint : 'transparent' })}
            >
              <Ionicons name="add" size={18} color={colors.navy} />
              <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.navy }}>
                {slot === 'dry' ? 'Adicionar ração seca' : 'Adicionar comida húmida'}
              </Text>
            </Pressable>
          )}
        </View>
      ))}
      {both ? (
        <Body muted size={12}>A seca completa as calorias que faltam depois das saquetas. Usa + e − para mudar quantas saquetas dás por dia.</Body>
      ) : null}
    </View>
  );
}
