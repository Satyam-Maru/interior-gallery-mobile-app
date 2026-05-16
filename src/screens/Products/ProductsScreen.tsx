import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { Search, Plus, Filter, X, ChevronDown, AlertCircle, Edit2, CheckSquare, Square } from 'lucide-react-native';
import { ProductService, CategoryService } from '../../services/api';
import Toast from 'react-native-toast-message';
import { useLanguage } from '../../context/LanguageContext';

const ProductsScreen = () => {
  const { language, t } = useLanguage();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form State
  const [newName, setNewName] = useState('');
  const [useProductCode, setUseProductCode] = useState(false);
  const [newProductCode, setNewProductCode] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newQuantity, setNewQuantity] = useState('0');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  
  // UI State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [catSearchQuery, setCatSearchQuery] = useState('');
  const [mainSearchQuery, setMainSearchQuery] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState<number | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const commonUnits = ['pcs', 'kg', 'meter'];

  useEffect(() => {
    const backAction = () => {
      if (showCategoryModal) {
        setShowCategoryModal(false);
        return true;
      }
      if (showFilterModal) {
        setShowFilterModal(false);
        return true;
      }
      if (showAddModal) {
        setShowAddModal(false);
        resetForm();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [showCategoryModal, showFilterModal, showAddModal]);

  useFocusEffect(
    React.useCallback(() => {
      resetForm();
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes] = await Promise.all([
        ProductService.getProducts(),
        CategoryService.getCategories(),
      ]);
      setProducts(prodRes.data);
      setCategories(catRes.data);
    } catch (error) {
      console.error('Fetch error:', error);
      Toast.show({
        type: 'error',
        text1: 'Fetch Failed',
        text2: 'Could not load inventory data',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setNewName(product.name);
    setUseProductCode(!!product.code);
    setNewProductCode(product.code || '');
    setNewUnit(product.unit || '');
    setNewPrice(product.price.toString());
    setNewQuantity(product.quantity.toString());
    setSelectedCategoryId(product.category_id);
    setNewCategoryName('');
    setShowAddModal(true);
  };

  const handleAddProduct = async () => {
    // Validation
    if (!newName.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Product name is required',
      });
      return;
    }

    if (useProductCode && !newProductCode.trim()) {
      Toast.show({
        type: 'error',
        text1: t.validationError,
        text2: t.enterProductCode,
      });
      return;
    }

    const priceNum = parseFloat(newPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please enter a valid price',
      });
      return;
    }

    const qtyNum = parseFloat(newQuantity);
    if (isNaN(qtyNum)) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please enter a valid initial stock',
      });
      return;
    }

    if (!selectedCategoryId && !newCategoryName.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please select or create a category',
      });
      return;
    }

    try {
      setSubmitting(true);
      
      let finalCategoryId = selectedCategoryId;
      if (!finalCategoryId && newCategoryName.trim()) {
        const catRes = await CategoryService.createCategory({ name: newCategoryName.trim() });
        finalCategoryId = catRes.data.id;
      }

      const productData = {
        name: newName.trim(),
        code: useProductCode ? newProductCode.trim() : '',
        unit: newUnit.trim() || undefined,
        price: priceNum,
        quantity: qtyNum,
        category_id: finalCategoryId!,
      };

      if (editingProduct) {
        await ProductService.updateProduct(editingProduct.id, productData);
        Toast.show({
          type: 'success',
          text1: 'Product Updated',
          text2: `${newName} has been updated`,
        });
      } else {
        await ProductService.createProduct(productData);
        Toast.show({
          type: 'success',
          text1: 'Product Added',
          text2: `${newName} added to inventory`,
        });
      }
      
      resetForm();
      setShowAddModal(false);
      fetchData();
    } catch (error: any) {
      console.error('Submit error:', error);
      Toast.show({
        type: 'error',
        text1: editingProduct ? 'Update Failed' : 'Save Failed',
        text2: error.response?.data?.error || 'Operation failed',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewName('');
    setUseProductCode(false);
    setNewProductCode('');
    setNewUnit('');
    setNewPrice('');
    setNewQuantity('0');
    setSelectedCategoryId(null);
    setNewCategoryName('');
    setEditingProduct(null);
  };

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(catSearchQuery.toLowerCase())
  );
  
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(mainSearchQuery.toLowerCase());
    const matchesCategory = filterCategoryId === null || p.category_id === filterCategoryId;
    return matchesSearch && matchesCategory;
  });

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
        <Text style={styles.title}>{t.inventory}</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Plus size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color={theme.colors.textSecondary} />
          <TextInput 
            placeholder={t.searchProducts} 
            style={styles.searchInput}
            placeholderTextColor={theme.colors.textSecondary}
            value={mainSearchQuery}
            onChangeText={setMainSearchQuery}
          />
          {mainSearchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setMainSearchQuery('')}>
              <X size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity 
          style={[styles.categoryDropdown, filterCategoryId !== null && styles.activeDropdown]}
          onPress={() => setShowFilterModal(true)}
        >
          <Filter size={18} color={filterCategoryId !== null ? '#FFF' : theme.colors.primary} />
          <Text style={[styles.dropdownText, filterCategoryId !== null && styles.activeDropdownText]}>
            {filterCategoryId === null ? t.category : categories.find(c => c.id === filterCategoryId)?.name}
          </Text>
          <ChevronDown size={16} color={filterCategoryId !== null ? '#FFF' : theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        onRefresh={fetchData}
        refreshing={loading}
        renderItem={({ item }) => {
          const isLowStock = parseFloat(item.quantity) < 5;
          return (
            <TouchableOpacity 
              style={[styles.productCard, isLowStock && styles.lowStockCard]}
              onPress={() => handleEditProduct(item)}
            >
              <View style={styles.productMain}>
                <View style={styles.productInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.productName}>{item.name}</Text>
                    {isLowStock && <AlertCircle size={16} color={theme.colors.error} style={{ marginLeft: 6 }} />}
                  </View>
                  <Text style={styles.productCategory}>
                    {categories.find(c => c.id === item.category_id)?.name || t.uncategorized}
                  </Text>
                  {item.code && (
                    <View style={styles.codeBadge}>
                      <Text style={styles.codeText}>{item.code}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.stockInfo}>
                  <Text style={[styles.stockCount, isLowStock && styles.lowStockText]}>
                    {item.quantity} {item.unit || t.units}
                  </Text>
                  <Text style={styles.price}>₹{parseFloat(item.price).toLocaleString()}</Text>
                </View>
              </View>
              <View style={styles.actions}>
                <View style={styles.actionButton}>
                  <Edit2 size={18} color={theme.colors.textSecondary} />
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Add/Edit Product Modal - Now a View for better compatibility */}
      {showAddModal && (
        <View style={styles.mainModalOverlay}>
          <SafeAreaView style={styles.fullScreenModal}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{editingProduct ? t.editProduct : t.newProduct}</Text>
                <Text style={styles.modalSubtitle}>
                  {editingProduct ? t.updateProductInfo : t.enterDetailsNewStock}
                </Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={() => {
                setShowAddModal(false);
                resetForm();
              }}>
                <X size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex: 1 }}
            >
              <ScrollView 
                style={styles.fullScreenForm} 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
              >
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t.productName}</Text>
                  <TextInput 
                    style={styles.input}
                    placeholder="e.g. Plywood"
                    value={newName}
                    onChangeText={setNewName}
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                </View>

                <TouchableOpacity 
                  style={styles.checkboxRow} 
                  onPress={() => setUseProductCode(!useProductCode)}
                  activeOpacity={0.7}
                >
                  {useProductCode ? (
                    <CheckSquare size={20} color={theme.colors.primary} />
                  ) : (
                    <Square size={20} color={theme.colors.textSecondary} />
                  )}
                  <Text style={styles.checkboxLabel}>{t.productCode}</Text>
                </TouchableOpacity>

                {useProductCode && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t.productCode}</Text>
                    <TextInput 
                      style={styles.input}
                      placeholder="e.g. FURN-001"
                      value={newProductCode}
                      onChangeText={setNewProductCode}
                      placeholderTextColor={theme.colors.textSecondary}
                    />
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t.unit}</Text>
                  <TextInput 
                    style={styles.input}
                    placeholder="e.g. Pcs"
                    value={newUnit}
                    onChangeText={setNewUnit}
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitChips}>
                    {commonUnits.map(unit => (
                      <TouchableOpacity 
                        key={unit} 
                        style={[styles.chip, newUnit === unit && styles.activeChip]}
                        onPress={() => setNewUnit(unit)}
                      >
                        <Text style={[styles.chipText, newUnit === unit && styles.activeChipText]}>{unit}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>{t.initialStock}</Text>
                    <TextInput 
                      style={styles.input}
                      placeholder="0"
                      keyboardType="numeric"
                      value={newQuantity}
                      onChangeText={setNewQuantity}
                      placeholderTextColor={theme.colors.textSecondary}
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>{t.basePrice}</Text>
                    <TextInput 
                      style={styles.input}
                      placeholder="0.00"
                      keyboardType="numeric"
                      value={newPrice}
                      onChangeText={setNewPrice}
                      placeholderTextColor={theme.colors.textSecondary}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t.category} *</Text>
                  <TouchableOpacity 
                    style={styles.picker} 
                    onPress={() => {
                      setCatSearchQuery('');
                      setShowCategoryModal(true);
                    }}
                  >
                    <Text style={[styles.pickerText, (selectedCategoryId || newCategoryName) ? { color: theme.colors.text } : null]}>
                      {newCategoryName ? newCategoryName : (selectedCategoryId ? categories.find(c => c.id === selectedCategoryId)?.name : t.selectCategory)}
                    </Text>
                    <ChevronDown size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                  <TouchableOpacity 
                    style={[styles.submitButton, submitting && styles.disabledButton]} 
                    onPress={handleAddProduct}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.submitText}>{editingProduct ? t.saveChanges : t.addProduct}</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.cancelButton} 
                    onPress={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                  >
                    <Text style={styles.cancelText}>{t.discard}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
            <Toast />
            {/* Searchable Category Modal - Now a View for better compatibility */}
            {showCategoryModal && (
              <View style={styles.innerModalOverlay}>
                <View style={styles.innerModalContent}>
                  <View style={styles.innerModalHeader}>
                    <Text style={styles.innerModalTitle}>{t.selectCategoryTitle}</Text>
                    <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                      <X size={20} color={theme.colors.text} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.modalSearch}>
                    <Search size={18} color={theme.colors.textSecondary} />
                    <TextInput 
                      placeholder={t.searchOrAddNew} 
                      style={styles.modalSearchInput}
                      value={catSearchQuery}
                      onChangeText={setCatSearchQuery}
                      autoFocus={Platform.OS === 'android'}
                    />
                  </View>

                  <FlatList
                    data={filteredCategories}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    renderItem={({ item }) => (
                      <TouchableOpacity 
                        style={styles.selectItem}
                        onPress={() => {
                          setSelectedCategoryId(item.id);
                          setNewCategoryName('');
                          setShowCategoryModal(false);
                        }}
                      >
                        <Text style={styles.selectItemText}>{item.name}</Text>
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={() => (
                      catSearchQuery.length > 0 ? (
                        <TouchableOpacity 
                          style={styles.addNewItem}
                          onPress={() => {
                            setNewCategoryName(catSearchQuery);
                            setSelectedCategoryId(null);
                            setShowCategoryModal(false);
                          }}
                        >
                          <Plus size={18} color={theme.colors.primary} />
                          <Text style={styles.addNewItemText}>{t.addAsNewCategory.replace('{query}', catSearchQuery)}</Text>
                        </TouchableOpacity>
                      ) : null
                    )}
                  />
                </View>
              </View>
            )}
          </SafeAreaView>
        </View>
      )}


      {/* Dropdown Filter Modal - Now a View for better compatibility */}
      {showFilterModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.dropdownModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t.filterCategory}</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.categoryList}>
              <TouchableOpacity 
                style={[styles.categoryItem, filterCategoryId === null && styles.activeCategoryItem]}
                onPress={() => {
                  setFilterCategoryId(null);
                  setShowFilterModal(false);
                }}
              >
                <Text style={[styles.categoryItemText, filterCategoryId === null && styles.activeCategoryItemText]}>
                  {t.allCategories}
                </Text>
              </TouchableOpacity>
              
              {categories.map((cat) => (
                <TouchableOpacity 
                  key={cat.id}
                  style={[styles.categoryItem, filterCategoryId === cat.id && styles.activeCategoryItem]}
                  onPress={() => {
                    setFilterCategoryId(cat.id);
                    setShowFilterModal(false);
                  }}
                >
                  <Text style={[styles.categoryItemText, filterCategoryId === cat.id && styles.activeCategoryItemText]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
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
  addButton: {
    backgroundColor: theme.colors.primary,
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  searchBar: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    ...theme.typography.body,
    color: theme.colors.text,
  },
  categoryDropdown: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    height: 48,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  activeDropdown: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  dropdownText: {
    flex: 1,
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.text,
  },
  activeDropdownText: {
    color: '#FFF',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    zIndex: 1000,
  },
  mainModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.background,
    zIndex: 900,
  },
  dropdownModalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    maxHeight: '60%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  categoryList: {
    marginTop: theme.spacing.sm,
  },
  categoryItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.md,
    marginBottom: 4,
  },
  activeCategoryItem: {
    backgroundColor: theme.colors.primary + '15',
  },
  categoryItemText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  activeCategoryItemText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  listContent: {
    padding: theme.spacing.lg,
  },
  productCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  productMain: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  productName: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lowStockCard: {
    borderColor: theme.colors.error,
    borderWidth: 1.5,
  },
  lowStockText: {
    color: theme.colors.error,
    fontWeight: '700',
  },
  productCategory: {
    ...theme.typography.caption,
  },
  stockInfo: {
    alignItems: 'flex-end',
    marginRight: theme.spacing.md,
  },
  stockCount: {
    fontWeight: '600',
    color: theme.colors.primary,
  },
  price: {
    ...theme.typography.caption,
    marginTop: 2,
  },
  codeBadge: {
    backgroundColor: theme.colors.primary + '10',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
    borderWidth: 1,
    borderColor: theme.colors.primary + '20',
  },
  codeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingVertical: 4,
  },
  checkboxLabel: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: theme.spacing.md,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  fullScreenModal: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  fullScreenForm: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  footer: {
    marginTop: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  cancelButton: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  modalTitle: {
    ...theme.typography.h2,
  },
  modalSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  unitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  unitChips: {
    flexGrow: 0,
  },
  form: {
    gap: 32,
  },
  innerModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
    zIndex: 1000,
  },
  innerModalContent: {
    width: '100%',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    maxHeight: '80%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  innerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  innerModalTitle: {
    ...theme.typography.body,
    fontWeight: '700',
  },
  selectItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  selectItemText: {
    ...theme.typography.body,
  },
  addNewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  addNewItemText: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  modalSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  modalSearchInput: {
    flex: 1,
    height: 44,
    marginLeft: theme.spacing.sm,
    ...theme.typography.body,
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
  input: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.typography.body,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pickerText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  disabledButton: {
    opacity: 0.7,
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
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  activeChip: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  activeChipText: {
    color: '#FFF',
  },
});

export default ProductsScreen;
