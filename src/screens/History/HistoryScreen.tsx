import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, ScrollView, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { ArrowUpRight, ArrowDownLeft, Clock, Filter, Calendar, X } from 'lucide-react-native';
import { StockService, ProductService, EntityService } from '../../services/api';
import Toast, { showToast } from '../../components/Toast';

const HistoryScreen = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [parties, setParties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customRange, setCustomRange] = useState({ start: '', end: '' });

  useEffect(() => {
    if (activeFilter !== 'custom') {
      fetchData();
    }
  }, [activeFilter]);

  const handleApplyCustom = () => {
    if (!customRange.start || !customRange.end) {
      showToast({ type: 'error', text1: 'Required', text2: 'Please enter both dates' });
      return;
    }
    const start = new Date(customRange.start);
    const end = new Date(customRange.end);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      showToast({ type: 'error', text1: 'Invalid Date', text2: 'Use YYYY-MM-DD format' });
      return;
    }
    setShowCustomModal(false);
    fetchData(customRange);
  };

  const fetchData = async (range?: { start: string; end: string }) => {
    try {
      setLoading(true);
      
      let startDate: string | undefined;
      let endDate: string | undefined;
      const now = new Date();
      
      if (activeFilter === 'today') {
        startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      } else if (activeFilter === 'week') {
        startDate = new Date(now.setDate(now.getDate() - 7)).toISOString();
      } else if (activeFilter === 'month') {
        startDate = new Date(now.setMonth(now.getMonth() - 1)).toISOString();
      } else if (activeFilter === 'custom' && range) {
        startDate = new Date(range.start).toISOString();
        endDate = new Date(range.end).toISOString();
      }

      const [histRes, prodRes, entRes] = await Promise.all([
        StockService.getHistory({ startDate, endDate }),
        ProductService.getProducts(),
        EntityService.getEntities(),
      ]);
      setHistory(histRes.data);
      setProducts(prodRes.data);
      setParties(entRes.data);
    } catch (error) {
      console.error('Fetch error:', error);
      showToast({
        type: 'error',
        text1: 'Fetch Failed',
        text2: 'Could not load transaction history',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <Clock size={24} color={theme.colors.primary} />
      </View>

      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {[
            { id: 'all', label: 'All Time' },
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'Last 7 Days' },
            { id: 'month', label: 'This Month' },
            { id: 'custom', label: 'Custom Range' },
          ].map((filter) => (
            <TouchableOpacity 
              key={filter.id}
              style={[
                styles.filterChip, 
                activeFilter === filter.id && styles.activeFilterChip
              ]}
              onPress={() => {
                if (filter.id === 'custom') {
                  setShowCustomModal(true);
                } else {
                  setActiveFilter(filter.id as any);
                }
              }}
            >
              <Text style={[
                styles.filterText,
                activeFilter === filter.id && styles.activeFilterText
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        onRefresh={() => fetchData(activeFilter === 'custom' ? customRange : undefined)}
        refreshing={loading}
        renderItem={({ item }) => {
          const product = products.find(p => p.id === item.product_id);
          const party = parties.find(p => p.id === item.entity_id);
          const totalAmount = (parseFloat(item.quantity) * parseFloat(item.price)).toFixed(2);
          const isPurchase = item.type === 'purchase';
          
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
            <View style={styles.historyCard}>
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
                  {isPurchase ? '-' : '+'}₹{parseFloat(totalAmount).toLocaleString()}
                </Text>
                <Text style={styles.qtyBreakdown}>
                  {item.quantity} × ₹{parseFloat(item.price).toLocaleString()}
                </Text>
              </View>
            </View>
          );
        }}
      />

      <Modal visible={showCustomModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Custom Range</Text>
              <TouchableOpacity onPress={() => setShowCustomModal(false)}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Start Date (YYYY-MM-DD)</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="2024-01-01"
                  value={customRange.start}
                  onChangeText={(v) => setCustomRange(prev => ({ ...prev, start: v }))}
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>End Date (YYYY-MM-DD)</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="2024-12-31"
                  value={customRange.end}
                  onChangeText={(v) => setCustomRange(prev => ({ ...prev, end: v }))}
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>

              <TouchableOpacity style={styles.applyButton} onPress={handleApplyCustom}>
                <Text style={styles.applyButtonText}>Apply Filter</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Toast />
    </View>
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
    paddingBottom: theme.spacing.md,
  },
  filterScroll: {
    paddingHorizontal: theme.spacing.lg,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  activeFilterChip: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterText: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.textSecondary,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    ...theme.typography.h2,
  },
  form: {
    gap: theme.spacing.md,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  input: {
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.typography.body,
  },
  applyButton: {
    backgroundColor: theme.colors.primary,
    padding: 16,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginTop: 8,
  },
  applyButtonText: {
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
  },
  totalAmountText: {
    ...theme.typography.body,
    fontWeight: '700',
    fontSize: 16,
  },
  qtyBreakdown: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
});

export default HistoryScreen;
