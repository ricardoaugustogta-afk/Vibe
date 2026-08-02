import { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin } from 'lucide-react-native';
import { useI18n } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { ThemedText } from '@/components/ThemedText';
import { COLORS, SPACING, RADII, FONT_WEIGHTS, SHADOWS } from '@/lib/theme';
import { LANGUAGES } from '@/types/database';
import { translate } from '@/lib/i18n';
import type { Language } from '@/types/database';

export default function WelcomeScreen() {
  const { t } = useI18n();
  const { demoSignIn } = useAuth();
  const [lang, setLang] = useState<Language>('pt-BR');

  function handleGuest() {
    demoSignIn('Convidado', lang);
    router.replace('/(tabs)');
  }

  return (
    <LinearGradient
      colors={[COLORS.primary[600], COLORS.primary[800], COLORS.neutral[900]]}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.logoBadge}>
            <MapPin color={COLORS.neutral[0]} size={36} strokeWidth={2.4} />
          </View>
          <ThemedText variant="display" color={COLORS.neutral[0]} style={styles.appName}>
            {t('app.name')}
          </ThemedText>
          <ThemedText variant="h3" color={COLORS.primary[100]} weight="medium" align="center">
            {t('auth.subtitle')}
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText variant="h3" color={COLORS.neutral[0]} align="center" style={styles.sectionTitle}>
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
                    color={selected ? COLORS.primary[700] : COLORS.neutral[100]}
                    weight={selected ? 'bold' : 'medium'}
                  >
                    {l.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.actions}>
          <Link href="/(auth)/login" asChild>
            <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}>
              <ThemedText variant="h3" color={COLORS.primary[700]} weight="bold">
                {translate(lang, 'auth.login')}
              </ThemedText>
            </Pressable>
          </Link>
          <Link href="/(auth)/signup" asChild>
            <Pressable style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}>
              <ThemedText variant="h3" color={COLORS.neutral[0]} weight="semibold">
                {translate(lang, 'auth.signup')}
              </ThemedText>
            </Pressable>
          </Link>
          <Pressable style={({ pressed }) => [styles.guestBtn, pressed && styles.btnPressed]} onPress={handleGuest}>
            <ThemedText variant="body" color={COLORS.neutral[100]} weight="medium">
              {lang === 'pt-BR' ? 'Entrar como convidado' : lang === 'es-ES' ? 'Entrar como invitado' : 'Continue as guest'}
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: 80, paddingBottom: 40 },
  hero: { alignItems: 'center', gap: SPACING.md },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: RADII.xl,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  appName: { fontSize: 44, fontWeight: FONT_WEIGHTS.bold, letterSpacing: -1 },
  section: { gap: SPACING.md },
  sectionTitle: { marginBottom: SPACING.xs },
  langRow: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.sm, flexWrap: 'wrap' },
  langPill: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADII.pill,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  langPillActive: {
    backgroundColor: COLORS.neutral[0],
    borderColor: COLORS.neutral[0],
  },
  actions: { gap: SPACING.md },
  primaryBtn: {
    backgroundColor: COLORS.neutral[0],
    paddingVertical: SPACING.lg,
    borderRadius: RADII.lg,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  secondaryBtn: {
    paddingVertical: SPACING.lg,
    borderRadius: RADII.lg,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  btnPressed: { opacity: 0.85 },
  guestBtn: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
});
