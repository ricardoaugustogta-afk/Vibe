import { View, TextInput, StyleSheet, type ViewStyle } from 'react-native';
import { ThemedText } from './ThemedText';
import { COLORS, SPACING, RADII } from '@/lib/theme';
import type { ReactNode } from 'react';

interface AuthTextInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  icon?: ReactNode;
  style?: ViewStyle;
}

export function AuthTextInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  icon,
  style,
}: AuthTextInputProps) {
  return (
    <View style={[styles.wrap, style]}>
      <ThemedText variant="label" color={COLORS.neutral[600]} weight="medium" style={styles.label}>
        {label}
      </ThemedText>
      <View style={styles.inputRow}>
        {icon && <View style={styles.iconWrap}>{icon}</View>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.neutral[400]}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          style={styles.input}
          editable
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: SPACING.xs },
  label: { marginLeft: SPACING.xs },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral[0],
    borderRadius: RADII.md,
    borderWidth: 1.5,
    borderColor: COLORS.neutral[200],
    paddingHorizontal: SPACING.md,
    height: 54,
  },
  iconWrap: { marginRight: SPACING.sm },
  input: { flex: 1, fontSize: 16, color: COLORS.neutral[900], fontFamily: 'Inter-Regular' },
});
