import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { LayoutGrid, Package, ArrowUpRight, ArrowDownLeft, History } from 'lucide-react-native';

const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <View style={styles.statCard}>
    <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
      <Icon size={24} color={color} />
    </View>
    <View>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  </View>
);

const DashboardScreen = () => {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Overview</Text>
        <Text style={styles.date}>Monday, May 12</Text>
      </View>

      <View style={styles.statsGrid}>
        <StatCard 
          title="Total Stock" 
          value="1,284" 
          icon={Package} 
          color={theme.colors.primary} 
        />
        <StatCard 
          title="Purchases" 
          value="48" 
          icon={ArrowUpRight} 
          color={theme.colors.success} 
        />
        <StatCard 
          title="Sales" 
          value="32" 
          icon={ArrowDownLeft} 
          color={theme.colors.accent} 
        />
        <StatCard 
          title="History" 
          value="156" 
          icon={History} 
          color={theme.colors.textSecondary} 
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        
        {[1, 2, 3].map((item) => (
          <View key={item} style={styles.activityItem}>
            <View style={styles.activityInfo}>
              <Text style={styles.activityName}>Modern Sofa Set</Text>
              <Text style={styles.activityTime}>2 hours ago</Text>
            </View>
            <Text style={[styles.activityAmount, { color: item % 2 === 0 ? theme.colors.success : theme.colors.error }]}>
              {item % 2 === 0 ? '+ 2' : '- 1'}
            </Text>
          </View>
        ))}
      </View>
      </ScrollView>
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
  header: {
    marginBottom: theme.spacing.xl,
  },
  greeting: {
    ...theme.typography.h1,
    color: theme.colors.primary,
  },
  date: {
    ...theme.typography.caption,
    fontSize: 14,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
  },
  statCard: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  iconContainer: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.sm,
  },
  statTitle: {
    ...theme.typography.caption,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  statValue: {
    ...theme.typography.h2,
    fontSize: 18,
    marginTop: 2,
  },
  section: {
    marginTop: theme.spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    ...theme.typography.h2,
    fontSize: 20,
  },
  seeAll: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    ...theme.typography.body,
    fontWeight: '600',
  },
  activityTime: {
    ...theme.typography.caption,
  },
  activityAmount: {
    fontWeight: '700',
    fontSize: 16,
  },
});

export default DashboardScreen;
