import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Image, Animated, Platform, TouchableOpacity } from 'react-native';
import { Text } from './src/components';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createMaterialTopTabNavigator, MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { theme } from './src/theme';
import { LayoutDashboard, Package, Receipt, History as HistoryIcon, Users } from 'lucide-react-native';
import Toast, { BaseToast, ErrorToast, InfoToast } from 'react-native-toast-message';
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DashboardScreen from './src/screens/Dashboard/DashboardScreen';
import ProductsScreen from './src/screens/Products/ProductsScreen';
import ManagementScreen from './src/screens/Management/ManagementScreen';
import StockEntryScreen from './src/screens/StockEntry/StockEntryScreen';
import HistoryScreen from './src/screens/History/HistoryScreen';
import CompanySelectScreen from './src/screens/CompanySelect/CompanySelectScreen';
import { CompanyProvider, useCompany } from './src/context/CompanyContext';

const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: theme.colors.success,
        width: '92%',
        height: 'auto',
        minHeight: 60,
        paddingVertical: 10,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.text,
      }}
      text2Style={{
        fontSize: 12,
        color: theme.colors.textSecondary,
        flexWrap: 'wrap',
      }}
      text1NumberOfLines={2}
      text2NumberOfLines={4}
    />
  ),
  error: (props: any) => (
    <ErrorToast
      {...props}
      style={{
        borderLeftColor: theme.colors.error,
        width: '92%',
        height: 'auto',
        minHeight: 60,
        paddingVertical: 10,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
        elevation: 5,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.error,
      }}
      text2Style={{
        fontSize: 12,
        color: theme.colors.text,
        flexWrap: 'wrap',
      }}
      text1NumberOfLines={2}
      text2NumberOfLines={4}
    />
  ),
  info: (props: any) => (
    <InfoToast
      {...props}
      style={{
        borderLeftColor: theme.colors.primary,
        width: '92%',
        height: 'auto',
        minHeight: 60,
        paddingVertical: 10,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.text,
      }}
      text2Style={{
        fontSize: 12,
        color: theme.colors.textSecondary,
        flexWrap: 'wrap',
      }}
      text1NumberOfLines={2}
      text2NumberOfLines={4}
    />
  ),
};

const Tab = createMaterialTopTabNavigator();

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function CustomTabBar({ state, descriptors, navigation }: MaterialTopTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom;
  const tabHeight = 56 + (bottomInset > 0 ? bottomInset : 8);

  return (
    <View style={[styles.tabBar, { height: tabHeight, paddingBottom: bottomInset > 0 ? bottomInset : 6 }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const rawLabel =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;
        const color = isFocused ? theme.colors.primary : theme.colors.textSecondary;
        const labelText =
          typeof rawLabel === 'function'
            ? rawLabel({ focused: isFocused, color, children: '' })
            : rawLabel;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={typeof options.tabBarAccessibilityLabel === 'string' ? options.tabBarAccessibilityLabel : undefined}
            testID={options.tabBarButtonTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={0.7}
            style={styles.tabButton}
          >
            {options.tabBarIcon && options.tabBarIcon({ color, focused: isFocused })}
            <Text
              numberOfLines={1}
              style={[
                styles.tabLabel,
                {
                  color,
                  fontWeight: isFocused ? '700' : '500',
                },
              ]}
            >
              {labelText}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function MainTabs({ company, onSwitchCompany }: { company: string; onSwitchCompany: () => void }) {
  const { t } = useLanguage();

  return (
    <Tab.Navigator
      backBehavior="history"
      tabBarPosition="bottom"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        swipeEnabled: false,
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{
          tabBarLabel: t.tabDashboard,
          tabBarIcon: ({ color }) => <LayoutDashboard size={22} color={color} />,
        }}
      />
      <Tab.Screen 
        name="Products" 
        component={ProductsScreen} 
        options={{
          tabBarLabel: t.tabProducts,
          tabBarIcon: ({ color }) => <Package size={22} color={color} />,
        }}
      />
      <Tab.Screen 
        name="Management" 
        component={ManagementScreen} 
        options={{
          tabBarLabel: t.tabManagement,
          tabBarIcon: ({ color }) => <Users size={22} color={color} />,
        }}
      />
      <Tab.Screen 
        name="Bill" 
        component={StockEntryScreen} 
        options={{
          tabBarLabel: t.tabStock,
          tabBarIcon: ({ color }) => <Receipt size={22} color={color} />,
        }}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreen} 
        options={{
          tabBarLabel: t.tabHistory,
          tabBarIcon: ({ color }) => <HistoryIcon size={22} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

// Inner component that reads company from context
function AppContent({ appIsReady, splashVisible, fadeAnim, onLayout }: {
  appIsReady: boolean;
  splashVisible: boolean;
  fadeAnim: Animated.Value;
  onLayout: () => void;
}) {
  const { company, setCompany } = useCompany();

  return (
    <View style={styles.container} onLayout={onLayout}>
      <StatusBar style="dark" />

      {/* Company selection — shown until a company is picked */}
      {!splashVisible && !company ? (
        <CompanySelectScreen onSelect={(key) => setCompany(key)} />
      ) : (
        <NavigationContainer theme={{
          ...DefaultTheme,
          colors: {
            ...DefaultTheme.colors,
            primary: theme.colors.primary,
            background: theme.colors.background,
            card: theme.colors.background,
            text: theme.colors.text,
            border: theme.colors.border,
            notification: theme.colors.accent,
          }
        }}>
          {company && (
            <MainTabs
              company={company}
              onSwitchCompany={() => setCompany(null)}
            />
          )}
        </NavigationContainer>
      )}

      {splashVisible && (
        <Animated.View
          style={[
            styles.splashOverlay,
            { opacity: fadeAnim }
          ]}
        >
          <Image
            source={require('./assets/Logo.jpeg')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.loadingText}>Loading Premium Experience...</Text>
        </Animated.View>
      )}
      <Toast config={toastConfig} topOffset={Platform.OS === 'ios' ? 55 : 45} />
    </View>
  );
}

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);
  const fadeAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load resources
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
      
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start(() => {
        setSplashVisible(false);
      });
    }
  }, [appIsReady, fadeAnim]);

  if (!appIsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LanguageProvider>
        <CompanyProvider>
          <SafeAreaProvider>
            <AppContent
              appIsReady={appIsReady}
              splashVisible={splashVisible}
              fadeAnim={fadeAnim}
              onLayout={onLayoutRootView}
            />
          </SafeAreaProvider>
        </CompanyProvider>
      </LanguageProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    paddingTop: 6,
    paddingHorizontal: 4,
    gap: 2,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 3,
    textAlign: 'center',
  },
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  logo: {
    width: 250,
    height: 250,
    marginBottom: theme.spacing.lg,
  },
  loadingText: {
    ...theme.typography.caption,
    letterSpacing: 1,
  },
});
