import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Image, Animated, Text, Platform } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
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

function MainTabs() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  // Uplift bottom tab bar to fully accommodate devices with bottom software navigation
  // (Android 3-button navigation, gesture navigation pill, iOS home indicator)
  const bottomInset = insets.bottom;
  const tabHeight = 58 + (bottomInset > 0 ? bottomInset : 8);

  return (
    <Tab.Navigator
      backBehavior="history"
      tabBarPosition="bottom"
      screenOptions={{
        tabBarShowIcon: true,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarIndicatorStyle: { height: 0 }, // Hide the indicator for a bottom-tab look
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          height: tabHeight,
          paddingBottom: bottomInset > 0 ? bottomInset : 6,
          paddingTop: 6,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.08,
          shadowRadius: 6,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          textTransform: 'none',
          marginTop: 2,
          marginBottom: 0,
        },
        tabBarItemStyle: {
          paddingHorizontal: 0,
          paddingVertical: 2,
          height: 52,
          justifyContent: 'center',
          alignItems: 'center',
        },
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
        <SafeAreaProvider>
          <View style={styles.container} onLayout={onLayoutRootView}>
          <StatusBar style="dark" />
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
            <MainTabs />
          </NavigationContainer>

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
      </SafeAreaProvider>
    </LanguageProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
