// Componentes base da interface, todos com a paleta Coral e marinho.

import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '../theme';

export function Screen({ children, scroll = true, footer, edges = ['top', 'left', 'right'], contentStyle }) {
  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, { flex: 1 }, contentStyle]}>{children}</View>
      )}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

export function Title({ children, size = 28, style }) {
  return <Text style={[styles.title, { fontSize: size }, style]}>{children}</Text>;
}

export function Body({ children, muted, size = 15, style, ...rest }) {
  return (
    <Text style={[styles.body, { fontSize: size, color: muted ? colors.textMuted : colors.text }, style]} {...rest}>
      {children}
    </Text>
  );
}

export function Label({ children, style }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

export function Button({ title, onPress, variant = 'primary', icon, style, disabled, accessibilityLabel }) {
  const v = buttonVariants[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: pressed ? v.pressed : v.bg, borderColor: v.border, opacity: disabled ? 0.5 : 1 },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={20} color={v.text} /> : null}
      <Text style={[styles.buttonText, { color: v.text }]}>{title}</Text>
    </Pressable>
  );
}

const buttonVariants = {
  primary: { bg: colors.navy, pressed: colors.navyDark, text: colors.white, border: colors.navy },
  secondary: { bg: colors.card, pressed: colors.coralTint, text: colors.navy, border: colors.navy },
  ghost: { bg: 'transparent', pressed: colors.coralTint, text: colors.navy, border: 'transparent' },
  black: { bg: '#000000', pressed: '#222222', text: colors.white, border: '#000000' },
  outline: { bg: colors.card, pressed: colors.bg, text: colors.text, border: colors.borderStrong },
};

