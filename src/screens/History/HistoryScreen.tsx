import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, ScrollView, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, Animated, BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { ArrowUpRight, ArrowDownLeft, Clock, Filter, Calendar, X, ChevronDown, Search } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { StockService, ProductService, EntityService } from '../../services/api';
import Toast from 'react-native-toast-message';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { FileSpreadsheet, TrendingUp, TrendingDown, Wallet } from 'lucide-react-native';
import { useLanguage } from '../../context/LanguageContext';

const HistoryScreen = () => {
  const { t } = useLanguage();
  const [history, setHistory] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [parties, setParties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'custom'>('all');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<number | null>(null);
  
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'date' | 'product' | 'party'>('date');
  
  // Custom range state
  const [customRange, setCustomRange] = useState({ 
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)), 
    end: new Date() 
  });

  // Modal temporary state
  const [tempFilter, setTempFilter] = useState<'all' | 'custom'>('all');
  const [tempRange, setTempRange] = useState({ ...customRange });
  const [tempProductId, setTempProductId] = useState<number | null>(null);
  const [tempEntityId, setTempEntityId] = useState<number | null>(null);
  
  const [productSearch, setProductSearch] = useState('');
  const [partySearch, setPartySearch] = useState('');
  const [showPicker, setShowPicker] = useState<{ show: boolean; type: 'start' | 'end' }>({ show: false, type: 'start' });
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [totals, setTotals] = useState({ sales: 0, purchases: 0, net: 0 });
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeFilter, selectedProductId, selectedEntityId]);

  useEffect(() => {
    const backAction = () => {
      if (showFilterModal) {
        setShowFilterModal(false);
        // Reset temp state
        setTempFilter(activeFilter);
        setTempProductId(selectedProductId);
        setTempEntityId(selectedEntityId);
        return true;
      }
      if (selectedEntry) {
        setSelectedEntry(null);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [showFilterModal, selectedEntry, activeFilter, selectedProductId, selectedEntityId]);

  useFocusEffect(
    React.useCallback(() => {
      // Clear filters on focus
      setActiveFilter('all');
      setSelectedProductId(null);
      setSelectedEntityId(null);
      setTempFilter('all');
      setTempProductId(null);
      setTempEntityId(null);
      setSelectedEntry(null);
      fetchData();
    }, [])
  );

  const handleOpenFilter = () => {
    setTempFilter(activeFilter);
    setTempRange({ ...customRange });
    setTempProductId(selectedProductId);
    setTempEntityId(selectedEntityId);
    setShowFilterModal(true);
  };

  const handleApplyFilter = () => {
    setCustomRange({ ...tempRange });
    setActiveFilter(tempFilter);
    setSelectedProductId(tempProductId);
    setSelectedEntityId(tempEntityId);
    setShowFilterModal(false);
    
    fetchData({ 
      start: tempFilter === 'custom' ? tempRange.start.toISOString() : undefined, 
      end: tempFilter === 'custom' ? tempRange.end.toISOString() : undefined,
      productId: tempProductId || undefined,
      entityId: tempEntityId || undefined
    });
  };

  const handleViewDetail = (item: any) => {
    const product = products.find(p => p.id === item.product_id);
    const party = parties.find(p => p.id === item.entity_id);
    setSelectedEntry({ ...item, productName: product?.name, partyName: party?.name, unit: product?.unit });
  };

  const onValueChange = (event: any, selectedDate?: Date) => {
    setShowPicker({ show: false, type: showPicker.type });
    if (selectedDate) {
      setTempRange(prev => ({
        ...prev,
        [showPicker.type]: selectedDate
      }));
    }
  };

  const onDismiss = () => {
    setShowPicker({ show: false, type: showPicker.type });
  };

  const fetchData = async (range?: { start?: string; end?: string; productId?: number; entityId?: number }) => {
    try {
      setLoading(true);
      
      const params = {
        startDate: range?.start || (activeFilter === 'custom' ? customRange.start.toISOString() : undefined),
        endDate: range?.end || (activeFilter === 'custom' ? customRange.end.toISOString() : undefined),
        productId: range?.productId !== undefined ? range.productId : (selectedProductId || undefined),
        entityId: range?.entityId !== undefined ? range.entityId : (selectedEntityId || undefined),
      };

      const [histRes, prodRes, entRes] = await Promise.all([
        StockService.getHistory(params),
        ProductService.getProducts(),
        EntityService.getEntities(),
      ]);
      setHistory(histRes.data);
      setProducts(prodRes.data);
      setParties(entRes.data);
    } catch (error) {
      console.error('Fetch error:', error);
      Toast.show({
        type: 'error',
        text1: 'Fetch Failed',
        text2: 'Could not load transaction history',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateTotals();
  }, [history]);

  const calculateTotals = () => {
    let sales = 0;
    let purchases = 0;
    
    history.forEach(item => {
      const quantity = parseFloat(item.quantity);
      const price = parseFloat(item.price);
      const discount = parseFloat(item.discount || 0);
      const finalTotal = (quantity * price) * (1 - (discount / 100));
      
      if (item.type === 'sell') {
        sales += finalTotal;
      } else {
        purchases += finalTotal;
      }
    });
    
    setTotals({
      sales,
      purchases,
      net: sales - purchases
    });
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      
      // Prepare data for Excel
      const excelData: any[] = history.map(item => {
        const product = products.find(p => p.id === item.product_id);
        const party = parties.find(p => p.id === item.entity_id);
        const quantity = parseFloat(item.quantity);
        const price = parseFloat(item.price);
        const discount = parseFloat(item.discount || 0);
        const finalTotal = (quantity * price) * (1 - (discount / 100));

        return {
          Date: formatIST(item.created_at).split(' • ')[0],
          Time: formatIST(item.created_at).split(' • ')[1],
          Type: item.type.toUpperCase(),
          Product: product?.name || 'Unknown',
          Party: party?.name || 'Unknown',
          Quantity: quantity,
          Unit: product?.unit || '',
          'Price/Unit': price,
          'Discount (%)': discount,
          'Final Total': finalTotal
        };
      });

      // Add Summary Rows
      excelData.push({}); // Empty row
      excelData.push({
        Product: 'SUMMARY',
        'Price/Unit': 'Total Sales:',
        'Final Total': totals.sales
      });
      excelData.push({
        'Price/Unit': 'Total Purchases:',
        'Final Total': totals.purchases
      });
      excelData.push({
        'Price/Unit': 'Net Balance:',
        'Final Total': totals.net
      });

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "History");

      // Generate base64 string
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      
      // File path
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `Inventory_Report_${dateStr}.xlsx`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      // Write file
      await FileSystem.writeAsStringAsync(fileUri, wbout, {
        encoding: 'base64'
      });

      // Share file
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Export Inventory History',
        UTI: 'com.microsoft.excel.xlsx'
      });

    } catch (error) {
      console.error('Export error:', error);
      Toast.show({
        type: 'error',
        text1: 'Export Failed',
        text2: 'Could not generate Excel file'
      });
    } finally {
      setExporting(false);
    }
  };

  const activeFilterCount = (activeFilter === 'custom' ? 1 : 0) + (selectedProductId ? 1 : 0) + (selectedEntityId ? 1 : 0);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const filteredProductsList = products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));
  const filteredPartiesList = parties.filter(p => p.name.toLowerCase().includes(partySearch.toLowerCase()));

  const formatDate = (date: Date) => {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
  };

  const formatIST = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      let cleanStr = dateStr.replace(' ', 'T');
      if (!cleanStr.includes('Z') && !cleanStr.includes('+')) {
        cleanStr += 'Z';
      }
      const date = new Date(cleanStr);
      if (isNaN(date.getTime())) return dateStr;
      const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
      const day = String(istDate.getUTCDate()).padStart(2, '0');
      const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
      const year = istDate.getUTCFullYear();
      let hours = istDate.getUTCHours();
      const minutes = String(istDate.getUTCMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${day}/${month}/${year} • ${hours}:${minutes} ${ampm}`;
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.history}</Text>
        <Clock size={24} color={theme.colors.primary} />
      </View>

      <View style={styles.filterBar}>
        <TouchableOpacity 
          style={[styles.filterChip, activeFilterCount > 0 && styles.activeFilterChip]}
          onPress={handleOpenFilter}
        >
          <Filter size={16} color={activeFilterCount > 0 ? '#FFF' : theme.colors.primary} />
          <Text style={[styles.filterText, activeFilterCount > 0 && styles.activeFilterText]}>
            {t.filters} {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
          </Text>
          <ChevronDown size={16} color={activeFilterCount > 0 ? '#FFF' : theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={() => (
          <View style={styles.summaryContainer}>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <TrendingUp size={16} color={theme.colors.success} />
                  <Text style={styles.summaryLabelText}>{t.totalSales}</Text>
                </View>
                <Text style={[styles.summaryValueText, { color: theme.colors.success }]}>
                  ₹{totals.sales.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </Text>
              </View>
              
              <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <TrendingDown size={16} color={theme.colors.error} />
                  <Text style={styles.summaryLabelText}>{t.totalBuy}</Text>
                </View>
                <Text style={[styles.summaryValueText, { color: theme.colors.error }]}>
                  ₹{totals.purchases.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </Text>
              </View>
            </View>

            <View style={[styles.netCard, { backgroundColor: totals.net >= 0 ? theme.colors.success + '10' : theme.colors.error + '10' }]}>
              <View style={styles.netInfo}>
                <Wallet size={20} color={totals.net >= 0 ? theme.colors.success : theme.colors.error} />
                <View>
                  <Text style={styles.netLabel}>{t.netBalance}</Text>
                  <Text style={[styles.netValue, { color: totals.net >= 0 ? theme.colors.success : theme.colors.error }]}>
                    ₹{totals.net.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                style={[styles.exportButton, exporting && { opacity: 0.7 }]} 
                onPress={handleExportExcel}
                disabled={exporting}
              >
                {exporting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <FileSpreadsheet size={18} color="#FFF" />
                    <Text style={styles.exportText}>{t.exportBtn}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        onRefresh={() => fetchData()}
        refreshing={loading}
        renderItem={({ item }) => {
          const product = products.find(p => p.id === item.product_id);
          const party = parties.find(p => p.id === item.entity_id);
          const quantity = parseFloat(item.quantity);
          const price = parseFloat(item.price);
          const discount = parseFloat(item.discount || 0);
          
          const rawTotal = quantity * price;
          const discountAmount = rawTotal * (discount / 100);
          const finalTotal = rawTotal - discountAmount;
          
          const isPurchase = item.type === 'purchase';

          return (
            <TouchableOpacity style={styles.historyCard} onPress={() => handleViewDetail(item)}>
              <View style={[styles.typeIndicator, { backgroundColor: isPurchase ? theme.colors.error + '15' : theme.colors.success + '15' }]}>
                {isPurchase ? (
                  <ArrowDownLeft size={18} color={theme.colors.error} />
                ) : (
                  <ArrowUpRight size={18} color={theme.colors.success} />
                )}
              </View>
              
              <View style={styles.details}>
                <Text style={styles.productName}>{product?.name || 'Unknown Product'}</Text>
                <Text style={styles.partyText}>{party?.name || 'Unknown Party'}</Text>
                <Text style={styles.dateText}>{formatIST(item.created_at)}</Text>
              </View>
              
              <View style={styles.amountInfo}>
                <Text style={[styles.totalAmountText, { color: isPurchase ? theme.colors.error : theme.colors.success }]}>
                  {isPurchase ? '-' : '+'}₹{finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
                <View style={styles.priceBreakdownContainer}>
                  {discount > 0 && (
                    <Text style={styles.discountBadge}>-{discount}%</Text>
                  )}
                  <Text style={styles.qtyBreakdown}>
                    {item.quantity} × ₹{price.toLocaleString()}
                  </Text>
                </View>
                {discount > 0 && (
                  <Text style={styles.originalTotal}>
                    ₹{rawTotal.toLocaleString()}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Transaction Detail Modal */}
      <Modal 
        visible={!!selectedEntry} 
        animationType="fade" 
        transparent
        onRequestClose={() => setSelectedEntry(null)}
      >
        <View style={styles.detailModalOverlay}>
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>{t.transactionDetails}</Text>
              <TouchableOpacity onPress={() => setSelectedEntry(null)}>
                <X size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedEntry && (
              <View style={styles.detailBody}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>{t.productLabel}</Text>
                  <Text style={styles.detailValueLarge}>{selectedEntry.productName}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>{t.partyLabel}</Text>
                  <Text style={styles.detailValue}>{selectedEntry.partyName}</Text>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailSectionHalf}>
                    <Text style={styles.detailLabel}>{t.typeLabel}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: selectedEntry.type === 'purchase' ? theme.colors.error + '15' : theme.colors.success + '15' }]}>
                      <Text style={[styles.statusText, { color: selectedEntry.type === 'purchase' ? theme.colors.error : theme.colors.success }]}>
                        {selectedEntry.type.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.detailSectionHalf}>
                    <Text style={styles.detailLabel}>{t.dateTimeLabel}</Text>
                    <Text style={styles.detailValueSmall}>{formatIST(selectedEntry.created_at)}</Text>
                  </View>
                </View>

                <View style={styles.detailDivider} />

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t.unitPrice}</Text>
                  <Text style={styles.summaryValue}>₹{parseFloat(selectedEntry.price).toLocaleString()}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t.quantityLabel}</Text>
                  <Text style={styles.summaryValue}>{selectedEntry.quantity} {selectedEntry.unit}</Text>
                </View>

                {parseFloat(selectedEntry.discount) > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>{t.discountLabel}</Text>
                    <Text style={[styles.summaryValue, { color: theme.colors.error }]}>-{selectedEntry.discount}%</Text>
                  </View>
                )}

                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>{t.totalAmount}</Text>
                  <Text style={[styles.totalValue, { color: selectedEntry.type === 'purchase' ? theme.colors.error : theme.colors.success }]}>
                    ₹{(
                      (parseFloat(selectedEntry.quantity) * parseFloat(selectedEntry.price)) * 
                      (1 - (parseFloat(selectedEntry.discount || 0) / 100))
                    ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.closeModalButton} onPress={() => setSelectedEntry(null)}>
              <Text style={styles.closeModalButtonText}>{t.done}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Flipkart-style Sidebar Filter Modal - Now a View for better compatibility */}
      {showFilterModal && (
        <View style={styles.filterModalOverlay}>
          <View style={styles.filterModalContent}>
            {/* Modal Header */}
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>{t.filtersTitle}</Text>
              <TouchableOpacity onPress={() => {
                setShowFilterModal(false);
                // Reset temp state to active state when closing without applying
                setTempFilter(activeFilter);
                setTempProductId(selectedProductId);
                setTempEntityId(selectedEntityId);
              }}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Split Pane Content */}
            <View style={styles.filterSplitPane}>
              {/* Left Sidebar */}
              <View style={styles.filterSidebar}>
                {[
                  { id: 'date', label: t.dateRange },
                  { id: 'product', label: t.tabProducts },
                  { id: 'party', label: t.partyLabel }
                ].map(item => (
                  <TouchableOpacity 
                    key={item.id}
                    style={[styles.sidebarItem, activeSidebarTab === item.id && styles.activeSidebarItem]}
                    onPress={() => setActiveSidebarTab(item.id as any)}
                  >
                    <View style={activeSidebarTab === item.id && styles.sidebarIndicator} />
                    <Text style={[styles.sidebarText, activeSidebarTab === item.id && styles.activeSidebarText]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Right Content Area */}
              <View style={styles.filterOptions}>
                {activeSidebarTab === 'date' && (
                  <ScrollView contentContainerStyle={styles.optionsContainer}>
                    <TouchableOpacity 
                      style={styles.optionRow} 
                      onPress={() => setTempFilter('all')}
                    >
                      <View style={[styles.radioButton, tempFilter === 'all' && styles.radioButtonActive]}>
                        {tempFilter === 'all' && <View style={styles.radioInner} />}
                      </View>
                      <Text style={styles.optionLabel}>{t.allTime}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.optionRow} 
                      onPress={() => setTempFilter('custom')}
                    >
                      <View style={[styles.radioButton, tempFilter === 'custom' && styles.radioButtonActive]}>
                        {tempFilter === 'custom' && <View style={styles.radioInner} />}
                      </View>
                      <Text style={styles.optionLabel}>{t.customDateRange}</Text>
                    </TouchableOpacity>

                    {tempFilter === 'custom' && (
                      <View style={styles.datePickerContainer}>
                        <TouchableOpacity 
                          style={styles.dateTrigger}
                          onPress={() => setShowPicker({ show: true, type: 'start' })}
                        >
                          <Text style={styles.dateTriggerLabel}>{t.fromDate}</Text>
                          <Text style={styles.dateTriggerValue}>{formatDate(tempRange.start)}</Text>
                        </TouchableOpacity>

                        <View style={styles.dateConnector} />

                        <TouchableOpacity 
                          style={styles.dateTrigger}
                          onPress={() => setShowPicker({ show: true, type: 'end' })}
                        >
                          <Text style={styles.dateTriggerLabel}>{t.toDate}</Text>
                          <Text style={styles.dateTriggerValue}>{formatDate(tempRange.end)}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </ScrollView>
                )}

                {activeSidebarTab === 'product' && (
                  <View style={{ flex: 1 }}>
                    <View style={styles.modalSearchMini}>
                      <Search size={16} color={theme.colors.textSecondary} />
                      <TextInput 
                        placeholder={t.searchProductFilter} 
                        style={styles.modalSearchInputMini}
                        value={productSearch}
                        onChangeText={setProductSearch}
                      />
                    </View>
                    <FlatList
                      data={[{ id: null, name: t.allProducts }, ...filteredProductsList]}
                      keyExtractor={(item) => (item.id === null ? 'all' : item.id.toString())}
                      renderItem={({ item }) => (
                        <TouchableOpacity 
                          style={styles.selectionRow} 
                          onPress={() => setTempProductId(item.id)}
                        >
                          <View style={[styles.radioButton, tempProductId === item.id && styles.radioButtonActive]}>
                            {tempProductId === item.id && <View style={styles.radioInner} />}
                          </View>
                          <Text style={styles.optionLabel}>{item.name}</Text>
                        </TouchableOpacity>
                      )}
                      contentContainerStyle={{ padding: 16 }}
                    />
                  </View>
                )}

                {activeSidebarTab === 'party' && (
                  <View style={{ flex: 1 }}>
                    <View style={styles.modalSearchMini}>
                      <Search size={16} color={theme.colors.textSecondary} />
                      <TextInput 
                        placeholder={t.searchPartyFilter} 
                        style={styles.modalSearchInputMini}
                        value={partySearch}
                        onChangeText={setPartySearch}
                      />
                    </View>
                    <FlatList
                      data={[{ id: null, name: t.allParties }, ...filteredPartiesList]}
                      keyExtractor={(item) => (item.id === null ? 'all' : item.id.toString())}
                      renderItem={({ item }) => (
                        <TouchableOpacity 
                          style={styles.selectionRow} 
                          onPress={() => setTempEntityId(item.id)}
                        >
                          <View style={[styles.radioButton, tempEntityId === item.id && styles.radioButtonActive]}>
                            {tempEntityId === item.id && <View style={styles.radioInner} />}
                          </View>
                          <Text style={styles.optionLabel}>{item.name}</Text>
                        </TouchableOpacity>
                      )}
                      contentContainerStyle={{ padding: 16 }}
                    />
                  </View>
                )}
              </View>
            </View>

            {/* Bottom Actions */}
            <View style={styles.filterFooter}>
              <TouchableOpacity 
                style={styles.clearButton} 
                onPress={() => {
                  setTempFilter('all');
                  setTempRange({ 
                    start: new Date(new Date().setMonth(new Date().getMonth() - 1)), 
                    end: new Date() 
                  });
                  setTempProductId(null);
                  setTempEntityId(null);
                }}
              >
                <Text style={styles.clearButtonText}>{t.clearAll}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButtonLarge} onPress={handleApplyFilter}>
                <Text style={styles.applyButtonTextLarge}>{t.apply}</Text>
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
          onChange={onValueChange}
          maximumDate={new Date()}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  title: {
    ...theme.typography.h1,
  },
  listContent: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  filterBar: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
    alignSelf: 'flex-start',
  },
  activeFilterChip: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterText: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.text,
  },
  activeFilterText: {
    color: '#FFF',
  },
  historyCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  summaryContainer: {
    marginBottom: theme.spacing.lg,
    gap: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryLabelText: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  summaryValueText: {
    ...theme.typography.h2,
    fontSize: 18,
  },
  netCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  netInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  netLabel: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  netValue: {
    ...theme.typography.h2,
    fontSize: 20,
  },
  exportButton: {
    backgroundColor: '#1D6F42', // Excel Green
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  exportText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  filterModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  filterModalContent: {
    backgroundColor: theme.colors.background,
    height: '70%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filterModalTitle: {
    ...theme.typography.h2,
  },
  filterSplitPane: {
    flex: 1,
    flexDirection: 'row',
  },
  filterSidebar: {
    width: '35%',
    backgroundColor: '#F8F9FA',
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
  },
  sidebarItem: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeSidebarItem: {
    backgroundColor: '#FFFFFF',
  },
  sidebarIndicator: {
    position: 'absolute',
    left: 0,
    width: 4,
    height: '60%',
    backgroundColor: theme.colors.primary,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  sidebarText: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    fontSize: 15,
  },
  activeSidebarText: {
    color: theme.colors.primary,
  },
  filterOptions: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  optionsContainer: {
    padding: 24,
    gap: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  selectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalSearchMini: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    height: 40,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalSearchInputMini: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: theme.colors.text,
  },
  optionLabel: {
    ...theme.typography.body,
    fontWeight: '500',
    fontSize: 16,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonActive: {
    borderColor: theme.colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  datePickerContainer: {
    marginTop: 10,
    paddingLeft: 32,
    gap: 12,
  },
  dateTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#F9FAFB',
  },
  dateTriggerLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  dateTriggerValue: {
    ...theme.typography.body,
    fontWeight: '600',
  },
  dateConnector: {
    height: 1,
    backgroundColor: theme.colors.border,
    width: '100%',
  },
  filterFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  clearButtonText: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  applyButtonLarge: {
    flex: 2,
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  applyButtonTextLarge: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
  typeIndicator: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.md,
  },
  details: {
    flex: 1,
  },
  productName: {
    ...theme.typography.body,
    fontWeight: '600',
  },
  partyText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  dateText: {
    ...theme.typography.caption,
    marginTop: 2,
    fontSize: 10,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  amountInfo: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
  },
  totalAmountText: {
    ...theme.typography.body,
    fontWeight: '700',
    fontSize: 16,
  },
  priceBreakdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qtyBreakdown: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  discountBadge: {
    ...theme.typography.caption,
    color: theme.colors.error,
    fontWeight: '700',
    fontSize: 10,
    backgroundColor: theme.colors.error + '10',
    paddingHorizontal: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  originalTotal: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 10,
    textDecorationLine: 'line-through',
    marginTop: -2,
  },
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailTitle: {
    ...theme.typography.h3,
    fontSize: 18,
    color: theme.colors.text,
  },
  detailBody: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  detailSectionHalf: {
    flex: 1,
  },
  detailLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  detailValueLarge: {
    ...theme.typography.h3,
    fontSize: 20,
    color: theme.colors.primary,
  },
  detailValue: {
    ...theme.typography.body,
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },
  detailValueSmall: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.text,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  statusText: {
    ...theme.typography.caption,
    fontWeight: '700',
    fontSize: 10,
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  summaryValue: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  totalRow: {
    marginTop: 10,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  totalLabel: {
    ...theme.typography.h3,
    fontSize: 16,
    color: theme.colors.text,
  },
  totalValue: {
    ...theme.typography.h2,
    fontSize: 20,
  },
  closeModalButton: {
    backgroundColor: theme.colors.primary,
    margin: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeModalButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default HistoryScreen;
