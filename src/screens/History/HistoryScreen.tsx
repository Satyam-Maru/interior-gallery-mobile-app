import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  TouchableOpacity, Modal, TextInput, ScrollView,
  BackHandler, Platform, KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import {
  Filter, X, ChevronDown, Search, Calendar,
  ArrowUpRight, ArrowDownLeft, RotateCcw, Clock,
  TrendingUp, TrendingDown, Wallet, CreditCard, Banknote, FileSpreadsheet, RotateCw
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BillService, PartyService, CreatePaymentPayload } from '../../services/api';
import Toast from 'react-native-toast-message';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useLanguage } from '../../context/LanguageContext';

type BillType = 'purchase' | 'sell' | 'purchase_return' | 'sell_return';

const TYPE_CONFIG: Record<BillType, { color: string; bg: string; icon: any; label: string }> = {
  purchase:         { color: '#dc3545', bg: '#dc354515', icon: ArrowDownLeft, label: 'Purchase' },
  sell:             { color: '#28a745', bg: '#28a74515', icon: ArrowUpRight,  label: 'Sell' },
  purchase_return:  { color: '#fd7e14', bg: '#fd7e1415', icon: RotateCcw,    label: 'Pur. Return' },
  sell_return:      { color: '#0d6efd', bg: '#0d6efd15', icon: RotateCcw,    label: 'Sell Return' },
};

