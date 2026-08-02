import { useState } from 'react';
import { View, StyleSheet, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { User, Instagram, Check } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { ThemedText } from '@/components/ThemedText';
import { AuthTextInput } from '@/components/AuthTextInput';
import { COLORS, SPACING, RADII, SHADOWS } from '@/lib/theme';
import type { Language } from '@/types/database';
import { LANGUAGES } from '@/types/database';

export default function OnboardingScreen() {
  const { session, setLanguage } = useAuth();
  const { t } = useI18n();
  const [username, setUsername] = useState('');
  const [instagram, setInstagram] = useState('');
  const [lang, setLang] = useState<Language>('pt-BR');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleComplete() {
    setError(null);
    if (!username.trim()) {
      setError(t('auth.errorUsername'));
      return;
    }
    if (!session) {
      setError(t('auth.errorGeneric'));
      return;
    }
    setBusy(true);
    const cleanIg = instagram.trim().replace(/^@/, '');
    const { error: err } = await supabase.from('profiles').upsert({
      id: session.user.id,
      username: username.trim(),
      instagram_username: cleanIg || null,
      language: lang,
    });
    setBusy(false);
    if (err) {
      setError(err.message.includes('unique') ? t('profile.usernameTaken') : t('profile.errorGeneric'));
      return;
    }
    await setLanguage(lang);
    router.replace('/(tabs)');
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <ThemedText variant="h1" color={COLORS.neutral[900]}>
            {t('auth.welcome')}
          </ThemedText>
          <ThemedText variant="body" color={COLORS.neutral[500]} style={styles.subtitle}>
            {t('profile.editProfile')}
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
            label={t('profile.instagram')}
            value={instagram}
            onChangeText={setInstagram}
            placeholder={t('profile.instagramPlaceholder')}
            autoCapitalize="none"
            icon={<Instagram color={COLORS.neutral[400]} size={20} />}
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
                    {selected && <Check color={COLORS.neutral[0]} size={14} />}
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
            onPress={handleComplete}
            disabled={busy}
          >
            <ThemedText variant="h3" color={COLORS.neutral[0]} weight="bold">
              {busy ? t('common.loading') : t('auth.continue')}
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.neutral[50] },
  scroll: { flexGrow: 1, paddingHorizontal: SPACING.lg, paddingTop: 80, paddingBottom: 40 },
  header: { gap: SPACING.xs, marginBottom: SPACING.xl },
  subtitle: { marginTop: SPACING.xs },
  form: { gap: SPACING.md },
  langSection: { gap: SPACING.sm, marginTop: SPACING.xs },
  langRow: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
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
});
