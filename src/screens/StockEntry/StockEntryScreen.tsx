import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, FlatList, ActivityIndicator, Platform, BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { ArrowUpRight, ArrowDownLeft, ChevronDown, Search, X, Percent } from 'lucide-react-native';
import { StockService, ProductService, EntityService } from '../../services/api';
import Toast from 'react-native-toast-message';
import { useLanguage } from '../../context/LanguageContext';

const StockEntryScreen = () => {
  const { t } = useLanguage();
  const [type, setType] = useState<'purchase' | 'sell'>('purchase');
  const [products, setProducts] = useState<any[]>([]);
  const [parties, setParties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modal State
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Selection State
  const [selectedParty, setSelectedParty] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // Form State
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [discount, setDiscount] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const backAction = () => {
      if (showProductModal) {
        setShowProductModal(false);
        return true;
      }
      if (showPartyModal) {
        setShowPartyModal(false);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [showProductModal, showPartyModal]);

  useFocusEffect(
    React.useCallback(() => {
      resetForm();
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, entRes] = await Promise.all([
        ProductService.getProducts(),
        EntityService.getEntities(),
      ]);
      setProducts(prodRes.data);
      setParties(entRes.data);
    } catch (error) {
      console.error('Fetch error:', error);
      Toast.show({
        type: 'error',
        text1: 'Fetch Failed',
        text2: 'Could not load data from server',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredParties = parties.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async () => {
    // Validation
    if (!selectedProduct) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please select a product',
      });
      return;
    }

    if (!selectedParty) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: `Please select a ${type === 'purchase' ? 'supplier' : 'customer'}`,
      });
      return;
    }

    const qtyNum = parseFloat(quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please enter a valid quantity',
      });
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please enter a valid price',
      });
      return;
    }

    // Business Logic Validation
    if (type === 'sell' && qtyNum > selectedProduct.quantity) {
      Toast.show({
        type: 'error',
        text1: 'Insufficient Stock',
        text2: `Only ${selectedProduct.quantity} units available in inventory`,
      });
      return;
    }

    try {
      setSubmitting(true);
      await StockService.createStock({
        type,
        quantity: qtyNum,
        price: priceNum,
        discount: parseFloat(discount) || 0,
        product_id: selectedProduct.id,
        entity_id: selectedParty.id,
      });

      Toast.show({
        type: 'success',
        text1: 'Transaction Recorded',
        text2: 'Inventory updated successfully',
      });
      
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Submit error:', error);
      Toast.show({
        type: 'error',
        text1: 'Save Failed',
        text2: 'Could not record transaction',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedParty(null);
    setSelectedProduct(null);
    setQuantity('');
    setPrice('');
    setDiscount('');
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
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t.stockEntry}</Text>
        
        <View style={styles.typeToggle}>
          <TouchableOpacity 
            style={[styles.typeButton, type === 'purchase' && styles.activeButton]} 
            onPress={() => setType('purchase')}
          >
            <ArrowDownLeft size={20} color={type === 'purchase' ? '#FFF' : theme.colors.textSecondary} />
            <Text style={[styles.typeText, type === 'purchase' && styles.activeTypeText]}>{t.purchase}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.typeButton, type === 'sell' && styles.activeButton]} 
            onPress={() => setType('sell')}
          >
            <ArrowUpRight size={20} color={type === 'sell' ? '#FFF' : theme.colors.textSecondary} />
            <Text style={[styles.typeText, type === 'sell' && styles.activeTypeText]}>{t.sell}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.product}</Text>
            <TouchableOpacity 
              style={styles.picker} 
              onPress={() => {
                setSearchQuery('');
                setShowProductModal(true);
              }}
            >
              <Text style={[styles.pickerText, selectedProduct && { color: theme.colors.text }]}>
                {selectedProduct ? selectedProduct.name : t.selectProduct}
              </Text>
              <ChevronDown size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.partySupplierCustomer}</Text>
            <TouchableOpacity 
              style={styles.picker} 
              onPress={() => {
                setSearchQuery('');
                setShowPartyModal(true);
              }}
            >
              <Text style={[styles.pickerText, selectedParty && { color: theme.colors.text }]}>
                {selectedParty ? selectedParty.name : t.selectParty}
              </Text>
              <ChevronDown size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>{t.quantity}</Text>
              <TextInput 
                style={styles.input} 
                placeholder="0" 
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
            
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>{t.price}</Text>
              <TextInput 
                style={styles.input} 
                placeholder="0.00" 
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
          </View>

          {type === 'sell' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t.discountPercent}</Text>
              <View style={styles.discountContainer}>
                <TextInput 
                  style={[styles.input, { flex: 1 }]} 
                  placeholder="0" 
                  keyboardType="numeric"
                  value={discount}
                  onChangeText={setDiscount}
                  placeholderTextColor={theme.colors.textSecondary}
                />
                <View style={styles.discountIcon}>
                  <Percent size={18} color={theme.colors.textSecondary} />
                </View>
              </View>
            </View>
          )}

          <View style={styles.totalContainer}>
            <View>
              <Text style={styles.totalLabel}>{t.totalEstimate}</Text>
              <Text style={styles.totalSublabel}>
                {quantity || '0'} × ₹{price || '0'} 
                {type === 'sell' && discount ? ` (-${discount}%)` : ''}
              </Text>
            </View>
            <Text style={styles.totalValue}>
              ₹{(
                (parseFloat(quantity) || 0) * 
                (parseFloat(price) || 0) * 
                (type === 'sell' ? (1 - (parseFloat(discount) || 0) / 100) : 1)
              ).toFixed(2)}
            </Text>
          </View>

          <TouchableOpacity 
            style={[styles.submitButton, submitting && { opacity: 0.7 }]} 
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitText}>{type === 'purchase' ? t.confirmPurchase : t.confirmSale}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Product Selection Modal - Now a View for better compatibility */}
      {showProductModal && (
        <View style={styles.innerModalOverlay}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t.selectProduct}</Text>
              <TouchableOpacity onPress={() => setShowProductModal(false)}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalSearch}>
              <Search size={20} color={theme.colors.textSecondary} />
              <TextInput 
                placeholder={t.searchProduct} 
                style={styles.modalSearchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus={Platform.OS === 'android'}
              />
            </View>
            <FlatList
              data={filteredProducts}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingHorizontal: theme.spacing.lg }}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.partyItem}
                  onPress={() => {
                    setSelectedProduct(item);
                    setPrice(parseFloat(item.price).toString());
                    setShowProductModal(false);
                  }}
                >
                  <View>
                    <Text style={styles.partyName}>{item.name}</Text>
                    <Text style={styles.partyType}>{t.stock}: {item.quantity}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </SafeAreaView>
        </View>
      )}

      {/* Party Selection Modal - Now a View for better compatibility */}
      {showPartyModal && (
        <View style={styles.innerModalOverlay}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t.selectParty}</Text>
              <TouchableOpacity onPress={() => setShowPartyModal(false)}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalSearch}>
              <Search size={20} color={theme.colors.textSecondary} />
              <TextInput 
                placeholder={t.searchByName} 
                style={styles.modalSearchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus={Platform.OS === 'android'}
              />
            </View>
            <FlatList
              data={filteredParties}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingHorizontal: theme.spacing.lg }}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.partyItem}
                  onPress={() => {
                    setSelectedParty(item);
                    setShowPartyModal(false);
                  }}
                >
                  <View>
                    <Text style={styles.partyName}>{item.name}</Text>
                    <Text style={styles.partyType}>{item.type}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </SafeAreaView>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
  },
  title: {
    ...theme.typography.h1,
    marginBottom: theme.spacing.xl,
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    padding: 6,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xl,
    gap: 6,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: theme.borderRadius.sm,
    gap: 8,
  },
  activeButton: {
    backgroundColor: theme.colors.primary,
  },
  typeText: {
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  activeTypeText: {
    color: '#FFF',
  },
  form: {
    gap: 32,
  },
  inputGroup: {
    gap: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  label: {
    ...theme.typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pickerText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  input: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.typography.body,
    fontSize: 16,
  },
  discountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discountIcon: {
    position: 'absolute',
    right: theme.spacing.md,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 20,
    borderRadius: theme.borderRadius.md,
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  totalLabel: {
    ...theme.typography.body,
    fontWeight: '700',
    color: theme.colors.text,
  },
  totalSublabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  totalValue: {
    ...theme.typography.h2,
    color: theme.colors.primary,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  submitText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  innerModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.background,
    zIndex: 1000,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    ...theme.typography.h2,
  },
  modalSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  modalSearchInput: {
    flex: 1,
    height: 48,
    marginLeft: theme.spacing.sm,
    ...theme.typography.body,
  },
  partyItem: {
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  partyName: {
    ...theme.typography.body,
    fontWeight: '600',
  },
  partyType: {
    ...theme.typography.caption,
    textTransform: 'uppercase',
    marginTop: 2,
  },
});

export default StockEntryScreen;
