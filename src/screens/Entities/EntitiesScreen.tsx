import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { Users, Plus, Search, MapPin, X, ChevronDown, Truck } from 'lucide-react-native';
import { EntityService, LocationService } from '../../services/api';
import Toast from 'react-native-toast-message';

const EntitiesScreen = () => {
  const [activeTab, setActiveTab] = useState<'supplier' | 'customer'>('supplier');
  const [entities, setEntities] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form State
  const [editingEntity, setEditingEntity] = useState<any>(null);
  const [newName, setNewName] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [newLocationName, setNewLocationName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // UI State
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locSearchQuery, setLocSearchQuery] = useState('');

  useEffect(() => {
    const backAction = () => {
      if (showLocationModal) {
        setShowLocationModal(false);
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
  }, [showLocationModal, showAddModal]);

  useFocusEffect(
    React.useCallback(() => {
      resetForm();
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      const [entRes, locRes] = await Promise.all([
        EntityService.getEntities(),
        LocationService.getLocations(),
      ]);
      setEntities(entRes.data);
      setLocations(locRes.data);
    } catch (error) {
      console.error('Fetch error:', error);
      Toast.show({
        type: 'error',
        text1: 'Fetch Failed',
        text2: 'Could not load party data',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredEntities = entities.filter(e => 
    e.type === activeTab && 
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredLocations = locations.filter(l => 
    l.name.toLowerCase().includes(locSearchQuery.toLowerCase())
  );

  const handleEditEntity = (entity: any) => {
    setEditingEntity(entity);
    setNewName(entity.name);
    setSelectedLocationId(entity.location_id);
    setShowAddModal(true);
  };

  const handleSaveEntity = async () => {
    if (!newName.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: `Please enter ${activeTab} name`,
      });
      return;
    }

    try {
      setSubmitting(true);
      
      let locationId = selectedLocationId;
      
      // Handle "on the go" location creation
      if (newLocationName.trim()) {
        const locRes = await LocationService.createLocation({ name: newLocationName.trim() });
        locationId = locRes.data.id;
      }

      const entityData = {
        name: newName.trim(),
        type: activeTab,
        location_id: locationId || undefined,
      };

      if (editingEntity) {
        await EntityService.updateEntity(editingEntity.id, entityData);
        Toast.show({
          type: 'success',
          text1: 'Updated',
          text2: `${activeTab} updated successfully`,
        });
      } else {
        await EntityService.createEntity(entityData);
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: `${activeTab} added successfully`,
        });
      }

      setShowAddModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Save error:', error);
      Toast.show({
        type: 'error',
        text1: 'Save Failed',
        text2: `Could not save ${activeTab} to database`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setEditingEntity(null);
    setNewName('');
    setSelectedLocationId(null);
    setNewLocationName('');
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
        <Text style={styles.title}>Parties</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Plus size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'supplier' && styles.activeTabButton]}
          onPress={() => setActiveTab('supplier')}
        >
          <Truck size={20} color={activeTab === 'supplier' ? '#FFF' : theme.colors.textSecondary} />
          <Text style={[styles.tabButtonText, activeTab === 'supplier' && styles.activeTabButtonText]}>Suppliers</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'customer' && styles.activeTabButton]}
          onPress={() => setActiveTab('customer')}
        >
          <Users size={20} color={activeTab === 'customer' ? '#FFF' : theme.colors.textSecondary} />
          <Text style={[styles.tabButtonText, activeTab === 'customer' && styles.activeTabButtonText]}>Customers</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color={theme.colors.textSecondary} />
        <TextInput 
          placeholder={`Search ${activeTab}s...`} 
          style={styles.searchInput}
          placeholderTextColor={theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredEntities}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        onRefresh={fetchData}
        refreshing={loading}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.entityCard} onPress={() => handleEditEntity(item)}>
            <View style={styles.entityIcon}>
              <Users size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.entityInfo}>
              <Text style={styles.entityName}>{item.name}</Text>
              <View style={styles.locationContainer}>
                <MapPin size={12} color={theme.colors.textSecondary} />
                <Text style={styles.locationText}>
                  {locations.find(l => l.id === item.location_id)?.name || 'No location'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Add/Edit Party Modal - Now a View for better compatibility */}
      {showAddModal && (
        <View style={styles.mainModalOverlay}>
          <SafeAreaView style={styles.fullScreenModal}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{editingEntity ? 'Edit' : 'New'} {activeTab}</Text>
                <Text style={styles.modalSubtitle}>
                  {editingEntity ? `Update details for this ${activeTab}` : `Register a new ${activeTab} in the system`}
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
                  <Text style={styles.label}>Name *</Text>
                  <TextInput 
                    style={styles.input}
                    placeholder={`Enter ${activeTab} name`}
                    value={newName}
                    onChangeText={setNewName}
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Location</Text>
                  <TouchableOpacity 
                    style={styles.picker}
                    onPress={() => {
                      setLocSearchQuery('');
                      setShowLocationModal(true);
                    }}
                  >
                    <Text style={[styles.pickerText, (selectedLocationId || newLocationName) ? { color: theme.colors.text } : null]}>
                      {newLocationName ? newLocationName : (selectedLocationId ? locations.find(l => l.id === selectedLocationId)?.name : 'Select Location')}
                    </Text>
                    <ChevronDown size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                  <TouchableOpacity 
                    style={[styles.submitButton, submitting ? { opacity: 0.7 } : null]} 
                    onPress={handleSaveEntity}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.submitText}>{editingEntity ? 'Save Changes' : `Save ${activeTab}`}</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.cancelButton} 
                    onPress={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                  >
                    <Text style={styles.cancelText}>Discard</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
            <Toast />
            {/* Searchable Location Modal - Now a View for better compatibility */}
            {showLocationModal && (
              <View style={styles.innerModalOverlay}>
                <View style={styles.innerModalContent}>
                  <View style={styles.innerModalHeader}>
                    <Text style={styles.innerModalTitle}>Select Location</Text>
                    <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                      <X size={20} color={theme.colors.text} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.modalSearch}>
                    <Search size={18} color={theme.colors.textSecondary} />
                    <TextInput 
                      placeholder="Search or add new..." 
                      style={styles.modalSearchInput}
                      value={locSearchQuery}
                      onChangeText={setLocSearchQuery}
                      autoFocus={Platform.OS === 'android'}
                    />
                  </View>

                  <FlatList
                    data={filteredLocations}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    renderItem={({ item }) => (
                      <TouchableOpacity 
                        style={styles.selectItem}
                        onPress={() => {
                          setSelectedLocationId(item.id);
                          setNewLocationName('');
                          setShowLocationModal(false);
                        }}
                      >
                        <Text style={styles.selectItemText}>{item.name}</Text>
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={() => (
                      locSearchQuery.length > 0 ? (
                        <TouchableOpacity 
                          style={styles.addNewItem}
                          onPress={() => {
                            setNewLocationName(locSearchQuery);
                            setSelectedLocationId(null);
                            setShowLocationModal(false);
                          }}
                        >
                          <Plus size={18} color={theme.colors.primary} />
                          <Text style={styles.addNewItemText}>Add "{locSearchQuery}" as new location</Text>
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    padding: 6,
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xl,
    gap: 6,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: theme.borderRadius.sm,
    gap: 8,
  },
  activeTabButton: {
    backgroundColor: theme.colors.primary,
  },
  tabButtonText: {
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  activeTabButtonText: {
    color: '#FFF',
  },
  searchContainer: {
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
  searchInput: {
    flex: 1,
    height: 44,
    marginLeft: theme.spacing.sm,
    ...theme.typography.body,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
  },
  entityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  entityIcon: {
    width: 40,
    height: 40,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  entityInfo: {
    flex: 1,
  },
  entityName: {
    ...theme.typography.body,
    fontWeight: '600',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  locationText: {
    ...theme.typography.caption,
  },
  fullScreenModal: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  mainModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.background,
    zIndex: 900,
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
    height: 48,
    marginLeft: theme.spacing.sm,
    ...theme.typography.body,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
});

export default EntitiesScreen;
