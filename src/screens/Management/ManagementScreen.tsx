import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { Users, Plus, Search, X, Layers, Edit2, RotateCw } from 'lucide-react-native';
import { PartyService, CategoryService } from '../../services/api';
import Toast from 'react-native-toast-message';
import { useLanguage } from '../../context/LanguageContext';

type ManagementTab = 'party' | 'category';

const ManagementScreen = () => {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<ManagementTab>('party');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [editingItem, setEditingItem] = useState<any>(null);
  const [newName, setNewName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const entityNames: Record<ManagementTab, string> = {
    party: t.party,
    category: t.categories,
  };

  const activeEntityName = entityNames[activeTab];

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'party') {
        const res = await PartyService.getParties();
        setData(res.data);
      } else if (activeTab === 'category') {
        const res = await CategoryService.getCategories();
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

  const filteredData = data.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddItem = () => {
    setEditingItem(null);
    setNewName('');
    setShowAddModal(true);
  };

  const handleEditItem = (item: any) => {
    setEditingItem(item);
    setNewName(item.name);
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

      if (activeTab === 'party') {
        if (editingItem) {
          await PartyService.updateParty(editingItem.id, { name: newName.trim() });
        } else {
          await PartyService.createParty({ name: newName.trim() });
        }
      } else if (activeTab === 'category') {
        if (editingItem) {
          await CategoryService.updateCategory(editingItem.id, { name: newName.trim() });
        } else {
          await CategoryService.createCategory({ name: newName.trim() });
        }
      }

      Toast.show({
        type: 'success',
        text1: editingItem ? 'Updated' : 'Success',
        text2: `${activeEntityName} ${editingItem ? 'updated' : 'added'} successfully`,
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
    setEditingItem(null);
    setNewName('');
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardMain}>
        <View style={styles.iconContainer}>
          {activeTab === 'party' ? (
            <Users size={20} color={theme.colors.primary} />
          ) : (
            <Layers size={20} color={theme.colors.primary} />
          )}
        </View>
        <View style={styles.info}>
          <Text style={styles.itemName}>{item.name}</Text>
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
        <TouchableOpacity style={styles.refreshButton} onPress={fetchData} activeOpacity={0.7}>
          <RotateCw size={18} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <View style={styles.tabGrid}>
          {(['party', 'category'] as ManagementTab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
              onPress={() => {
                setActiveTab(tab);
                setSearchQuery('');
              }}
            >
              <View style={styles.tabIcon}>
                {tab === 'party' ? (
                  <Users size={20} color={activeTab === tab ? '#FFF' : theme.colors.primary} />
                ) : (
                  <Layers size={20} color={activeTab === tab ? '#FFF' : theme.colors.primary} />
                )}
              </View>
              <Text style={[styles.tabButtonText, activeTab === tab && styles.activeTabButtonText]}>
                {tab === 'party' ? t.parties : t.categories}
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
              <Text style={styles.emptyText}>
                No {activeTab === 'party' ? t.parties : t.categories} found
              </Text>
            </View>
          )}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={handleCloseModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={handleCloseModal}
          />
          <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 16) + 20 }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {editingItem ? t.edit : t.new} {activeEntityName}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {editingItem
                    ? `${t.updateDetailsFor} ${activeEntityName.toLowerCase()}`
                    : `${t.registerNew} ${activeEntityName.toLowerCase()}`}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCloseModal}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t.name}</Text>
              <TextInput
                style={styles.input}
                placeholder={`${activeEntityName} name...`}
                value={newName}
                onChangeText={setNewName}
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.submitButton, submitting && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitText}>
                    {editingItem ? t.saveChanges : `${t.saveItem} ${activeEntityName}`}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCloseModal}>
                <Text style={styles.cancelText}>{t.discard}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
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
    gap: 12,
  },
  tabButton: {
    flex: 1,
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
    marginBottom: theme.spacing.md,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: theme.spacing.sm,
    fontSize: 14,
    color: theme.colors.text,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 80,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
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
    color: theme.colors.text,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: theme.spacing.sm,
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
    color: theme.colors.textSecondary,
  },

  // Modal styles
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: theme.spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : theme.spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  modalTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  modalSubtitle: {
    ...theme.typography.caption,
    marginTop: 4,
    color: theme.colors.textSecondary,
  },
  closeButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
  },
  inputGroup: {
    marginBottom: theme.spacing.xl,
  },
  label: {
    ...theme.typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
    color: theme.colors.textSecondary,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.colors.text,
  },
  modalActions: {
    gap: 12,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
});

export default ManagementScreen;
