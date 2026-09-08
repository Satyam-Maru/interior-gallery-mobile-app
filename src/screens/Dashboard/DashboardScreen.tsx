import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { Package, ArrowUpRight, ArrowDownLeft, Receipt, AlertCircle, RotateCw } from 'lucide-react-native';
import { DashboardService } from '../../services/api';
import LineChart from 'react-native-chart-kit/dist/line-chart';
import PieChart from 'react-native-chart-kit/dist/PieChart';
import { useLanguage } from '../../context/LanguageContext';
import { getFormattedDate, toGujaratiNumerals } from '../../i18n/translations';

const screenWidth = Dimensions.get('window').width;

const StatCard = ({ title, value, icon: Icon, color, isCurrency, lang }: any) => (
  <View style={styles.statCard}>
    <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
      <Icon size={24} color={color} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {isCurrency
          ? `₹${lang === 'gu' ? toGujaratiNumerals(value) : value}`
          : (lang === 'gu' ? toGujaratiNumerals(value) : value)}
      </Text>
    </View>
  </View>
);

const DashboardScreen = () => {
  const { language, t, setLanguage } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({
    totalStock: 0,
    totalPurchases: 0,
    totalSales: 0,
    billCount: 0,
    totalOutstanding: 0,
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

  useEffect(() => {
    fetchData();
  }, []);

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(13, 110, 253, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(108, 117, 125, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: theme.colors.primary,
    },
  };

  const trendData = {
    labels: stats.dailyTrend.map((d: any) =>
      language === 'gu' ? toGujaratiNumerals(d.date.split('-')[2]) : d.date.split('-')[2]
    ),
    datasets: [
      {
        data: stats.dailyTrend.map((d: any) => d.sales),
        color: (opacity = 1) => `rgba(40, 167, 69, ${opacity})`,
        strokeWidth: 2
      },
      {
        data: stats.dailyTrend.map((d: any) => d.purchases),
        color: (opacity = 1) => `rgba(220, 53, 69, ${opacity})`,
        strokeWidth: 2
      }
    ],
    legend: [t.sales, t.purchases]
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
        {/* Header with refresh button and language toggle */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{t.overview}</Text>
            <Text style={styles.date}>{getFormattedDate(language)}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={fetchData}
              activeOpacity={0.7}
            >
              <RotateCw size={18} color={theme.colors.primary} />
            </TouchableOpacity>
            {/* Language pill toggle */}
            <View style={styles.langToggle}>
              <TouchableOpacity
                style={[styles.langOption, language === 'en' && styles.langOptionActive]}
                onPress={() => setLanguage('en')}
                activeOpacity={0.8}
              >
                <Text style={[styles.langOptionText, language === 'en' && styles.langOptionTextActive]}>
                  EN
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.langOption, language === 'gu' && styles.langOptionActive]}
                onPress={() => setLanguage('gu')}
                activeOpacity={0.8}
              >
                <Text style={[styles.langOptionText, language === 'gu' && styles.langOptionTextActive]}>
                  ગુ
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            title={t.totalStock}
            value={stats.totalStock.toLocaleString()}
            icon={Package}
            color={theme.colors.primary}
            lang={language}
          />
          <StatCard
            title={t.billCountLabel}
            value={(stats.billCount ?? 0).toLocaleString()}
            icon={Receipt}
            color={theme.colors.textSecondary}
            lang={language}
          />
          <StatCard
            title={t.purchases}
            value={stats.totalPurchases.toLocaleString()}
            icon={ArrowDownLeft}
            color={theme.colors.error}
            isCurrency
            lang={language}
          />
          <StatCard
            title={t.sales}
            value={stats.totalSales.toLocaleString()}
            icon={ArrowUpRight}
            color={theme.colors.success}
            isCurrency
            lang={language}
          />
          <StatCard
            title={t.outstandingLabel}
            value={(stats.totalOutstanding ?? 0).toLocaleString()}
            icon={AlertCircle}
            color="#fd7e14"
            isCurrency
            lang={language}
          />
        </View>

        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>{t.last7DaysTrend}</Text>
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
          <Text style={styles.chartTitle}>{t.stockByCategory}</Text>
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
                    <Text style={styles.legendValue}>
                      ({language === 'gu' ? toGujaratiNumerals(item.population) : item.population})
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <Text style={styles.emptyText}>{t.noCategoryData}</Text>
          )}
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.loadingText}>{t.updatingStatistics}</Text>
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
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  // ── Language toggle ──────────────────────────────────────
  langToggle: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 3,
    gap: 2,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  langOption: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  langOptionActive: {
    backgroundColor: theme.colors.primary,
  },
  langOptionText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  langOptionTextActive: {
    color: '#FFF',
  },
  // ── Stats ────────────────────────────────────────────────
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
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default DashboardScreen;
