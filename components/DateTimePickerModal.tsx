import { useState } from 'react';
import { View, StyleSheet, Pressable, Modal, ScrollView } from 'react-native';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react-native';
import { COLORS, SPACING, RADII, FONT_SIZES } from '@/lib/theme';
import { ThemedText } from '@/components/ThemedText';

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  initialDate?: Date;
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function DatePickerModal({ visible, onClose, onConfirm, minDate, maxDate, initialDate }: DatePickerModalProps) {
  const today = new Date();
  const init = initialDate ?? today;
  const [viewYear, setViewYear] = useState(init.getFullYear());
  const [viewMonth, setViewMonth] = useState(init.getMonth());
  const [selected, setSelected] = useState<Date | null>(initialDate ?? null);

  const minTime = minDate?.getTime() ?? 0;
  const maxTime = maxDate?.getTime() ?? Infinity;

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  function buildDays(): (Date | null)[] {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const startWeekday = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(new Date(viewYear, viewMonth, d));
    return cells;
  }

  function isSameDay(a: Date | null, b: Date | null): boolean {
    if (!a || !b) return false;
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function isDisabled(d: Date): boolean {
    const t = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    return t < minTime || t > maxTime;
  }

  function handleConfirm() {
    if (selected) onConfirm(selected);
  }

  const days = buildDays();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Pressable style={styles.navBtn} onPress={prevMonth}>
              <ChevronLeft color={COLORS.neutral[700]} size={22} />
            </Pressable>
            <ThemedText variant="h3" color={COLORS.neutral[900]} weight="semibold">
              {MONTHS[viewMonth]} {viewYear}
            </ThemedText>
            <Pressable style={styles.navBtn} onPress={nextMonth}>
              <ChevronRight color={COLORS.neutral[700]} size={22} />
            </Pressable>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((d, i) => (
              <ThemedText key={i} variant="caption" color={COLORS.neutral[400]} align="center" style={styles.weekdayCell}>
                {d}
              </ThemedText>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {days.map((d, i) => {
              if (!d) return <View key={i} style={styles.dayCell} />;
              const disabled = isDisabled(d);
              const isSelected = isSameDay(d, selected);
              const isToday = isSameDay(d, today);
              return (
                <Pressable
                  key={i}
                  style={[
                    styles.dayCell,
                    isSelected && styles.daySelected,
                    disabled && styles.dayDisabled,
                  ]}
                  onPress={() => !disabled && setSelected(d)}
                >
                  <ThemedText
                    color={isSelected ? COLORS.neutral[0] : disabled ? COLORS.neutral[400] : COLORS.neutral[800]}
                    weight={isSelected ? 'bold' : isToday ? 'semibold' : 'regular'}
                    size={FONT_SIZES.md}
                    align="center"
                  >
                    {d.getDate()}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <ThemedText color={COLORS.neutral[500]} weight="medium">Cancelar</ThemedText>
            </Pressable>
            <Pressable style={styles.confirmBtn} onPress={handleConfirm} disabled={!selected}>
              <ThemedText color={COLORS.neutral[0]} weight="bold">Confirmar</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface TimePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (hour: number, minute: number) => void;
  initialHour?: number;
  initialMinute?: number;
}

export function TimePickerModal({ visible, onClose, onConfirm, initialHour, initialMinute }: TimePickerModalProps) {
  const [hour, setHour] = useState(initialHour ?? 19);
  const [minute, setMinute] = useState(initialMinute ?? 0);

  function adjust(field: 'hour' | 'minute', delta: number) {
    if (field === 'hour') {
      setHour((h) => (h + delta + 24) % 24);
    } else {
      setMinute((m) => (m + delta + 60) % 60);
    }
  }

  function handleConfirm() {
    onConfirm(hour, minute);
  }

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <ThemedText variant="h3" color={COLORS.neutral[900]} weight="semibold" align="center" style={{ marginBottom: SPACING.lg }}>
            Selecionar horario
          </ThemedText>

          <View style={styles.timeRow}>
            <View style={styles.timeColumn}>
              <Pressable style={styles.arrowBtn} onPress={() => adjust('hour', 1)}>
                <ChevronRight color={COLORS.neutral[500]} size={24} style={{ transform: [{ rotate: '-90deg' }] }} />
              </Pressable>
              <View style={styles.timeValueBox}>
                <ThemedText variant="display" color={COLORS.neutral[900]} weight="bold" align="center">
                  {pad(hour)}
                </ThemedText>
              </View>
              <Pressable style={styles.arrowBtn} onPress={() => adjust('hour', -1)}>
                <ChevronRight color={COLORS.neutral[500]} size={24} style={{ transform: [{ rotate: '90deg' }] }} />
              </Pressable>
              <ThemedText variant="caption" color={COLORS.neutral[400]} align="center" style={{ marginTop: SPACING.xs }}>
                Hora
              </ThemedText>
            </View>

            <ThemedText variant="display" color={COLORS.neutral[700]} weight="bold">
              :
            </ThemedText>

            <View style={styles.timeColumn}>
              <Pressable style={styles.arrowBtn} onPress={() => adjust('minute', 1)}>
                <ChevronRight color={COLORS.neutral[500]} size={24} style={{ transform: [{ rotate: '-90deg' }] }} />
              </Pressable>
              <View style={styles.timeValueBox}>
                <ThemedText variant="display" color={COLORS.neutral[900]} weight="bold" align="center">
                  {pad(minute)}
                </ThemedText>
              </View>
              <Pressable style={styles.arrowBtn} onPress={() => adjust('minute', -1)}>
                <ChevronRight color={COLORS.neutral[500]} size={24} style={{ transform: [{ rotate: '90deg' }] }} />
              </Pressable>
              <ThemedText variant="caption" color={COLORS.neutral[400]} align="center" style={{ marginTop: SPACING.xs }}>
                Min
              </ThemedText>
            </View>
          </View>

          <View style={styles.minutePresets}>
            {[0, 15, 30, 45].map((m) => (
              <Pressable
                key={m}
                style={[styles.minutePreset, minute === m && styles.minutePresetActive]}
                onPress={() => setMinute(m)}
              >
                <ThemedText
                  color={minute === m ? COLORS.neutral[0] : COLORS.neutral[500]}
                  weight="medium"
                  size={13}
                >
                  :{pad(m)}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <ThemedText color={COLORS.neutral[500]} weight="medium">Cancelar</ThemedText>
            </Pressable>
            <Pressable style={styles.confirmBtn} onPress={handleConfirm}>
              <ThemedText color={COLORS.neutral[0]} weight="bold">Confirmar</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    width: '88%',
    backgroundColor: COLORS.neutral[50],
    borderRadius: RADII.xl,
    padding: SPACING.lg,
    ...({ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 8 } as any),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  navBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  weekdayRow: { flexDirection: 'row', marginBottom: SPACING.xs },
  weekdayCell: { flex: 1, paddingVertical: SPACING.xs },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADII.md,
  },
  daySelected: { backgroundColor: COLORS.primary[600] },
  dayDisabled: { opacity: 0.3 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.sm, marginTop: SPACING.lg },
  cancelBtn: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, borderRadius: RADII.md },
  confirmBtn: {
    backgroundColor: COLORS.primary[600],
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADII.md,
  },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.lg },
  timeColumn: { alignItems: 'center', gap: SPACING.xs },
  arrowBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.neutral[100] },
  timeValueBox: {
    width: 80,
    height: 80,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.neutral[300],
  },
  minutePresets: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.sm, marginTop: SPACING.lg },
  minutePreset: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.neutral[100],
  },
  minutePresetActive: { backgroundColor: COLORS.primary[600] },
});
