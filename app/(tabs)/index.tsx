import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Keyboard,
  FlatList,
  ActivityIndicator,
  TextInput,
  ScrollView,
  LayoutAnimation,
  Platform,
  Modal,
} from 'react-native';
import { Search, MapPin, Navigation, X, ChevronUp, Store, Clock, ChevronRight } from 'lucide-react-native';
import { StarRatingDisplay } from '@/components/StarRating';
import { Avatar } from '@/components/Avatar';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { router, useFocusEffect } from 'expo-router';
import { useI18n } from '@/contexts/LanguageContext';
import { useLocation } from '@/hooks/useLocation';
import { supabase } from '@/lib/supabase';
import { buildMapHtml } from '@/lib/mapHtml';
import { searchPlace, type GeocodeResult } from '@/lib/geocode';
import { COLORS, SPACING, RADII, SHADOWS, CATEGORIES_COLORS } from '@/lib/theme';
import { isLive, formatDistance, timeUntil } from '@/lib/time';
import { getLocalEvents } from '@/lib/localEvents';
import { ThemedText } from '@/components/ThemedText';
import type { NearbyEvent } from '@/types/database';

interface GroupedMarker {
  id: string;
  lat: number;
  lng: number;
  color: string;
  live: boolean;
  title: string;
  avatarUrl: string | null;
  business: boolean;
  eventCount: number;
  events: NearbyEvent[];
  creatorUsername: string;
}