export function Card({ children, style, onPress, accessibilityLabel }) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [styles.card, pressed && { backgroundColor: colors.bg }, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Field({ label, value, onChangeText, placeholder, keyboardType, style, autoFocus, maxLength, ...rest }) {
  return (
    <View style={style}>
      {label ? <Label>{label}</Label> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        autoFocus={autoFocus}
        maxLength={maxLength}
        accessibilityLabel={label}
        {...rest}
        style={styles.input}
      />
    </View>
  );
}

// Controlo segmentado (2 a 4 opções).
export function Segmented({ options, value, onChange, label }) {
  return (
    <View>
      {label ? <Label>{label}</Label> : null}
      <View style={styles.segment} accessibilityRole="radiogroup">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={String(o.value)}
              onPress={() => onChange(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={[styles.segmentItem, on && styles.segmentItemOn]}
            >
              <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// Grelha de opções com título e subtítulo (ex.: fases de vida).
export function OptionGrid({ options, value, onChange, label, columns = 2, disabled, fadedWhenEmpty = false }) {
  // fadedWhenEmpty: sem nada escolhido, as opções aparecem mais clarinhas; depois de escolher, normais.
  const empty = fadedWhenEmpty && (value === null || value === undefined);
  return (
    <View>
      {label ? <Label>{label}</Label> : null}
      <View style={styles.grid}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              disabled={disabled}
              accessibilityRole="radio"
              accessibilityState={{ selected: on, disabled: !!disabled }}
              style={[styles.option, { width: columns === 2 ? '48.5%' : '100%' }, on && styles.optionOn, (disabled && !on) || empty ? { opacity: 0.45 } : null]}
            >
              <Text style={[styles.optionTitle, on && { color: colors.navy }]}>{o.label}</Text>
              {o.hint ? <Text style={[styles.optionHint, on && { color: colors.coralTintText }]}>{o.hint}</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Chip({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={onPress ? { selected: !!active } : undefined}
      style={[styles.chip, active ? styles.chipOn : null]}
    >
      <Text style={[styles.chipText, active && { color: colors.coralTintText, fontFamily: fonts.semibold }]}>{label}</Text>
    </Pressable>
  );
}

export function Avatar({ animal, size = 48 }) {
  // Cores da paleta Coral e marinho: gato em coral, cão em marinho.
  const tint = animal?.species === 'dog' || animal?.species === 'fish' ? { bg: colors.navy, fg: colors.white } : { bg: colors.coralTint, fg: colors.coralDark };
  const ICONS = { cat: 'cat', dog: 'dog', bird: 'bird', small: 'rabbit', fish: 'fish', reptile: 'turtle' };
  if (animal?.photoUri) {
    return (
      <Image
        source={{ uri: animal.photoUri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        accessibilityLabel={`Foto de ${animal.name}`}
      />
    );
  }
  // Sem foto: o desenho de um gato ou de um cão (conforme o animal).
  return (
    <View
      accessible
      accessibilityLabel={animal?.name ? `${animal.name}, sem foto` : 'Sem foto'}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tint.bg, alignItems: 'center', justifyContent: 'center' }}
    >
      <MaterialCommunityIcons name={ICONS[animal?.species] || 'cat'} size={size * 0.56} color={tint.fg} />
    </View>
  );
}

export function IconButton({ icon, onPress, accessibilityLabel, style }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      style={({ pressed }) => [styles.iconButton, pressed && { backgroundColor: colors.coralTint }, style]}
    >
      <Ionicons name={icon} size={20} color={colors.text} />
    </Pressable>
  );
}

export function BackButton({ onPress }) {
  return (
    <IconButton
      icon="chevron-back"
      accessibilityLabel="Voltar"
      onPress={onPress || (() => (router.canGoBack() ? router.back() : router.replace('/')))}
    />
  );
}

// Cabeçalho do onboarding: voltar + "Passo X de 3" + barra de progresso.
export function StepHeader({ step, total = 3, onBack }) {
  return (
    <View style={{ marginBottom: 28 }}>
      <View style={styles.rowBetween}>
        <BackButton onPress={onBack} />
        <Body muted size={13}>
          Passo {step} de {total}
        </Body>
      </View>
      <View style={styles.progress}>
        {Array.from({ length: total }).map((_, i) => (
          <View key={i} style={[styles.progressBar, { backgroundColor: i < step ? colors.coral : colors.borderStrong }]} />
        ))}
      </View>
    </View>
  );
}

export function Banner({ icon = 'time-outline', title, body, action, onAction }) {
  return (
    <View style={styles.banner}>
      <View style={styles.bannerIcon}>
        <Ionicons name={icon} size={18} color={colors.white} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.text }}>{title}</Text>
        {body ? <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.coralTintText, marginTop: 3 }}>{body}</Text> : null}
        {action ? (
          <Pressable onPress={onAction} accessibilityRole="button" style={styles.bannerAction}>
            <Text style={{ fontFamily: fonts.semibold, color: colors.white, fontSize: 14 }}>{action}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function Stat({ label, value, style, valueStyle }) {
  return (
    <View style={[styles.stat, style]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, valueStyle]}>{value}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 32, gap: 16 },
  footer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16, backgroundColor: colors.bg },
  title: { fontFamily: fonts.display, color: colors.text, letterSpacing: -0.5 },
  body: { fontFamily: fonts.regular, lineHeight: 21 },
  label: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginBottom: 6 },
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonText: { fontFamily: fonts.semibold, fontSize: 16 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16 },
  input: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  },
  segment: { flexDirection: 'row', backgroundColor: colors.segmentBg, borderRadius: 12, padding: 4, gap: 4 },
  segmentItem: { flex: 1, minHeight: 44, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  segmentItemOn: { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segmentText: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted, textAlign: 'center' },
  segmentTextOn: { fontFamily: fonts.semibold, color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  option: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, padding: 13, minHeight: 64 },
  optionOn: { backgroundColor: colors.coralTint, borderColor: colors.navy, borderWidth: 2, padding: 12 },
  optionTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  optionHint: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  chip: { borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.card, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 8, minHeight: 36, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.coralTint, borderColor: colors.coralTint },
  chipText: { fontFamily: fonts.regular, fontSize: 14, color: colors.text },
  iconButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: '#EED8D3', alignItems: 'center', justifyContent: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progress: { flexDirection: 'row', gap: 6, marginTop: 16 },
  progressBar: { flex: 1, height: 4, borderRadius: 2 },
  banner: { flexDirection: 'row', gap: 12, backgroundColor: colors.alertBg, borderColor: colors.alertBorder, borderWidth: 1, borderRadius: 16, padding: 14 },
  bannerIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  bannerAction: { alignSelf: 'flex-start', backgroundColor: colors.text, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginTop: 10, minHeight: 40, justifyContent: 'center' },
  stat: { flex: 1, backgroundColor: colors.bg, borderRadius: 12, padding: 12 },
  statLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  statValue: { fontFamily: fonts.semibold, fontSize: 18, color: colors.text, marginTop: 2 },
});
