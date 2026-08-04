import { View, StyleSheet, Pressable } from 'react-native';
import { Star } from 'lucide-react-native';
import { COLORS, SPACING } from '@/lib/theme';
import { ThemedText } from '@/components/ThemedText';

type StarRatingProps = {
  rating: number;
  count?: number;
  size?: number;
  interactive?: boolean;
  onRate?: (stars: number) => void;
  showLabel?: boolean;
  label?: string;
};

export function StarRatingDisplay({ rating, count, size = 14 }: { rating: number; count?: number; size?: number }) {
  const rounded = Math.round(rating);
  return (
    <View style={styles.displayRow}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          color={i < rounded ? COLORS.warning[400] : COLORS.neutral[300]}
          fill={i < rounded ? COLORS.warning[400] : 'none'}
          strokeWidth={1.5}
        />
      ))}
      {count !== undefined && count > 0 && (
        <ThemedText variant="caption" color={COLORS.neutral[500]} style={{ marginLeft: 4 }}>
          {rating > 0 ? rating.toFixed(1) : ''} ({count})
        </ThemedText>
      )}
    </View>
  );
}

export function StarRatingInteractive({
  rating,
  size = 32,
  onRate,
  label,
}: {
  rating: number;
  size?: number;
  onRate: (stars: number) => void;
  label?: string;
}) {
  return (
    <View style={styles.interactiveContainer}>
      {label && (
        <ThemedText variant="label" color={COLORS.neutral[600]} weight="medium" style={styles.label}>
          {label}
        </ThemedText>
      )}
      <View style={styles.starsRow}>
        {Array.from({ length: 5 }).map((_, i) => {
          const starNum = i + 1;
          return (
            <Pressable key={i} onPress={() => onRate(starNum)} hitSlop={8}>
              <Star
                size={size}
                color={starNum <= rating ? COLORS.warning[400] : COLORS.neutral[300]}
                fill={starNum <= rating ? COLORS.warning[400] : 'none'}
                strokeWidth={1.5}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  displayRow: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  interactiveContainer: { gap: SPACING.xs },
  label: { marginLeft: SPACING.xs },
  starsRow: { flexDirection: 'row', gap: SPACING.sm },
});
