import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { Text } from '../../components';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import {
  X,
  Calendar,
  TrendingDown,
  TrendingUp,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Scale,
  FileDown,
} from 'lucide-react-native';
import { BillService } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { useCompany } from '../../context/CompanyContext';
import { formatCurrency } from '../../i18n/translations';
import Toast from 'react-native-toast-message';
import DateTimePicker from '@react-native-community/datetimepicker';
import { exportLedgerPDF } from './ledgerPDF';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Party {
  id: number;
  name: string;
}

interface LedgerEntry {
  id: number;
  bill_date: string;
  type: 'sell' | 'purchase' | 'sell_return' | 'purchase_return';
  net_amount?: number;
  note?: string | null;
  debit: number;
  credit: number;
  label: string;
}

interface MonthGroup {
  monthKey: string;
  monthLabel: string;
  entries: LedgerEntry[];
  totalDebit: number;
  totalCredit: number;
}

interface Props {
  visible: boolean;
  party: Party | null;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  return `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year}`;
}

function getMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatSignedCurrency(amount: number): string {
  const isNegative = amount < 0;
  const absFormatted = Math.abs(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${isNegative ? '-' : ''}₹${absFormatted}`;
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

// sell            -> Credit
// sell_return     -> Debit
// purchase        -> Debit
// purchase_return -> Credit
function classifyBill(bill: any): { debit: number; credit: number; label: string } {
  const amount = parseFloat(bill.net_amount ?? '0');
  switch (bill.type) {
    case 'sell':            return { debit: 0,      credit: amount, label: 'Sales'            };
    case 'sell_return':     return { debit: amount, credit: 0,      label: 'Sales Return'      };
    case 'purchase':        return { debit: amount, credit: 0,      label: 'Purchase'          };
    case 'purchase_return': return { debit: 0,      credit: amount, label: 'Purchase Return'   };
    default:                return { debit: 0,      credit: amount, label: bill.type           };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

// Company display names
const COMPANY_LABELS: Record<string, string> = {
  acp:      'Interior Gallery (ACP)',
  handles:  'Interior Gallery (Handles)',
  interior: 'Interior Gallery',
};

const PartyLedgerModal: React.FC<Props> = ({ visible, party, onClose }) => {
  const { language } = useLanguage();
  const { company } = useCompany();
  const insets = useSafeAreaInsets();

  const defaultEnd = endOfDay(new Date());
  const defaultStart = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  const [startDate, setStartDate] = useState<Date>(defaultStart);
  const [endDate, setEndDate] = useState<Date>(defaultEnd);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());

  const fetchLedger = useCallback(async () => {
    if (!party) return;
    try {
      setLoading(true);
      const res = await BillService.getBills({
        party_id: party.id,
        endDate: endOfDay(endDate).toISOString(),
      });
      setBills(res.data ?? []);
    } catch (e) {
      console.error('Ledger fetch error:', e);
      Toast.show({ type: 'error', text1: 'Failed to load ledger' });
    } finally {
      setLoading(false);
    }
  }, [party, endDate]);

  useEffect(() => {
    if (visible && party) {
      fetchLedger();
    }
  }, [visible, party, fetchLedger]);

  const {
    monthGroups,
    openingDebit,
    openingCredit,
    grandDebit,
    grandCredit,
    allEntries,
  } = useMemo(() => {
    const startBoundary = startOfDay(startDate).getTime();
    const endBoundary = endOfDay(endDate).getTime();

    let preDebit = 0;
    let preCredit = 0;
    const inRangeBills: any[] = [];

    for (const b of bills) {
      const bTime = new Date(b.bill_date).getTime();
      if (bTime < startBoundary) {
        const { debit, credit } = classifyBill(b);
        preDebit += debit;
        preCredit += credit;
      } else if (bTime <= endBoundary) {
        inRangeBills.push(b);
      }
    }

    // Net opening amount prior to startDate (including all earlier dates)
    const preNet = preDebit - preCredit;
    const openingDebit = preNet > 0 ? preNet : 0;
    const openingCredit = preNet < 0 ? Math.abs(preNet) : 0;

    const entries: LedgerEntry[] = inRangeBills.map((bill) => {
      const { debit, credit, label } = classifyBill(bill);
      return {
        id: bill.id,
        bill_date: bill.bill_date,
        type: bill.type,
        net_amount: bill.net_amount,
        note: bill.note,
        debit,
        credit,
        label,
      };
    });

    entries.sort((a, b) => new Date(a.bill_date).getTime() - new Date(b.bill_date).getTime());

    const groupMap = new Map<string, LedgerEntry[]>();
    for (const entry of entries) {
      const mk = getMonthKey(entry.bill_date);
      if (!groupMap.has(mk)) groupMap.set(mk, []);
      groupMap.get(mk)!.push(entry);
    }

    let periodDebit = 0;
    let periodCredit = 0;

    const monthGroups: MonthGroup[] = Array.from(groupMap.entries()).map(([mk, grpEntries]) => {
      const totalDebit  = grpEntries.reduce((s, e) => s + e.debit, 0);
      const totalCredit = grpEntries.reduce((s, e) => s + e.credit, 0);
      periodDebit  += totalDebit;
      periodCredit += totalCredit;
      return {
        monthKey: mk,
        monthLabel: getMonthLabel(mk),
        entries: [...grpEntries].reverse(),
        totalDebit,
        totalCredit,
      };
    });

    monthGroups.reverse();

    const grandDebit = openingDebit + periodDebit;
    const grandCredit = openingCredit + periodCredit;

    // Flat list in chronological order for PDF export
    const allEntries = [...entries];
    return {
      monthGroups,
      openingDebit,
      openingCredit,
      grandDebit,
      grandCredit,
      allEntries,
    };
  }, [bills, startDate, endDate]);

  const netBalance = grandDebit - grandCredit;

  // ── PDF Export ────────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!party || (allEntries.length === 0 && openingDebit === 0 && openingCredit === 0)) {
      Toast.show({ type: 'info', text1: 'Nothing to export', text2: 'No transactions or opening balance found.' });
      return;
    }
    try {
      setExporting(true);
      const companyName = 'Interior Gallery';
      await exportLedgerPDF({
        companyName,
        partyName: party.name,
        startDate,
        endDate,
        openingDebit,
        openingCredit,
        entries: allEntries,
        grandDebit,
        grandCredit,
      });
    } catch (e: any) {
      console.error('PDF export error:', e);
      Toast.show({ type: 'error', text1: 'Export Failed', text2: e?.message ?? 'Could not generate PDF' });
    } finally {
      setExporting(false);
    }
  };

  const toggleMonth = (monthKey: string) => {
    setCollapsedMonths((prev) => {
      const next = new Set(prev);
      next.has(monthKey) ? next.delete(monthKey) : next.add(monthKey);
      return next;
    });
  };

  const onChangeStart = (_: any, selected?: Date) => {
    setShowStartPicker(false);
    if (selected) setStartDate(startOfDay(selected));
  };
  const onChangeEnd = (_: any, selected?: Date) => {
    setShowEndPicker(false);
    if (selected) setEndDate(endOfDay(selected));
  };

  const renderEntry = (entry: LedgerEntry) => (
    <View key={entry.id} style={styles.entryRow}>
      <View style={styles.entryLeft}>
        <View style={[styles.entryDot, entry.debit > 0 ? styles.dotDebit : styles.dotCredit]} />
        <View style={styles.entryInfo}>
          <Text style={styles.entryLabel}>{entry.label}</Text>
          <Text style={styles.entryDate}>{formatDateDisplay(entry.bill_date)}</Text>
          {entry.note ? <Text style={styles.entryNote} numberOfLines={1}>{entry.note}</Text> : null}
        </View>
      </View>
      <View style={styles.entryAmounts}>
        <Text style={[styles.entryAmount, entry.debit > 0 ? styles.debitText : styles.zeroText]}>
          {entry.debit > 0 ? formatCurrency(entry.debit, language) : '—'}
        </Text>
        <Text style={[styles.entryAmount, entry.credit > 0 ? styles.creditText : styles.zeroText]}>
          {entry.credit > 0 ? formatCurrency(entry.credit, language) : '—'}
        </Text>
      </View>
    </View>
  );

  const renderMonthGroup = (group: MonthGroup) => {
    const isCollapsed = collapsedMonths.has(group.monthKey);
    return (
      <View key={group.monthKey} style={styles.monthBlock}>
        <TouchableOpacity style={styles.monthHeader} onPress={() => toggleMonth(group.monthKey)} activeOpacity={0.7}>
          <View style={styles.monthHeaderLeft}>
            {isCollapsed
              ? <ChevronRight size={16} color={theme.colors.textSecondary} />
              : <ChevronDown size={16} color={theme.colors.textSecondary} />}
            <Text style={styles.monthTitle}>{group.monthLabel}</Text>
          </View>
          <View style={styles.monthSummary}>
            <Text style={[styles.monthAmount, styles.debitText]}>{formatCurrency(group.totalDebit, language)}</Text>
            <Text style={styles.monthSumDivider}> / </Text>
            <Text style={[styles.monthAmount, styles.creditText]}>{formatCurrency(group.totalCredit, language)}</Text>
          </View>
        </TouchableOpacity>

        {!isCollapsed && (
          <View style={styles.entriesContainer}>
            {group.entries.map(renderEntry)}
            <View style={styles.monthSubtotalRow}>
              <Text style={styles.subtotalLabel}>Month Total</Text>
              <View style={styles.subtotalAmounts}>
                <Text style={[styles.subtotalAmount, styles.debitText]}>{formatCurrency(group.totalDebit, language)}</Text>
                <Text style={[styles.subtotalAmount, styles.creditText]}>{formatCurrency(group.totalCredit, language)}</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top']}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <BookOpen size={20} color={theme.colors.accent} />
            <View style={styles.headerText}>
              <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">{party?.name ?? ''}</Text>
              <Text style={styles.headerSubtitle} numberOfLines={1} ellipsizeMode="tail">Ledger Account</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.exportBtn, exporting && { opacity: 0.6 }]}
              onPress={handleExport}
              disabled={exporting}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {exporting
                ? <ActivityIndicator size="small" color="#FFF" />
                : <FileDown size={17} color="#FFF" />}
              <Text style={styles.exportBtnText}>PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Filter */}
        <View style={styles.filterCard}>
          <View style={styles.filterRow}>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>FROM</Text>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartPicker(true)}>
                <Calendar size={13} color={theme.colors.accent} />
                <Text style={styles.dateButtonText}>{formatDateDisplay(startDate.toISOString())}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.filterDivider} />
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>TO</Text>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndPicker(true)}>
                <Calendar size={13} color={theme.colors.accent} />
                <Text style={styles.dateButtonText}>{formatDateDisplay(endDate.toISOString())}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.applyButton} onPress={fetchLedger}>
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Column Headers */}
        <View style={styles.columnHeaders}>
          <Text style={styles.colHeader}>Particulars</Text>
          <View style={styles.colHeaderRight}>
            <Text style={[styles.colHeader, styles.debitText]}>Debit</Text>
            <Text style={[styles.colHeader, styles.creditText]}>Credit</Text>
          </View>
        </View>

        {/* Body */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading ledger...</Text>
          </View>
        ) : bills.length === 0 ? (
          <View style={styles.center}>
            <Scale size={48} color={theme.colors.border} />
            <Text style={styles.emptyTitle}>No Transactions Found</Text>
            <Text style={styles.emptySubtitle}>No records found for this party</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 100 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Top row: Opening Balance */}
            <View style={styles.openingRow}>
              <View style={styles.openingLeft}>
                <View style={styles.openingBadge}>
                  <Text style={styles.openingBadgeText}>OPENING</Text>
                </View>
                <View style={styles.entryInfo}>
                  <Text style={styles.openingLabel}>Opening Balance</Text>
                  <Text style={styles.openingDate}>{`Prior to ${formatDateDisplay(startDate.toISOString())}`}</Text>
                </View>
              </View>
              <View style={styles.entryAmounts}>
                <Text style={[styles.entryAmount, openingDebit > 0 ? styles.debitText : styles.zeroText, styles.openingAmount]}>
                  {openingDebit > 0 ? formatCurrency(openingDebit, language) : '—'}
                </Text>
                <Text style={[styles.entryAmount, openingCredit > 0 ? styles.creditText : styles.zeroText, styles.openingAmount]}>
                  {openingCredit > 0 ? formatCurrency(openingCredit, language) : '—'}
                </Text>
              </View>
            </View>

            {monthGroups.length === 0 ? (
              <View style={styles.emptyRangeBlock}>
                <Text style={styles.emptyRangeTitle}>No Transactions in Selected Period</Text>
                <Text style={styles.emptyRangeSubtitle}>
                  {`All activity occurred prior to ${formatDateDisplay(startDate.toISOString())}`}
                </Text>
              </View>
            ) : (
              monthGroups.map(renderMonthGroup)
            )}

            {/* Grand Total */}
            <View style={styles.grandTotalCard}>
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>Grand Total (Credit - Debit)</Text>
                <Text style={styles.grandTotalAmount}>
                  {formatSignedCurrency(grandCredit - grandDebit)}
                </Text>
              </View>
            </View>
          </ScrollView>
        )}

        {/* Date Pickers */}
        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onChangeStart}
            maximumDate={endDate}
          />
        )}
        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onChangeEnd}
            minimumDate={startDate}
            maximumDate={new Date()}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: theme.colors.background },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border, gap: 8 },
  headerLeft:       { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, flexShrink: 1 },
  headerText:       { flex: 1, flexShrink: 1 },
  headerTitle:      { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  headerSubtitle:   { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },
  headerActions:    { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  exportBtn:        { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.borderRadius.sm },
  exportBtnText:    { color: '#FFF', fontSize: 12, fontWeight: '700' },
  closeBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },

  filterCard:       { margin: theme.spacing.md, marginBottom: 0, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.md },
  filterRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterItem:       { flex: 1 },
  filterLabel:      { fontSize: 10, fontWeight: '700', color: theme.colors.textSecondary, letterSpacing: 0.8, marginBottom: 4 },
  dateButton:       { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.sm, paddingHorizontal: 8, paddingVertical: 8 },
  dateButtonText:   { fontSize: 11, color: theme.colors.text, fontWeight: '500' },
  filterDivider:    { width: 1, height: 36, backgroundColor: theme.colors.border, marginTop: 18 },
  applyButton:      { backgroundColor: theme.colors.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: theme.borderRadius.sm, marginTop: 18, alignItems: 'center', justifyContent: 'center' },
  applyButtonText:  { color: '#FFF', fontSize: 13, fontWeight: '700' },

  columnHeaders:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.md, paddingVertical: 10, marginTop: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  colHeader:        { fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  colHeaderRight:   { flexDirection: 'row', gap: 20 },

  scrollArea:       { flex: 1 },

  monthBlock:       { marginHorizontal: theme.spacing.md, marginTop: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, overflow: 'hidden' },
  monthHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F0F0F0', paddingHorizontal: theme.spacing.md, paddingVertical: 12 },
  monthHeaderLeft:  { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  monthTitle:       { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  monthSummary:     { flexDirection: 'row', alignItems: 'center' },
  monthAmount:      { fontSize: 12, fontWeight: '600' },
  monthSumDivider:  { fontSize: 12, color: theme.colors.textSecondary },

  entriesContainer: { backgroundColor: theme.colors.background },
  entryRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.md, paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.colors.border },
  entryLeft:        { flexDirection: 'row', alignItems: 'flex-start', flex: 1, gap: 10 },
  entryDot:         { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  dotDebit:         { backgroundColor: theme.colors.error },
  dotCredit:        { backgroundColor: theme.colors.success },
  entryInfo:        { flex: 1 },
  entryLabel:       { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  entryDate:        { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  entryNote:        { fontSize: 11, color: theme.colors.textSecondary, fontStyle: 'italic', marginTop: 2 },
  entryAmounts:     { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  entryAmount:      { fontSize: 12, fontWeight: '600', minWidth: 72, textAlign: 'right' },

  monthSubtotalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.md, paddingVertical: 10, backgroundColor: '#FAFAFA', borderTopWidth: 1, borderTopColor: theme.colors.border },
  subtotalLabel:    { fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  subtotalAmounts:  { flexDirection: 'row', gap: 8 },
  subtotalAmount:   { fontSize: 12, fontWeight: '700', minWidth: 72, textAlign: 'right' },

  grandTotalCard:   { margin: theme.spacing.md, marginTop: theme.spacing.lg, backgroundColor: '#FFFFFF', borderRadius: theme.borderRadius.md, borderWidth: 1.5, borderColor: '#000000', padding: theme.spacing.md, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  grandTotalRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grandTotalLabel:  { fontSize: 13, fontWeight: '700', color: '#000000', textTransform: 'uppercase', letterSpacing: 0.5 },
  grandTotalAmount: { fontSize: 18, fontWeight: '800', color: '#000000' },

  openingRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.md, paddingVertical: 12, backgroundColor: '#F5F5F5', borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  openingLeft:      { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  openingBadge:     { backgroundColor: theme.colors.primary, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  openingBadgeText: { fontSize: 9, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },
  openingLabel:     { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  openingDate:      { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  openingAmount:    { fontWeight: '700' },
  emptyRangeBlock:  { padding: theme.spacing.xl, alignItems: 'center', gap: 6 },
  emptyRangeTitle:  { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
  emptyRangeSubtitle:{ fontSize: 12, color: theme.colors.textSecondary, textAlign: 'center' },

  debitText:        { color: theme.colors.error },
  creditText:       { color: theme.colors.success },
  zeroText:         { color: theme.colors.textSecondary },
  center:           { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingBottom: 60 },
  loadingText:      { fontSize: 14, color: theme.colors.textSecondary, marginTop: 8 },
  emptyTitle:       { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  emptySubtitle:    { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center' },
});

export default PartyLedgerModal;
