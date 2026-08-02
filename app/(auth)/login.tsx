import { useState } from 'react';
import { View, StyleSheet, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { ArrowLeft, Mail, Lock } from 'lucide-react-native';
import { useI18n } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { ThemedText } from '@/components/ThemedText';
import { AuthTextInput } from '@/components/AuthTextInput';
import { COLORS, SPACING, RADII, SHADOWS, FONT_SIZES } from '@/lib/theme';

export default function LoginScreen() {
  const { t } = useI18n();
  const { demoSignIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleLogin() {
    setError(null);
    if (!email.trim() || !password) {
      setError(t('auth.errorEmpty'));
      return;
    }
    setBusy(true);
    const username = email.trim().split('@')[0];
    demoSignIn(username);
    setBusy(false);
    router.replace('/(tabs)');
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Link href="/(auth)/welcome" asChild>
          <Pressable style={styles.backBtn}>
            <ArrowLeft color={COLORS.neutral[700]} size={24} />
          </Pressable>
        </Link>

        <View style={styles.header}>
          <ThemedText variant="h1" color={COLORS.neutral[900]}>
            {t('auth.login')}
          </ThemedText>
          <ThemedText variant="body" color={COLORS.neutral[500]} style={styles.subtitle}>
            {t('auth.subtitle')}
          </ThemedText>
        </View>

        <View style={styles.form}>
          <AuthTextInput
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            placeholder="voce@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            icon={<Mail color={COLORS.neutral[400]} size={20} />}
          />
          <AuthTextInput
            label={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            icon={<Lock color={COLORS.neutral[400]} size={20} />}
          />

          {error && (
            <View style={styles.errorBox}>
              <ThemedText color={COLORS.live[600]} size={FONT_SIZES.sm}>
                {error}
              </ThemedText>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed, busy && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={busy}
          >
            <ThemedText variant="h3" color={COLORS.neutral[0]} weight="bold">
              {busy ? t('auth.signingIn') : t('auth.loginButton')}
            </ThemedText>
          </Pressable>

          <View style={styles.switchRow}>
            <ThemedText color={COLORS.neutral[500]}>{t('auth.noAccount')} </ThemedText>
            <Link href="/(auth)/signup" asChild>
              <Pressable>
                <ThemedText color={COLORS.primary[600]} weight="semibold">
                  {t('auth.signup')}
                </ThemedText>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.neutral[50] },
  scroll: { flexGrow: 1, paddingHorizontal: SPACING.lg, paddingTop: 60, paddingBottom: 40 },
  backBtn: { width: 44, height: 44, borderRadius: RADII.pill, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg },
  header: { gap: SPACING.xs, marginBottom: SPACING.xl },
  subtitle: { marginTop: SPACING.xs },
  form: { gap: SPACING.md },
  errorBox: {
    backgroundColor: COLORS.live[50],
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary[600],
    paddingVertical: SPACING.lg,
    borderRadius: RADII.lg,
    alignItems: 'center',
    marginTop: SPACING.sm,
    ...SHADOWS.md,
  },
  btnPressed: { opacity: 0.88 },
  btnDisabled: { opacity: 0.6 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.lg },
});
