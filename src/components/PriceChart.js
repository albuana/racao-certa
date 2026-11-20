// 📉 Histórico de preço: linha simples com o mais baixo e o mais alto.
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { formatEuro } from '../lib/nutrition';
import { colors, fonts } from '../theme';

export default function PriceChart({ history = [], width = 300, height = 120 }) {
  if (history.length < 2) {
    return (
      <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted }}>
        O histórico começa hoje. Vamos guardar o preço mais baixo de cada dia; volta daqui a uns dias.
      </Text>
    );
  }
  const prices = history.map((h) => h.price);
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  const pad = 8;
  const span = hi - lo || 1;
  const x = (i) => pad + (i * (width - pad * 2)) / (history.length - 1);
  const y = (p) => pad + ((hi - p) * (height - pad * 2)) / span;
  const points = history.map((h, i) => `${x(i)},${y(h.price)}`).join(' ');
  const last = history[history.length - 1];
  const fmtDay = (d) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

  return (
    <View style={{ gap: 6 }}>
      <Svg width={width} height={height} accessibilityLabel={`Preço entre ${formatEuro(lo)} e ${formatEuro(hi)}`}>
        <Line x1={pad} x2={width - pad} y1={y(lo)} y2={y(lo)} stroke={colors.border} strokeDasharray="4 4" />
        <Polyline points={points} fill="none" stroke={colors.navy} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        <Circle cx={x(history.length - 1)} cy={y(last.price)} r={4.5} fill={colors.coral} />
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted }}>{fmtDay(history[0].d)}</Text>
        <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted }}>
          mais baixo {formatEuro(lo)} · mais alto {formatEuro(hi)}
        </Text>
        <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted }}>{fmtDay(last.d)}</Text>
      </View>
    </View>
  );
}
