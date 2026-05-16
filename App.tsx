import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Image, Animated, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { theme } from './src/theme';
import { LayoutDashboard, Package, ArrowLeftRight, History as HistoryIcon, Users } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';

// Screens
import DashboardScreen from './src/screens/Dashboard/DashboardScreen';
import ProductsScreen from './src/screens/Products/ProductsScreen';
import StockEntryScreen from './src/screens/StockEntry/StockEntryScreen';
import HistoryScreen from './src/screens/History/HistoryScreen';
import ManagementScreen from './src/screens/Management/ManagementScreen';

const Tab = createMaterialTopTabNavigator();

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function MainTabs() {
  const { t } = useLanguage();

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
          height: 65,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          textTransform: 'none',
          marginBottom: 5,
        },
        tabBarItemStyle: {
          paddingHorizontal: 0,
        },
        swipeEnabled: true,
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{
          tabBarLabel: t.tabDashboard,
          tabBarIcon: ({ color }) => <LayoutDashboard size={24} color={color} />,
        }}
      />
      <Tab.Screen 
        name="Products" 
        component={ProductsScreen} 
        options={{
          tabBarLabel: t.tabProducts,
          tabBarIcon: ({ color }) => <Package size={24} color={color} />,
        }}
      />
      <Tab.Screen 
        name="Management" 
        component={ManagementScreen} 
        options={{
          tabBarLabel: t.tabManagement,
          tabBarIcon: ({ color }) => <Users size={24} color={color} />,
        }}
      />
      <Tab.Screen 
        name="Stock" 
        component={StockEntryScreen} 
        options={{
          tabBarLabel: t.tabStock,
          tabBarIcon: ({ color }) => <ArrowLeftRight size={24} color={color} />,
        }}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreen} 
        options={{
          tabBarLabel: t.tabHistory,
          tabBarIcon: ({ color }) => <HistoryIcon size={24} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

import { GestureHandlerRootView } from 'react-native-gesture-handler';

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
          <Toast />
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
