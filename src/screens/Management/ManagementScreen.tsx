import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { Users, Plus, Search, MapPin, X, ChevronDown, Truck, Layers, Edit2 } from 'lucide-react-native';
import { EntityService, LocationService, CategoryService } from '../../services/api';
import Toast from 'react-native-toast-message';
import { useLanguage } from '../../context/LanguageContext';

type ManagementTab = 'supplier' | 'customer' | 'category' | 'location';

const ManagementScreen = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<ManagementTab>('supplier');
  const [data, setData] = useState<any[]>([]);
  const [extraData, setExtraData] = useState<any[]>([]); // For locations when adding entities
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form State
  const [editingItem, setEditingItem] = useState<any>(null);
  const [newName, setNewName] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // UI State
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locSearchQuery, setLocSearchQuery] = useState('');

  const entityNames: Record<ManagementTab, string> = {
    supplier: t.supplier,
    customer: t.customer,
    category: t.categories, // Using plural categories or t.category if available? Wait, t.categories is 'શ્રેણી' in GU.
    location: t.locations   // Using plural locations or t.location if available?
  };

  const activeEntityName = entityNames[activeTab];

  useEffect(() => {
    const backAction = () => {
      if (showLocationPicker) {
        setShowLocationPicker(false);
        return true;
      }
      if (showAddModal) {
        handleCloseModal();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [showLocationPicker, showAddModal]);

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [activeTab])
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'supplier' || activeTab === 'customer') {
        const [entRes, locRes] = await Promise.all([
          EntityService.getEntities(),
          LocationService.getLocations(),
        ]);
        setData(entRes.data.filter((e: any) => e.type === activeTab));
        setExtraData(locRes.data);
      } else if (activeTab === 'category') {
        const res = await CategoryService.getCategories();
        setData(res.data);
      } else if (activeTab === 'location') {
        const res = await LocationService.getLocations();
        setData(res.data);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      Toast.show({
        type: 'error',
        text1: 'Fetch Failed',
        text2: `Could not load ${activeTab} data`,
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddItem = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleEditItem = (item: any) => {
    setEditingItem(item);
    setNewName(item.name);
    if (activeTab === 'supplier' || activeTab === 'customer') {
      setSelectedLocationId(item.location_id);
    }
    setShowAddModal(true);
  };


  const handleSave = async () => {
    if (!newName.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please enter a name',
      });
      return;
    }

    try {
      setSubmitting(true);
      
      if (activeTab === 'supplier' || activeTab === 'customer') {
        const entityData = {
          name: newName.trim(),
          type: activeTab,
          location_id: selectedLocationId || undefined,
        };
        if (editingItem) {
          await EntityService.updateEntity(editingItem.id, entityData);
        } else {
          await EntityService.createEntity(entityData);
        }
      } else if (activeTab === 'category') {
        if (editingItem) {
          await CategoryService.updateCategory(editingItem.id, { name: newName.trim() });
        } else {
          await CategoryService.createCategory({ name: newName.trim() });
        }
      } else if (activeTab === 'location') {
        if (editingItem) {
          await LocationService.updateLocation(editingItem.id, { name: newName.trim() });
        } else {
          await LocationService.createLocation({ name: newName.trim() });
        }
      }

      Toast.show({
        type: 'success',
        text1: editingItem ? 'Updated' : 'Success',
        text2: `Item ${editingItem ? 'updated' : 'added'} successfully`,
      });

      handleCloseModal();
      fetchData();
    } catch (error: any) {
      console.error('Save error:', error);
      Toast.show({
        type: 'error',
        text1: 'Save Failed',
        text2: error.response?.data?.error || 'Could not save to database',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    resetForm();
  };

  const resetForm = () => {
    setEditingItem(null);
    setNewName('');
    setSelectedLocationId(null);
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardMain}>
        <View style={styles.iconContainer}>
          {activeTab === 'supplier' ? <Truck size={20} color={theme.colors.primary} /> :
           activeTab === 'customer' ? <Users size={20} color={theme.colors.primary} /> :
           activeTab === 'category' ? <Layers size={20} color={theme.colors.primary} /> :
           <MapPin size={20} color={theme.colors.primary} />}
        </View>
        <View style={styles.info}>
          <Text style={styles.itemName}>{item.name}</Text>
          {(activeTab === 'supplier' || activeTab === 'customer') && (
            <View style={styles.subInfo}>
              <MapPin size={12} color={theme.colors.textSecondary} />
              <Text style={styles.subInfoText}>
                {item.locations?.name || extraData.find(l => l.id === item.location_id)?.name || t.noLocation}
              </Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleEditItem(item)}>
          <Edit2 size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.management}</Text>
      </View>

      <View style={styles.tabContainer}>
        <View style={styles.tabGrid}>
          {(['supplier', 'customer', 'category', 'location'] as ManagementTab[]).map((tab) => (
            <TouchableOpacity 
              key={tab}
              style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
              onPress={() => {
                setActiveTab(tab);
                setSearchQuery('');
              }}
            >
              <View style={styles.tabIcon}>
                {tab === 'supplier' ? <Truck size={20} color={activeTab === tab ? '#FFF' : theme.colors.primary} /> :
                 tab === 'customer' ? <Users size={20} color={activeTab === tab ? '#FFF' : theme.colors.primary} /> :
                 tab === 'category' ? <Layers size={20} color={activeTab === tab ? '#FFF' : theme.colors.primary} /> :
                 <MapPin size={20} color={activeTab === tab ? '#FFF' : theme.colors.primary} />}
              </View>
              <Text style={[styles.tabButtonText, activeTab === tab && styles.activeTabButtonText]}>
                {tab === 'supplier' ? t.suppliers :
                 tab === 'customer' ? t.customers :
                 tab === 'category' ? t.categories :
                 t.locations}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Search size={20} color={theme.colors.textSecondary} />
          <TextInput 
            placeholder={t.search} 
            style={styles.searchInput}
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleAddItem}>
          <Plus size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {loading && data.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          onRefresh={fetchData}
          refreshing={loading}
          renderItem={renderItem}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t.noLocation}</Text>
            </View>
          )}
        />
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {editingItem ? t.edit : t.new} {activeEntityName}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {editingItem ? `${t.updateDetailsFor} ${activeEntityName}` : `${t.registerNew} ${activeEntityName}`}
                </Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={handleCloseModal}>
                <X size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex: 1 }}
            >
              <ScrollView 
                style={styles.modalForm} 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
              >
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t.name}</Text>
                  <TextInput 
                    style={styles.input}
                    placeholder={`${t.management}...`} // Wait, this placeholder was already translated

                    value={newName}
                    onChangeText={setNewName}
                    placeholderTextColor={theme.colors.textSecondary}
                    autoFocus
                  />
                </View>

                {(activeTab === 'supplier' || activeTab === 'customer') && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t.location}</Text>
                    <TouchableOpacity 
                      style={styles.picker}
                      onPress={() => {
                        setLocSearchQuery('');
                        setShowLocationPicker(true);
                      }}
                    >
                      <Text style={[styles.pickerText, selectedLocationId ? { color: theme.colors.text } : null]}>
                        {selectedLocationId ? extraData.find(l => l.id === selectedLocationId)?.name : t.selectLocation}
                      </Text>
                      <ChevronDown size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.modalFooter}>
                  <TouchableOpacity 
                    style={[styles.submitButton, submitting ? { opacity: 0.7 } : null]} 
                    onPress={handleSave}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.submitText}>{editingItem ? t.saveChanges : `${t.saveItem} ${activeEntityName}`}</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.cancelButton} 
                    onPress={handleCloseModal}
                  >
                    <Text style={styles.cancelText}>{t.discard}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>

            {/* Inner Location Picker */}
            {showLocationPicker && (
              <View style={styles.innerModalOverlay}>
                <View style={styles.innerModalContent}>
                  <View style={styles.innerModalHeader}>
                    <Text style={styles.innerModalTitle}>{t.selectLocation}</Text>
                    <TouchableOpacity onPress={() => setShowLocationPicker(false)}>
                      <X size={20} color={theme.colors.text} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.modalSearch}>
                    <Search size={18} color={theme.colors.textSecondary} />
                    <TextInput 
                      placeholder={t.searchLocations} 
                      style={styles.modalSearchInput}
                      value={locSearchQuery}
                      onChangeText={setLocSearchQuery}
                      autoFocus
                    />
                  </View>

                  <FlatList
                    data={extraData.filter(l => l.name.toLowerCase().includes(locSearchQuery.toLowerCase()))}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                      <TouchableOpacity 
                        style={styles.selectItem}
                        onPress={() => {
                          setSelectedLocationId(item.id);
                          setShowLocationPicker(false);
                        }}
                      >
                        <Text style={styles.selectItemText}>{item.name}</Text>
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={() => (
                      <View style={{ padding: 20, alignItems: 'center' }}>
                        <Text style={{ color: theme.colors.textSecondary }}>{t.noLocationsFound}</Text>
                      </View>
                    )}
                  />
                </View>
              </View>
            )}
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
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  tabContainer: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  tabGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tabButton: {
    width: '48%', // Adjusted for 2x2 with gap
    paddingVertical: 14,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tabIcon: {
    marginBottom: 2,
  },
  activeTabButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  tabButtonText: {
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  activeTabButtonText: {
    color: '#FFF',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    gap: 12,
    marginBottom: theme.spacing.md,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    height: 44,
    marginLeft: theme.spacing.sm,
    ...theme.typography.body,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  info: {
    flex: 1,
  },
  itemName: {
    ...theme.typography.body,
    fontWeight: '600',
  },
  subInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  subInfoText: {
    ...theme.typography.caption,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
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
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.background,
    zIndex: 900,
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    ...theme.typography.h2,
    textTransform: 'capitalize',
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
  modalForm: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  inputGroup: {
    gap: 12,
    marginBottom: 20,
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
  modalFooter: {
    marginTop: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  submitText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
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
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
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
    height: 48,
    marginLeft: theme.spacing.sm,
    ...theme.typography.body,
  },
  selectItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  selectItemText: {
    ...theme.typography.body,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
});

export default ManagementScreen;
