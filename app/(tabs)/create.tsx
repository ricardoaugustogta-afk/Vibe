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
  type ViewStyle,
} from 'react-native';
import { router } from 'expo-router';
import { Zap, CalendarClock, MapPin, Check, Calendar, Clock } from 'lucide-react-native';
import { useI18n } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/hooks/useLocation';
import { supabase } from '@/lib/supabase';
import { addLocalEvent } from '@/lib/localEvents';
import { ThemedText } from '@/components/ThemedText';
import { AuthTextInput } from '@/components/AuthTextInput';
import { MapPickerModal } from '@/components/MapPickerModal';
import { DatePickerModal, TimePickerModal } from '@/components/DateTimePickerModal';
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
  const [pickedLocation, setPickedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [dateObj, setDateObj] = useState<Date | null>(null);
  const [startHour, setStartHour] = useState<number | null>(null);
  const [startMin, setStartMin] = useState<number | null>(null);
  const [endHour, setEndHour] = useState<number | null>(null);
  const [endMin, setEndMin] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [showMap, setShowMap] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  async function handlePublish() {
    setError(null);
    if (!title.trim()) {
      setError(t('create.errorTitle'));
      return;
    }
    const loc = pickedLocation ?? (coords ? { lat: coords.latitude, lng: coords.longitude } : null);
    if (!loc) {
      await requestPermission();
      setError(t('create.errorLocation'));
      return;
    }
    if (mode === 'scheduled') {
      if (!dateObj || startHour === null || endHour === null) {
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
      startTime = new Date(dateObj!);
      startTime.setHours(startHour!, startMin ?? 0, 0, 0);
      endTime = new Date(dateObj!);
      endTime.setHours(endHour!, endMin ?? 0, 0, 0);
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
        location: `POINT(${loc.lng} ${loc.lat})`,
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

    const startMs = startTime.getTime();
    const endMs = endTime.getTime();

    addLocalEvent({
      id: data.id,
      creator_id: session!.user.id,
      title: title.trim(),
      description: description.trim() || null,
      category,
      address_text: address.trim() || null,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      lat: loc.lat,
      lng: loc.lng,
      creator_username: session?.user?.user_metadata?.username ?? t('common.anonymous'),
      going_count: 0,
      not_going_count: 0,
      liked_count: 0,
      distance_m: 0,
      avg_rating: 0,
      rating_count: 0,
    });

    Alert.alert(t('app.name'), t('create.success'), [
      {
        text: 'OK',
        onPress: () => router.replace('/(tabs)'),
      },
    ]);
  }

  const pad = (n: number) => n.toString().padStart(2, '0');
  const dateLabel = dateObj
    ? `${pad(dateObj.getDate())}/${pad(dateObj.getMonth() + 1)}/${dateObj.getFullYear()}`
    : '';
  const startTimeLabel = startHour !== null ? `${pad(startHour)}:${pad(startMin ?? 0)}` : '';
  const endTimeLabel = endHour !== null ? `${pad(endHour)}:${pad(endMin ?? 0)}` : '';
  const today = new Date();
  const maxDate = new Date(today.getTime() + MAX_FUTURE_DAYS * 86400000);

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

        <View style={styles.locInfo}>
          <MapPin color={pickedLocation || coords ? COLORS.success[600] : COLORS.warning[500]} size={18} />
          {locLoading ? (
            <ActivityIndicator color={COLORS.primary[600]} size="small" />
          ) : pickedLocation || coords ? (
            <ThemedText variant="muted" color={COLORS.neutral[600]}>
              {t('create.locationHint')}
            </ThemedText>
          ) : (
            <ThemedText variant="muted" color={COLORS.warning[600]}>
              {t('create.locationUnknown')}
            </ThemedText>
          )}
          {!coords && !pickedLocation && !locLoading && (
            <Pressable onPress={requestPermission} style={styles.retryLink}>
              <ThemedText color={COLORS.primary[600]} weight="semibold" size={13}>
                {t('create.useMyLocation')}
              </ThemedText>
            </Pressable>
          )}
        </View>

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

          {/* Location picker field */}
          <View style={styles.fieldGap}>
            <ThemedText variant="label" color={COLORS.neutral[600]} weight="medium" style={styles.fieldLabel}>
              {t('create.address')}
            </ThemedText>
            <Pressable style={styles.mapPickerField} onPress={() => setShowMap(true)}>
              <MapPin color={COLORS.neutral[400]} size={20} />
              <ThemedText
                color={address ? COLORS.neutral[900] : COLORS.neutral[400]}
                style={{ flex: 1 }}
                numberOfLines={1}
              >
                {address || t('create.addressPlaceholder')}
              </ThemedText>
              <MapPin color={COLORS.primary[600]} size={20} />
            </Pressable>
          </View>

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
                      { borderColor: selected ? CATEGORIES_COLORS[cat] : COLORS.neutral[300] },
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
                  <Pressable style={styles.pickerField} onPress={() => setShowDatePicker(true)}>
                    <Calendar color={COLORS.neutral[400]} size={18} />
                    <ThemedText color={dateLabel ? COLORS.neutral[900] : COLORS.neutral[400]}>
                      {dateLabel || 'DD/MM/AAAA'}
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
              <View style={styles.dateTimeRow}>
                <View style={styles.dateTimeField}>
                  <ThemedText variant="label" color={COLORS.neutral[600]} weight="medium" style={styles.fieldLabel}>
                    {t('create.startTime')}
                  </ThemedText>
                  <Pressable style={styles.pickerField} onPress={() => setShowStartPicker(true)}>
                    <Clock color={COLORS.neutral[400]} size={18} />
                    <ThemedText color={startTimeLabel ? COLORS.neutral[900] : COLORS.neutral[400]}>
                      {startTimeLabel || 'HH:MM'}
                    </ThemedText>
                  </Pressable>
                </View>
                <View style={styles.dateTimeField}>
                  <ThemedText variant="label" color={COLORS.neutral[600]} weight="medium" style={styles.fieldLabel}>
                    {t('create.endTime')}
                  </ThemedText>
                  <Pressable style={styles.pickerField} onPress={() => setShowEndPicker(true)}>
                    <Clock color={COLORS.neutral[400]} size={18} />
                    <ThemedText color={endTimeLabel ? COLORS.neutral[900] : COLORS.neutral[400]}>
                      {endTimeLabel || 'HH:MM'}
                    </ThemedText>
                  </Pressable>
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

      <MapPickerModal
        visible={showMap}
        onClose={() => setShowMap(false)}
        onConfirm={(result) => {
          setPickedLocation({ lat: result.lat, lng: result.lng });
          setAddress(result.address || address);
          setShowMap(false);
        }}
        initialLat={pickedLocation?.lat ?? coords?.latitude}
        initialLng={pickedLocation?.lng ?? coords?.longitude}
      />

      <DatePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onConfirm={(d) => {
          setDateObj(d);
          setShowDatePicker(false);
        }}
        minDate={today}
        maxDate={maxDate}
        initialDate={dateObj ?? undefined}
      />

      <TimePickerModal
        visible={showStartPicker}
        onClose={() => setShowStartPicker(false)}
        onConfirm={(h, m) => {
          setStartHour(h);
          setStartMin(m);
          setShowStartPicker(false);
        }}
        initialHour={startHour ?? undefined}
        initialMinute={startMin ?? undefined}
      />

      <TimePickerModal
        visible={showEndPicker}
        onClose={() => setShowEndPicker(false)}
        onConfirm={(h, m) => {
          setEndHour(h);
          setEndMin(m);
          setShowEndPicker(false);
        }}
        initialHour={endHour ?? undefined}
        initialMinute={endMin ?? undefined}
      />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.neutral[0] },
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
    borderColor: COLORS.neutral[300],
    backgroundColor: COLORS.neutral[50],
  },
  locInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    backgroundColor: COLORS.neutral[50],
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
  },
  retryLink: { marginLeft: 'auto' },
  form: { gap: SPACING.md },
  descInput: {} as ViewStyle,
  fieldGap: { gap: SPACING.sm },
  fieldLabel: { marginLeft: SPACING.xs },
  mapPickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.neutral[50],
    borderRadius: RADII.md,
    borderWidth: 1.5,
    borderColor: COLORS.neutral[300],
    paddingHorizontal: SPACING.md,
    height: 54,
  },
  catScroll: { gap: SPACING.sm, paddingRight: SPACING.lg },
  catPill: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.pill,
    borderWidth: 1.5,
    backgroundColor: COLORS.neutral[50],
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
    borderColor: COLORS.neutral[300],
    backgroundColor: COLORS.neutral[50],
  },
  durPillActive: {
    backgroundColor: COLORS.primary[600],
    borderColor: COLORS.primary[600],
  },
  dateTimeRow: { flexDirection: 'row', gap: SPACING.md },
  dateTimeField: { flex: 1, gap: SPACING.xs },
  pickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.neutral[50],
    borderRadius: RADII.md,
    borderWidth: 1.5,
    borderColor: COLORS.neutral[300],
    paddingHorizontal: SPACING.md,
    height: 54,
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
