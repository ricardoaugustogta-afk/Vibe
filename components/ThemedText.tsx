import { Text, type TextProps, type TextStyle } from 'react-native';
import { COLORS, FONT_SIZES } from '@/lib/theme';

type Variant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'label' | 'caption' | 'muted';
type Weight = 'regular' | 'medium' | 'semibold' | 'bold';

interface ThemedTextProps extends TextProps {
  variant?: Variant;
  weight?: Weight;
  color?: string;
  size?: number;
  align?: 'auto' | 'left' | 'center' | 'right';
}

const variantStyle: Record<Variant, TextStyle> = {
  display: { fontSize: FONT_SIZES.display, fontWeight: '700', lineHeight: 40 },
  h1: { fontSize: FONT_SIZES.xxl, fontWeight: '700', lineHeight: 34 },
  h2: { fontSize: FONT_SIZES.xl, fontWeight: '600', lineHeight: 28 },
  h3: { fontSize: FONT_SIZES.lg, fontWeight: '600', lineHeight: 24 },
  body: { fontSize: FONT_SIZES.md, fontWeight: '400', lineHeight: 24 },
  label: { fontSize: FONT_SIZES.sm, fontWeight: '500', lineHeight: 20 },
  caption: { fontSize: FONT_SIZES.xs, fontWeight: '400', lineHeight: 16 },
  muted: { fontSize: FONT_SIZES.sm, fontWeight: '400', lineHeight: 20 },
};

const weightMap: Record<Weight, TextStyle['fontWeight']> = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

export function ThemedText({
  variant = 'body',
  weight,
  color,
  size,
  align = 'left',
  style,
  ...rest
}: ThemedTextProps) {
  return (
    <Text
      style={[
        variantStyle[variant],
        weight ? { fontWeight: weightMap[weight] } : undefined,
        color ? { color } : { color: COLORS.neutral[900] },
        size ? { fontSize: size } : undefined,
        { textAlign: align },
        style,
      ]}
      {...rest}
    />
  );
}
