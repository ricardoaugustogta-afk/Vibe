import { useState } from 'react';
import { View, StyleSheet, Pressable, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { ArrowLeft, Mail, Lock, User } from 'lucide-react-native';
import { useI18n } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { ThemedText } from '@/components/ThemedText';
import { AuthTextInput } from '@/components/AuthTextInput';
import { COLORS, SPACING, RADII, SHADOWS } from '@/lib/theme';
import type { Language } from '@/types/database';
import { LANGUAGES } from '@/types/database';

export default function SignupScreen() {
  const { t } = useI18n();
  const { demoSignIn } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [lang, setLang] = useState<Language>('pt-BR');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSignup() {
    setError(null);
    if (!username.trim() || !email.trim() || !password || !confirm) {
      setError(t('auth.errorEmpty'));
      return;
    }
    if (password !== confirm) {
      setError(t('auth.errorPasswordMatch'));
      return;
    }
    setBusy(true);
    demoSignIn(username.trim(), lang);
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
            {t('auth.signup')}
          </ThemedText>
          <ThemedText variant="body" color={COLORS.neutral[500]} style={styles.subtitle}>
            {t('auth.subtitle')}
          </ThemedText>
        </View>

        <View style={styles.form}>
          <AuthTextInput
            label={t('auth.username')}
            value={username}
            onChangeText={setUsername}
            placeholder="seu_usuario"
            autoCapitalize="none"
            icon={<User color={COLORS.neutral[400]} size={20} />}
          />
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
          <AuthTextInput
            label={t('auth.confirmPassword')}
            value={confirm}
            onChangeText={setConfirm}
            placeholder="••••••••"
            secureTextEntry
            icon={<Lock color={COLORS.neutral[400]} size={20} />}
          />

          <View style={styles.langSection}>
            <ThemedText variant="label" color={COLORS.neutral[600]} weight="medium">
              {t('auth.chooseLanguage')}
            </ThemedText>
            <View style={styles.langRow}>
              {LANGUAGES.map((l) => {
                const selected = l.code === lang;
                return (
                  <Pressable
                    key={l.code}
                    style={[styles.langPill, selected && styles.langPillActive]}
                    onPress={() => setLang(l.code)}
                  >
                    <ThemedText
                      color={selected ? COLORS.neutral[0] : COLORS.neutral[600]}
                      weight={selected ? 'semibold' : 'medium'}
                    >
                      {l.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <ThemedText color={COLORS.live[600]} size={14}>
                {error}
              </ThemedText>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed, busy && styles.btnDisabled]}
            onPress={handleSignup}
            disabled={busy}
          >
            <ThemedText variant="h3" color={COLORS.neutral[0]} weight="bold">
              {busy ? t('auth.signingUp') : t('auth.signupButton')}
            </ThemedText>
          </Pressable>

          <View style={styles.switchRow}>
            <ThemedText color={COLORS.neutral[500]}>{t('auth.haveAccount')} </ThemedText>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <ThemedText color={COLORS.primary[600]} weight="semibold">
                  {t('auth.login')}
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
  header: { gap: SPACING.xs, marginBottom: SPACING.lg },
  subtitle: { marginTop: SPACING.xs },
  form: { gap: SPACING.md },
  langSection: { gap: SPACING.sm, marginTop: SPACING.xs },
  langRow: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  langPill: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.neutral[100],
    borderWidth: 1.5,
    borderColor: COLORS.neutral[200],
  },
  langPillActive: {
    backgroundColor: COLORS.primary[600],
    borderColor: COLORS.primary[600],
  },
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
