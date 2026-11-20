// Logótipo da Ração Certa: taça com um visto + "Ração / Certa".
// O desenho é o mesmo do ícone da app (assets/icon.png).

import { View } from 'react-native';
import Svg, { Circle, Path, Polyline, Rect } from 'react-native-svg';
import { colors } from '../theme';

// Símbolo sozinho. variant "cor" (fundo claro) ou "sobreCoral" (fundo coral).
export function LogoMark({ size = 96, variant = 'cor' }) {
  const onCoral = variant === 'sobreCoral';
  const bowl = onCoral ? colors.white : colors.navy;
  const dots = onCoral ? colors.coral : colors.coralTint;
  const check = onCoral ? colors.navy : colors.coral;
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" accessibilityLabel="Ração Certa">
      <Path d="M12 60 H108 A48 44 0 0 1 12 60 Z" fill={bowl} />
      <Rect x="6" y="53" width="108" height="13" rx="6.5" fill={bowl} />
      <Circle cx="42" cy="80" r="5.5" fill={dots} />
      <Circle cx="60" cy="88" r="5.5" fill={dots} />
      <Circle cx="78" cy="80" r="5.5" fill={dots} />
      <Polyline
        points="34,30 54,48 94,8"
        fill="none"
        stroke={check}
        strokeWidth={13}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Logótipo da app: quadrado coral arredondado com a taça branca e o visto marinho.
export function LogoIcon({ size = 112 }) {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Ração Certa"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.23),
        backgroundColor: colors.coral,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <LogoMark size={Math.round(size * 0.65)} variant="sobreCoral" />
    </View>
  );
}

