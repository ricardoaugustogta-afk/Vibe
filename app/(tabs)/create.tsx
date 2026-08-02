import { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  TextInput,
  type ViewStyle,
} from 'react-native';
import { router } from 'expo-router';
import { Zap, CalendarClock, MapPin, Check } from 'lucide-react-native';
import { useI18n } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/hooks/useLocation';
import { supabase } from '@/lib/supabase';
import { ThemedText } from '@/components/ThemedText';
import { AuthTextInput } from '@/components/AuthTextInput';
import { COLORS, SPACING, RADII, SHADOWS, CATEGORIES_COLORS } from '@/lib/theme';
import { EVENT_CATEGORIES, type EventCategory } from '@/types/database';

type Mode = 'instant' | 'scheduled';

const DURATIONS = [
  { hours: 1, key: 'create.hour' },
  { hours: 2, key: 'create.hours2' },
  { hours: 4, key: 'create.hours4' },
  { hours: 6, key: 'create.hours6' },
];

const MAX_FUTURE_DAYS = 14;

export default function CreateScreen() {
  const { t } = useI18n();
  const { session } = useAuth();
  const { coords, requestPermission, loading: locLoading } = useLocation();

  const [mode, setMode] = useState<Mode>('instant');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<EventCategory>('Geral');
  const [address, setAddress] = useState('');
  const [duration, setDuration] = useState(2);
  const [dateStr, setDateStr] = useState('');
  const [startStr, setStartStr] = useState('');
  const [endStr, setEndStr] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handlePublish() {
    setError(null);
    if (!title.trim()) {
      setError(t('create.errorTitle'));
      return;
    }
    if (!coords) {
      await requestPermission();
      setError(t('create.errorLocation'));
      return;
    }
    if (mode === 'scheduled') {
      if (!dateStr || !startStr || !endStr) {
        setError(t('create.errorEndTime'));
        return;
      }
    }

    const now = new Date();
    let startTime: Date;
    let endTime: Date;

    if (mode === 'instant') {
      startTime = now;
      endTime = new Date(now.getTime() + duration * 3600000);
    } else {
      startTime = new Date(`${dateStr}T${startStr}:00`);
      endTime = new Date(`${dateStr}T${endStr}:00`);
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        setError(t('create.errorEndTime'));
        return;
      }
      if (endTime <= startTime) {
        setError(t('create.errorPastEnd'));
        return;
      }
      const maxFuture = new Date(now.getTime() + MAX_FUTURE_DAYS * 86400000);
      if (startTime > maxFuture) {
        setError(t('create.errorTooFar'));
        return;
      }
      if (endTime <= now) {
        setError(t('create.errorPastEnd'));
        return;
      }
    }

    setBusy(true);
    const { data, error: err } = await supabase
      .from('events')
      .insert({
        creator_id: session!.user.id,
        title: title.trim(),
        description: description.trim() || null,
        category,
        location: `POINT(${coords.longitude} ${coords.latitude})`,
        address_text: address.trim() || null,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
      })
      .select('id')
      .single();

    setBusy(false);
    if (err || !data) {
      setError(t('create.errorGeneric'));
      return;
    }
    Alert.alert(t('app.name'), t('create.success'));
    router.replace(`/event/${data.id}`);
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText variant="h1" color={COLORS.neutral[900]}>
            {t('create.title')}
          </ThemedText>
        </View>

        {/* Mode selector */}
        <View style={styles.modeRow}>
          <ModeCard
            active={mode === 'instant'}
            onPress={() => setMode('instant')}
            icon={<Zap color={mode === 'instant' ? COLORS.neutral[0] : COLORS.primary[600]} size={22} />}
            title={t('create.instant')}
            desc={t('create.instantDesc')}
            activeColor={COLORS.live[600]}
          />
          <ModeCard
            active={mode === 'scheduled'}
            onPress={() => setMode('scheduled')}
            icon={<CalendarClock color={mode === 'scheduled' ? COLORS.neutral[0] : COLORS.primary[600]} size={22} />}
            title={t('create.scheduled')}
            desc={t('create.scheduledDesc')}
            activeColor={COLORS.primary[600]}
          />
        </View>

        {/* Location info */}
        <View style={styles.locInfo}>
          <MapPin color={coords ? COLORS.success[600] : COLORS.warning[500]} size={18} />
          {locLoading ? (
            <ActivityIndicator color={COLORS.primary[600]} size="small" />
          ) : coords ? (
            <ThemedText variant="muted" color={COLORS.neutral[600]}>
              {t('create.locationHint')}
            </ThemedText>
          ) : (
            <ThemedText variant="muted" color={COLORS.warning[600]}>
              {t('create.locationUnknown')}
            </ThemedText>
          )}
          {!coords && !locLoading && (
            <Pressable onPress={requestPermission} style={styles.retryLink}>
              <ThemedText color={COLORS.primary[600]} weight="semibold" size={13}>
                {t('create.useMyLocation')}
              </ThemedText>
            </Pressable>
          )}
        </View>

        {/* Form */}
        <View style={styles.form}>
          <AuthTextInput
            label={t('create.eventTitle')}
            value={title}
            onChangeText={setTitle}
            placeholder={t('create.eventTitlePlaceholder')}
          />
          <AuthTextInput
            label={t('create.description')}
            value={description}
            onChangeText={setDescription}
            placeholder={t('create.descriptionPlaceholder')}
            style={styles.descInput as ViewStyle}
          />
          <AuthTextInput
            label={t('create.address')}
            value={address}
            onChangeText={setAddress}
            placeholder={t('create.addressPlaceholder')}
            icon={<MapPin color={COLORS.neutral[400]} size={20} />}
          />

          {/* Category */}
          <View style={styles.fieldGap}>
            <ThemedText variant="label" color={COLORS.neutral[600]} weight="medium" style={styles.fieldLabel}>
              {t('create.category')}
            </ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
              {EVENT_CATEGORIES.map((cat) => {
                const selected = cat === category;
                return (
                  <Pressable
                    key={cat}
                    style={[
                      styles.catPill,
                      { borderColor: selected ? CATEGORIES_COLORS[cat] : COLORS.neutral[200] },
                      selected && { backgroundColor: CATEGORIES_COLORS[cat] },
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <ThemedText
                      color={selected ? COLORS.neutral[0] : COLORS.neutral[600]}
                      weight={selected ? 'semibold' : 'medium'}
                    >
                      {cat}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Time fields */}
          {mode === 'instant' ? (
            <View style={styles.fieldGap}>
              <ThemedText variant="label" color={COLORS.neutral[600]} weight="medium" style={styles.fieldLabel}>
                {t('create.duration')}
              </ThemedText>
              <View style={styles.durationRow}>
                {DURATIONS.map((d) => {
                  const selected = d.hours === duration;
                  return (
                    <Pressable
                      key={d.hours}
                      style={[styles.durPill, selected && styles.durPillActive]}
                      onPress={() => setDuration(d.hours)}
                    >
                      {selected && <Check color={COLORS.neutral[0]} size={14} />}
                      <ThemedText
                        color={selected ? COLORS.neutral[0] : COLORS.neutral[600]}
                        weight={selected ? 'bold' : 'medium'}
                      >
                        {t(d.key)}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={styles.fieldGap}>
              <View style={styles.dateTimeRow}>
                <View style={styles.dateTimeField}>
                  <ThemedText variant="label" color={COLORS.neutral[600]} weight="medium" style={styles.fieldLabel}>
                    {t('create.startDate')}
                  </ThemedText>
                  <DateInput value={dateStr} onChange={setDateStr} min={today} mode="date" placeholder="DD/MM/AAAA" />
                </View>
              </View>
              <View style={styles.dateTimeRow}>
                <View style={styles.dateTimeField}>
                  <ThemedText variant="label" color={COLORS.neutral[600]} weight="medium" style={styles.fieldLabel}>
                    {t('create.startTime')}
                  </ThemedText>
                  <DateInput value={startStr} onChange={setStartStr} mode="time" placeholder="HH:MM" />
                </View>
                <View style={styles.dateTimeField}>
                  <ThemedText variant="label" color={COLORS.neutral[600]} weight="medium" style={styles.fieldLabel}>
                    {t('create.endTime')}
                  </ThemedText>
                  <DateInput value={endStr} onChange={setEndStr} mode="time" placeholder="HH:MM" />
                </View>
              </View>
            </View>
          )}

          {error && (
            <View style={styles.errorBox}>
              <ThemedText color={COLORS.live[600]} size={14}>
                {error}
              </ThemedText>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [styles.publishBtn, pressed && styles.btnPressed, busy && styles.btnDisabled]}
            onPress={handlePublish}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color={COLORS.neutral[0]} />
            ) : (
              <ThemedText variant="h3" color={COLORS.neutral[0]} weight="bold">
                {t('create.publish')}
              </ThemedText>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ModeCard({
  active,
  onPress,
  icon,
  title,
  desc,
  activeColor,
}: {
  active: boolean;
  onPress: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
  activeColor: string;
}) {
  return (
    <Pressable
      style={[styles.modeCard, active && { backgroundColor: activeColor, borderColor: activeColor }]}
      onPress={onPress}
    >
      {icon}
      <ThemedText variant="label" color={active ? COLORS.neutral[0] : COLORS.neutral[800]} weight="semibold">
        {title}
      </ThemedText>
      <ThemedText variant="caption" color={active ? COLORS.neutral[100] : COLORS.neutral[500]}>
        {desc}
      </ThemedText>
    </Pressable>
  );
}

function DateInput({
  value,
  onChange,
  mode,
  placeholder,
  min,
}: {
  value: string;
  onChange: (v: string) => void;
  mode: 'date' | 'time';
  placeholder: string;
  min?: string;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={COLORS.neutral[400]}
      style={styles.dateInput}
      keyboardType={mode === 'time' ? 'numeric' : 'numeric'}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.neutral[50] },
  scroll: { paddingHorizontal: SPACING.lg, paddingTop: 60, paddingBottom: 40 },
  header: { marginBottom: SPACING.lg },
  modeRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  modeCard: {
    flex: 1,
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: RADII.lg,
    borderWidth: 1.5,
    borderColor: COLORS.neutral[200],
    backgroundColor: COLORS.neutral[0],
  },
  locInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    backgroundColor: COLORS.neutral[0],
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
  },
  retryLink: { marginLeft: 'auto' },
  form: { gap: SPACING.md },
  descInput: {},
  fieldGap: { gap: SPACING.sm },
  fieldLabel: { marginLeft: SPACING.xs },
  catScroll: { gap: SPACING.sm, paddingRight: SPACING.lg },
  catPill: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.pill,
    borderWidth: 1.5,
    backgroundColor: COLORS.neutral[0],
  },
  durationRow: { flexDirection: 'row', gap: SPACING.sm },
  durPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: SPACING.md,
    borderRadius: RADII.md,
    borderWidth: 1.5,
    borderColor: COLORS.neutral[200],
    backgroundColor: COLORS.neutral[0],
  },
  durPillActive: {
    backgroundColor: COLORS.primary[600],
    borderColor: COLORS.primary[600],
  },
  dateTimeRow: { flexDirection: 'row', gap: SPACING.md },
  dateTimeField: { flex: 1, gap: SPACING.xs },
  dateInput: {
    backgroundColor: COLORS.neutral[0],
    borderRadius: RADII.md,
    borderWidth: 1.5,
    borderColor: COLORS.neutral[200],
    paddingHorizontal: SPACING.md,
    height: 54,
    fontSize: 16,
    color: COLORS.neutral[900],
    fontFamily: 'Inter-Regular',
  },
  errorBox: {
    backgroundColor: COLORS.live[50],
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  publishBtn: {
    backgroundColor: COLORS.primary[600],
    paddingVertical: SPACING.lg,
    borderRadius: RADII.lg,
    alignItems: 'center',
    marginTop: SPACING.md,
    ...SHADOWS.md,
  },
  btnPressed: { opacity: 0.88 },
  btnDisabled: { opacity: 0.6 },
});
