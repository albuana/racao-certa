// "Como está o corpo?" com um desenho para cada opção, visto de cima, como as tabelas de
// condição corporal dos veterinários (WSAVA): magro (cintura muito marcada, costelas à vista),
// ideal (cintura ligeira) e com peso a mais (sem cintura, corpo redondo).
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { BODY_CONDITIONS } from '../lib/nutrition';
import { colors, fonts } from '../theme';
import { Body, Label } from './ui';

// Larguras (metade) do peito, da cintura e da anca em cada condição.
const SHAPES = {
  thin: { chest: 15, waist: 8, hips: 13 },
  ideal: { chest: 17, waist: 13, hips: 16 },
  over: { chest: 22, waist: 25, hips: 23 },
};

function bodyPath({ chest, waist, hips }) {
  const L = (x) => 50 - x;
  const R = (x) => 50 + x;
  return [
    `M ${L(chest * 0.6)} 38`,
    `Q ${L(chest)} 42 ${L(chest)} 54`,
    `Q ${L(chest)} 66 ${L(waist)} 76`,
    `Q ${L(hips + 1)} 88 ${L(hips)} 100`,
    `Q ${L(hips - 2)} 116 50 120`,
    `Q ${R(hips - 2)} 116 ${R(hips)} 100`,
    `Q ${R(hips + 1)} 88 ${R(waist)} 76`,
    `Q ${R(chest)} 66 ${R(chest)} 54`,
    `Q ${R(chest)} 42 ${R(chest * 0.6)} 38`,
    'Z',
  ].join(' ');
}

export function BodyShape({ species = 'cat', condition = 'ideal', size = 84, active = false }) {
  const shape = SHAPES[condition] || SHAPES.ideal;
  const fill = active ? colors.navy : '#B9A7A3';
  const detail = active ? colors.coralTint : '#F3E1DD';
  const dog = species === 'dog';
  return (
    <Svg width={size} height={size * 1.3} viewBox="0 0 100 140" accessibilityElementsHidden importantForAccessibility="no">
      {/* cauda */}
      <Path d={dog ? 'M 50 118 Q 52 130 60 136' : 'M 50 118 Q 54 132 70 134 Q 78 134 80 128'} stroke={fill} strokeWidth={dog ? 6 : 5} strokeLinecap="round" fill="none" />
      {/* corpo */}
      <Path d={bodyPath(shape)} fill={fill} />
      {/* cabeça */}
      {dog ? (
        <G>
          <Ellipse cx={50} cy={24} rx={12} ry={14} fill={fill} />
          <Ellipse cx={50} cy={10} rx={7} ry={8} fill={fill} />
          <Ellipse cx={36} cy={28} rx={5} ry={10} fill={fill} transform="rotate(15 36 28)" />
          <Ellipse cx={64} cy={28} rx={5} ry={10} fill={fill} transform="rotate(-15 64 28)" />
          <Circle cx={50} cy={4} r={2.5} fill={detail} />
        </G>
      ) : (
        <G>
          <Circle cx={50} cy={24} r={12} fill={fill} />
          <Path d="M 39 19 L 37 5 L 47 13 Z" fill={fill} />
          <Path d="M 61 19 L 63 5 L 53 13 Z" fill={fill} />
        </G>
      )}
      {/* magro: costelas e ossos da anca à vista */}
      {condition === 'thin' ? (
        <G stroke={detail} strokeWidth={1.8} strokeLinecap="round" fill="none">
          <Path d="M 38 50 Q 44 52 47 50" />
          <Path d="M 39 57 Q 44 59 47 57" />
          <Path d="M 40 64 Q 45 66 47 64" />
          <Path d="M 62 50 Q 56 52 53 50" />
          <Path d="M 61 57 Q 56 59 53 57" />
          <Path d="M 60 64 Q 55 66 53 64" />
          <Circle cx={41} cy={98} r={1.8} fill={detail} stroke="none" />
          <Circle cx={59} cy={98} r={1.8} fill={detail} stroke="none" />
        </G>
      ) : null}
      {/* peso a mais: gordura nos lados */}
      {condition === 'over' ? (
        <G stroke={detail} strokeWidth={1.6} strokeLinecap="round" fill="none">
          <Path d="M 30 70 Q 28 78 30 86" />
          <Path d="M 70 70 Q 72 78 70 86" />
        </G>
      ) : null}
    </Svg>
  );
}

export default function BodyConditionPicker({ species, female, value, onChange, label }) {
  const selected = BODY_CONDITIONS.find((b) => b.id === value) || BODY_CONDITIONS[1];
  return (
    <View style={{ gap: 8 }}>
      {label ? <Label>{label}</Label> : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {BODY_CONDITIONS.map((b) => {
          const on = b.id === value;
          return (
            <Pressable
              key={b.id}
              onPress={() => onChange(b.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${female ? b.labelF : b.label}. ${b.hint}`}
              style={{
                flex: 1,
                alignItems: 'center',
                gap: 4,
                paddingVertical: 10,
                paddingHorizontal: 4,
                borderRadius: 14,
                borderWidth: on ? 2 : 1,
                borderColor: on ? colors.navy : colors.borderStrong,
                backgroundColor: on ? colors.coralTint : colors.card,
              }}
            >
              <BodyShape species={species} condition={b.id} size={64} active={on} />
              <Text style={{ fontFamily: on ? fonts.semibold : fonts.medium, fontSize: 13, color: on ? colors.navy : colors.text, textAlign: 'center' }}>
                {female ? b.labelF : b.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Body muted size={12}>{selected.hint}</Body>
    </View>
  );
}
