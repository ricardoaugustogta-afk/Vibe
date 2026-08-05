import { Image, View, type ImageStyle } from 'react-native';
import { ThemedText } from './ThemedText';
import { COLORS, FONT_WEIGHTS } from '@/lib/theme';

interface AvatarProps {
  url: string | null | undefined;
  username: string;
  size?: number;
  business?: boolean;
  style?: ImageStyle;
}

export function Avatar({ url, username, size = 40, business = false, style }: AvatarProps) {
  const initials = (username || '?')
    .slice(0, 2)
    .toUpperCase();

  const borderStyle = business
    ? { borderWidth: 2.5, borderColor: COLORS.accent[500] as unknown as string }
    : {};

  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: COLORS.neutral[200],
            ...(business ? { borderWidth: 2.5, borderColor: '#fbbf24' } : {}),
          },
          style,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: COLORS.primary[600],
          alignItems: 'center',
          justifyContent: 'center',
          ...(business ? { borderWidth: 2.5, borderColor: '#fbbf24' } : {}),
        },
        style,
      ]}
    >
      <ThemedText
        weight="bold"
        color={COLORS.neutral[0]}
        size={size * 0.36}
        style={{ lineHeight: size * 0.36 }}
      >
        {initials}
      </ThemedText>
    </View>
  );
}

export function AvatarSafeUrl(url: string | null | undefined): string | null {
  return url ?? null;
}
