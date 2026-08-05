import { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
  FlatList,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { User, Instagram, Camera, Check, LogOut, Info, MapPin, ChevronRight, Store, UserRound } from 'lucide-react-native';
import { useI18n } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ThemedText } from '@/components/ThemedText';
import { Avatar } from '@/components/Avatar';
import { COLORS, SPACING, RADII, SHADOWS, CATEGORIES_COLORS, FONT_SIZES } from '@/lib/theme';
import { isLive, timeUntil, formatDistance } from '@/lib/time';
import { LANGUAGES, type Language, type NearbyEvent, type AccountType } from '@/types/database';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

export default function ProfileScreen() {
  const { t } = useI18n();
  const { profile, session, setLanguage, signOut, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(profile?.username ?? '');
  const [instagram, setInstagram] = useState(profile?.instagram_username ?? '');
  const [accountType, setAccountType] = useState<AccountType>(profile?.account_type ?? 'personal');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myEvents, setMyEvents] = useState<NearbyEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const loadMyEvents = useCallback(async () => {
    if (!session) return;
    setLoadingEvents(true);
    const { data, error: err } = await supabase
      .from('events')
      .select('id, creator_id, title, description, category, address_text, start_time, end_time, hidden, created_at, location')
      .eq('creator_id', session.user.id)
      .order('created_at', { ascending: false });
    if (err) {
      setLoadingEvents(false);
      return;
    }
    const mapped: NearbyEvent[] = (data || []).map((e: any) => ({
      id: e.id,
      creator_id: e.creator_id,
      title: e.title,
      description: e.description,
      category: e.category,
      address_text: e.address_text,
      start_time: e.start_time,
      end_time: e.end_time,
      lat: 0,
      lng: 0,
      creator_username: profile?.username ?? '',
      going_count: 0,
      not_going_count: 0,
      liked_count: 0,
      distance_m: 0,
    }));
    setMyEvents(mapped.filter((e) => new Date(e.end_time).getTime() > Date.now()));
    setLoadingEvents(false);
  }, [session, profile]);

  useFocusEffect(
    useCallback(() => {
      loadMyEvents();
    }, [loadMyEvents]),
  );

  async function changeAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
      exif: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const manip = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: 256, height: 256 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true },
    );
    if (!manip.base64 || !session) return;
    setBusy(true);
    const fileName = `${session.user.id}/avatar-${Date.now()}.jpg`;
    const binary = atob(manip.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const { error: upErr } = await supabase.storage
      .from('event-photos')
      .upload(fileName, bytes, { contentType: 'image/jpeg', upsert: true });
    if (upErr) {
      setBusy(false);
      Alert.alert(t('common.error'), t('profile.errorGeneric'));
      return;
    }
    const { data } = supabase.storage.from('event-photos').getPublicUrl(fileName);
    const { error: updErr } = await supabase
      .from('profiles')
      .update({ avatar_url: data.publicUrl })
      .eq('id', session.user.id);
    setBusy(false);
    if (updErr) {
      Alert.alert(t('common.error'), t('profile.errorGeneric'));
      return;
    }
    refreshProfile();
  }

  async function saveProfile() {
    if (!session) return;
    setError(null);
    if (!username.trim()) {
      setError(t('auth.errorUsername'));
      return;
    }
    setBusy(true);
    const cleanIg = instagram.trim().replace(/^@/, '');
    const { error: err } = await supabase
      .from('profiles')
      .update({
        username: username.trim(),
        instagram_username: cleanIg || null,
        account_type: accountType,
      })
      .eq('id', session.user.id);
    setBusy(false);
    if (err) {
      setError(err.message.includes('unique') ? t('profile.usernameTaken') : t('profile.errorGeneric'));
      return;
    }
    setEditing(false);
    refreshProfile();
  }

  function handleSignOut() {
    Alert.alert(t('app.name'), t('profile.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.signOut'), style: 'destructive', onPress: () => signOut() },
    ]);
  }

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary[600]} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <ThemedText variant="h1" color={COLORS.neutral[900]}>
          {t('profile.title')}
        </ThemedText>
      </View>

      {/* Profile card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarWrap}>
          <Avatar url={profile.avatar_url} username={profile.username} size={88} />
          <Pressable style={styles.cameraBtn} onPress={changeAvatar} disabled={busy}>
            {busy ? (
              <ActivityIndicator color={COLORS.neutral[0]} size="small" />
            ) : (
              <Camera color={COLORS.neutral[0]} size={16} />
            )}
          </Pressable>
        </View>

        {editing ? (
          <View style={styles.editForm}>
            <View style={styles.editField}>
              <User color={COLORS.neutral[400]} size={18} />
              <TextInput
                value={username}
                onChangeText={setUsername}
                style={styles.editInput}
                placeholder={t('profile.username')}
                placeholderTextColor={COLORS.neutral[400]}
                autoCapitalize="none"
              />
            </View>
            <View style={styles.editField}>
              <Instagram color={COLORS.neutral[400]} size={18} />
              <TextInput
                value={instagram}
                onChangeText={setInstagram}
                style={styles.editInput}
                placeholder={t('profile.instagramPlaceholder')}
                placeholderTextColor={COLORS.neutral[400]}
                autoCapitalize="none"
              />
            </View>
            <View style={styles.editField}>
              <View style={styles.accountSelector}>
                <Pressable
                  style={[styles.accountPill, accountType === 'personal' && styles.accountPillActive]}
                  onPress={() => setAccountType('personal')}
                >
                  <UserRound color={accountType === 'personal' ? COLORS.neutral[0] : COLORS.neutral[600]} size={16} />
                  <ThemedText
                    color={accountType === 'personal' ? COLORS.neutral[0] : COLORS.neutral[600]}
                    weight={accountType === 'personal' ? 'semibold' : 'medium'}
                    size={13}
                  >
                    {t('profile.personal')}
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.accountPill, accountType === 'business' && styles.accountPillActive]}
                  onPress={() => setAccountType('business')}
                >
                  <Store color={accountType === 'business' ? COLORS.neutral[0] : COLORS.neutral[600]} size={16} />
                  <ThemedText
                    color={accountType === 'business' ? COLORS.neutral[0] : COLORS.neutral[600]}
                    weight={accountType === 'business' ? 'semibold' : 'medium'}
                    size={13}
                  >
                    {t('profile.business')}
                  </ThemedText>
                </Pressable>
              </View>
            </View>
            {error && (
              <ThemedText color={COLORS.live[600]} size={FONT_SIZES.sm} style={{ marginLeft: SPACING.sm }}>
                {error}
              </ThemedText>
            )}
            <View style={styles.editActions}>
              <Pressable style={styles.cancelEditBtn} onPress={() => { setEditing(false); setError(null); }}>
                <ThemedText color={COLORS.neutral[600]} weight="medium">{t('common.cancel')}</ThemedText>
              </Pressable>
              <Pressable style={styles.saveEditBtn} onPress={saveProfile} disabled={busy}>
                {busy ? (
                  <ActivityIndicator color={COLORS.neutral[0]} size="small" />
                ) : (
                  <>
                    <Check color={COLORS.neutral[0]} size={16} />
                    <ThemedText color={COLORS.neutral[0]} weight="bold">{t('common.save')}</ThemedText>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.profileInfo}>
            <View style={styles.usernameRow}>
              <ThemedText variant="h2" color={COLORS.neutral[900]}>
                {profile.username}
              </ThemedText>
              {profile.account_type === 'business' && (
                <View style={styles.businessBadge}>
                  <Store color={COLORS.accent[500]} size={14} />
                  <ThemedText color={COLORS.accent[500]} weight="semibold" size={11}>
                    {t('profile.business')}
                  </ThemedText>
                </View>
              )}
              {profile.instagram_username && (
                <Pressable
                  style={styles.igBtn}
                  onPress={() => Linking.openURL(`https://instagram.com/${profile.instagram_username}`)}
                >
                  <Instagram color={COLORS.neutral[0]} size={16} />
                  <ThemedText color={COLORS.neutral[0]} weight="semibold" size={13}>
                    {profile.instagram_username}
                  </ThemedText>
                </Pressable>
              )}
            </View>
            <Pressable style={styles.editBtn} onPress={() => { setEditing(true); setUsername(profile.username); setInstagram(profile.instagram_username ?? ''); setAccountType(profile.account_type ?? 'personal'); }}>
              <ThemedText color={COLORS.primary[600]} weight="semibold" size={14}>
                {t('profile.editProfile')}
              </ThemedText>
            </Pressable>
          </View>
        )}
      </View>

      {/* Language selector */}
      <View style={styles.section}>
        <ThemedText variant="h3" color={COLORS.neutral[900]} style={styles.sectionTitle}>
          {t('profile.language')}
        </ThemedText>
        <View style={styles.langRow}>
          {LANGUAGES.map((l) => {
            const selected = l.code === profile.language;
            return (
              <Pressable
                key={l.code}
                style={[styles.langPill, selected && styles.langPillActive]}
                onPress={() => setLanguage(l.code as Language)}
              >
                {selected && <Check color={COLORS.neutral[0]} size={14} />}
                <ThemedText
                  color={selected ? COLORS.neutral[0] : COLORS.neutral[600]}
                  weight={selected ? 'bold' : 'medium'}
                >
                  {l.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* My events */}
      <View style={styles.section}>
        <ThemedText variant="h3" color={COLORS.neutral[900]} style={styles.sectionTitle}>
          {t('profile.myEvents')}
        </ThemedText>
        {loadingEvents ? (
          <ActivityIndicator color={COLORS.primary[600]} style={{ padding: SPACING.lg }} />
        ) : myEvents.length === 0 ? (
          <View style={styles.noEventsBox}>
            <ThemedText variant="muted" color={COLORS.neutral[400]} align="center">
              {t('profile.noEvents')}
            </ThemedText>
          </View>
        ) : (
          <View style={{ gap: SPACING.sm }}>
            {myEvents.map((e) => {
              const live = isLive(e.start_time);
              const rem = timeUntil(e.end_time);
              const remLabel = rem ? `${rem.value}${rem.unit === 'min' ? t('common.minutes') : rem.unit === 'h' ? t('common.hours') : t('common.days')}` : '';
              return (
                <Pressable
                  key={e.id}
                  style={({ pressed }) => [styles.myEventCard, pressed && { opacity: 0.85 }]}
                  onPress={() => router.push(`/event/${e.id}`)}
                >
                  <View style={styles.myEventLeft}>
                    <View style={[styles.catDot, { backgroundColor: CATEGORIES_COLORS[e.category] ?? COLORS.primary[600] }]} />
                    <View>
                      <ThemedText variant="label" color={COLORS.neutral[900]} weight="semibold" numberOfLines={1}>
                        {e.title}
                      </ThemedText>
                      {live ? (
                        <ThemedText variant="caption" color={COLORS.live[600]} weight="medium">
                          {t('map.endsIn')} {remLabel}
                        </ThemedText>
                      ) : (
                        <ThemedText variant="caption" color={COLORS.neutral[500]}>
                          {t('map.soon')}
                        </ThemedText>
                      )}
                    </View>
                  </View>
                  <ChevronRight color={COLORS.neutral[300]} size={20} />
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* About */}
      <View style={styles.section}>
        <View style={styles.aboutHeader}>
          <Info color={COLORS.primary[600]} size={20} />
          <ThemedText variant="h3" color={COLORS.neutral[900]}>
            {t('profile.about')}
          </ThemedText>
        </View>
        <ThemedText variant="muted" color={COLORS.neutral[600]} style={styles.aboutText}>
          {t('profile.aboutText')}
        </ThemedText>
        <ThemedText variant="muted" color={COLORS.neutral[500]} style={styles.aboutText}>
          {t('profile.aboutText2')}
        </ThemedText>
      </View>

      {/* Sign out */}
      <Pressable style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.85 }]} onPress={handleSignOut}>
        <LogOut color={COLORS.live[600]} size={20} />
        <ThemedText color={COLORS.live[600]} weight="semibold">{t('profile.signOut')}</ThemedText>
      </Pressable>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.neutral[50] },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.neutral[50] },
  header: { paddingHorizontal: SPACING.lg, paddingTop: 60, paddingBottom: SPACING.md },
  profileCard: {
    backgroundColor: COLORS.neutral[0],
    marginHorizontal: SPACING.lg,
    borderRadius: RADII.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  avatarWrap: { position: 'relative', marginBottom: SPACING.md },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.neutral[0],
  },
  profileInfo: { alignItems: 'center', gap: SPACING.xs, width: '100%' },
  usernameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap', justifyContent: 'center' },
  igBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E1306C',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADII.pill,
  },
  editBtn: { marginTop: SPACING.xs },
  editForm: { width: '100%', gap: SPACING.sm },
  editField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.neutral[50],
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.md,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
  },
  editInput: { flex: 1, fontSize: FONT_SIZES.md, color: COLORS.neutral[900], fontFamily: 'Inter-Regular' },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.sm, marginTop: SPACING.xs },
  cancelEditBtn: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, borderRadius: RADII.md },
  saveEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary[600],
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADII.md,
  },
  section: { paddingHorizontal: SPACING.lg, marginTop: SPACING.xl },
  sectionTitle: { marginBottom: SPACING.md },
  langRow: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.neutral[0],
    borderWidth: 1.5,
    borderColor: COLORS.neutral[200],
  },
  langPillActive: { backgroundColor: COLORS.primary[600], borderColor: COLORS.primary[600] },
  noEventsBox: {
    backgroundColor: COLORS.neutral[0],
    borderRadius: RADII.lg,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
  },
  myEventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.neutral[0],
    borderRadius: RADII.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
  },
  myEventLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  aboutHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  aboutText: { marginBottom: SPACING.xs },
  accountSelector: { flexDirection: 'row', gap: SPACING.sm, paddingVertical: SPACING.xs },
  accountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.neutral[50],
    borderWidth: 1.5,
    borderColor: COLORS.neutral[200],
  },
  accountPillActive: {
    backgroundColor: COLORS.primary[600],
    borderColor: COLORS.primary[600],
  },
  businessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.accent[50],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADII.pill,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.live[50],
  },
});
