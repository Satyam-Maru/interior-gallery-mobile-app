import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { Package, ArrowUpRight, ArrowDownLeft, History } from 'lucide-react-native';
import { DashboardService } from '../../services/api';
import LineChart from 'react-native-chart-kit/dist/line-chart';
import PieChart from 'react-native-chart-kit/dist/PieChart';

const screenWidth = Dimensions.get('window').width;

const StatCard = ({ title, value, icon: Icon, color, isCurrency }: any) => (
  <View style={styles.statCard}>
    <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
      <Icon size={24} color={color} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {isCurrency ? `₹${value}` : value}
      </Text>
    </View>
  </View>
);

const DashboardScreen = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({
    totalStock: 0,
    totalPurchases: 0,
    totalSales: 0,
    historyCount: 0,
    dailyTrend: [],
    categoryDistribution: []
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await DashboardService.getStats();
      setStats(res.data);
    } catch (error) {
      console.error('Stats fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const getCurrentDate = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const now = new Date();
    return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(13, 110, 253, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(108, 117, 125, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: theme.colors.primary,
    },
  };

  const trendData = {
    labels: stats.dailyTrend.map((d: any) => d.date.split('-')[2]), // Just days
    datasets: [
      {
        data: stats.dailyTrend.map((d: any) => d.sales),
        color: (opacity = 1) => `rgba(40, 167, 69, ${opacity})`, // Success/Sales
        strokeWidth: 2
      },
      {
        data: stats.dailyTrend.map((d: any) => d.purchases),
        color: (opacity = 1) => `rgba(220, 53, 69, ${opacity})`, // Error/Purchases
        strokeWidth: 2
      }
    ],
    legend: ['Sales', 'Purchases']
  };

  const pieData = stats.categoryDistribution.map((cat: any, index: number) => {
    const colors = [theme.colors.primary, theme.colors.accent, '#20c997', '#ffc107', '#fd7e14', '#6610f2'];
    return {
      name: cat.name,
      population: cat.value,
      color: colors[index % colors.length],
      legendFontColor: '#7F7F7F',
      legendFontSize: 12
    };
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchData} colors={[theme.colors.primary]} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Overview</Text>
          <Text style={styles.date}>{getCurrentDate()}</Text>
        </View>

        <View style={styles.statsGrid}>
          <StatCard 
            title="Total Stock" 
            value={stats.totalStock.toLocaleString()} 
            icon={Package} 
            color={theme.colors.primary} 
          />
          <StatCard 
            title="Total History" 
            value={stats.historyCount.toLocaleString()} 
            icon={History} 
            color={theme.colors.textSecondary} 
          />
          <StatCard 
            title="Purchases" 
            value={stats.totalPurchases.toLocaleString()} 
            icon={ArrowDownLeft} 
            color={theme.colors.error}
            isCurrency
          />
          <StatCard 
            title="Sales" 
            value={stats.totalSales.toLocaleString()} 
            icon={ArrowUpRight} 
            color={theme.colors.success}
            isCurrency
          />
        </View>

        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Last 7 Days Trend</Text>
          {stats.dailyTrend.length > 0 ? (
            <LineChart
              data={trendData}
              width={screenWidth - 80}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          ) : (
            <ActivityIndicator color={theme.colors.primary} />
          )}
        </View>

        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Stock by Category</Text>
          {stats.categoryDistribution.length > 0 ? (
            <View style={styles.pieContainer}>
              <PieChart
                data={pieData}
                width={screenWidth - 48}
                height={200}
                chartConfig={chartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft={(screenWidth / 4).toString()}
                absolute
                hasLegend={false}
              />
              <View style={styles.customLegend}>
                {pieData.map((item: any, index: number) => (
                  <View key={index} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text style={styles.legendText}>{item.name}</Text>
                    <Text style={styles.legendValue}>({item.population})</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <Text style={styles.emptyText}>No category data available</Text>
          )}
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.loadingText}>Updating statistics...</Text>
          </View>
        )}
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
    marginBottom: theme.spacing.md,
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
    color: theme.colors.textSecondary,
  },
  statValue: {
    ...theme.typography.h2,
    fontSize: 18,
    marginTop: 2,
    color: theme.colors.text,
  },
  chartSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chartTitle: {
    ...theme.typography.h3,
    fontSize: 16,
    marginBottom: 16,
    color: theme.colors.text,
  },
  pieContainer: {
    alignItems: 'center',
  },
  customLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.text,
    fontWeight: '600',
  },
  legendValue: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  emptyText: {
    ...theme.typography.caption,
    textAlign: 'center',
    marginVertical: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: theme.spacing.xl,
    marginBottom: 40,
  },
  loadingText: {
    ...theme.typography.caption,
    marginTop: 8,
  }
});

export default DashboardScreen;
