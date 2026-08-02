import { useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Keyboard,
  Modal,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Search, MapPin, Navigation, X, Check } from 'lucide-react-native';
import { buildMapHtml } from '@/lib/mapHtml';
import { searchPlace, type GeocodeResult } from '@/lib/geocode';
import { reverseGeocode } from '@/lib/geocode';
import { useLocation } from '@/hooks/useLocation';
import { COLORS, SPACING, RADII, SHADOWS } from '@/lib/theme';
import { ThemedText } from '@/components/ThemedText';

interface MapPickerResult {
  lat: number;
  lng: number;
  address: string;
}

interface MapPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (result: MapPickerResult) => void;
  initialLat?: number;
  initialLng?: number;
}

export function MapPickerModal({ visible, onClose, onConfirm, initialLat, initialLng }: MapPickerModalProps) {
  const { coords } = useLocation();
  const webRef = useRef<WebView>(null);
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState('');
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [busy, setBusy] = useState(false);

  const startLat = initialLat ?? coords?.latitude ?? -11.8563;
  const startLng = initialLng ?? coords?.longitude ?? -55.5084;

  const html = buildMapHtml({
    initialLat: startLat,
    initialLng: startLng,
    pickMode: true,
    dark: true,
    userLat: coords?.latitude ?? startLat,
    userLng: coords?.longitude ?? startLng,
  });

  const sendToMap = useCallback((msg: object) => {
    webRef.current?.postMessage(JSON.stringify(msg));
  }, []);

  function handleMessage(e: WebViewMessageEvent) {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === 'pick') {
        setPicked({ lat: msg.lat, lng: msg.lng });
        fetchAddress(msg.lat, msg.lng);
      }
    } catch {}
  }

  async function fetchAddress(lat: number, lng: number) {
    setBusy(true);
    try {
      const addr = await reverseGeocode(lat, lng);
      setAddress(addr);
    } catch {
      setAddress('');
    }
    setBusy(false);
  }

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
    setPicked({ lat: r.lat, lng: r.lng });
    setAddress(r.displayName);
    sendToMap({ type: 'placePick', lat: r.lat, lng: r.lng });
  }

  function goMyLocation() {
    if (coords) {
      const c = { lat: coords.latitude, lng: coords.longitude };
      setPicked(c);
      sendToMap({ type: 'placePick', lat: c.lat, lng: c.lng });
      fetchAddress(c.lat, c.lng);
    }
  }

  function handleConfirm() {
    if (picked) {
      onConfirm({ lat: picked.lat, lng: picked.lng, address });
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.headerBtn} onPress={onClose}>
            <X color={COLORS.neutral[700]} size={24} />
          </Pressable>
          <ThemedText variant="h3" color={COLORS.neutral[900]} weight="semibold">
            Selecionar local
          </ThemedText>
          <Pressable style={styles.headerBtn} onPress={handleConfirm} disabled={!picked}>
            <Check color={picked ? COLORS.primary[600] : COLORS.neutral[400]} size={24} />
          </Pressable>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search color={COLORS.neutral[400]} size={20} />
            <TextInput
              value={searchText}
              onChangeText={doSearch}
              placeholder="Buscar endereco ou local..."
              placeholderTextColor={COLORS.neutral[400]}
              style={styles.searchInput}
              onFocus={() => setShowSearch(true)}
            />
            {searchText.length > 0 && (
              <Pressable onPress={() => { setSearchText(''); setSearchResults([]); }}>
                <X color={COLORS.neutral[400]} size={18} />
              </Pressable>
            )}
          </View>

          {showSearch && (
            <View style={styles.searchResults}>
              {searching && <ActivityIndicator color={COLORS.primary[600]} style={{ padding: SPACING.md }} />}
              {!searching && searchResults.length === 0 && searchText.length >= 3 && (
                <ThemedText variant="muted" color={COLORS.neutral[500]} style={styles.noResultText}>
                  Nenhum resultado encontrado
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

        <View style={styles.mapWrap}>
          <WebView
            ref={webRef}
            source={{ html }}
            style={styles.map}
            onMessage={handleMessage}
            javaScriptEnabled
            originWhitelist={['*']}
            scrollEnabled={false}
          />

          <Pressable style={styles.myLocBtn} onPress={goMyLocation}>
            <Navigation color={COLORS.primary[600]} size={22} />
          </Pressable>
        </View>

        <View style={styles.bottomBar}>
          {picked ? (
            <>
              <View style={styles.pickedInfo}>
                <MapPin color={COLORS.primary[600]} size={18} />
                {busy ? (
                  <ActivityIndicator color={COLORS.primary[600]} size="small" />
                ) : (
                  <ThemedText variant="label" color={COLORS.neutral[700]} numberOfLines={2} style={{ flex: 1 }}>
                    {address || `${picked.lat.toFixed(5)}, ${picked.lng.toFixed(5)}`}
                  </ThemedText>
                )}
              </View>
              <Pressable style={styles.confirmBtn} onPress={handleConfirm}>
                <ThemedText color={COLORS.neutral[0]} weight="bold">
                  Confirmar
                </ThemedText>
              </Pressable>
            </>
          ) : (
            <ThemedText variant="muted" color={COLORS.neutral[500]} align="center">
              Toque no mapa para selecionar o local
            </ThemedText>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.neutral[0] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: 56,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral[200],
  },
  headerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  searchContainer: {
    position: 'relative',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    zIndex: 30,
    backgroundColor: COLORS.neutral[0],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.neutral[50],
    borderRadius: RADII.lg,
    paddingHorizontal: SPACING.md,
    height: 50,
    borderWidth: 1.5,
    borderColor: COLORS.neutral[200],
  },
  searchInput: { flex: 1, fontSize: 16, color: COLORS.neutral[900], fontFamily: 'Inter-Regular' },
  searchResults: {
    marginTop: SPACING.xs,
    backgroundColor: COLORS.neutral[50],
    borderRadius: RADII.lg,
    padding: SPACING.sm,
    maxHeight: 260,
    borderWidth: 1.5,
    borderColor: COLORS.neutral[200],
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
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: 24,
    backgroundColor: COLORS.neutral[0],
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral[200],
    minHeight: 80,
  },
  pickedInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  confirmBtn: {
    backgroundColor: COLORS.primary[600],
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADII.md,
  },
});
