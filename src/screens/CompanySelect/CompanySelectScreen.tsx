import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { Text } from '../../components';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { ChevronRight, Layers, Wrench, Store } from 'lucide-react-native';

export type CompanyKey = 'acp' | 'handles' | 'interior';

interface Company {
  key: CompanyKey;
  label: string;
  subtitle: string;
  Icon: any;
  iconColor: string;
  iconBg: string;
  accentColor: string;
}

const COMPANIES: Company[] = [
  {
    key: 'acp',
    label: 'ACP',
    subtitle: 'Aluminium Composite Panels',
    Icon: Layers,
    iconColor: '#1565C0',
    iconBg: '#E3F2FD',
    accentColor: '#1565C0',
  },
  {
    key: 'handles',
    label: 'Handles',
    subtitle: 'Hardware & Handle Division',
    Icon: Wrench,
    iconColor: '#6A1B9A',
    iconBg: '#F3E5F5',
    accentColor: '#6A1B9A',
  },
  {
    key: 'interior',
    label: 'Interior Gallery Shop',
    subtitle: 'Furniture & Interior Products',
    Icon: Store,
    iconColor: '#1A1A1A',
    iconBg: '#F1F5F9',
    accentColor: '#1A1A1A',
  },
];

interface Props {
  onSelect: (company: CompanyKey) => void;
}

export default function CompanySelectScreen({ onSelect }: Props) {
  const anims = useRef(COMPANIES.map(() => new Animated.Value(0))).current;
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
      easing: Easing.out(Easing.quad),
    }).start();

    COMPANIES.forEach((_, i) => {
      Animated.timing(anims[i], {
        toValue: 1,
        duration: 420,
        delay: 300 + i * 110,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }).start();
    });
  }, []);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerAnim,
            transform: [
              {
                translateY: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-16, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Image
          source={require('../../../assets/Logo.jpeg')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Interior Gallery</Text>
        <Text style={styles.subtitle}>Select a business to continue</Text>
      </Animated.View>

      {/* Company cards */}
      <View style={styles.cardsContainer}>
        {COMPANIES.map((co, i) => {
          const anim = anims[i];
          const Icon = co.Icon;
          return (
            <Animated.View
              key={co.key}
              style={{
                opacity: anim,
                transform: [
                  {
                    translateY: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [28, 0],
                    }),
                  },
                ],
              }}
            >
              <TouchableOpacity
                style={styles.card}
                onPress={() => onSelect(co.key)}
                activeOpacity={0.82}
              >
                {/* Left accent bar */}
                <View style={[styles.accentBar, { backgroundColor: co.accentColor }]} />

                {/* Icon */}
                <View style={[styles.iconWrap, { backgroundColor: co.iconBg }]}>
                  <Icon size={26} color={co.iconColor} />
                </View>

                {/* Labels */}
                <View style={styles.cardText}>
                  <Text style={styles.cardLabel}>{co.label}</Text>
                  <Text style={styles.cardSub}>{co.subtitle}</Text>
                </View>

                {/* Arrow */}
                <ChevronRight size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>

      <Text style={styles.footer}>Interior Gallery © {new Date().getFullYear()}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 20,
  },

  // Header
  header: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 36,
  },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 5,
    fontWeight: '500',
  },

  // Cards
  cardsContainer: {
    gap: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    paddingVertical: 18,
    paddingRight: 18,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardText: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.text,
  },
  cardSub: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 3,
    fontWeight: '500',
  },

  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 'auto' as any,
    paddingBottom: 8,
    opacity: 0.6,
  },
});