export default function MapScreen() {
  const { t } = useI18n();
  const { coords, granted, loading: locLoading, requestPermission } = useLocation();
  const webRef = useRef<WebView>(null);
  const [events, setEvents] = useState<NearbyEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [scheduleMarker, setScheduleMarker] = useState<GroupedMarker | null>(null);

  const lastCenter = useRef<{ lat: number; lng: number } | null>(null);

  const loadEvents = useCallback(
    async (lat: number, lng: number) => {
      setLoadingEvents(true);
      try {
        const { data, error } = await supabase.rpc('vibe_nearby_events', {
          p_lat: lat,
          p_lng: lng,
          p_radius_m: 25000,
        });
        if (!error && data && (data as NearbyEvent[]).length > 0) {
          setEvents(data as NearbyEvent[]);
          setLoadingEvents(false);
          return;
        }
      } catch {
        // fall through to local fallback
      }
      setEvents(getLocalEvents(lat, lng));
      setLoadingEvents(false);
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      requestPermission();
      if (lastCenter.current) {
        loadEvents(lastCenter.current.lat, lastCenter.current.lng);
      }
    }, [requestPermission, loadEvents]),
  );

  useEffect(() => {
    if (coords) {
      const c = { lat: coords.latitude, lng: coords.longitude };
      lastCenter.current = c;
      setCenter(c);
      loadEvents(c.lat, c.lng);
    }
  }, [coords, loadEvents]);

  const sendToMap = useCallback((msg: object) => {
    webRef.current?.postMessage(JSON.stringify(msg));
  }, []);

  useEffect(() => {
    if (center) {
      sendToMap({ type: 'center', lat: center.lat, lng: center.lng, zoom: 14 });
    }
  }, [center, sendToMap]);

  const groupedMarkers: GroupedMarker[] = (() => {
    const byCreator = new Map<string, NearbyEvent[]>();
    for (const e of events) {
      const key = e.creator_id;
      const arr = byCreator.get(key) ?? [];
      arr.push(e);
      byCreator.set(key, arr);
    }
    const result: GroupedMarker[] = [];
    for (const [, evts] of byCreator) {
      const first = evts[0];
      const anyLive = evts.some((e) => isLive(e.start_time));
      result.push({
        id: first.creator_id,
        lat: first.lat,
        lng: first.lng,
        color: CATEGORIES_COLORS[first.category] ?? COLORS.primary[600],
        live: anyLive,
        title: first.title,
        avatarUrl: first.creator_avatar_url,
        business: first.creator_account_type === 'business',
        eventCount: evts.length,
        events: evts.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()),
        creatorUsername: first.creator_username,
      });
    }
    return result;
  })();

  const markers = groupedMarkers.map((m) => ({
    id: m.id,
    lat: m.lat,
    lng: m.lng,
    color: m.color,
    live: m.live,
    title: m.title,
    avatarUrl: m.avatarUrl,
    business: m.business,
    eventCount: m.eventCount,
  }));

  useEffect(() => {
    sendToMap({ type: 'updateMarkers', markers });
  }, [markers, sendToMap]);

  const html = center
    ? buildMapHtml({
        initialLat: center.lat,
        initialLng: center.lng,
        markers,
        userLat: coords?.latitude,
        userLng: coords?.longitude,
        dark: true,
      })
    : null;

  async function doSearch(text: string) {
    setSearchText(text);
    if (text.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await searchPlace(text);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
  }

  function selectResult(r: GeocodeResult) {
    Keyboard.dismiss();
    setShowSearch(false);
    setSearchText(r.displayName.split(',')[0]);
    setSearchResults([]);
    setCenter({ lat: r.lat, lng: r.lng });
    lastCenter.current = { lat: r.lat, lng: r.lng };
    loadEvents(r.lat, r.lng);
  }

  function goMyLocation() {
    if (coords) {
      setCenter({ lat: coords.latitude, lng: coords.longitude });
      lastCenter.current = { lat: coords.latitude, lng: coords.longitude };
      loadEvents(coords.latitude, coords.longitude);
      sendToMap({ type: 'setUser', lat: coords.latitude, lng: coords.longitude });
    }
  }

  function handleMessage(e: WebViewMessageEvent) {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === 'markerClick' && msg.id) {
        const found = groupedMarkers.find((m) => m.id === msg.id);
        if (found) {
          setScheduleMarker(found);
        }
      }
    } catch {
      // ignore
    }
  }

  function toggleSheet() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSheetOpen((v) => !v);
  }

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search color={COLORS.neutral[400]} size={20} />
          <TextInput
            value={searchText}
            onChangeText={doSearch}
            placeholder={t('map.searchPlaceholder')}
            placeholderTextColor={COLORS.neutral[400]}
            style={styles.searchInput}
            onFocus={() => setShowSearch(true)}
          />
          {searchText.length > 0 && (
            <Pressable
              onPress={() => {
                setSearchText('');
                setSearchResults([]);
              }}
            >
              <X color={COLORS.neutral[400]} size={18} />
            </Pressable>
          )}
        </View>

        {showSearch && (
          <View style={styles.searchResults}>
            {searching && <ActivityIndicator color={COLORS.primary[600]} style={{ padding: SPACING.md }} />}
            {!searching && searchResults.length === 0 && searchText.length >= 3 && (
              <ThemedText variant="muted" color={COLORS.neutral[500]} style={styles.noResultText}>
                {t('map.searchError')}
              </ThemedText>
            )}
            <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
              {searchResults.map((r, i) => (
                <Pressable
                  key={i}
                  style={({ pressed }) => [styles.resultItem, pressed && { opacity: 0.6 }]}
                  onPress={() => selectResult(r)}
                >
                  <MapPin color={COLORS.primary[600]} size={18} />
                  <ThemedText variant="label" color={COLORS.neutral[700]} style={styles.resultText} numberOfLines={2}>
                    {r.displayName}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Map */}
      <View style={styles.mapWrap}>
        {!html || locLoading ? (
          <View style={styles.mapLoading}>
            <ActivityIndicator size="large" color={COLORS.primary[600]} />
            <ThemedText variant="muted" color={COLORS.neutral[500]} style={{ marginTop: SPACING.md }}>
              {t('map.loading')}
            </ThemedText>
          </View>
        ) : (
          <WebView
            ref={webRef}
            source={{ html }}
            style={styles.map}
            onMessage={handleMessage}
            javaScriptEnabled
            originWhitelist={['*']}
            scrollEnabled={false}
          />
        )}

        {/* My location button */}
        {coords && (
          <Pressable style={styles.myLocBtn} onPress={goMyLocation}>
            <Navigation color={COLORS.primary[600]} size={22} />
          </Pressable>
        )}

        {/* Location denied banner */}
        {!granted && !locLoading && (
          <View style={styles.deniedBanner}>
            <ThemedText variant="label" color={COLORS.neutral[700]}>
              {t('map.locationDenied')}
            </ThemedText>
            <Pressable onPress={requestPermission} style={styles.retryBtn}>
              <ThemedText color={COLORS.primary[600]} weight="semibold" size={13}>
                {t('common.retry')}
              </ThemedText>
            </Pressable>
          </View>
        )}
      </View>

      {/* Bottom sheet */}
      <View style={[styles.sheet, sheetOpen ? styles.sheetOpen : styles.sheetClosed]}>
        <Pressable style={styles.sheetHandle} onPress={toggleSheet}>
          <View style={styles.handleBar} />
          <View style={styles.sheetHeaderRow}>
            <ThemedText variant="h3" color={COLORS.neutral[900]}>
              {t('map.nearbyEvents')}
            </ThemedText>
            <ChevronUp
              color={COLORS.neutral[400]}
              size={22}
              style={{ transform: [{ rotate: sheetOpen ? '180deg' : '0deg' }] }}
            />
          </View>
        </Pressable>

        {sheetOpen && (
          <FlatList
            data={events}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <EventCard event={item} t={t} />}
            ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
            ListEmptyComponent={
              loadingEvents ? (
                <ActivityIndicator color={COLORS.primary[600]} style={{ padding: SPACING.xl }} />
              ) : (
                <View style={styles.emptyState}>
                  <ThemedText variant="h3" color={COLORS.neutral[400]} align="center">
                    {t('map.noEvents')}
                  </ThemedText>
                  <ThemedText variant="muted" color={COLORS.neutral[400]} align="center" style={{ marginTop: SPACING.xs }}>
                    {t('map.noEventsHint')}
                  </ThemedText>
                </View>
              )
            }
            contentContainerStyle={styles.sheetList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Schedule popup */}
      <SchedulePopup marker={scheduleMarker} onClose={() => setScheduleMarker(null)} t={t} />
    </View>
  );
}

function SchedulePopup({
  marker,
  onClose,
  t,
}: {
  marker: GroupedMarker | null;
  onClose: () => void;
  t: (k: string, p?: Record<string, string | number>) => string;
}) {
  if (!marker) return null;

  return (
    <Modal visible={!!marker} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.popupOverlay} onPress={onClose}>
        <Pressable style={styles.popupSheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.popupHandle} />

          {/* Profile header */}
          <View style={styles.popupProfile}>
            <Avatar url={marker.avatarUrl} username={marker.creatorUsername} size={52} business={marker.business} />
            <View style={styles.popupProfileInfo}>
              <View style={styles.popupNameRow}>
                <ThemedText variant="h3" color={COLORS.neutral[900]} weight="semibold" numberOfLines={1}>
                  {marker.creatorUsername}
                </ThemedText>
                {marker.business && (
                  <View style={styles.popupBusinessBadge}>
                    <Store color={COLORS.accent[500]} size={13} />
                    <ThemedText color={COLORS.accent[500]} weight="semibold" size={10}>
                      {t('profile.business')}
                    </ThemedText>
                  </View>
                )}
              </View>
              {marker.events[0]?.address_text && (
                <View style={styles.popupAddr}>
                  <MapPin color={COLORS.neutral[400]} size={13} />
                  <ThemedText variant="muted" color={COLORS.neutral[500]} numberOfLines={1}>
                    {marker.events[0].address_text}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>

          <ThemedText variant="label" color={COLORS.neutral[600]} weight="medium" style={{ marginTop: SPACING.md, marginBottom: SPACING.xs }}>
            {t('map.eventsAtLocation')}
          </ThemedText>

          {/* Event schedule list */}
          <FlatList
            data={marker.events}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <ScheduleEventRow event={item} t={t} />}
            ItemSeparatorComponent={() => <View style={styles.scheduleSeparator} />}
            showsVerticalScrollIndicator={false}
            style={styles.scheduleList}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ScheduleEventRow({
  event,
  t,
}: {
  event: NearbyEvent;
  t: (k: string, p?: Record<string, string | number>) => string;
}) {
  const live = isLive(event.start_time);
  const remaining = timeUntil(event.end_time);
  const remainingLabel = remaining
    ? `${remaining.value}${remaining.unit === 'min' ? t('common.minutes') : remaining.unit === 'h' ? t('common.hours') : t('common.days')}`
    : '';

  return (
    <Pressable
      style={({ pressed }) => [styles.scheduleRow, pressed && { opacity: 0.7 }]}
      onPress={() => router.push(`/event/${event.id}`)}
    >
      <View style={[styles.scheduleDot, { backgroundColor: CATEGORIES_COLORS[event.category] ?? COLORS.primary[600] }]} />
      <View style={styles.scheduleContent}>
        <View style={styles.scheduleTopRow}>
          <ThemedText variant="label" color={COLORS.neutral[900]} weight="semibold" numberOfLines={1} style={{ flex: 1 }}>
            {event.title}
          </ThemedText>
          {live ? (
            <View style={styles.scheduleLiveBadge}>
              <View style={styles.scheduleLiveDot} />
              <ThemedText color={COLORS.live[600]} weight="bold" size={10}>
                {t('map.now').toUpperCase()}
              </ThemedText>
            </View>
          ) : null}
        </View>
        <View style={styles.scheduleTimeRow}>
          <Clock color={COLORS.neutral[400]} size={12} />
          <ThemedText variant="caption" color={COLORS.neutral[500]}>
            {live && remainingLabel
              ? `${t('map.endsIn')} ${remainingLabel}`
              : formatDistance(event.distance_m)}
          </ThemedText>
          {event.rating_count > 0 && (
            <StarRatingDisplay rating={event.avg_rating} count={event.rating_count} size={11} />
          )}
        </View>
      </View>
      <ChevronRight color={COLORS.neutral[300]} size={18} />
    </Pressable>
  );
}

function EventCard({ event, t }: { event: NearbyEvent; t: (k: string, p?: Record<string, string | number>) => string }) {
  const live = isLive(event.start_time);
  const remaining = timeUntil(event.end_time);
  const remainingLabel = remaining
    ? `${remaining.value}${remaining.unit === 'min' ? t('common.minutes') : remaining.unit === 'h' ? t('common.hours') : t('common.days')}`
    : '';

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
      onPress={() => router.push(`/event/${event.id}`)}
    >
      <View style={styles.cardTop}>
        <View style={[styles.categoryDot, { backgroundColor: CATEGORIES_COLORS[event.category] ?? COLORS.primary[600] }]} />
        <ThemedText variant="label" color={COLORS.neutral[500]} weight="medium">
          {event.category}
        </ThemedText>
        {live ? (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <ThemedText color={COLORS.live[600]} weight="bold" size={11}>
              {t('map.now').toUpperCase()}
            </ThemedText>
          </View>
        ) : (
          <View style={styles.soonBadge}>
            <ThemedText color={COLORS.primary[700]} weight="semibold" size={11}>
              {t('map.soon').toUpperCase()}
            </ThemedText>
          </View>
        )}
      </View>

      <ThemedText variant="h3" color={COLORS.neutral[900]} numberOfLines={1} style={{ marginTop: SPACING.xs }}>
        {event.title}
      </ThemedText>

      {event.address_text && (
        <View style={styles.cardAddr}>
          <MapPin color={COLORS.neutral[400]} size={14} />
          <ThemedText variant="muted" color={COLORS.neutral[500]} numberOfLines={1}>
            {event.address_text}
          </ThemedText>
        </View>
      )}

      {event.rating_count > 0 && (
        <View style={styles.cardRating}>
          <StarRatingDisplay rating={event.avg_rating} count={event.rating_count} size={13} />
        </View>
      )}

      <View style={styles.cardBottom}>
        <ThemedText variant="caption" color={COLORS.neutral[500]}>
          {t('event.by', { name: event.creator_username })}
        </ThemedText>
        <View style={styles.cardStats}>
          {live && remainingLabel ? (
            <ThemedText variant="caption" color={COLORS.live[600]} weight="semibold">
              {t('map.endsIn')} {remainingLabel}
            </ThemedText>
          ) : null}
          <ThemedText variant="caption" color={COLORS.neutral[500]}>
            {formatDistance(event.distance_m)}
          </ThemedText>
          {event.going_count > 0 && (
            <ThemedText variant="caption" color={COLORS.success[600]} weight="medium">
              {event.going_count} {t('event.going').toLowerCase()}
            </ThemedText>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const SHEET_CLOSED = 80;
const SHEET_OPEN = 480;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.neutral[50] },
  searchContainer: {
    position: 'absolute',
    top: 56,
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 30,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.neutral[0],
    borderRadius: RADII.lg,
    paddingHorizontal: SPACING.md,
    height: 52,
    ...SHADOWS.md,
  },
  searchInput: { flex: 1, fontSize: 16, color: COLORS.neutral[900], fontFamily: 'Inter-Regular' },
  searchResults: {
    marginTop: SPACING.xs,
    backgroundColor: COLORS.neutral[0],
    borderRadius: RADII.lg,
    padding: SPACING.sm,
    maxHeight: 280,
    ...SHADOWS.md,
  },
  noResultText: { padding: SPACING.md, textAlign: 'center' },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADII.md,
  },
  resultText: { flex: 1 },
  mapWrap: { flex: 1 },
  map: { flex: 1 },
  mapLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  myLocBtn: {
    position: 'absolute',
    bottom: SPACING.md,
    right: SPACING.md,
    width: 48,
    height: 48,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.neutral[0],
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  deniedBanner: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    right: SPACING.md,
    backgroundColor: COLORS.warning[100],
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOWS.sm,
  },
  retryBtn: { padding: SPACING.xs },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.neutral[0],
    borderTopLeftRadius: RADII.xl,
    borderTopRightRadius: RADII.xl,
    ...SHADOWS.lg,
    paddingBottom: Platform.OS === 'ios' ? 0 : 0,
  },
  sheetClosed: { height: SHEET_CLOSED },
  sheetOpen: { height: SHEET_OPEN },
  sheetHandle: {
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.neutral[300],
    alignSelf: 'center',
    marginBottom: SPACING.sm,
  },
  sheetHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetList: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg },
  card: {
    backgroundColor: COLORS.neutral[50],
    borderRadius: RADII.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  categoryDot: { width: 10, height: 10, borderRadius: 5 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    backgroundColor: COLORS.live[50],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADII.pill,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.live[500] },
  soonBadge: {
    marginLeft: 'auto',
    backgroundColor: COLORS.primary[50],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADII.pill,
  },
  cardAddr: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: SPACING.xs },
  cardRating: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.xs },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral[200],
  },
  cardStats: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  emptyState: { paddingVertical: SPACING.xxl, alignItems: 'center', paddingHorizontal: SPACING.xl },
  // Schedule popup
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  popupSheet: {
    backgroundColor: COLORS.neutral[0],
    borderTopLeftRadius: RADII.xl,
    borderTopRightRadius: RADII.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
    maxHeight: '70%',
    ...SHADOWS.lg,
  },
  popupHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.neutral[300],
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  popupProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  popupProfileInfo: { flex: 1 },
  popupNameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  popupBusinessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.accent[50],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADII.pill,
  },
  popupAddr: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  scheduleList: { maxHeight: 320 },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  scheduleDot: { width: 8, height: 8, borderRadius: 4 },
  scheduleContent: { flex: 1 },
  scheduleTopRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  scheduleTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  scheduleLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.live[50],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADII.pill,
  },
  scheduleLiveDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: COLORS.live[500] },
  scheduleSeparator: { height: 1, backgroundColor: COLORS.neutral[200] },
});
