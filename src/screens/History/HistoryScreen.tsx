import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, FlatList, ActivityIndicator,
  TouchableOpacity, Modal, ScrollView,
  BackHandler, Platform, KeyboardAvoidingView
} from 'react-native';
import { Text, TextInput } from '../../components';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import {
  Filter, X, ChevronDown, Search, Calendar,
  ArrowUpRight, ArrowDownLeft, RotateCcw, Clock,
  TrendingUp, TrendingDown, Wallet, CreditCard, Banknote, FileSpreadsheet, RotateCw,
  Edit2, Plus, Trash2, Check
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BillService, PartyService, ProductService, CreatePaymentPayload, UpdateBillPayload } from '../../services/api';
import Toast from 'react-native-toast-message';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useLanguage } from '../../context/LanguageContext';

type BillType = 'purchase' | 'sell' | 'purchase_return' | 'sell_return';

const TYPE_CONFIG: Record<BillType, {
  color: string;
  bg: string;
  icon: any;
  label: string;
  iconColor?: string;
  iconBg?: string;
  badgeColor?: string;
  badgeBg?: string;
}> = {
  purchase: {
    color: '#dc3545',
    bg: '#F1F5F9',
    icon: ArrowDownLeft,
    label: 'Purchase',
    iconColor: '#64748b',
    iconBg: '#F1F5F9',
    badgeColor: '#475569',
    badgeBg: '#F1F5F9',
  },
  sell: {
    color: '#28a745',
    bg: '#28a74515',
    icon: ArrowUpRight,
    label: 'Sell',
    iconColor: '#28a745',
    iconBg: '#28a74515',
    badgeColor: '#28a745',
    badgeBg: '#28a74515',
  },
  purchase_return: {
    color: '#fd7e14',
    bg: '#fd7e1415',
    icon: RotateCcw,
    label: 'Pur. Return',
    iconColor: '#fd7e14',
    iconBg: '#fd7e1415',
    badgeColor: '#fd7e14',
    badgeBg: '#fd7e1415',
  },
  sell_return: {
    color: '#0d6efd',
    bg: '#0d6efd15',
    icon: RotateCcw,
    label: 'Sell Return',
    iconColor: '#0d6efd',
    iconBg: '#0d6efd15',
    badgeColor: '#0d6efd',
    badgeBg: '#0d6efd15',
  },
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

  // ── Products for Edit ────────────────────────────────────
  const [products, setProducts] = useState<any[]>([]);

  // ── Edit Bill state ──────────────────────────────────────
  const [showEditModal, setShowEditModal] = useState(false);
  const [editOriginalBill, setEditOriginalBill] = useState<any>(null);
  const [editBillId, setEditBillId] = useState<number | null>(null);
  const [editBillType, setEditBillType] = useState<BillType>('purchase');
  const [editPartyId, setEditPartyId] = useState<number | null>(null);
  const [editSelectedParty, setEditSelectedParty] = useState<any | null>(null);
  const [editBillDate, setEditBillDate] = useState<Date>(new Date());
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [editNote, setEditNote] = useState('');
  const [editDiscounts, setEditDiscounts] = useState<string[]>([]);
  const [editItems, setEditItems] = useState<{
    id: string;
    product_id: number;
    product: any;
    quantity: string;
    price: string;
  }[]>([]);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Sub-modals for Edit Bill
  const [showEditPartyPicker, setShowEditPartyPicker] = useState(false);
  const [editPartySearch, setEditPartySearch] = useState('');
  const [showEditProductPicker, setShowEditProductPicker] = useState(false);
  const [editItemTargetIdx, setEditItemTargetIdx] = useState<number | null>(null);
  const [editProductSearch, setEditProductSearch] = useState('');

  // ── Totals ───────────────────────────────────────────────
  const [totals, setTotals] = useState({ sales: 0, purchases: 0, net: 0 });

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    let sales = 0;
    let purchases = 0;

    if (selectedType === 'sell_return') {
      sales = bills.reduce((a, b) => a + parseFloat(b.net_amount || 0), 0);
    } else {
      sales = bills.reduce((acc, b) => {
        const amt = parseFloat(b.net_amount || 0);
        if (b.type === 'sell') return acc + amt;
        if (b.type === 'sell_return') return acc - amt;
        return acc;
      }, 0);
    }

    if (selectedType === 'purchase_return') {
      purchases = bills.reduce((a, b) => a + parseFloat(b.net_amount || 0), 0);
    } else {
      purchases = bills.reduce((acc, b) => {
        const amt = parseFloat(b.net_amount || 0);
        if (b.type === 'purchase') return acc + amt;
        if (b.type === 'purchase_return') return acc - amt;
        return acc;
      }, 0);
    }

    setTotals({ sales, purchases, net: sales - purchases });
  }, [bills, selectedType]);

  useEffect(() => {
    const back = () => {
      if (showEditPartyPicker) { setShowEditPartyPicker(false); return true; }
      if (showEditProductPicker) { setShowEditProductPicker(false); return true; }
      if (showEditModal) { setShowEditModal(false); return true; }
      if (showPaymentModal) { setShowPaymentModal(false); return true; }
      if (selectedBill) { setSelectedBill(null); return true; }
      if (showFilterModal) { setShowFilterModal(false); return true; }
      return false;
    };
    const h = BackHandler.addEventListener('hardwareBackPress', back);
    return () => h.remove();
  }, [showEditPartyPicker, showEditProductPicker, showEditModal, showPaymentModal, selectedBill, showFilterModal]);

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

      const [billRes, entRes, prodRes] = await Promise.all([
        BillService.getBills(params),
        PartyService.getParties(),
        ProductService.getProducts(),
      ]);
      setBills(billRes.data);
      setParties(entRes.data);
      setProducts(prodRes.data);
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

  // ── Edit Bill handlers ───────────────────────────────────
  const openEditModal = async (bill: any) => {
    try {
      setEditOriginalBill(bill);
      setEditBillId(bill.id);
      setEditBillType(bill.type);
      const party = bill.parties || parties.find((p: any) => p.id === (bill.party_id || bill.entity_id));
      setEditPartyId(party?.id || bill.party_id || bill.entity_id || null);
      setEditSelectedParty(party || null);

      let bDate = new Date();
      if (bill.bill_date) {
        let c = bill.bill_date.replace(' ', 'T');
        if (!c.includes('Z') && !c.includes('+')) c += 'Z';
        const d = new Date(c);
        if (!isNaN(d.getTime())) bDate = d;
      }
      setEditBillDate(bDate);
      setEditNote(bill.note || '');
      setEditDiscounts((bill.discounts || []).map((d: any) => String(d)));

      let prodList = products;
      if (prodList.length === 0) {
        const pRes = await ProductService.getProducts();
        prodList = pRes.data;
        setProducts(prodList);
      }

      const mappedItems = (bill.bill_items || []).map((bi: any, index: number) => {
        const prod = bi.products || prodList.find((p: any) => p.id === bi.product_id) || { id: bi.product_id, name: `Product #${bi.product_id}` };
        return {
          id: String(bi.id || index),
          product_id: bi.product_id,
          product: prod,
          quantity: String(bi.quantity),
          price: String(bi.price),
        };
      });
      setEditItems(mappedItems);
      setShowEditModal(true);
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to prepare bill for editing' });
    }
  };

  const handleEditAddItem = () => {
    setEditItemTargetIdx(null);
    setEditProductSearch('');
    setShowEditProductPicker(true);
  };

  const handleEditSelectProduct = (product: any) => {
    if (editItemTargetIdx !== null) {
      setEditItems(prev => {
        const next = [...prev];
        next[editItemTargetIdx] = {
          ...next[editItemTargetIdx],
          product_id: product.id,
          product: product,
          price: next[editItemTargetIdx].price || String(product.price || '0'),
        };
        return next;
      });
    } else {
      setEditItems(prev => [
        ...prev,
        {
          id: String(Date.now()),
          product_id: product.id,
          product: product,
          quantity: '1',
          price: String(product.price || '0'),
        },
      ]);
    }
    setShowEditProductPicker(false);
  };

  const handleEditRemoveItem = (index: number) => {
    setEditItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditItemChange = (index: number, field: 'quantity' | 'price', val: string) => {
    setEditItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const handleEditAddDiscount = () => {
    if (editDiscounts.length < 5) {
      setEditDiscounts(prev => [...prev, '']);
    }
  };

  const handleEditDiscountChange = (index: number, val: string) => {
    setEditDiscounts(prev => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const handleEditRemoveDiscount = (index: number) => {
    setEditDiscounts(prev => prev.filter((_, i) => i !== index));
  };

  const editTotals = (() => {
    const gross = editItems.reduce((acc, item) => {
      const q = parseFloat(item.quantity) || 0;
      const p = parseFloat(item.price) || 0;
      return acc + (q * p);
    }, 0);

    let running = gross;
    const activeDiscounts = editDiscounts.filter(d => (parseFloat(d) || 0) > 0);
    const discountBreakdown = editDiscounts.map((d, i) => {
      const pct = parseFloat(d) || 0;
      const amt = running * (pct / 100);
      running -= amt;
      const label = activeDiscounts.length > 1
        ? `${t.discountStep} ${i + 1} (${pct}%)`
        : `${t.discountStep} (${pct}%)`;
      return { pct, amount: amt, label };
    });

    const net = Math.max(0, running);
    return { gross, discountBreakdown, net };
  })();

  const editTotalPaid = parseFloat(editOriginalBill?.total_paid || 0) || 0;
  const editTotalReturned = parseFloat(editOriginalBill?.total_returned || 0) || 0;
  const editAdjustedNet = Math.max(0, editTotals.net - editTotalReturned);
  const editRemaining = Math.max(0, editAdjustedNet - editTotalPaid);

  const handleSaveEdit = async () => {
    if (!editBillId) return;
    if (!editPartyId) {
      Toast.show({ type: 'error', text1: t.validationError, text2: 'Please select a party' });
      return;
    }
    if (editItems.length === 0) {
      Toast.show({ type: 'error', text1: t.validationError, text2: 'At least one item is required' });
      return;
    }
    for (let i = 0; i < editItems.length; i++) {
      const item = editItems[i];
      const q = parseFloat(item.quantity);
      const p = parseFloat(item.price);
      if (isNaN(q) || q <= 0) {
        Toast.show({ type: 'error', text1: t.validationError, text2: `Invalid quantity for ${item.product?.name || `Item ${i + 1}`}` });
        return;
      }
      if (isNaN(p) || p < 0) {
        Toast.show({ type: 'error', text1: t.validationError, text2: `Invalid price for ${item.product?.name || `Item ${i + 1}`}` });
        return;
      }
    }

    try {
      setEditSubmitting(true);
      const payload: UpdateBillPayload = {
        party_id: editPartyId,
        bill_date: editBillDate.toISOString(),
        note: editNote.trim() || null,
        discounts: editDiscounts.map(d => parseFloat(d)).filter(d => !isNaN(d) && d >= 0),
        items: editItems.map(item => ({
          product_id: item.product_id,
          quantity: parseFloat(item.quantity),
          price: parseFloat(item.price),
        })),
      };

      const res = await BillService.updateBill(editBillId, payload);
      setSelectedBill(res.data);
      setShowEditModal(false);
      Toast.show({ type: 'success', text1: t.success, text2: t.billUpdatedSuccess });
      fetchData();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message || 'Failed to update bill';
      Toast.show({ type: 'error', text1: t.saveFailed, text2: msg });
    } finally {
      setEditSubmitting(false);
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
                  {totals.sales < 0 ? `-₹${Math.abs(totals.sales).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `₹${totals.sales.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <View style={styles.summaryCardHeader}>
                  <TrendingDown size={14} color={theme.colors.error} />
                  <Text style={styles.summaryCardLabel}>{t.totalBuy}</Text>
                </View>
                <Text style={[styles.summaryCardValue, { color: theme.colors.error }]}>
                  {totals.purchases < 0 ? `-₹${Math.abs(totals.purchases).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `₹${totals.purchases.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
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
              <View style={styles.billCardTop}>
                <View style={[styles.typeIndicator, { backgroundColor: cfg.iconBg || cfg.bg }]}>
                  <Icon size={18} color={cfg.iconColor || cfg.color} />
                </View>
                <View style={styles.billDetails}>
                  <Text style={styles.billParty} numberOfLines={1} ellipsizeMode="tail">
                    {item.parties?.name || item.entities?.name || '—'}
                  </Text>
                  <View style={styles.billMeta}>
                    <View style={[styles.typeBadge, { backgroundColor: cfg.badgeBg || cfg.bg }]}>
                      <Text style={[styles.typeBadgeText, { color: cfg.badgeColor || cfg.color }]}>{cfg.label}</Text>
                    </View>
                    {item.original_bill_id && (
                      <View style={styles.refBadge}>
                        <Text style={styles.refBadgeText}>Ref #{item.original_bill_id}</Text>
                      </View>
                    )}
                    {item.bill_items?.length > 0 && (
                      <Text style={styles.billItemCount}>{item.bill_items.length} item(s)</Text>
                    )}
                  </View>
                </View>
                <View style={styles.billAmount}>
                  <Text style={[styles.billNet, { color: '#000000' }]}>
                    ₹{parseFloat(item.adjusted_net_amount ?? item.net_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                  {item.total_returned > 0 && (
                    <Text style={styles.billDiscount}>
                      -₹{parseFloat(item.total_returned).toFixed(0)} {t.returnsApplied}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.billCardDivider} />

              <View style={styles.billCardBottom}>
                <View style={styles.timestampRow}>
                  <Clock size={12} color={theme.colors.textSecondary} />
                  <Text style={styles.billDate}>{formatIST(item.bill_date)}</Text>
                </View>
                <Text style={styles.billIdText}>#{item.id}</Text>
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
                <TouchableOpacity
                  style={styles.detailEditHeaderBtn}
                  onPress={() => openEditModal(selectedBill)}
                  activeOpacity={0.7}
                >
                  <Edit2 size={18} color={theme.colors.primary} />
                </TouchableOpacity>
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
                        <View style={[styles.typeBadge, { backgroundColor: cfg.badgeBg || cfg.bg }]}>
                          <Text style={[styles.typeBadgeText, { color: cfg.badgeColor || cfg.color }]}>{cfg.label}</Text>
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
                  {(() => {
                    const activeDiscounts = (selectedBill.discounts || []).filter((d: any) => (parseFloat(d) || 0) > 0);
                    let running = parseFloat(selectedBill.total_amount || 0);
                    return activeDiscounts.map((d: any, i: number) => {
                      const pct = parseFloat(d) || 0;
                      const discAmount = running * (pct / 100);
                      running -= discAmount;
                      const label = activeDiscounts.length > 1
                        ? `${t.discountStep} ${i + 1} (${pct}%)`
                        : `${t.discountStep} (${pct}%)`;
                      return (
                        <View key={i} style={styles.amountRow}>
                          <Text style={styles.amountLabel}>
                            {label}
                          </Text>
                          <Text style={[styles.amountValue, { fontWeight: '600' }]}>
                            - ₹{discAmount.toFixed(2)}
                          </Text>
                        </View>
                      );
                    });
                  })()}
                  <View style={[styles.amountRow, styles.amountTotalRow]}>
                    <Text style={[styles.amountTotalLabel, { color: '#000000' }]}>{selectedBill.total_returned > 0 ? 'Original Total' : t.netAmount}</Text>
                    <Text style={[styles.amountTotalValue, { color: '#000000' }]}>
                      ₹{parseFloat(selectedBill.net_amount).toFixed(2)}
                    </Text>
                  </View>
                  {selectedBill.total_returned > 0 && (
                    <>
                      <View style={styles.amountRow}>
                        <Text style={styles.amountLabel}>{t.returnsApplied}</Text>
                        <Text style={[styles.amountValue, { fontWeight: '700' }]}>
                          - ₹{parseFloat(selectedBill.total_returned).toFixed(2)}
                        </Text>
                      </View>
                      <View style={[styles.amountRow, { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 6, alignItems: 'center' }]}>
                        <Text style={[styles.amountTotalLabel, { fontWeight: '700', color: '#000000' }]}>{t.adjustedBillAmount}</Text>
                        <Text style={[styles.amountTotalValue, { fontWeight: '800', color: '#000000' }]}>
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
                        <View style={styles.paymentModeIcon}>
                          <RotateCcw size={16} color={theme.colors.textSecondary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.paymentAmount}>
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
                  {
                    backgroundColor: theme.colors.surface
                  }
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
                      { color: (selectedBill.outstanding || 0) > 0.01 ? theme.colors.error : theme.colors.text }
                    ]}>
                      ₹{parseFloat(selectedBill.outstanding || 0).toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Actions: Edit Bill & Record Payment */}
                <View style={styles.detailActionButtonsRow}>
                  <TouchableOpacity
                    style={styles.detailEditActionBtn}
                    onPress={() => openEditModal(selectedBill)}
                    activeOpacity={0.8}
                  >
                    <Edit2 size={16} color={theme.colors.primary} />
                    <Text style={styles.detailEditActionBtnText}>{t.editBill}</Text>
                  </TouchableOpacity>

                  {(selectedBill.outstanding || 0) > 0.01 && (
                    <TouchableOpacity
                      style={styles.recordPaymentBtn}
                      onPress={() => {
                        setPayAmount('');
                        setPayMode('cash');
                        setPayNote('');
                        setShowPaymentModal(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.recordPaymentText}>{t.recordPayment}</Text>
                    </TouchableOpacity>
                  )}
                </View>
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
                <Text style={{ color: theme.colors.textSecondary }}>{t.outstanding}: </Text>
                <Text style={{ color: (selectedBill?.outstanding || 0) > 0.01 ? theme.colors.error : theme.colors.text, fontWeight: '700' }}>
                  ₹{parseFloat(selectedBill?.outstanding || 0).toFixed(2)}
                </Text>
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

      {/* ─── Edit Bill Modal ─── */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <SafeAreaView style={styles.detailContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            {/* Edit Header */}
            <View style={styles.detailHeader}>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={styles.detailTitle}>{t.editBill} #{editBillId}</Text>
              <TouchableOpacity
                onPress={handleSaveEdit}
                disabled={editSubmitting}
                style={[styles.editSaveHeaderBtn, editSubmitting && { opacity: 0.6 }]}
              >
                {editSubmitting ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                  <Text style={styles.editSaveHeaderText}>{t.saveItem}</Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.editModalContent}>
              {/* Type Badge & Date */}
              <View style={styles.editMetaSection}>
                <View style={styles.editRowBetween}>
                  <View style={[styles.typeBadge, { backgroundColor: TYPE_CONFIG[editBillType]?.badgeBg || TYPE_CONFIG[editBillType]?.bg }]}>
                    <Text style={[styles.typeBadgeText, { color: TYPE_CONFIG[editBillType]?.badgeColor || TYPE_CONFIG[editBillType]?.color }]}>
                      {TYPE_CONFIG[editBillType]?.label}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.editDateBtn}
                    onPress={() => setShowEditDatePicker(true)}
                  >
                    <Calendar size={14} color={theme.colors.primary} />
                    <Text style={styles.editDateText}>
                      {formatDate(editBillDate)}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Party Selector */}
                <Text style={styles.editFieldLabel}>{t.partyLabel} *</Text>
                <TouchableOpacity
                  style={styles.editPartyPickerBtn}
                  onPress={() => {
                    setEditPartySearch('');
                    setShowEditPartyPicker(true);
                  }}
                >
                  <Text style={[styles.editPartyPickerText, !editSelectedParty && { color: theme.colors.textSecondary }]}>
                    {editSelectedParty?.name || t.selectParty}
                  </Text>
                  <ChevronDown size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>

                {/* Note */}
                <Text style={styles.editFieldLabel}>{t.note}</Text>
                <TextInput
                  style={styles.editNoteInput}
                  placeholder="Optional note..."
                  value={editNote}
                  onChangeText={setEditNote}
                />
              </View>

              {/* Items Section */}
              <View style={styles.editSectionHeader}>
                <Text style={styles.sectionLabel}>{t.lineItems}</Text>
                <TouchableOpacity
                  style={styles.editAddItemBtn}
                  onPress={handleEditAddItem}
                >
                  <Plus size={14} color={theme.colors.primary} />
                  <Text style={styles.editAddItemBtnText}>{t.addItem.replace(/^\+\s*/, '')}</Text>
                </TouchableOpacity>
              </View>

              {editItems.map((item, idx) => (
                <View key={item.id || idx} style={styles.editItemCard}>
                  <View style={styles.editItemHeaderRow}>
                    <TouchableOpacity
                      style={styles.editItemProductSelect}
                      onPress={() => {
                        setEditItemTargetIdx(idx);
                        setEditProductSearch('');
                        setShowEditProductPicker(true);
                      }}
                    >
                      <Text style={styles.editItemProductName} numberOfLines={1}>
                        {item.product?.name || `Product #${item.product_id}`}
                      </Text>
                      <ChevronDown size={14} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleEditRemoveItem(idx)}
                      style={styles.editItemRemoveBtn}
                    >
                      <Trash2 size={16} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.editItemInputsRow}>
                    <View style={styles.editInputGroup}>
                      <Text style={styles.editSmallLabel}>{t.quantity}</Text>
                      <TextInput
                        style={styles.editNumInput}
                        keyboardType="decimal-pad"
                        value={item.quantity}
                        onChangeText={(val) => handleEditItemChange(idx, 'quantity', val)}
                        placeholder="0"
                      />
                    </View>
                    <View style={styles.editInputGroup}>
                      <Text style={styles.editSmallLabel}>{t.price}</Text>
                      <TextInput
                        style={styles.editNumInput}
                        keyboardType="decimal-pad"
                        value={item.price}
                        onChangeText={(val) => handleEditItemChange(idx, 'price', val)}
                        placeholder="0.00"
                      />
                    </View>
                    <View style={styles.editSubTotalGroup}>
                      <Text style={styles.editSmallLabel}>Subtotal</Text>
                      <Text style={styles.editSubTotalText}>
                        ₹{((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}

              {/* Discounts Section */}
              <View style={styles.editSectionHeader}>
                <Text style={styles.sectionLabel}>{t.discountPercent}</Text>
                {editDiscounts.length < 5 && (
                  <TouchableOpacity
                    style={styles.editAddItemBtn}
                    onPress={handleEditAddDiscount}
                  >
                    <Plus size={14} color={theme.colors.primary} />
                    <Text style={styles.editAddItemBtnText}>{t.addDiscount.replace(/^\+\s*/, '')}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {editDiscounts.map((disc, idx) => (
                <View key={idx} style={styles.editDiscountRow}>
                  <Text style={styles.editDiscountLabel}>{t.discountStep} {idx + 1} (%)</Text>
                  <TextInput
                    style={styles.editDiscountInput}
                    keyboardType="decimal-pad"
                    value={disc}
                    onChangeText={(val) => handleEditDiscountChange(idx, val)}
                    placeholder="0"
                  />
                  <TouchableOpacity
                    onPress={() => handleEditRemoveDiscount(idx)}
                    style={styles.editItemRemoveBtn}
                  >
                    <Trash2 size={16} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Summary Card */}
              <View style={styles.amountCard}>
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>{t.totalBeforeDiscount}</Text>
                  <Text style={styles.amountValue}>₹{editTotals.gross.toFixed(2)}</Text>
                </View>
                {editTotals.discountBreakdown.filter(d => d.pct > 0).map((d, i) => (
                  <View key={i} style={styles.amountRow}>
                    <Text style={styles.amountLabel}>
                      {d.label}
                    </Text>
                    <Text style={[styles.amountValue, { fontWeight: '600' }]}>
                      - ₹{d.amount.toFixed(2)}
                    </Text>
                  </View>
                ))}
                <View style={[styles.amountRow, styles.amountTotalRow]}>
                  <Text style={[styles.amountTotalLabel, { color: '#000000' }]}>{editTotalReturned > 0 ? 'Original Total' : t.netAmount}</Text>
                  <Text style={[styles.amountTotalValue, { color: '#000000' }]}>
                    ₹{editTotals.net.toFixed(2)}
                  </Text>
                </View>
                {editTotalReturned > 0 && (
                  <>
                    <View style={styles.amountRow}>
                      <Text style={styles.amountLabel}>{t.returnsApplied}</Text>
                      <Text style={[styles.amountValue, { fontWeight: '700' }]}>
                        - ₹{editTotalReturned.toFixed(2)}
                      </Text>
                    </View>
                    <View style={[styles.amountRow, { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 6, alignItems: 'center' }]}>
                      <Text style={[styles.amountTotalLabel, { fontWeight: '700', color: '#000000' }]}>{t.adjustedBillAmount}</Text>
                      <Text style={[styles.amountTotalValue, { fontWeight: '800', color: '#000000' }]}>
                        ₹{editAdjustedNet.toFixed(2)}
                      </Text>
                    </View>
                  </>
                )}
                {editTotalPaid > 0 && (
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>{t.totalPaid}</Text>
                    <Text style={[styles.amountValue, { color: theme.colors.success }]}>
                      ₹{editTotalPaid.toFixed(2)}
                    </Text>
                  </View>
                )}
                <View style={[styles.amountRow, { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 8, marginTop: 4, alignItems: 'center' }]}>
                  <Text style={[styles.amountTotalLabel, { fontWeight: '700' }]}>{t.outstanding}</Text>
                  <Text style={[styles.amountTotalValue, { color: editRemaining > 0.01 ? theme.colors.error : theme.colors.text, fontWeight: '800' }]}>
                    ₹{editRemaining.toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.editActionsContainer}>
                <TouchableOpacity
                  style={styles.editDiscardBtn}
                  onPress={() => setShowEditModal(false)}
                  disabled={editSubmitting}
                >
                  <Text style={styles.editDiscardText}>{t.discard}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.editSaveBtn, editSubmitting && { opacity: 0.7 }]}
                  onPress={handleSaveEdit}
                  disabled={editSubmitting}
                >
                  {editSubmitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.editSaveBtnText}>{t.updateBill}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Date Picker for Edit */}
      {showEditDatePicker && (
        <DateTimePicker
          value={editBillDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(_, date) => {
            setShowEditDatePicker(false);
            if (date) setEditBillDate(date);
          }}
        />
      )}

      {/* Select Party Modal for Edit */}
      <Modal
        visible={showEditPartyPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditPartyPicker(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={[styles.pickerModalCard, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>{t.selectParty}</Text>
              <TouchableOpacity onPress={() => setShowEditPartyPicker(false)}>
                <X size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.pickerSearchBox}>
              <Search size={16} color={theme.colors.textSecondary} />
              <TextInput
                style={styles.pickerSearchInput}
                placeholder={t.searchPartyFilter}
                value={editPartySearch}
                onChangeText={setEditPartySearch}
              />
            </View>
            <FlatList
              data={parties.filter(p => p.name.toLowerCase().includes(editPartySearch.toLowerCase()))}
              keyExtractor={p => String(p.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerListItem}
                  onPress={() => {
                    setEditPartyId(item.id);
                    setEditSelectedParty(item);
                    setShowEditPartyPicker(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{item.name}</Text>
                  {editPartyId === item.id && <Check size={18} color={theme.colors.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Select Product Modal for Edit */}
      <Modal
        visible={showEditProductPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditProductPicker(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={[styles.pickerModalCard, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>{t.selectProduct}</Text>
              <TouchableOpacity onPress={() => setShowEditProductPicker(false)}>
                <X size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.pickerSearchBox}>
              <Search size={16} color={theme.colors.textSecondary} />
              <TextInput
                style={styles.pickerSearchInput}
                placeholder={t.searchProductFilter}
                value={editProductSearch}
                onChangeText={setEditProductSearch}
              />
            </View>
            <FlatList
              data={products.filter(p => p.name.toLowerCase().includes(editProductSearch.toLowerCase()))}
              keyExtractor={p => String(p.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerListItem}
                  onPress={() => handleEditSelectProduct(item)}
                >
                  <View>
                    <Text style={styles.pickerItemText}>{item.name}</Text>
                    <Text style={styles.pickerItemSub}>
                      Stock: {item.quantity}  •  ₹{parseFloat(item.price || 0).toFixed(2)}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
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
  billCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  billCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  typeIndicator: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  billDetails: {
    flex: 1,
    minWidth: 0,
  },
  billParty: {
    ...theme.typography.body,
    fontWeight: '700',
    color: theme.colors.text,
  },
  billMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  typeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  refBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: theme.colors.primary + '15',
  },
  refBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  billItemCount: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  billAmount: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexShrink: 0,
    marginLeft: 8,
  },
  billNet: {
    ...theme.typography.h3,
    fontWeight: '800',
    color: '#000000',
  },
  billDiscount: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  billCardDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 10,
    opacity: 0.6,
  },
  billCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  billDate: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  billIdText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    fontSize: 11,
  },

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
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amountLabel: { ...theme.typography.body, color: theme.colors.textSecondary, flex: 1 },
  amountValue: { ...theme.typography.body, fontWeight: '600', textAlign: 'right' },
  amountTotalRow: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 10, marginTop: 4, alignItems: 'center' },
  amountTotalLabel: { ...theme.typography.body, fontWeight: '700', color: '#000000', flex: 1 },
  amountTotalValue: { ...theme.typography.h2, fontWeight: '800', color: '#000000', textAlign: 'right' },
  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  paymentModeIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, justifyContent: 'center', alignItems: 'center' },
  paymentAmount: { ...theme.typography.body, fontWeight: '700' },
  paymentMeta: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 2 },
  outstandingCard: { borderRadius: 12, padding: theme.spacing.md, gap: 10, borderWidth: 1, borderColor: theme.colors.border },
  outstandingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  outstandingLabel: { ...theme.typography.body, fontWeight: '600', flex: 1 },
  outstandingValue: { ...theme.typography.h3, fontWeight: '800', textAlign: 'right' },
  recordPaymentBtn: { backgroundColor: theme.colors.primary, padding: 16, borderRadius: theme.borderRadius.md, alignItems: 'center' },
  recordPaymentText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Payment Modal
  payModalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  payModalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: theme.spacing.lg, gap: 14 },
  payModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  payModalTitle: { ...theme.typography.h2 },
  payModalOutstanding: { ...theme.typography.body, fontWeight: '700' },
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

  // Detail Modal Actions
  detailEditHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailActionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  detailEditActionBtn: {
    flex: 1,
    padding: 16,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  detailEditActionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.primary,
  },

  // Edit Bill Modal
  editSaveHeaderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: theme.colors.primary + '15',
  },
  editSaveHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  editModalContent: {
    padding: theme.spacing.lg,
    paddingBottom: 40,
    gap: 14,
  },
  editMetaSection: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  editRowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  editDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  editDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  editFieldLabel: {
    ...theme.typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 4,
  },
  editPartyPickerBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#fff',
  },
  editPartyPickerText: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.text,
  },
  editNoteInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: theme.colors.text,
  },
  editSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 4,
  },
  editAddItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: theme.colors.primary + '15',
  },
  editAddItemBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  editItemCard: {
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  editItemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editItemProductSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 10,
  },
  editItemProductName: {
    ...theme.typography.body,
    fontWeight: '700',
    color: theme.colors.text,
    flexShrink: 1,
  },
  editItemRemoveBtn: {
    padding: 6,
  },
  editItemInputsRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-end',
  },
  editInputGroup: {
    flex: 1,
  },
  editSmallLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  editNumInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  editSubTotalGroup: {
    width: 80,
    alignItems: 'flex-end',
    paddingBottom: 8,
  },
  editSubTotalText: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.text,
  },
  editDiscountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.surface,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  editDiscountLabel: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    flex: 1,
  },
  editDiscountInput: {
    width: 70,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    padding: 6,
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '700',
    color: theme.colors.text,
  },
  editActionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    marginBottom: 20,
  },
  editDiscardBtn: {
    flex: 1,
    padding: 14,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  editDiscardText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  editSaveBtn: {
    flex: 2,
    padding: 14,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editSaveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  // Picker Modals for Edit
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerModalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    padding: theme.spacing.lg,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pickerModalTitle: {
    ...theme.typography.h2,
  },
  pickerSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  pickerSearchInput: {
    flex: 1,
    height: 40,
    ...theme.typography.body,
  },
  pickerListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  pickerItemText: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.text,
  },
  pickerItemSub: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },

  // note key from translations used inline
  note: {},
  totalBeforeDiscount: {},
  discountStep: {},
});

export default HistoryScreen;