const HistoryScreen = () => {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  // ── List state ───────────────────────────────────────────
  const [bills, setBills] = useState<any[]>([]);
  const [parties, setParties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // ── Filter state ─────────────────────────────────────────
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'date' | 'type' | 'party'>('date');
  const [activeFilter, setActiveFilter] = useState<'all' | 'custom'>('all');
  const [selectedType, setSelectedType] = useState<BillType | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<number | null>(null);
  const [customRange, setCustomRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    end: new Date(),
  });

  // Temp filter state (used inside modal before Apply)
  const [tempFilter, setTempFilter] = useState<'all' | 'custom'>('all');
  const [tempRange, setTempRange] = useState({ ...customRange });
  const [tempType, setTempType] = useState<BillType | null>(null);
  const [tempEntityId, setTempEntityId] = useState<number | null>(null);
  const [partySearch, setPartySearch] = useState('');
  const [showPicker, setShowPicker] = useState<{ show: boolean; type: 'start' | 'end' }>({ show: false, type: 'start' });

  // ── Bill detail state ────────────────────────────────────
  const [selectedBill, setSelectedBill] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── Payment form state ───────────────────────────────────
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState<'cash' | 'online'>('cash');
  const [payNote, setPayNote] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);

  // ── Totals ───────────────────────────────────────────────
  const [totals, setTotals] = useState({ sales: 0, purchases: 0, net: 0 });

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const sales = bills
      .filter(b => b.type === 'sell' || b.type === 'sell_return')
      .reduce((a, b) => a + parseFloat(b.net_amount || 0), 0);
    const purchases = bills
      .filter(b => b.type === 'purchase' || b.type === 'purchase_return')
      .reduce((a, b) => a + parseFloat(b.net_amount || 0), 0);
    setTotals({ sales, purchases, net: sales - purchases });
  }, [bills]);

  useEffect(() => {
    const back = () => {
      if (showPaymentModal) { setShowPaymentModal(false); return true; }
      if (selectedBill) { setSelectedBill(null); return true; }
      if (showFilterModal) { setShowFilterModal(false); return true; }
      return false;
    };
    const h = BackHandler.addEventListener('hardwareBackPress', back);
    return () => h.remove();
  }, [showPaymentModal, selectedBill, showFilterModal]);

  const fetchData = async (overrides?: any) => {
    try {
      setLoading(true);
      const params: any = {};
      const filter = overrides?.filter ?? activeFilter;
      const range = overrides?.range ?? customRange;
      const type = overrides?.type !== undefined ? overrides.type : selectedType;
      const entityId = overrides?.entityId !== undefined ? overrides.entityId : selectedEntityId;

      if (filter === 'custom') {
        params.startDate = range.start.toISOString();
        params.endDate = range.end.toISOString();
      }
      if (type) params.type = type;
      if (entityId) {
        params.party_id = entityId;
        params.entity_id = entityId;
      }

      const [billRes, entRes] = await Promise.all([
        BillService.getBills(params),
        PartyService.getParties(),
      ]);
      setBills(billRes.data);
      setParties(entRes.data);
    } catch {
      Toast.show({ type: 'error', text1: 'Fetch Failed', text2: 'Could not load bills' });
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setActiveFilter('all');
    setSelectedType(null);
    setSelectedEntityId(null);
    setTempFilter('all');
    setTempType(null);
    setTempEntityId(null);
    setSelectedBill(null);
  };

  const openFilter = () => {
    setTempFilter(activeFilter);
    setTempRange({ ...customRange });
    setTempType(selectedType);
    setTempEntityId(selectedEntityId);
    setShowFilterModal(true);
  };

  const applyFilter = () => {
    setActiveFilter(tempFilter);
    setCustomRange({ ...tempRange });
    setSelectedType(tempType);
    setSelectedEntityId(tempEntityId);
    setShowFilterModal(false);
    fetchData({
      filter: tempFilter,
      range: tempRange,
      type: tempType,
      entityId: tempEntityId,
    });
  };

  const openBillDetail = async (bill: any) => {
    try {
      setDetailLoading(true);
      setSelectedBill({ ...bill, _loading: true });
      const res = await BillService.getBillById(bill.id);
      setSelectedBill(res.data);
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Could not load bill details' });
      setSelectedBill(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) {
      Toast.show({ type: 'error', text1: 'Validation', text2: 'Enter a valid payment amount' });
      return;
    }
    if (amt > (selectedBill?.outstanding ?? 0) + 0.001) {
      Toast.show({ type: 'error', text1: 'Validation', text2: `Amount exceeds outstanding ₹${selectedBill?.outstanding?.toFixed(2)}` });
      return;
    }
    try {
      setPaySubmitting(true);
      await BillService.createPayment({
        bill_id: selectedBill.id,
        entity_id: selectedBill.entity_id,
        amount: amt,
        mode: payMode,
        note: payNote.trim() || undefined,
      });
      Toast.show({ type: 'success', text1: 'Payment Recorded', text2: `₹${amt.toFixed(2)} via ${payMode}` });
      setShowPaymentModal(false);
      setPayAmount('');
      setPayNote('');
      // Refresh detail
      const res = await BillService.getBillById(selectedBill.id);
      setSelectedBill(res.data);
      fetchData();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to record payment';
      Toast.show({ type: 'error', text1: 'Error', text2: msg });
    } finally {
      setPaySubmitting(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const rows = bills.map(b => ({
        'Bill #': b.id,
        Date: b.bill_date?.split('T')[0],
        Type: b.type,
        Party: b.parties?.name || b.entities?.name || '',
        'Total': parseFloat(b.total_amount || 0).toFixed(2),
        'Net Amount': parseFloat(b.net_amount || 0).toFixed(2),
        'Discounts': (b.discounts || []).join(', ') + '%',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Bills');
      const out = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const file = `${FileSystem.documentDirectory}Bills_${new Date().toISOString().split('T')[0]}.xlsx`;
      await FileSystem.writeAsStringAsync(file, out, { encoding: 'base64' });
      await Sharing.shareAsync(file, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Export Bills',
        UTI: 'com.microsoft.excel.xlsx',
      });
    } catch {
      Toast.show({ type: 'error', text1: 'Export Failed' });
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;

  const formatIST = (s: string) => {
    if (!s) return '—';
    try {
      let c = s.replace(' ', 'T');
      if (!c.includes('Z') && !c.includes('+')) c += 'Z';
      const d = new Date(c);
      if (isNaN(d.getTime())) return s;
      const ist = new Date(d.getTime() + 5.5 * 3600 * 1000);
      const day = String(ist.getUTCDate()).padStart(2, '0');
      const mon = String(ist.getUTCMonth() + 1).padStart(2, '0');
      const yr = ist.getUTCFullYear();
      let h = ist.getUTCHours();
      const m = String(ist.getUTCMinutes()).padStart(2, '0');
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${day}/${mon}/${yr} • ${h}:${m} ${ampm}`;
    } catch { return s; }
  };

  const activeFilterCount =
    (activeFilter === 'custom' ? 1 : 0) + (selectedType ? 1 : 0) + (selectedEntityId ? 1 : 0);

  const filteredParties = parties.filter(p =>
    p.name.toLowerCase().includes(partySearch.toLowerCase())
  );

  // ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t.history}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.refreshButton} onPress={() => fetchData()} activeOpacity={0.7}>
            <RotateCw size={18} color={theme.colors.primary} />
          </TouchableOpacity>
          <Clock size={22} color={theme.colors.textSecondary} />
        </View>
      </View>

      {/* Filter bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterChip, activeFilterCount > 0 && styles.filterChipActive]}
          onPress={openFilter}
        >
          <Filter size={16} color={activeFilterCount > 0 ? '#fff' : theme.colors.primary} />
          <Text style={[styles.filterText, activeFilterCount > 0 && { color: '#fff' }]}>
            {t.filters} {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
          </Text>
          <ChevronDown size={14} color={activeFilterCount > 0 ? '#fff' : theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Bills list */}
      <FlatList
        data={bills}
        keyExtractor={b => String(b.id)}
        onRefresh={fetchData}
        refreshing={loading}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? <Text style={styles.emptyText}>{t.noBills}</Text> : null
        }
        ListHeaderComponent={() => (
          <View style={styles.summaryContainer}>
            {/* Summary cards */}
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <View style={styles.summaryCardHeader}>
                  <TrendingUp size={14} color={theme.colors.success} />
                  <Text style={styles.summaryCardLabel}>{t.totalSales}</Text>
                </View>
                <Text style={[styles.summaryCardValue, { color: theme.colors.success }]}>
                  ₹{totals.sales.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <View style={styles.summaryCardHeader}>
                  <TrendingDown size={14} color={theme.colors.error} />
                  <Text style={styles.summaryCardLabel}>{t.totalBuy}</Text>
                </View>
                <Text style={[styles.summaryCardValue, { color: theme.colors.error }]}>
                  ₹{totals.purchases.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </Text>
              </View>
            </View>

            {/* Net + export */}
            <View style={[styles.netCard, { backgroundColor: totals.net >= 0 ? theme.colors.success + '10' : theme.colors.error + '10' }]}>
              <View style={styles.netInfo}>
                <Wallet size={18} color={totals.net >= 0 ? theme.colors.success : theme.colors.error} />
                <View>
                  <Text style={styles.netLabel}>{t.netBalance}</Text>
                  <Text style={[styles.netValue, { color: totals.net >= 0 ? theme.colors.success : theme.colors.error }]}>
                    ₹{Math.abs(totals.net).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    {totals.net < 0 ? ' (deficit)' : ''}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.exportBtn} onPress={handleExport} disabled={exporting}>
                {exporting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <><FileSpreadsheet size={16} color="#fff" /><Text style={styles.exportBtnText}>{t.exportBtn}</Text></>
                }
              </TouchableOpacity>
            </View>
          </View>
        )}
        renderItem={({ item }) => {
          const cfg = TYPE_CONFIG[item.type as BillType] || TYPE_CONFIG.purchase;
          const Icon = cfg.icon;
          const outstanding = parseFloat(item.net_amount || 0);
          return (
            <TouchableOpacity style={styles.billCard} onPress={() => openBillDetail(item)}>
              <View style={[styles.typeIndicator, { backgroundColor: cfg.bg }]}>
                <Icon size={18} color={cfg.color} />
              </View>
              <View style={styles.billDetails}>
                <Text style={styles.billParty}>{item.parties?.name || item.entities?.name || '—'}</Text>
                <View style={styles.billMeta}>
                  <View style={[styles.typeBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.typeBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                  <Text style={styles.billDate}>{formatIST(item.bill_date)}</Text>
                  {item.original_bill_id && (
                    <Text style={[styles.billDate, { color: theme.colors.primary, fontWeight: '700' }]}>
                      (Ref #{item.original_bill_id})
                    </Text>
                  )}
                </View>
                {item.bill_items?.length > 0 && (
                  <Text style={styles.billItemCount}>{item.bill_items.length} item(s)</Text>
                )}
              </View>
              <View style={styles.billAmount}>
                <Text style={[styles.billNet, { color: cfg.color }]}>
                  ₹{parseFloat(item.adjusted_net_amount ?? item.net_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
                {item.total_returned > 0 && (
                  <Text style={[styles.billDiscount, { color: theme.colors.error }]}>
                    -₹{parseFloat(item.total_returned).toFixed(0)} {t.returnsApplied}
                  </Text>
                )}
                {(item.discounts?.length > 0 && item.discounts.some((d: number) => d > 0)) && (
                  <Text style={styles.billDiscount}>-{item.discounts.join('%, ')}%</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* ─── Bill Detail Modal ─── */}
      <Modal
        visible={!!selectedBill}
        animationType="slide"
        onRequestClose={() => setSelectedBill(null)}
      >
        <SafeAreaView style={styles.detailContainer}>
          {selectedBill?._loading || detailLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : selectedBill && (
            <>
              {/* Detail header */}
              <View style={styles.detailHeader}>
                <TouchableOpacity onPress={() => setSelectedBill(null)}>
                  <X size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.detailTitle}>{t.billDetails}</Text>
                <View style={{ width: 24 }} />
              </View>

              <ScrollView contentContainerStyle={styles.detailContent}>
                {/* Bill meta */}
                {(() => {
                  const cfg = TYPE_CONFIG[selectedBill.type as BillType] || TYPE_CONFIG.purchase;
                  return (
                    <View style={[styles.detailMetaCard, { borderLeftColor: cfg.color }]}>
                      <View style={styles.detailMetaRow}>
                        <Text style={styles.detailMetaLabel}>Bill #</Text>
                        <Text style={styles.detailMetaValue}>{selectedBill.id}</Text>
                      </View>
                      <View style={styles.detailMetaRow}>
                        <Text style={styles.detailMetaLabel}>{t.typeLabel}</Text>
                        <View style={[styles.typeBadge, { backgroundColor: cfg.bg }]}>
                          <Text style={[styles.typeBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                        </View>
                      </View>
                      <View style={styles.detailMetaRow}>
                        <Text style={styles.detailMetaLabel}>{t.partyLabel}</Text>
                        <Text style={styles.detailMetaValue}>{selectedBill.parties?.name || selectedBill.entities?.name || '—'}</Text>
                      </View>
                      <View style={styles.detailMetaRow}>
                        <Text style={styles.detailMetaLabel}>{t.dateTimeLabel}</Text>
                        <Text style={styles.detailMetaValue}>{formatIST(selectedBill.bill_date)}</Text>
                      </View>
                      {selectedBill.original_bill_id && (
                        <View style={styles.detailMetaRow}>
                          <Text style={styles.detailMetaLabel}>Original Bill</Text>
                          <Text style={styles.detailMetaValue}>#{selectedBill.original_bill_id}</Text>
                        </View>
                      )}
                      {selectedBill.note && (
                        <View style={styles.detailMetaRow}>
                          <Text style={styles.detailMetaLabel}>{t.note}</Text>
                          <Text style={[styles.detailMetaValue, { flex: 1, textAlign: 'right' }]}>{selectedBill.note}</Text>
                        </View>
                      )}
                    </View>
                  );
                })()}

                {/* Line items */}
                <Text style={styles.sectionLabel}>{t.lineItems}</Text>
                {(selectedBill.bill_items || []).map((item: any) => (
                  <View key={item.id} style={styles.lineItemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lineItemName}>{item.products?.name || `Product #${item.product_id}`}</Text>
                      <Text style={styles.lineItemMeta}>
                        {item.quantity} × ₹{parseFloat(item.price).toFixed(2)}
                      </Text>
                    </View>
                    <Text style={styles.lineItemTotal}>
                      ₹{parseFloat(item.sub_total).toFixed(2)}
                    </Text>
                  </View>
                ))}

                {/* Amount breakdown */}
                <View style={styles.amountCard}>
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>{t.totalBeforeDiscount}</Text>
                    <Text style={styles.amountValue}>₹{parseFloat(selectedBill.total_amount).toFixed(2)}</Text>
                  </View>
                  {(selectedBill.discounts || []).map((d: number, i: number) => d > 0 && (
                    <View key={i} style={styles.amountRow}>
                      <Text style={[styles.amountLabel, { color: theme.colors.error }]}>
                        {t.discountStep} {i + 1}: {d}%
                      </Text>
                    </View>
                  ))}
                  <View style={[styles.amountRow, styles.amountTotalRow]}>
                    <Text style={styles.amountTotalLabel}>{selectedBill.total_returned > 0 ? 'Original Total' : t.netAmount}</Text>
                    <Text style={[styles.amountTotalValue, { color: TYPE_CONFIG[selectedBill.type as BillType]?.color || theme.colors.primary }]}>
                      ₹{parseFloat(selectedBill.net_amount).toFixed(2)}
                    </Text>
                  </View>
                  {selectedBill.total_returned > 0 && (
                    <>
                      <View style={styles.amountRow}>
                        <Text style={[styles.amountLabel, { color: theme.colors.error }]}>{t.returnsApplied}</Text>
                        <Text style={[styles.amountValue, { color: theme.colors.error, fontWeight: '700' }]}>
                          - ₹{parseFloat(selectedBill.total_returned).toFixed(2)}
                        </Text>
                      </View>
                      <View style={[styles.amountRow, { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 6 }]}>
                        <Text style={[styles.amountTotalLabel, { fontWeight: '700' }]}>{t.adjustedBillAmount}</Text>
                        <Text style={[styles.amountTotalValue, { fontWeight: '800', color: theme.colors.primary }]}>
                          ₹{parseFloat(selectedBill.adjusted_net_amount).toFixed(2)}
                        </Text>
                      </View>
                    </>
                  )}
                </View>

                {/* Linked Return Bills References */}
                {(selectedBill.return_bills || []).length > 0 && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={styles.sectionLabel}>{t.linkedReturnBills}</Text>
                    {selectedBill.return_bills.map((rb: any) => (
                      <View key={rb.id} style={styles.paymentRow}>
                        <View style={[styles.paymentModeIcon, { backgroundColor: theme.colors.error + '15' }]}>
                          <RotateCcw size={16} color={theme.colors.error} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.paymentAmount, { color: theme.colors.error }]}>
                            - ₹{parseFloat(rb.net_amount).toFixed(2)}
                          </Text>
                          <Text style={styles.paymentMeta}>
                            Return Bill #{rb.id}  •  {formatIST(rb.bill_date)}
                            {rb.note ? `  •  ${rb.note}` : ''}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Payments */}
                <Text style={styles.sectionLabel}>{t.paymentsLabel}</Text>
                {(selectedBill.payments || []).length === 0 ? (
                  <Text style={styles.emptySubText}>No payments recorded yet</Text>
                ) : (
                  (selectedBill.payments || []).map((p: any) => (
                    <View key={p.id} style={styles.paymentRow}>
                      <View style={styles.paymentModeIcon}>
                        {p.mode === 'cash'
                          ? <Banknote size={16} color={theme.colors.success} />
                          : <CreditCard size={16} color={theme.colors.primary} />
                        }
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.paymentAmount}>₹{parseFloat(p.amount).toFixed(2)}</Text>
                        <Text style={styles.paymentMeta}>
                          {p.mode.toUpperCase()}  •  {formatIST(p.paid_at)}
                          {p.note ? `  •  ${p.note}` : ''}
                        </Text>
                      </View>
                    </View>
                  ))
                )}

                {/* Outstanding */}
                <View style={[
                  styles.outstandingCard,
                  { backgroundColor: (selectedBill.outstanding || 0) > 0.01
                      ? theme.colors.error + '12'
                      : theme.colors.success + '12' }
                ]}>
                  <View style={styles.outstandingRow}>
                    <Text style={styles.outstandingLabel}>{t.totalPaid}</Text>
                    <Text style={[styles.outstandingValue, { color: theme.colors.success }]}>
                      ₹{parseFloat(selectedBill.total_paid || 0).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.outstandingRow}>
                    <Text style={styles.outstandingLabel}>{t.outstanding}</Text>
                    <Text style={[
                      styles.outstandingValue,
                      { color: (selectedBill.outstanding || 0) > 0.01 ? theme.colors.error : theme.colors.success }
                    ]}>
                      ₹{parseFloat(selectedBill.outstanding || 0).toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Record payment button */}
                {(selectedBill.outstanding || 0) > 0.01 && (
                  <TouchableOpacity
                    style={styles.recordPaymentBtn}
                    onPress={() => {
                      setPayAmount(parseFloat(selectedBill.outstanding || 0).toFixed(2));
                      setPayMode('cash');
                      setPayNote('');
                      setShowPaymentModal(true);
                    }}
                  >
                    <Text style={styles.recordPaymentText}>{t.recordPayment}</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </>
          )}
        </SafeAreaView>
      </Modal>

      {/* ─── Payment Form Modal ─── */}
      <Modal visible={showPaymentModal} animationType="slide" transparent onRequestClose={() => setShowPaymentModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.payModalOverlay}>
            <View style={[styles.payModalCard, { paddingBottom: Math.max(insets.bottom, 16) + 20 }]}>
              <View style={styles.payModalHeader}>
                <Text style={styles.payModalTitle}>{t.recordPayment}</Text>
                <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                  <X size={22} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              <Text style={styles.payModalOutstanding}>
                {t.outstanding}: ₹{parseFloat(selectedBill?.outstanding || 0).toFixed(2)}
              </Text>

              <Text style={styles.payLabel}>{t.paymentAmount}</Text>
              <TextInput
                style={styles.payInput}
                value={payAmount}
                onChangeText={setPayAmount}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={theme.colors.textSecondary}
              />

              <Text style={styles.payLabel}>{t.paymentMode}</Text>
              <View style={styles.payModeRow}>
                <TouchableOpacity
                  style={[styles.payModeBtn, payMode === 'cash' && styles.payModeBtnActive]}
                  onPress={() => setPayMode('cash')}
                >
                  <Banknote size={16} color={payMode === 'cash' ? '#fff' : theme.colors.textSecondary} />
                  <Text style={[styles.payModeText, payMode === 'cash' && { color: '#fff' }]}>{t.cash}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.payModeBtn, payMode === 'online' && styles.payModeBtnActive]}
                  onPress={() => setPayMode('online')}
                >
                  <CreditCard size={16} color={payMode === 'online' ? '#fff' : theme.colors.textSecondary} />
                  <Text style={[styles.payModeText, payMode === 'online' && { color: '#fff' }]}>{t.online}</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.payLabel}>{t.note}</Text>
              <TextInput
                style={styles.payInput}
                value={payNote}
                onChangeText={setPayNote}
                placeholder="Optional note..."
                placeholderTextColor={theme.colors.textSecondary}
              />

              <TouchableOpacity
                style={[styles.paySubmitBtn, paySubmitting && { opacity: 0.7 }]}
                onPress={handleRecordPayment}
                disabled={paySubmitting}
              >
                {paySubmitting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.paySubmitText}>{t.recordPayment}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Filter Modal ─── */}
      {showFilterModal && (
        <View style={styles.filterModalOverlay}>
          <View style={styles.filterModalContent}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>{t.filtersTitle}</Text>
              <TouchableOpacity onPress={() => { setShowFilterModal(false); }}>
                <X size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.filterSplitPane}>
              {/* Sidebar */}
              <View style={styles.filterSidebar}>
                {[
                  { id: 'date', label: t.dateRange },
                  { id: 'type', label: t.billType },
                  { id: 'party', label: t.partyLabel },
                ].map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.sidebarItem, activeSidebarTab === item.id && styles.sidebarItemActive]}
                    onPress={() => setActiveSidebarTab(item.id as any)}
                  >
                    <Text style={[styles.sidebarText, activeSidebarTab === item.id && styles.sidebarTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Content */}
              <View style={styles.filterOptions}>
                {activeSidebarTab === 'date' && (
                  <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
                    {[
                      { val: 'all', label: t.allTime },
                      { val: 'custom', label: t.customDateRange },
                    ].map(opt => (
                      <TouchableOpacity key={opt.val} style={styles.optionRow} onPress={() => setTempFilter(opt.val as any)}>
                        <View style={[styles.radio, tempFilter === opt.val && styles.radioActive]}>
                          {tempFilter === opt.val && <View style={styles.radioInner} />}
                        </View>
                        <Text style={styles.optionLabel}>{opt.label}</Text>
                      </TouchableOpacity>
                    ))}
                    {tempFilter === 'custom' && (
                      <View style={{ gap: 12 }}>
                        <TouchableOpacity style={styles.dateTrigger} onPress={() => setShowPicker({ show: true, type: 'start' })}>
                          <Text style={styles.dateTriggerLabel}>{t.fromDate}</Text>
                          <Text style={styles.dateTriggerValue}>{formatDate(tempRange.start)}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.dateTrigger} onPress={() => setShowPicker({ show: true, type: 'end' })}>
                          <Text style={styles.dateTriggerLabel}>{t.toDate}</Text>
                          <Text style={styles.dateTriggerValue}>{formatDate(tempRange.end)}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </ScrollView>
                )}

                {activeSidebarTab === 'type' && (
                  <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
                    <TouchableOpacity style={styles.optionRow} onPress={() => setTempType(null)}>
                      <View style={[styles.radio, tempType === null && styles.radioActive]}>
                        {tempType === null && <View style={styles.radioInner} />}
                      </View>
                      <Text style={styles.optionLabel}>{t.allTypes}</Text>
                    </TouchableOpacity>
                    {(['purchase', 'sell', 'purchase_return', 'sell_return'] as BillType[]).map(bt => (
                      <TouchableOpacity key={bt} style={styles.optionRow} onPress={() => setTempType(bt)}>
                        <View style={[styles.radio, tempType === bt && styles.radioActive]}>
                          {tempType === bt && <View style={styles.radioInner} />}
                        </View>
                        <Text style={styles.optionLabel}>{TYPE_CONFIG[bt].label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                {activeSidebarTab === 'party' && (
                  <View style={{ flex: 1 }}>
                    <View style={styles.miniSearch}>
                      <Search size={14} color={theme.colors.textSecondary} />
                      <TextInput
                        style={styles.miniSearchInput}
                        placeholder={t.searchPartyFilter}
                        value={partySearch}
                        onChangeText={setPartySearch}
                      />
                    </View>
                    <FlatList
                      data={[{ id: null, name: t.allParties }, ...filteredParties]}
                      keyExtractor={i => String(i.id ?? 'all')}
                      contentContainerStyle={{ padding: 12 }}
                      renderItem={({ item }) => (
                        <TouchableOpacity style={styles.optionRow} onPress={() => setTempEntityId(item.id)}>
                          <View style={[styles.radio, tempEntityId === item.id && styles.radioActive]}>
                            {tempEntityId === item.id && <View style={styles.radioInner} />}
                          </View>
                          <Text style={styles.optionLabel}>{item.name}</Text>
                        </TouchableOpacity>
                      )}
                    />
                  </View>
                )}
              </View>
            </View>

            <View style={[styles.filterFooter, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
              <TouchableOpacity style={styles.clearBtn} onPress={() => {
                setTempFilter('all');
                setTempType(null);
                setTempEntityId(null);
              }}>
                <Text style={styles.clearBtnText}>{t.clearAll}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={applyFilter}>
                <Text style={styles.applyBtnText}>{t.apply}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {showPicker.show && (
        <DateTimePicker
          value={showPicker.type === 'start' ? tempRange.start : tempRange.end}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={(_, d) => {
            setShowPicker({ show: false, type: showPicker.type });
            if (d) setTempRange(p => ({ ...p, [showPicker.type]: d }));
          }}
        />
      )}
    </SafeAreaView>
  );
};

// ── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.lg, paddingBottom: theme.spacing.sm },
  title: { ...theme.typography.h1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBar: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, alignSelf: 'flex-start' },
  filterChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterText: { ...theme.typography.body, fontWeight: '600' },
  listContent: { padding: theme.spacing.lg, paddingTop: theme.spacing.sm },
  emptyText: { textAlign: 'center', marginTop: 60, ...theme.typography.body, color: theme.colors.textSecondary },
  emptySubText: { ...theme.typography.caption, color: theme.colors.textSecondary, marginBottom: 12 },

  // Summary header
  summaryContainer: { marginBottom: theme.spacing.md, gap: 10 },
  summaryGrid: { flexDirection: 'row', gap: 10 },
  summaryCard: { flex: 1, backgroundColor: theme.colors.surface, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border },
  summaryCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  summaryCardLabel: { ...theme.typography.caption, fontWeight: '700', color: theme.colors.textSecondary, fontSize: 10, textTransform: 'uppercase' },
  summaryCardValue: { ...theme.typography.h3, fontWeight: '800' },
  netCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border },
  netInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  netLabel: { ...theme.typography.caption, color: theme.colors.textSecondary, fontWeight: '600' },
  netValue: { ...theme.typography.h3, fontWeight: '800' },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  exportBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Bill card
  billCard: { backgroundColor: theme.colors.surface, flexDirection: 'row', alignItems: 'center', gap: 12, padding: theme.spacing.md, borderRadius: theme.borderRadius.md, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
  typeIndicator: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  billDetails: { flex: 1 },
  billParty: { ...theme.typography.body, fontWeight: '700' },
  billMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  typeBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  billDate: { ...theme.typography.caption, color: theme.colors.textSecondary, fontSize: 11 },
  billItemCount: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 2 },
  billAmount: { alignItems: 'flex-end' },
  billNet: { ...theme.typography.h3, fontWeight: '800' },
  billDiscount: { ...theme.typography.caption, color: theme.colors.error, fontSize: 11 },

  // Bill Detail
  detailContainer: { flex: 1, backgroundColor: theme.colors.background },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  detailTitle: { ...theme.typography.h2 },
  detailContent: { padding: theme.spacing.lg, gap: 16 },
  detailMetaCard: { backgroundColor: theme.colors.surface, borderRadius: 12, padding: theme.spacing.md, borderLeftWidth: 4, gap: 12, borderWidth: 1, borderColor: theme.colors.border },
  detailMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailMetaLabel: { ...theme.typography.caption, color: theme.colors.textSecondary, fontWeight: '600', textTransform: 'uppercase' },
  detailMetaValue: { ...theme.typography.body, fontWeight: '600', color: theme.colors.text },
  sectionLabel: { ...theme.typography.caption, fontWeight: '800', textTransform: 'uppercase', color: theme.colors.textSecondary, letterSpacing: 0.5 },
  lineItemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  lineItemName: { ...theme.typography.body, fontWeight: '600' },
  lineItemMeta: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 2 },
  lineItemTotal: { ...theme.typography.body, fontWeight: '700', color: theme.colors.text },
  amountCard: { backgroundColor: theme.colors.surface, borderRadius: 12, padding: theme.spacing.md, gap: 10, borderWidth: 1, borderColor: theme.colors.border },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between' },
  amountLabel: { ...theme.typography.body, color: theme.colors.textSecondary },
  amountValue: { ...theme.typography.body, fontWeight: '600' },
  amountTotalRow: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 10, marginTop: 4 },
  amountTotalLabel: { ...theme.typography.body, fontWeight: '700' },
  amountTotalValue: { ...theme.typography.h2, fontWeight: '800' },
  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  paymentModeIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, justifyContent: 'center', alignItems: 'center' },
  paymentAmount: { ...theme.typography.body, fontWeight: '700' },
  paymentMeta: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 2 },
  outstandingCard: { borderRadius: 12, padding: theme.spacing.md, gap: 10, borderWidth: 1, borderColor: theme.colors.border },
  outstandingRow: { flexDirection: 'row', justifyContent: 'space-between' },
  outstandingLabel: { ...theme.typography.body, fontWeight: '600' },
  outstandingValue: { ...theme.typography.h3, fontWeight: '800' },
  recordPaymentBtn: { backgroundColor: theme.colors.primary, padding: 16, borderRadius: theme.borderRadius.md, alignItems: 'center' },
  recordPaymentText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Payment Modal
  payModalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  payModalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: theme.spacing.lg, gap: 14 },
  payModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  payModalTitle: { ...theme.typography.h2 },
  payModalOutstanding: { ...theme.typography.body, color: theme.colors.error, fontWeight: '700' },
  payLabel: { ...theme.typography.caption, fontWeight: '700', textTransform: 'uppercase', color: theme.colors.textSecondary, letterSpacing: 0.5 },
  payInput: { backgroundColor: theme.colors.surface, padding: 14, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border, ...theme.typography.body },
  payModeRow: { flexDirection: 'row', gap: 12 },
  payModeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  payModeBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  payModeText: { fontWeight: '600', color: theme.colors.textSecondary },
  paySubmitBtn: { backgroundColor: theme.colors.primary, padding: 16, borderRadius: theme.borderRadius.md, alignItems: 'center', marginTop: 4 },
  paySubmitText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Filter Modal
  filterModalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', zIndex: 999, justifyContent: 'flex-end' },
  filterModalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '75%', overflow: 'hidden' },
  filterModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  filterModalTitle: { ...theme.typography.h2 },
  filterSplitPane: { flex: 1, flexDirection: 'row' },
  filterSidebar: { width: 110, backgroundColor: theme.colors.surface, borderRightWidth: 1, borderRightColor: theme.colors.border },
  sidebarItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  sidebarItemActive: { backgroundColor: '#fff', borderLeftWidth: 3, borderLeftColor: theme.colors.primary },
  sidebarText: { ...theme.typography.caption, fontWeight: '600', color: theme.colors.textSecondary },
  sidebarTextActive: { color: theme.colors.primary, fontWeight: '800' },
  filterOptions: { flex: 1 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  optionLabel: { ...theme.typography.body },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: theme.colors.border, justifyContent: 'center', alignItems: 'center' },
  radioActive: { borderColor: theme.colors.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.primary },
  dateTrigger: { backgroundColor: theme.colors.surface, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, flexDirection: 'row', justifyContent: 'space-between' },
  dateTriggerLabel: { ...theme.typography.caption, color: theme.colors.textSecondary, fontWeight: '700' },
  dateTriggerValue: { ...theme.typography.body, fontWeight: '700', color: theme.colors.primary },
  miniSearch: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 12, backgroundColor: theme.colors.surface, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 10 },
  miniSearchInput: { flex: 1, height: 38, ...theme.typography.body },
  filterFooter: { flexDirection: 'row', gap: 12, padding: theme.spacing.lg, borderTopWidth: 1, borderTopColor: theme.colors.border },
  clearBtn: { flex: 1, borderWidth: 1, borderColor: theme.colors.border, padding: 14, borderRadius: theme.borderRadius.md, alignItems: 'center' },
  clearBtnText: { fontWeight: '700', color: theme.colors.text },
  applyBtn: { flex: 2, backgroundColor: theme.colors.primary, padding: 14, borderRadius: theme.borderRadius.md, alignItems: 'center' },
  applyBtnText: { color: '#fff', fontWeight: '700' },

  // note key from translations used inline
  note: {},
  totalBeforeDiscount: {},
  discountStep: {},
});

export default HistoryScreen;
