import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, ScrollView, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { ArrowUpRight, ArrowDownLeft, Clock, Filter, Calendar, X } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { StockService, ProductService, EntityService } from '../../services/api';
import Toast, { showToast } from '../../components/Toast';

const HistoryScreen = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [parties, setParties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'custom'>('all');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customRange, setCustomRange] = useState({ 
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)), 
    end: new Date() 
  });
  const [showPicker, setShowPicker] = useState<{ show: boolean; type: 'start' | 'end' }>({ show: false, type: 'start' });

  useEffect(() => {
    if (activeFilter === 'all') {
      fetchData();
    }
  }, [activeFilter]);

  const handleApplyCustom = () => {
    setShowCustomModal(false);
    setActiveFilter('custom');
    fetchData({ 
      start: customRange.start.toISOString(), 
      end: customRange.end.toISOString() 
    });
  };

  const onValueChange = (event: any, selectedDate?: Date) => {
    setShowPicker({ show: false, type: showPicker.type });
    if (selectedDate) {
      setCustomRange(prev => ({
        ...prev,
        [showPicker.type]: selectedDate
      }));
    }
  };

  const onDismiss = () => {
    setShowPicker({ show: false, type: showPicker.type });
  };

  const fetchData = async (range?: { start: string; end: string }) => {
    try {
      setLoading(true);
      
      let startDate: string | undefined;
      let endDate: string | undefined;
      
      if (activeFilter === 'custom' || range) {
        startDate = range?.start || customRange.start.toISOString();
        endDate = range?.end || customRange.end.toISOString();
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <Clock size={24} color={theme.colors.primary} />
      </View>

      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {[
            { id: 'all', label: 'All Time' },
            { id: 'custom', label: activeFilter === 'custom' ? 'Filtered Range' : 'Select Range' },
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
                  setActiveFilter('all');
                }
              }}
            >
              {filter.id === 'custom' && <Calendar size={14} color={activeFilter === 'custom' ? '#FFF' : theme.colors.textSecondary} style={{ marginRight: 6 }} />}
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
        onRefresh={() => fetchData()}
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
                <Text style={styles.label}>Start Date</Text>
                <TouchableOpacity 
                  style={styles.dateSelector} 
                  onPress={() => setShowPicker({ show: true, type: 'start' })}
                >
                  <Calendar size={18} color={theme.colors.textSecondary} />
                  <Text style={styles.dateSelectorText}>{customRange.start.toLocaleDateString()}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>End Date</Text>
                <TouchableOpacity 
                  style={styles.dateSelector} 
                  onPress={() => setShowPicker({ show: true, type: 'end' })}
                >
                  <Calendar size={18} color={theme.colors.textSecondary} />
                  <Text style={styles.dateSelectorText}>{customRange.end.toLocaleDateString()}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.applyButton} onPress={handleApplyCustom}>
                <Text style={styles.applyButtonText}>Apply Filter</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {showPicker.show && (
        <DateTimePicker
          value={showPicker.type === 'start' ? customRange.start : customRange.end}
          mode="date"
          display="default"
          onValueChange={onValueChange}
          onDismiss={onDismiss}
          maximumDate={new Date()}
        />
      )}

      <Toast />
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
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  dateSelectorText: {
    ...theme.typography.body,
    color: theme.colors.text,
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
