import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, FlatList, ActivityIndicator, Platform, BackHandler, Alert,
  Modal, KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused, useFocusEffect } from '@react-navigation/native';
import { theme } from '../../theme';
import {
  ArrowUpRight, ArrowDownLeft, RotateCcw, ChevronDown,
  Search, X, Trash2, Percent, CreditCard, Banknote, RotateCw,
  Plus, Package, Users, Eye, AlertCircle
} from 'lucide-react-native';
import { BillService, ProductService, PartyService, CategoryService, BillFilters } from '../../services/api';
import Toast from 'react-native-toast-message';
import { useLanguage } from '../../context/LanguageContext';

type BillType = 'purchase' | 'sell' | 'purchase_return' | 'sell_return';

interface LineItem {
  id: string; // local key
  product: any | null;
  quantity: string;
  price: string;
  maxQuantity?: number;
  originalQuantity?: number;
  alreadyReturned?: number;
}

const BILL_TYPES: { key: BillType; icon: any }[] = [
  { key: 'purchase', icon: ArrowDownLeft },
  { key: 'sell', icon: ArrowUpRight },
  { key: 'purchase_return', icon: RotateCcw },
  { key: 'sell_return', icon: RotateCcw },
];

const uid = () => Math.random().toString(36).slice(2);

const StockEntryScreen = () => {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  // ── Core state ──────────────────────────────────────────
  const [type, setType] = useState<BillType>('purchase');
  const [products, setProducts] = useState<any[]>([]);
  const [parties, setParties] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [recentBills, setRecentBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ── Quick Create Product Modal State ─────────────────────
  const [showCreateProductModal, setShowCreateProductModal] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdUnit, setNewProdUnit] = useState('');
  const [newProdCategoryId, setNewProdCategoryId] = useState<number | null>(null);
  const [newProdCategoryName, setNewProdCategoryName] = useState('');
  const [creatingProduct, setCreatingProduct] = useState(false);

  // ── Quick Create Party Modal State ───────────────────────
  const [showCreatePartyModal, setShowCreatePartyModal] = useState(false);
  const [newPartyNameInput, setNewPartyNameInput] = useState('');
  const [creatingParty, setCreatingParty] = useState(false);

  // ── View Original Bill Modal State ───────────────────────
  const [showViewOriginalBillModal, setShowViewOriginalBillModal] = useState(false);

  // ── Selection state ─────────────────────────────────────
  const [selectedParty, setSelectedParty] = useState<any>(null);
  const [originalBill, setOriginalBill] = useState<any>(null);

  // ── Line items ──────────────────────────────────────────
  const [items, setItems] = useState<LineItem[]>([{ id: uid(), product: null, quantity: '', price: '' }]);

  // ── Discounts ───────────────────────────────────────────
  const [discounts, setDiscounts] = useState<string[]>(['']);

  // ── Optional fields ─────────────────────────────────────
  const [note, setNote] = useState('');
  const [payMode, setPayMode] = useState<'cash' | 'online' | null>(null);
  const [payAmount, setPayAmount] = useState('');

  // ── Modal state ─────────────────────────────────────────
  const [modal, setModal] = useState<
    'none' | 'party' | 'bill' | { itemId: string }
  >('none');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Clear Bill Form Fields ──────────────────────────────
  const clearBillFields = useCallback(() => {
    setSelectedParty(null);
    setOriginalBill(null);
    setItems([{ id: uid(), product: null, quantity: '', price: '' }]);
    setDiscounts(['']);
    setNote('');
    setPayMode(null);
    setPayAmount('');
    setModal('none');
    setSearchQuery('');
    setShowCreateProductModal(false);
    setShowCreatePartyModal(false);
    setShowViewOriginalBillModal(false);
    setNewProdName('');
    setNewProdPrice('');
    setNewProdUnit('');
    setNewProdCategoryId(null);
    setNewProdCategoryName('');
    setNewPartyNameInput('');
  }, []);

  // ── Reset Form ──────────────────────────────────────────
  const resetForm = useCallback(() => {
    setType('purchase');
    clearBillFields();
  }, [clearBillFields]);

  // ── Clear form when swapping away from the Bill screen ──
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const wasFocusedRef = useRef(isFocused);

  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      resetForm();
    });
    return unsubscribe;
  }, [navigation, resetForm]);

  useEffect(() => {
    if (wasFocusedRef.current && !isFocused) {
      resetForm();
    }
    wasFocusedRef.current = isFocused;
  }, [isFocused, resetForm]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        resetForm();
      };
    }, [resetForm])
  );

  // ── Fetch ────────────────────────────────────────────────
  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const back = () => {
      if (showViewOriginalBillModal) { setShowViewOriginalBillModal(false); return true; }
      if (showCreatePartyModal) { setShowCreatePartyModal(false); return true; }
      if (showCreateProductModal) { setShowCreateProductModal(false); return true; }
      if (modal !== 'none') { setModal('none'); return true; }
      return false;
    };
    const h = BackHandler.addEventListener('hardwareBackPress', back);
    return () => h.remove();
  }, [modal, showCreateProductModal, showCreatePartyModal, showViewOriginalBillModal]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, entRes, billRes, catRes] = await Promise.all([
        ProductService.getProducts(),
        PartyService.getParties(),
        BillService.getBills({ type: 'purchase' } as BillFilters),
        CategoryService.getCategories(),
      ]);
      setProducts(prodRes.data);
      setParties(entRes.data);
      setCategories(catRes.data);
      // Load recent bills for return reference (both purchase and sell)
      const [sellBillRes] = await Promise.all([
        BillService.getBills({ type: 'sell' } as BillFilters),
      ]);
      setRecentBills([...billRes.data, ...sellBillRes.data]);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Fetch Failed', text2: 'Could not load data' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateProduct = (initialName?: string) => {
    setNewProdName(initialName || searchQuery.trim() || '');
    setNewProdPrice('');
    setNewProdUnit('');
    setNewProdCategoryId(categories.length > 0 ? categories[0].id : null);
    setNewProdCategoryName('');
    setShowCreateProductModal(true);
  };

  const handleCreateProductSubmit = async () => {
    const trimmedName = newProdName.trim();
    if (!trimmedName) {
      Toast.show({ type: 'error', text1: 'Validation', text2: 'Please enter item name' });
      return;
    }
    const priceNum = parseFloat(newProdPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      Toast.show({ type: 'error', text1: 'Validation', text2: 'Please enter a valid price' });
      return;
    }

    let finalCatId = newProdCategoryId;
    if (!finalCatId && newProdCategoryName.trim()) {
      try {
        const catRes = await CategoryService.createCategory({ name: newProdCategoryName.trim() });
        finalCatId = catRes.data.id;
        setCategories(prev => [...prev, catRes.data]);
      } catch (e) {
        Toast.show({ type: 'error', text1: 'Failed', text2: 'Could not create category' });
        return;
      }
    }

    if (!finalCatId && categories.length > 0) {
      finalCatId = categories[0].id;
    }

    if (!finalCatId) {
      try {
        const catRes = await CategoryService.createCategory({ name: 'General' });
        finalCatId = catRes.data.id;
        setCategories(prev => [...prev, catRes.data]);
      } catch (e) {
        Toast.show({ type: 'error', text1: 'Failed', text2: 'Category is required' });
        return;
      }
    }

    if (!finalCatId) {
      Toast.show({ type: 'error', text1: 'Failed', text2: 'Category is required' });
      return;
    }

    const assignedCategoryId: number = finalCatId;

    try {
      setCreatingProduct(true);
      const res = await ProductService.createProduct({
        name: trimmedName,
        price: priceNum,
        quantity: 0,
        category_id: assignedCategoryId,
        unit: newProdUnit.trim() || undefined,
      });
      const created = res.data;
      setProducts(prev => [created, ...prev]);

      if (modal !== 'none' && typeof modal === 'object') {
        const itemId = (modal as { itemId: string }).itemId;
        updateItem(itemId, {
          product: created,
          price: priceNum.toString(),
        });
      }

      Toast.show({ type: 'success', text1: 'Item Created', text2: `${created.name} created & selected` });
      setShowCreateProductModal(false);
      setModal('none');
      setSearchQuery('');
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message || 'Failed to create item';
      Toast.show({ type: 'error', text1: 'Failed', text2: msg });
    } finally {
      setCreatingProduct(false);
    }
  };

  const handleOpenCreateParty = (initialName?: string) => {
    setNewPartyNameInput(initialName || searchQuery.trim() || '');
    setShowCreatePartyModal(true);
  };

  const handleCreatePartySubmit = async () => {
    const trimmedName = newPartyNameInput.trim();
    if (!trimmedName) {
      Toast.show({ type: 'error', text1: 'Validation', text2: 'Please enter party name' });
      return;
    }

    try {
      setCreatingParty(true);
      const res = await PartyService.createParty({ name: trimmedName });
      const created = res.data;

      // Add to local parties list
      setParties(prev => [created, ...prev]);

      // Automatically select this party for the bill
      setSelectedParty(created);

      Toast.show({ type: 'success', text1: 'Party Created', text2: `${created.name} selected` });
      setShowCreatePartyModal(false);
      setModal('none');
      setSearchQuery('');
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message || 'Failed to create party';
      Toast.show({ type: 'error', text1: 'Failed', text2: msg });
    } finally {
      setCreatingParty(false);
    }
  };

  // ── Handle Select Original Bill ──────────────────────────
  const handleSelectOriginalBill = async (billItem: any) => {
    setModal('none');
    setSearchQuery('');
    try {
      // Refresh or get latest products so that real stock counts are always up-to-date
      let currentProducts = products;
      try {
        const prodRes = await ProductService.getProducts();
        if (prodRes?.data && Array.isArray(prodRes.data)) {
          currentProducts = prodRes.data;
          setProducts(prodRes.data);
        }
      } catch {
        // Fallback to existing state products
      }

      // 1. Fetch full bill details with annotated return quantities
      const res = await BillService.getBillById(billItem.id);
      const fullBill = res.data;
      setOriginalBill(fullBill);

      // 2. Autofill Party
      const matchingParty = parties.find((p: any) => p.id === (fullBill.party_id || fullBill.parties?.id));
      if (matchingParty) {
        setSelectedParty(matchingParty);
      } else if (fullBill.parties) {
        setSelectedParty(fullBill.parties);
      } else if (fullBill.party_id) {
        setSelectedParty({ id: fullBill.party_id, name: fullBill.entities?.name || `Party #${fullBill.party_id}` });
      }

      // 3. Pre-populate line items with returnable items from original bill
      const returnableLines = (fullBill.bill_items || [])
        .filter((bi: any) => {
          const retQty = bi.returnable_quantity !== undefined ? bi.returnable_quantity : bi.quantity;
          return retQty > 0;
        })
        .map((bi: any) => {
          const matchedProd = currentProducts.find((p: any) => p.id === bi.product_id);
          return {
            id: uid(),
            product: matchedProd
              ? { ...matchedProd }
              : {
                id: bi.product_id,
                name: bi.products?.name || `Product #${bi.product_id}`,
                quantity: bi.products?.quantity ?? 0,
                price: bi.price,
              },
            quantity: '',
            price: parseFloat(bi.price).toString(),
            maxQuantity: bi.returnable_quantity !== undefined ? bi.returnable_quantity : bi.quantity,
            originalQuantity: bi.quantity,
            alreadyReturned: bi.returned_quantity ?? 0,
          };
        });

      if (returnableLines.length > 0) {
        setItems(returnableLines);
        Toast.show({
          type: 'info',
          text1: 'Original Bill Loaded',
          text2: `Party & ${returnableLines.length} returnable items selected`,
        });
      } else {
        Toast.show({
          type: 'info',
          text1: 'All Items Returned',
          text2: 'All items on this bill have already been fully returned.',
        });
        setItems([{ id: uid(), product: null, quantity: '', price: '' }]);
      }
    } catch (err: any) {
      setOriginalBill(billItem);
      if (billItem.parties) setSelectedParty(billItem.parties);
    }
  };

  // ── Computed totals ──────────────────────────────────────
  const itemSubtotals = items.map(item => {
    const q = parseFloat(item.quantity) || 0;
    const p = parseFloat(item.price) || 0;
    return q * p;
  });
  const totalAmount = itemSubtotals.reduce((a, b) => a + b, 0);
  const netAmount = discounts.reduce((acc, d) => {
    const pct = parseFloat(d) || 0;
    return acc * (1 - pct / 100);
  }, totalAmount);

  // ── Helpers ──────────────────────────────────────────────
  const isReturn = type === 'purchase_return' || type === 'sell_return';

  const addItem = () =>
    setItems(prev => [...prev, { id: uid(), product: null, quantity: '', price: '' }]);

  const removeItem = (id: string) =>
    setItems(prev => prev.length > 1 ? prev.filter(i => i.id !== id) : prev);

  const updateItem = (id: string, patch: Partial<LineItem>) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));

  const addDiscount = () => setDiscounts(prev => [...prev, '']);
  const removeDiscount = (idx: number) =>
    setDiscounts(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : ['']);
  const updateDiscount = (idx: number, val: string) =>
    setDiscounts(prev => prev.map((d, i) => i === idx ? val : d));

  // ── Submit ───────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedParty) {
      Toast.show({ type: 'error', text1: 'Validation', text2: 'Please select a party' });
      return;
    }
    if (isReturn && !originalBill) {
      Toast.show({ type: 'error', text1: 'Validation', text2: 'Please select the original bill' });
      return;
    }
    for (const item of items) {
      if (!item.product) {
        Toast.show({ type: 'error', text1: 'Validation', text2: 'Please select a product for every item' });
        return;
      }
      const q = parseFloat(item.quantity);
      const p = parseFloat(item.price);
      if (!q || q <= 0) {
        Toast.show({ type: 'error', text1: 'Validation', text2: `Invalid quantity for ${item.product.name}` });
        return;
      }
      if (!p || p <= 0) {
        Toast.show({ type: 'error', text1: 'Validation', text2: `Invalid price for ${item.product.name}` });
        return;
      }

      // Return quantity limit check against original bill
      if (isReturn && originalBill) {
        const origItem = (originalBill.bill_items || []).find((bi: any) => bi.product_id === item.product.id);
        if (!origItem) {
          Toast.show({
            type: 'error',
            text1: 'Validation Error',
            text2: `${item.product.name} was not in original bill #${originalBill.id}`,
          });
          return;
        }
        const maxAllowed = origItem.returnable_quantity !== undefined ? origItem.returnable_quantity : Number(origItem.quantity);
        if (q > maxAllowed + 0.0001) {
          Toast.show({
            type: 'error',
            text1: 'Excess Return Quantity',
            text2: `${t.cannotReturnMoreThan} ${maxAllowed} for ${item.product.name}`,
          });
          return;
        }
      }

      // Client-side stock check
      if ((type === 'sell' || type === 'purchase_return') && q > item.product.quantity) {
        Toast.show({
          type: 'error',
          text1: 'Insufficient Stock',
          text2: `${item.product.name}: available ${item.product.quantity}`,
        });
        return;
      }
    }

    const payAmt = parseFloat(payAmount) || 0;
    if (payMode && payAmt > netAmount + 0.001) {
      Toast.show({ type: 'error', text1: 'Validation', text2: `Payment exceeds net amount ₹${netAmount.toFixed(2)}` });
      return;
    }

    try {
      setSubmitting(true);
      const billRes = await BillService.createBill({
        type,
        party_id: selectedParty.id,
        original_bill_id: originalBill?.id,
        items: items.map(i => ({
          product_id: i.product!.id,
          quantity: parseFloat(i.quantity),
          price: parseFloat(i.price),
        })),
        discounts: discounts
          .map(d => parseFloat(d) || 0)
          .filter(d => d > 0),
        note: note.trim() || undefined,
      });

      const bill = billRes.data;

      // Record payment if amount entered
      if (payMode && payAmt > 0) {
        await BillService.createPayment({
          bill_id: bill.id,
          party_id: selectedParty.id,
          amount: payAmt,
          mode: payMode,
        });
      }

      Toast.show({ type: 'success', text1: 'Bill Created', text2: `Net amount ₹${bill.net_amount}` });
      resetForm();
      fetchData();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message || 'Unknown error';
      Toast.show({ type: 'error', text1: 'Failed', text2: msg });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Filter helpers ───────────────────────────────────────
  const filteredParties = parties.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (isReturn && originalBill && originalBill.bill_items) {
      const isFromOriginal = originalBill.bill_items.some((bi: any) => bi.product_id === p.id);
      return matchesSearch && isFromOriginal;
    }
    return matchesSearch;
  });
  const filteredBills = recentBills.filter(b => {
    const expectedType = type === 'purchase_return' ? 'purchase' : 'sell';
    const matchType = b.type === expectedType;
    const matchSearch = searchQuery
      ? (b.parties?.name || b.entities?.name)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(b.id).includes(searchQuery)
      : true;
    return matchType && matchSearch;
  });

  // ── Discount breakdown label ─────────────────────────────
  const discountSteps = (() => {
    const steps: { label: string; value: number }[] = [];
    let running = totalAmount;
    discounts.forEach((d, i) => {
      const pct = parseFloat(d) || 0;
      if (pct > 0) {
        running = running * (1 - pct / 100);
        steps.push({ label: `Discount ${i + 1}: ${pct}%`, value: running });
      }
    });
    return steps;
  })();

  const renderTypeButton = (bt: { key: BillType; icon: any }) => {
    const isSelected = type === bt.key;
    const Icon = bt.icon;
    const label = t[
      bt.key === 'purchase' ? 'purchase'
        : bt.key === 'sell' ? 'sell'
          : bt.key === 'purchase_return' ? 'purchaseReturn'
            : 'sellReturn'
    ];

    return (
      <TouchableOpacity
        key={bt.key}
        style={[styles.typeCard, isSelected && styles.typeCardActive]}
        onPress={() => {
          if (type !== bt.key) {
            setType(bt.key);
            clearBillFields();
          }
        }}
        activeOpacity={0.75}
      >
        <View style={[styles.typeIconContainer, isSelected && styles.typeIconContainerActive]}>
          <Icon size={16} color={isSelected ? '#FFFFFF' : theme.colors.primary} />
        </View>
        <Text
          style={[styles.typeText, isSelected && styles.typeTextActive]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>{t.stockEntry}</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={fetchData} activeOpacity={0.7}>
            <RotateCw size={18} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* ── Type selector ── */}
        <View style={styles.typeSection}>
          <Text style={styles.label}>{t.typeLabel}</Text>
          <View style={styles.typeContainer}>
            <View style={styles.typeRow}>
              {BILL_TYPES.slice(0, 2).map(renderTypeButton)}
            </View>
            <View style={styles.typeRow}>
              {BILL_TYPES.slice(2, 4).map(renderTypeButton)}
            </View>
          </View>
        </View>

        {/* ── Original bill (for returns) ── */}
        {isReturn && (
          <View style={styles.inputGroup}>
            <View style={styles.originalBillHeaderRow}>
              <Text style={styles.label}>{t.originalBill}</Text>
              {originalBill && (
                <TouchableOpacity
                  style={styles.viewOrigBillBtn}
                  onPress={() => setShowViewOriginalBillModal(true)}
                  activeOpacity={0.7}
                >
                  <Eye size={14} color={theme.colors.primary} />
                  <Text style={styles.viewOrigBillBtnText}>{t.viewOriginalBill}</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => { setSearchQuery(''); setModal('bill'); }}
            >
              <Text style={[styles.pickerText, originalBill && { color: theme.colors.text }]}>
                {originalBill
                  ? `Bill #${originalBill.id} — ${originalBill.parties?.name || originalBill.entities?.name || ''}`
                  : t.selectBill}
              </Text>
              <ChevronDown size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Party picker ── */}
        <View style={styles.inputGroup}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.label}>{t.party} *</Text>
            {isReturn && originalBill && (
              <Text style={styles.lockedPartyBadge}>Autofilled from Bill #{originalBill.id}</Text>
            )}
          </View>
          <TouchableOpacity
            style={[styles.picker, isReturn && originalBill && styles.pickerDisabled]}
            disabled={isReturn && Boolean(originalBill)}
            onPress={() => { setSearchQuery(''); setModal('party'); }}
          >
            <Text style={[styles.pickerText, selectedParty && { color: theme.colors.text }]}>
              {selectedParty ? selectedParty.name : t.selectParty}
            </Text>
            {(!isReturn || !originalBill) && (
              <ChevronDown size={20} color={theme.colors.textSecondary} />
            )}
          </TouchableOpacity>
        </View>

        {/* ── Line items ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t.itemsLabel}</Text>
          <TouchableOpacity style={styles.addBtn} onPress={addItem}>
            <Text style={styles.addBtnText}>{t.addItem}</Text>
          </TouchableOpacity>
        </View>

        {items.map((item, idx) => (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemNumber}>Item {idx + 1}</Text>
              {items.length > 1 && (
                <TouchableOpacity onPress={() => removeItem(item.id)}>
                  <Trash2 size={16} color={theme.colors.error} />
                </TouchableOpacity>
              )}
            </View>

            {/* Product picker */}
            <TouchableOpacity
              style={styles.picker}
              onPress={() => { setSearchQuery(''); setModal({ itemId: item.id }); }}
            >
              <Text style={[styles.pickerText, item.product && { color: theme.colors.text }]}>
                {item.product ? `${item.product.name} (${t.stock}: ${item.product.quantity})` : t.selectProduct}
              </Text>
              <ChevronDown size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            {/* Qty + Price */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>{t.quantity}</Text>
                <TextInput
                  style={[
                    styles.input,
                    ((isReturn && originalBill && item.maxQuantity !== undefined && parseFloat(item.quantity) > item.maxQuantity) ||
                     ((type === 'sell' || type === 'purchase_return') && item.product && parseFloat(item.quantity) > item.product.quantity)) &&
                    styles.inputError,
                  ]}
                  placeholder="0"
                  keyboardType="numeric"
                  value={item.quantity}
                  onChangeText={v => updateItem(item.id, { quantity: v })}
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>{t.price}</Text>
                <TextInput
                  style={[styles.input, isReturn && originalBill && styles.pickerDisabled]}
                  editable={!isReturn || !originalBill}
                  placeholder="0.00"
                  keyboardType="numeric"
                  value={item.price}
                  onChangeText={v => updateItem(item.id, { price: v })}
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>
            </View>

            {/* Return Item Limit Hint */}
            {isReturn && originalBill && item.maxQuantity !== undefined && (
              <View style={styles.returnItemLimitContainer}>
                <Text style={styles.returnItemLimitText}>
                  {t.maxReturnable}: <Text style={{ fontWeight: '700', color: theme.colors.text }}>{item.maxQuantity}</Text>  ({t.originalQuantity}: {item.originalQuantity}{item.alreadyReturned ? `, ${t.alreadyReturned}: ${item.alreadyReturned}` : ''})
                </Text>
                {parseFloat(item.quantity) > item.maxQuantity && (
                  <View style={styles.inlineErrorBox}>
                    <AlertCircle size={14} color={theme.colors.error} style={{ flexShrink: 0 }} />
                    <Text style={styles.inlineErrorText}>
                      {t.exceedsReturnableQty} ({t.cannotReturnMoreThan} {item.maxQuantity})
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Insufficient Stock Warning for Sell or Purchase Return */}
            {(type === 'sell' || type === 'purchase_return') && item.product && parseFloat(item.quantity) > item.product.quantity && (
              <View style={styles.inlineErrorBox}>
                <AlertCircle size={14} color={theme.colors.error} style={{ flexShrink: 0 }} />
                <Text style={styles.inlineErrorText}>
                  {item.product.name}: {t.stock} {item.product.quantity}
                </Text>
              </View>
            )}

            {/* Item subtotal */}
            {item.product && item.quantity && item.price && (
              <Text style={styles.subTotalHint}>
                Subtotal: ₹{((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)).toFixed(2)}
              </Text>
            )}
          </View>
        ))}

        {/* ── Discounts ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t.discountPercent}</Text>
          <TouchableOpacity style={styles.addBtn} onPress={addDiscount}>
            <Text style={styles.addBtnText}>{t.addDiscount}</Text>
          </TouchableOpacity>
        </View>

        {discounts.map((d, idx) => (
          <View key={idx} style={styles.discountRow}>
            <Text style={styles.discountLabel}>{t.discountStep} {idx + 1}</Text>
            <View style={styles.discountInputWrap}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="0"
                keyboardType="numeric"
                value={d}
                onChangeText={v => updateDiscount(idx, v)}
                placeholderTextColor={theme.colors.textSecondary}
              />
              <Percent size={16} color={theme.colors.textSecondary} style={{ marginLeft: 8 }} />
            </View>
            {discounts.length > 1 && (
              <TouchableOpacity onPress={() => removeDiscount(idx)} style={styles.removeDiscountBtn}>
                <X size={14} color={theme.colors.error} />
              </TouchableOpacity>
            )}
          </View>
        ))}

        {/* ── Note ── */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t.note}</Text>
          <TextInput
            style={[styles.input, { minHeight: 48 }]}
            placeholder="Optional note..."
            value={note}
            onChangeText={setNote}
            placeholderTextColor={theme.colors.textSecondary}
            multiline
          />
        </View>

        {/* ── Mode of Payment (optional) ── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>{t.modeOfPayment}</Text>
            <View style={styles.optionalBadge}>
              <Text style={styles.optionalBadgeText}>{t.optional}</Text>
            </View>
          </View>
        </View>
        <View style={styles.payModeRow}>
          <TouchableOpacity
            style={[styles.payModeBtn, payMode === 'cash' && styles.payModeBtnActive]}
            onPress={() => setPayMode(payMode === 'cash' ? null : 'cash')}
          >
            <Banknote size={16} color={payMode === 'cash' ? '#fff' : theme.colors.textSecondary} />
            <Text style={[styles.payModeText, payMode === 'cash' && { color: '#fff' }]}>{t.cash}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.payModeBtn, payMode === 'online' && styles.payModeBtnActive]}
            onPress={() => setPayMode(payMode === 'online' ? null : 'online')}
          >
            <CreditCard size={16} color={payMode === 'online' ? '#fff' : theme.colors.textSecondary} />
            <Text style={[styles.payModeText, payMode === 'online' && { color: '#fff' }]}>{t.online}</Text>
          </TouchableOpacity>
        </View>

        {payMode && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.paymentAmount}</Text>
            <TextInput
              style={[
                styles.input,
                parseFloat(payAmount) > netAmount + 0.001 && styles.inputError,
              ]}
              placeholder={`Max ₹${netAmount.toFixed(2)}`}
              keyboardType="numeric"
              value={payAmount}
              onChangeText={setPayAmount}
              placeholderTextColor={theme.colors.textSecondary}
            />
            {parseFloat(payAmount) > netAmount + 0.001 && (
              <View style={styles.inlineErrorBox}>
                <AlertCircle size={14} color={theme.colors.error} style={{ flexShrink: 0 }} />
                <Text style={styles.inlineErrorText}>
                  Payment exceeds net amount ₹{netAmount.toFixed(2)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Summary card ── */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t.totalBeforeDiscount}</Text>
            <Text style={styles.summaryValue}>₹{totalAmount.toFixed(2)}</Text>
          </View>
          {discountSteps.map((step, i) => (
            <View key={i} style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.error }]}>{step.label}</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.error }]}>₹{step.value.toFixed(2)}</Text>
            </View>
          ))}
          <View style={[styles.summaryRow, styles.summaryTotal]}>
            <Text style={styles.summaryTotalLabel}>{t.netAmount}</Text>
            <Text style={styles.summaryTotalValue}>
              ₹{netAmount.toFixed(2)}
            </Text>
          </View>
          {payMode && parseFloat(payAmount) > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.success }]}>
                {t.paid} ({payMode})
              </Text>
              <Text style={[styles.summaryValue, { color: theme.colors.success }]}>
                ₹{parseFloat(payAmount).toFixed(2)}
              </Text>
            </View>
          )}
        </View>

        {/* ── Submit ── */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitText}>
              {type === 'purchase' ? t.confirmPurchase
                : type === 'sell' ? t.confirmSale
                  : t.confirmReturn}
            </Text>
          }
        </TouchableOpacity>
      </ScrollView>

      {/* ────────── Modals ────────── */}

      {/* Party Modal */}
      {modal === 'party' && (
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t.selectParty}</Text>
              <TouchableOpacity onPress={() => setModal('none')}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalSearch}>
              <Search size={18} color={theme.colors.textSecondary} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder={t.searchByName}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <X size={16} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            <FlatList
              data={filteredParties}
              keyExtractor={i => String(i.id)}
              contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: 40 }}
              ListHeaderComponent={
                searchQuery.trim().length > 0 && !filteredParties.some(p => p.name.toLowerCase() === searchQuery.trim().toLowerCase()) ? (
                  <TouchableOpacity
                    style={styles.createItemQuickRow}
                    onPress={() => handleOpenCreateParty(searchQuery.trim())}
                    activeOpacity={0.7}
                  >
                    <View style={styles.createItemQuickIcon}>
                      <Plus size={16} color={theme.colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.createItemQuickTitle}>
                        + {t.party} "{searchQuery.trim()}"
                      </Text>
                      <Text style={styles.createItemQuickSub}>
                        {t.registerNew} {t.party.toLowerCase()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ) : null
              }
              ListEmptyComponent={
                searchQuery.trim().length > 0 ? (
                  <View style={styles.noResultsBox}>
                    <Users size={38} color={theme.colors.textSecondary} />
                    <Text style={styles.noResultsTitle}>
                      {t.noPartyFound}
                    </Text>
                    <Text style={styles.noResultsSub}>
                      {t.noPartyFound}: "{searchQuery.trim()}"
                    </Text>
                    <TouchableOpacity
                      style={styles.createItemPromptBtn}
                      onPress={() => handleOpenCreateParty(searchQuery.trim())}
                      activeOpacity={0.8}
                    >
                      <Plus size={16} color="#FFF" />
                      <Text style={styles.createItemPromptBtnText}>
                        {t.createParty} "{searchQuery.trim()}"
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.emptyText}>{t.noPartyFound}</Text>
                )
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => { setSelectedParty(item); setModal('none'); }}
                >
                  <Text style={styles.modalItemName}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </SafeAreaView>
        </View>
      )}

      {/* Product Modal */}
      {modal !== 'none' && typeof modal === 'object' && (
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isReturn && originalBill ? t.onlyOriginalItems : t.selectProduct}
              </Text>
              <TouchableOpacity onPress={() => setModal('none')}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalSearch}>
              <Search size={18} color={theme.colors.textSecondary} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder={t.searchProduct}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <X size={16} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            <FlatList
              data={filteredProducts}
              keyExtractor={i => String(i.id)}
              contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: 40 }}
              ListHeaderComponent={
                !isReturn && searchQuery.trim().length > 0 && !filteredProducts.some(p => p.name.toLowerCase() === searchQuery.trim().toLowerCase()) ? (
                  <TouchableOpacity
                    style={styles.createItemQuickRow}
                    onPress={() => handleOpenCreateProduct(searchQuery.trim())}
                    activeOpacity={0.7}
                  >
                    <View style={styles.createItemQuickIcon}>
                      <Plus size={16} color={theme.colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.createItemQuickTitle}>
                        + Create "{searchQuery.trim()}"
                      </Text>
                      <Text style={styles.createItemQuickSub}>
                        Tap to add as a new item
                      </Text>
                    </View>
                  </TouchableOpacity>
                ) : null
              }
              ListEmptyComponent={
                searchQuery.trim().length > 0 ? (
                  <View style={styles.noResultsBox}>
                    <Package size={38} color={theme.colors.textSecondary} />
                    <Text style={styles.noResultsTitle}>
                      {t.noItemsFound}
                    </Text>
                    <Text style={styles.noResultsSub}>
                      {isReturn && originalBill
                        ? `"${searchQuery.trim()}" was not found in original bill #${originalBill.id}.`
                        : `No item matches "${searchQuery.trim()}". Create it now to proceed.`}
                    </Text>
                    {!isReturn && (
                      <TouchableOpacity
                        style={styles.createItemPromptBtn}
                        onPress={() => handleOpenCreateProduct(searchQuery.trim())}
                        activeOpacity={0.8}
                      >
                        <Plus size={16} color="#FFF" />
                        <Text style={styles.createItemPromptBtnText}>
                          Create "{searchQuery.trim()}"
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <Text style={styles.emptyText}>{t.noItemsFound}</Text>
                )
              }
              renderItem={({ item }) => {
                const origBi = isReturn && originalBill
                  ? (originalBill.bill_items || []).find((bi: any) => bi.product_id === item.id)
                  : null;
                const maxReturnable = origBi ? (origBi.returnable_quantity !== undefined ? origBi.returnable_quantity : origBi.quantity) : undefined;
                const origPrice = origBi ? parseFloat(origBi.price).toString() : parseFloat(item.price).toString();
                const isFullyReturned = maxReturnable !== undefined && maxReturnable <= 0;

                return (
                  <TouchableOpacity
                    style={[styles.modalItem, isFullyReturned && { opacity: 0.5 }]}
                    disabled={isFullyReturned}
                    onPress={() => {
                      const itemId = (modal as { itemId: string }).itemId;
                      updateItem(itemId, {
                        product: item,
                        price: origPrice,
                        maxQuantity: maxReturnable,
                        originalQuantity: origBi?.quantity,
                        alreadyReturned: origBi?.returned_quantity ?? 0,
                      });
                      setModal('none');
                    }}
                  >
                    <Text style={styles.modalItemName}>{item.name}</Text>
                    <Text style={styles.modalItemSub}>
                      {isReturn && origBi
                        ? `${t.originalQuantity}: ${origBi.quantity}  •  ${t.alreadyReturned}: ${origBi.returned_quantity ?? 0}  •  ${t.maxReturnable}: ${maxReturnable}`
                        : `${t.stock}: ${item.quantity}  •  ₹${parseFloat(item.price).toFixed(2)}`}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </SafeAreaView>
        </View>
      )}

      {/* Original Bill Modal */}
      {modal === 'bill' && (
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t.selectBill}</Text>
              <TouchableOpacity onPress={() => setModal('none')}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalSearch}>
              <Search size={18} color={theme.colors.textSecondary} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder={t.searchBills}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <FlatList
              data={filteredBills}
              keyExtractor={i => String(i.id)}
              contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: 40 }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No bills found</Text>
              }
              renderItem={({ item }) => {
                const partyName = item.parties?.name || item.entities?.name || `Party #${item.party_id}`;
                const adjAmount = item.adjusted_net_amount !== undefined ? item.adjusted_net_amount : item.net_amount;
                return (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => handleSelectOriginalBill(item)}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.modalItemName}>Bill #{item.id} — {partyName}</Text>
                      {item.return_count > 0 && (
                        <View style={styles.hasReturnsBadge}>
                          <Text style={styles.hasReturnsBadgeText}>{item.return_count} Returns</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.modalItemSub}>
                      ₹{parseFloat(adjAmount).toFixed(2)}{item.total_returned > 0 ? ` (orig ₹${parseFloat(item.net_amount).toFixed(2)})` : ''}  •  {item.bill_date?.split('T')[0]}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </SafeAreaView>
        </View>
      )}

      {/* ── Quick Create Product Modal ── */}
      <Modal
        visible={showCreateProductModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateProductModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.quickCreateOverlay}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setShowCreateProductModal(false)}
          />
          <View style={[styles.quickCreateCard, { paddingBottom: Math.max(insets.bottom, 16) + 20 }]}>
            <View style={styles.quickCreateHeader}>
              <View>
                <Text style={styles.quickCreateTitle}>New Item</Text>
                <Text style={styles.quickCreateSubtitle}>Register and select for this entry</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowCreateProductModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t.productName || 'Item Name'} *</Text>
              <TextInput
                style={styles.input}
                value={newProdName}
                onChangeText={setNewProdName}
                placeholder="Item name..."
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            {/* Price & Unit Row */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>{t.price} (₹) *</Text>
                <TextInput
                  style={styles.input}
                  value={newProdPrice}
                  onChangeText={setNewProdPrice}
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>{t.unit || 'Unit'}</Text>
                <TextInput
                  style={styles.input}
                  value={newProdUnit}
                  onChangeText={setNewProdUnit}
                  placeholder="e.g. pcs, sqft"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>
            </View>

            {/* Category selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t.category} *</Text>
              {categories.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {categories.map((cat: any) => {
                    const isSel = newProdCategoryId === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.catChip, isSel && styles.catChipActive]}
                        onPress={() => setNewProdCategoryId(cat.id)}
                      >
                        <Text style={[styles.catChipText, isSel && styles.catChipTextActive]}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : (
                <TextInput
                  style={styles.input}
                  value={newProdCategoryName}
                  onChangeText={setNewProdCategoryName}
                  placeholder="Enter category name..."
                  placeholderTextColor={theme.colors.textSecondary}
                />
              )}
            </View>

            {/* Modal Actions */}
            <View style={styles.quickCreateActions}>
              <TouchableOpacity
                style={styles.quickCreateCancelBtn}
                onPress={() => setShowCreateProductModal(false)}
              >
                <Text style={styles.quickCreateCancelText}>{t.discard}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickCreateSubmitBtn, creatingProduct && { opacity: 0.7 }]}
                onPress={handleCreateProductSubmit}
                disabled={creatingProduct}
              >
                {creatingProduct ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.quickCreateSubmitText}>{t.createItem}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Quick Create Party Modal ── */}
      <Modal
        visible={showCreatePartyModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreatePartyModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.quickCreateOverlay}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setShowCreatePartyModal(false)}
          />
          <View style={[styles.quickCreateCard, { paddingBottom: Math.max(insets.bottom, 16) + 20 }]}>
            <View style={styles.quickCreateHeader}>
              <View>
                <Text style={styles.quickCreateTitle}>{t.new} {t.party}</Text>
                <Text style={styles.quickCreateSubtitle}>Register and select for this bill</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowCreatePartyModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t.party} {t.name}</Text>
              <TextInput
                style={styles.input}
                value={newPartyNameInput}
                onChangeText={setNewPartyNameInput}
                placeholder="Party name..."
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            {/* Modal Actions */}
            <View style={styles.quickCreateActions}>
              <TouchableOpacity
                style={styles.quickCreateCancelBtn}
                onPress={() => setShowCreatePartyModal(false)}
              >
                <Text style={styles.quickCreateCancelText}>{t.discard}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickCreateSubmitBtn, creatingParty && { opacity: 0.7 }]}
                onPress={handleCreatePartySubmit}
                disabled={creatingParty}
              >
                {creatingParty ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.quickCreateSubmitText}>{t.createParty}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* ── View Original Bill Modal ── */}
      <Modal
        visible={showViewOriginalBillModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowViewOriginalBillModal(false)}
      >
        <View style={styles.viewOrigModalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setShowViewOriginalBillModal(false)}
          />
          <View style={[styles.viewOrigModalCard, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
            <View style={styles.viewOrigModalHeader}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.viewOrigModalTitle}>
                    Bill #{originalBill?.id}
                  </Text>
                  <View style={[
                    styles.typeBadge,
                    { backgroundColor: (originalBill?.type === 'purchase' ? '#1A1A1A' : '#333333') }
                  ]}>
                    <Text style={styles.typeBadgeText}>
                      {originalBill?.type?.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.viewOrigModalSubtitle}>
                  {originalBill?.parties?.name || selectedParty?.name || 'Party'}  •  {originalBill?.bill_date?.split('T')[0]}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowViewOriginalBillModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              {/* Items Table */}
              <Text style={styles.origSectionHeader}>{t.itemsLabel}</Text>
              {(originalBill?.bill_items || []).map((bi: any, index: number) => {
                const retQty = bi.returned_quantity ?? 0;
                const maxQty = bi.returnable_quantity !== undefined ? bi.returnable_quantity : bi.quantity;
                return (
                  <View key={bi.id || index} style={styles.origItemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.origItemName}>{bi.products?.name || `Item #${bi.product_id}`}</Text>
                      <Text style={styles.origItemMeta}>
                        ₹{parseFloat(bi.price).toFixed(2)} × {bi.quantity}  =  ₹{(bi.quantity * bi.price).toFixed(2)}
                      </Text>
                      {retQty > 0 && (
                        <Text style={styles.origItemReturned}>
                          {t.alreadyReturned}: {retQty}  •  {t.maxReturnable}: {maxQty}
                        </Text>
                      )}
                    </View>
                    <View style={styles.origItemStatus}>
                      <Text style={[styles.origItemReturnable, maxQty === 0 && { color: theme.colors.textSecondary }]}>
                        {maxQty > 0 ? `${maxQty} returnable` : 'Fully Returned'}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {/* Linked Return Bills References */}
              {originalBill?.return_bills && originalBill.return_bills.length > 0 && (
                <View style={styles.linkedReturnsContainer}>
                  <Text style={styles.origSectionHeader}>{t.linkedReturnBills}</Text>
                  {originalBill.return_bills.map((rb: any) => (
                    <View key={rb.id} style={styles.linkedReturnRow}>
                      <View>
                        <Text style={styles.linkedReturnTitle}>Return Bill #{rb.id}</Text>
                        <Text style={styles.linkedReturnDate}>{rb.bill_date?.split('T')[0]}</Text>
                      </View>
                      <Text style={styles.linkedReturnAmount}>- ₹{parseFloat(rb.net_amount).toFixed(2)}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Financial summary */}
              <View style={styles.origFinancialCard}>
                <View style={styles.origFinancialRow}>
                  <Text style={styles.origFinancialLabel}>{t.totalBeforeDiscount}</Text>
                  <Text style={styles.origFinancialValue}>₹{parseFloat(originalBill?.total_amount || 0).toFixed(2)}</Text>
                </View>
                {originalBill?.discounts && originalBill.discounts.length > 0 && (
                  <View style={styles.origFinancialRow}>
                    <Text style={[styles.origFinancialLabel, { color: theme.colors.error }]}>Discounts</Text>
                    <Text style={[styles.origFinancialValue, { color: theme.colors.error }]}>
                      {originalBill.discounts.map((d: any) => `${d}%`).join(' + ')}
                    </Text>
                  </View>
                )}
                <View style={styles.origFinancialRow}>
                  <Text style={styles.origFinancialLabel}>Original Net Amount</Text>
                  <Text style={styles.origFinancialValue}>₹{parseFloat(originalBill?.net_amount || 0).toFixed(2)}</Text>
                </View>
                {originalBill?.total_returned > 0 && (
                  <>
                    <View style={styles.origFinancialRow}>
                      <Text style={[styles.origFinancialLabel, { color: theme.colors.error }]}>{t.returnsApplied}</Text>
                      <Text style={[styles.origFinancialValue, { color: theme.colors.error }]}>
                        - ₹{parseFloat(originalBill.total_returned).toFixed(2)}
                      </Text>
                    </View>
                    <View style={[styles.origFinancialRow, { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 6 }]}>
                      <Text style={[styles.origFinancialLabel, { fontWeight: '700' }]}>{t.adjustedBillAmount}</Text>
                      <Text style={[styles.origFinancialValue, { fontWeight: '700' }]}>
                        ₹{parseFloat(originalBill.adjusted_net_amount).toFixed(2)}
                      </Text>
                    </View>
                  </>
                )}
                <View style={styles.origFinancialRow}>
                  <Text style={[styles.origFinancialLabel, { color: theme.colors.success }]}>{t.totalPaid}</Text>
                  <Text style={[styles.origFinancialValue, { color: theme.colors.success }]}>
                    ₹{parseFloat(originalBill?.total_paid || 0).toFixed(2)}
                  </Text>
                </View>
                <View style={[styles.origFinancialRow, { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 6 }]}>
                  <Text style={[styles.origFinancialLabel, { fontWeight: '700', color: (originalBill?.outstanding || 0) > 0 ? theme.colors.error : theme.colors.success }]}>
                    {t.outstanding}
                  </Text>
                  <Text style={[styles.origFinancialValue, { fontWeight: '700', color: (originalBill?.outstanding || 0) > 0 ? theme.colors.error : theme.colors.success }]}>
                    ₹{parseFloat(originalBill?.outstanding || 0).toFixed(2)}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.closeOrigModalBtn}
              onPress={() => setShowViewOriginalBillModal(false)}
            >
              <Text style={styles.closeOrigModalText}>{t.done}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  title: { ...theme.typography.h1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Type selector
  typeSection: {
    marginBottom: theme.spacing.xl,
  },
  typeContainer: {
    gap: 10,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: 8,
  },
  typeCardActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  typeIconContainer: {
    width: 28,
    height: 28,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  typeIconContainerActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'transparent',
  },
  typeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  typeTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Form
  inputGroup: { marginBottom: theme.spacing.md },
  label: {
    ...theme.typography.caption, fontWeight: '700',
    textTransform: 'uppercase', color: theme.colors.textSecondary,
    letterSpacing: 0.5, marginBottom: 8,
  },
  picker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.colors.surface, padding: 16,
    borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border,
  },
  pickerText: { ...theme.typography.body, color: theme.colors.textSecondary, flex: 1 },
  input: {
    backgroundColor: theme.colors.surface, padding: 14,
    borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border,
    ...theme.typography.body, fontSize: 15,
  },
  row: { flexDirection: 'row', gap: 12 },

  // Section header
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 8 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { ...theme.typography.body, fontWeight: '700', color: theme.colors.text },
  optionalBadge: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  optionalBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addBtnText: { ...theme.typography.caption, color: theme.colors.primary, fontWeight: '700' },

  // Item card
  itemCard: {
    backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md,
    borderWidth: 1, borderColor: theme.colors.border,
    padding: theme.spacing.md, marginBottom: theme.spacing.md, gap: 10,
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemNumber: { ...theme.typography.caption, fontWeight: '700', color: theme.colors.textSecondary, textTransform: 'uppercase' },
  subTotalHint: { ...theme.typography.caption, color: theme.colors.primary, textAlign: 'right', fontWeight: '600' },

  // Discounts
  discountRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  discountLabel: { ...theme.typography.caption, color: theme.colors.textSecondary, width: 70, fontWeight: '600' },
  discountInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  removeDiscountBtn: { padding: 6 },

  // Pay mode
  payModeRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  payModeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: theme.borderRadius.md,
    borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface,
  },
  payModeBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  payModeText: { fontWeight: '600', color: theme.colors.textSecondary },

  // Summary
  summaryCard: {
    backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md,
    borderWidth: 1, borderColor: theme.colors.border,
    padding: theme.spacing.md, gap: 10, marginBottom: theme.spacing.xl,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { ...theme.typography.body, color: theme.colors.textSecondary },
  summaryValue: { ...theme.typography.body, fontWeight: '600', color: theme.colors.text },
  summaryTotal: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 10, marginTop: 4 },
  summaryTotalLabel: { ...theme.typography.body, fontWeight: '700', color: theme.colors.text },
  summaryTotalValue: { ...theme.typography.h2, fontWeight: '800', color: theme.colors.primary },

  // Submit
  submitBtn: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Modal
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.background,
    zIndex: 1000,
  },
  modalContainer: { flex: 1, backgroundColor: theme.colors.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md,
  },
  modalTitle: { ...theme.typography.h2 },
  modalSearch: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.lg, paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  modalSearchInput: { flex: 1, height: 48, marginLeft: theme.spacing.sm, ...theme.typography.body },
  modalItem: { padding: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  modalItemName: { ...theme.typography.body, fontWeight: '600' },
  modalItemSub: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  emptyText: { ...theme.typography.caption, textAlign: 'center', marginTop: 40, color: theme.colors.textSecondary },

  // Quick Create Item
  createItemQuickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.surface,
    padding: 14,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  createItemQuickIcon: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  createItemQuickTitle: {
    ...theme.typography.body,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  createItemQuickSub: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  noResultsBox: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    gap: 10,
  },
  noResultsTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    textAlign: 'center',
    marginTop: 8,
  },
  noResultsSub: {
    ...theme.typography.caption,
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  createItemPromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: theme.borderRadius.md,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  createItemPromptBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  quickCreateOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  quickCreateCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: theme.spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  quickCreateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.lg,
  },
  quickCreateTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  quickCreateSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  catChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  catChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  catChipText: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  catChipTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  quickCreateActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: theme.spacing.md,
  },
  quickCreateCancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCreateCancelText: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  quickCreateSubmitBtn: {
    flex: 2,
    padding: 14,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCreateSubmitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  // Return bill UI & limits
  originalBillHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  viewOrigBillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  viewOrigBillBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  lockedPartyBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pickerDisabled: {
    opacity: 0.85,
    backgroundColor: '#F3F4F6',
  },
  returnItemLimitContainer: {
    marginTop: 6,
    width: '100%',
  },
  returnItemLimitText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    flexWrap: 'wrap',
    lineHeight: 16,
  },
  inlineErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 5,
    width: '100%',
  },
  inlineErrorText: {
    fontSize: 11,
    color: theme.colors.error,
    fontWeight: '600',
    flex: 1,
    flexWrap: 'wrap',
    lineHeight: 15,
  },
  inputError: {
    borderColor: theme.colors.error,
    borderWidth: 1.5,
    backgroundColor: '#FFF5F5',
  },
  hasReturnsBadge: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  hasReturnsBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primary,
  },

  // View Original Bill Modal
  viewOrigModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  viewOrigModalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  viewOrigModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: 10,
  },
  viewOrigModalTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  viewOrigModalSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  origSectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginTop: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  origItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  origItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  origItemMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  origItemReturned: {
    fontSize: 11,
    color: theme.colors.error,
    marginTop: 2,
  },
  origItemStatus: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 10,
  },
  origItemReturnable: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  linkedReturnsContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: theme.borderRadius.md,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  linkedReturnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  linkedReturnTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  linkedReturnDate: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  linkedReturnAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.error,
  },
  origFinancialCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: theme.borderRadius.md,
    padding: 12,
    marginTop: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  origFinancialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  origFinancialLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  origFinancialValue: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  closeOrigModalBtn: {
    backgroundColor: theme.colors.primary,
    padding: 14,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginTop: 14,
  },
  closeOrigModalText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
});

export default StockEntryScreen;
