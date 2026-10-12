import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import {
  X,
  Calendar,
  FileDown,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronRight,
  Scale,
  Users,
  Search,
} from 'lucide-react-native';
import { theme } from '../../theme';
import { BillService, PartyService } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { useCompany } from '../../context/CompanyContext';
import {
  exportAllPartiesLedgerPDF,
  MonthSummaryGroup,
  PartyMonthSummary,
} from './allPartiesLedgerPDF';

// ─────────────────────────────────────────────────────────────────────────────
// Types & Helpers
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const mIndex = parseInt(monthStr, 10) - 1;
  return `${MONTH_NAMES[mIndex]} ${yearStr}`;
}

function formatDateDisplay(isoStr: string): string {
  const d = new Date(isoStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = MONTH_NAMES[d.getMonth()].slice(0, 3);
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function formatCurrency(amount: number, language: string): string {
  const formatted = Math.abs(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return language === 'gu' ? `₹ ${formatted}` : `₹${formatted}`;
}

function formatSignedCurrency(amount: number): string {
  const isNegative = amount < 0;
  const absFormatted = Math.abs(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${isNegative ? '-' : ''}₹${absFormatted}`;
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

// Reversed mapping:
// sell            -> Credit (Revenue earned)
// sell_return     -> Debit
// purchase        -> Debit (Cost incurred)
// purchase_return -> Credit
function classifyBill(bill: any): { debit: number; credit: number } {
  const amount = parseFloat(bill.net_amount ?? '0');
  switch (bill.type) {
    case 'sell':            return { debit: 0,      credit: amount };
    case 'sell_return':     return { debit: amount, credit: 0      };
    case 'purchase':        return { debit: amount, credit: 0      };
    case 'purchase_return': return { debit: 0,      credit: amount };
    default:                return { debit: 0,      credit: amount };
  }
}

const COMPANY_LABELS: Record<string, string> = {
  acp:      'Interior Gallery (ACP)',
  handles:  'Interior Gallery (Handles)',
  interior: 'Interior Gallery',
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const AllPartiesLedgerModal: React.FC<Props> = ({ visible, onClose }) => {
  const { language } = useLanguage();
  const { company } = useCompany();
  const insets = useSafeAreaInsets();

  // Default: start of current month to end of today
  const defaultEnd = endOfDay(new Date());
  const defaultStart = (() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  const [startDate, setStartDate] = useState<Date>(defaultStart);
  const [endDate, setEndDate] = useState<Date>(defaultEnd);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [bills, setBills] = useState<any[]>([]);
  const [partiesMap, setPartiesMap] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());

  const fetchLedgerData = useCallback(async () => {
    try {
      setLoading(true);
      const [billsRes, partiesRes] = await Promise.all([
        BillService.getBills({
          startDate: startOfDay(startDate).toISOString(),
          endDate: endOfDay(endDate).toISOString(),
        }),
        PartyService.getParties().catch(() => ({ data: [] })),
      ]);

      const pMap = new Map<number, string>();
      for (const p of partiesRes.data ?? []) {
        pMap.set(p.id, p.name);
      }
      setPartiesMap(pMap);
      setBills(billsRes.data ?? []);
    } catch (e) {
      console.error('All parties ledger fetch error:', e);
      Toast.show({ type: 'error', text1: 'Failed to load ledger data' });
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (visible) {
      fetchLedgerData();
    }
  }, [visible, fetchLedgerData]);

  // Aggregate bills by month and by party
  const { monthGroups, grandDebit, grandCredit, grandNetRevenue } = useMemo(() => {
    // Map: monthKey -> Map: partyId -> { partyId, partyName, debit, credit }
    const monthPartyMap = new Map<string, Map<number, { partyId: number; partyName: string; debit: number; credit: number }>>();

    for (const bill of bills) {
      const mk = getMonthKey(bill.bill_date);
      const partyId = bill.party_id || 0;
      const partyName = bill.parties?.name || partiesMap.get(partyId) || (partyId === 0 ? 'General Customer' : `Party #${partyId}`);

      if (!monthPartyMap.has(mk)) {
        monthPartyMap.set(mk, new Map());
      }
      const pMap = monthPartyMap.get(mk)!;
      if (!pMap.has(partyId)) {
        pMap.set(partyId, { partyId, partyName, debit: 0, credit: 0 });
      }

      const { debit, credit } = classifyBill(bill);
      const pRec = pMap.get(partyId)!;
      pRec.debit += debit;
      pRec.credit += credit;
    }

    let grandDebit = 0;
    let grandCredit = 0;

    const sortedMonthKeys = Array.from(monthPartyMap.keys()).sort().reverse();

    const groups: MonthSummaryGroup[] = sortedMonthKeys.map((mk) => {
      const pMap = monthPartyMap.get(mk)!;
      const allParties = Array.from(pMap.values());

      // Filter by search query if any
      const filteredParties = searchQuery.trim()
        ? allParties.filter((p) => p.partyName.toLowerCase().includes(searchQuery.toLowerCase().trim()))
        : allParties;

      // Sort parties by name
      filteredParties.sort((a, b) => a.partyName.localeCompare(b.partyName));

      const totalDebit = filteredParties.reduce((s, p) => s + p.debit, 0);
      const totalCredit = filteredParties.reduce((s, p) => s + p.credit, 0);

      grandDebit += totalDebit;
      grandCredit += totalCredit;

      return {
        monthKey: mk,
        monthLabel: getMonthLabel(mk),
        parties: filteredParties,
        totalDebit,
        totalCredit,
      };
    });

    const grandNetRevenue = grandCredit - grandDebit;

    return {
      monthGroups: groups,
      grandDebit,
      grandCredit,
      grandNetRevenue,
    };
  }, [bills, partiesMap, searchQuery]);

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

  const handleExport = async () => {
    if (monthGroups.length === 0 || (grandDebit === 0 && grandCredit === 0)) {
      Toast.show({ type: 'info', text1: 'Nothing to export', text2: 'No transactions found in this date range.' });
      return;
    }
    try {
      setExporting(true);
      const companyName = 'Interior Gallery';
      await exportAllPartiesLedgerPDF({
        companyName,
        startDate,
        endDate,
        monthGroups,
        grandDebit,
        grandCredit,
      });
    } catch (e: any) {
      console.error('All parties PDF export error:', e);
      Toast.show({ type: 'error', text1: 'Export Failed', text2: e?.message ?? 'Could not generate PDF' });
    } finally {
      setExporting(false);
    }
  };

  const renderPartyRow = (party: PartyMonthSummary) => (
    <View key={party.partyId} style={styles.partyRow}>
      <View style={styles.partyNameCol}>
        <View style={styles.partyDot} />
        <Text style={styles.partyNameText} numberOfLines={1}>
          {party.partyName}
        </Text>
      </View>
      <View style={styles.amountsCol}>
        <Text style={[styles.amountText, party.debit > 0 ? styles.debitText : styles.zeroText]}>
          {party.debit > 0 ? formatCurrency(party.debit, language) : '—'}
        </Text>
        <Text style={[styles.amountText, party.credit > 0 ? styles.creditText : styles.zeroText]}>
          {party.credit > 0 ? formatCurrency(party.credit, language) : '—'}
        </Text>
      </View>
    </View>
  );

  const renderMonthGroup = (group: MonthSummaryGroup) => {
    const isCollapsed = collapsedMonths.has(group.monthKey);
    return (
      <View key={group.monthKey} style={styles.monthBlock}>
        <TouchableOpacity
          style={styles.monthHeader}
          onPress={() => toggleMonth(group.monthKey)}
          activeOpacity={0.7}
        >
          <View style={styles.monthHeaderLeft}>
            {isCollapsed ? (
              <ChevronRight size={16} color={theme.colors.textSecondary} />
            ) : (
              <ChevronDown size={16} color={theme.colors.textSecondary} />
            )}
            <Text style={styles.monthTitle}>{group.monthLabel}</Text>
            <View style={styles.partyCountBadge}>
              <Text style={styles.partyCountText}>{group.parties.length} parties</Text>
            </View>
          </View>
          <View style={styles.monthSummary}>
            <Text style={[styles.monthAmount, styles.debitText]}>
              {formatCurrency(group.totalDebit, language)}
            </Text>
            <Text style={styles.monthSumDivider}> / </Text>
            <Text style={[styles.monthAmount, styles.creditText]}>
              {formatCurrency(group.totalCredit, language)}
            </Text>
          </View>
        </TouchableOpacity>

        {!isCollapsed && (
          <View style={styles.monthContent}>
            {group.parties.map(renderPartyRow)}

            {/* Month Subtotal */}
            <View style={styles.monthSubtotalRow}>
              <Text style={styles.subtotalLabel}>Month Total</Text>
              <View style={styles.amountsCol}>
                <Text style={[styles.subtotalAmount, styles.debitText]}>
                  {formatCurrency(group.totalDebit, language)}
                </Text>
                <Text style={[styles.subtotalAmount, styles.creditText]}>
                  {formatCurrency(group.totalCredit, language)}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconContainer}>
              <Users size={20} color={theme.colors.accent} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">All Parties Ledger</Text>
              <Text style={styles.headerSubtitle} numberOfLines={1} ellipsizeMode="tail">
                {COMPANY_LABELS[company ?? ''] ?? 'Interior Gallery'} · Revenue Statement
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.exportBtn}
              onPress={handleExport}
              disabled={exporting}
              activeOpacity={0.7}
            >
              {exporting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <FileDown size={15} color="#FFF" />
                  <Text style={styles.exportBtnText}>PDF</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
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
            <TouchableOpacity style={styles.applyButton} onPress={fetchLedgerData} activeOpacity={0.7}>
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search party */}
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Search size={16} color={theme.colors.textSecondary} />
            <TextInput
              placeholder="Filter by party name..."
              placeholderTextColor={theme.colors.textSecondary}
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={15} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Column Headers */}
        <View style={styles.columnHeaders}>
          <Text style={styles.colHeaderParty}>Party Name</Text>
          <View style={styles.colHeaderAmounts}>
            <Text style={[styles.colHeader, styles.debitText]}>Debit</Text>
            <Text style={[styles.colHeader, styles.creditText]}>Credit</Text>
          </View>
        </View>

        {/* Body */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Calculating all party ledgers...</Text>
          </View>
        ) : monthGroups.length === 0 ? (
          <View style={styles.center}>
            <Scale size={48} color={theme.colors.border} />
            <Text style={styles.emptyTitle}>No Transactions Found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting the date range filter</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 120 }}
            showsVerticalScrollIndicator={false}
          >
            {monthGroups.map(renderMonthGroup)}

            {/* Footer Grand Total Card */}
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
          />
        )}
        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onChangeEnd}
          />
        )}
      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    flexShrink: 1,
  },
  headerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5EBE1',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerText: {
    flex: 1,
    flexShrink: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.sm,
  },
  exportBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterCard: {
    margin: theme.spacing.md,
    marginBottom: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterItem: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  dateButtonText: {
    fontSize: 11,
    color: theme.colors.text,
    fontWeight: '500',
  },
  filterDivider: {
    width: 1,
    height: 36,
    backgroundColor: theme.colors.border,
    marginTop: 18,
  },
  applyButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.sm,
    marginTop: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },

  searchRow: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: 6,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 10,
    height: 38,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.text,
    paddingVertical: 0,
  },

  columnHeaders: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: '#FAFAFA',
  },
  colHeaderParty: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    flex: 1,
  },
  colHeaderAmounts: {
    flexDirection: 'row',
    gap: 12,
  },
  colHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    minWidth: 80,
    textAlign: 'right',
  },

  scrollArea: {
    flex: 1,
  },

  monthBlock: {
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
  },
  monthHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  monthTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  partyCountBadge: {
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  partyCountText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  monthSummary: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthAmount: {
    fontSize: 12,
    fontWeight: '600',
  },
  monthSumDivider: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },

  monthContent: {
    backgroundColor: theme.colors.background,
  },
  partyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  partyNameCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 8,
  },
  partyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.accent,
  },
  partyNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  amountsCol: {
    flexDirection: 'row',
    gap: 12,
  },
  amountText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 80,
    textAlign: 'right',
  },

  monthSubtotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  subtotalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtotalAmount: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 80,
    textAlign: 'right',
  },

  grandTotalCard: {
    margin: theme.spacing.md,
    marginTop: theme.spacing.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: '#000000',
    padding: theme.spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grandTotalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grandTotalAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
  },

  debitText: {
    color: theme.colors.error,
  },
  creditText: {
    color: theme.colors.success,
  },
  zeroText: {
    color: theme.colors.textSecondary,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 60,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});

export default AllPartiesLedgerModal;
