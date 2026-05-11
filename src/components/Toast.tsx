import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Platform, DeviceEventEmitter } from 'react-native';
import { theme } from '../theme';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react-native';

export type ToastType = 'success' | 'error' | 'info';

interface ToastOptions {
  type: ToastType;
  text1: string;
  text2?: string;
}

const TOAST_EVENT = 'SHOW_TOAST';

export const showToast = (options: ToastOptions) => {
  DeviceEventEmitter.emit(TOAST_EVENT, options);
};

const Toast: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<ToastOptions | null>(null);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(-100))[0];

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(TOAST_EVENT, (newOptions: ToastOptions) => {
      setOptions(newOptions);
      setVisible(true);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: Platform.OS === 'ios' ? 60 : 40,
          useNativeDriver: true,
          friction: 8,
        }),
      ]).start();

      setTimeout(() => {
        hide();
      }, 4000);
    });

    return () => subscription.remove();
  }, []);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      setOptions(null);
    });
  }, []);

  if (!visible || !options) return null;

  const getIcon = () => {
    switch (options.type) {
      case 'success': return <CheckCircle2 size={24} color="#4CAF50" />;
      case 'error': return <AlertCircle size={24} color="#FF5252" />;
      case 'info': return <Info size={24} color={theme.colors.primary} />;
    }
  };

  const getBorderColor = () => {
    switch (options.type) {
      case 'success': return '#4CAF50';
      case 'error': return '#FF5252';
      case 'info': return theme.colors.primary;
    }
  };

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          borderLeftColor: getBorderColor(),
        }
      ]}
    >
      <View style={styles.iconContainer}>
        {getIcon()}
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{options.text1}</Text>
        {options.text2 && <Text style={styles.message}>{options.text2}</Text>}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    padding: 16,
    borderLeftWidth: 6,
    zIndex: 1000,
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
  iconContainer: {
    marginRight: 12,
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    ...theme.typography.body,
    fontWeight: '700',
    color: theme.colors.text,
  },
  message: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});

export default Toast;
