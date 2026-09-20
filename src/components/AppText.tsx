import React from 'react';
import {
  Text as RNText,
  TextProps as RNTextProps,
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  StyleSheet,
  TextStyle,
} from 'react-native';
import { useLanguage } from '../context/LanguageContext';

export const GUJARATI_REGEX = /[\u0A80-\u0AFF]/;

/**
 * Recursively check if a React node contains any Gujarati Unicode characters
 */
export function containsGujarati(node: React.ReactNode): boolean {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return false;
  }
  if (typeof node === 'string') {
    return GUJARATI_REGEX.test(node);
  }
  if (typeof node === 'number') {
    return false;
  }
  if (Array.isArray(node)) {
    return node.some(containsGujarati);
  }
  if (React.isValidElement(node) && (node.props as any)?.children) {
    return containsGujarati((node.props as any).children);
  }
  return false;
}

/**
 * Returns enhanced, comfortable font size for Gujarati typography.
 * Compensates for smaller x-height and conjunct complexity of Gujarati glyphs.
 */
export function getGujaratiFontSize(baseSize?: number): number {
  const size = baseSize ?? 14;
  if (size <= 11) return size + 2.5; // Tiny badges / captions: 10 -> 12.5, 11 -> 13.5
  if (size <= 14) return size + 2;   // Normal labels / body: 12 -> 14, 14 -> 16
  if (size <= 18) return size + 2.5; // Subheaders / buttons: 15 -> 17.5, 16 -> 18.5, 18 -> 20.5
  return size + 3;                   // Large headers: 20 -> 23, 24 -> 27, 32 -> 35
}

export interface AppTextProps extends RNTextProps {
  isGujarati?: boolean;
}

export const AppText = React.forwardRef<RNText, AppTextProps>(
  ({ style, children, isGujarati, ...rest }, ref) => {
    const { language } = useLanguage();
    const isGu = isGujarati || language === 'gu' || containsGujarati(children);

    if (!isGu) {
      return (
        <RNText ref={ref} style={style} {...rest}>
          {children}
        </RNText>
      );
    }

    const flatStyle: TextStyle = (StyleSheet.flatten(style) || {}) as TextStyle;
    const currentFontSize = flatStyle.fontSize;

    const gujaratiOverride: TextStyle = {};

    if (currentFontSize !== undefined) {
      const newFontSize = getGujaratiFontSize(currentFontSize);
      gujaratiOverride.fontSize = newFontSize;

      if (flatStyle.lineHeight) {
        const scale = newFontSize / currentFontSize;
        gujaratiOverride.lineHeight = Math.round(flatStyle.lineHeight * scale);
      }
    } else {
      // If no fontSize was explicitly specified on this element, scale from default 14
      gujaratiOverride.fontSize = getGujaratiFontSize(14);
    }

    return (
      <RNText ref={ref} style={[style, gujaratiOverride]} {...rest}>
        {children}
      </RNText>
    );
  }
);

AppText.displayName = 'AppText';

export interface AppTextInputProps extends RNTextInputProps {
  isGujarati?: boolean;
}

export const AppTextInput = React.forwardRef<RNTextInput, AppTextInputProps>(
  ({ style, placeholder, value, isGujarati, ...rest }, ref) => {
    const { language } = useLanguage();

    const isGu =
      isGujarati ||
      language === 'gu' ||
      (typeof placeholder === 'string' && GUJARATI_REGEX.test(placeholder)) ||
      (typeof value === 'string' && GUJARATI_REGEX.test(value));

    if (!isGu) {
      return (
        <RNTextInput
          ref={ref}
          style={style}
          placeholder={placeholder}
          value={value}
          {...rest}
        />
      );
    }

    const flatStyle: TextStyle = (StyleSheet.flatten(style) || {}) as TextStyle;
    const currentFontSize = flatStyle.fontSize ?? 15;
    const newFontSize = getGujaratiFontSize(currentFontSize);

    const gujaratiOverride: TextStyle = {
      fontSize: newFontSize,
    };

    if (flatStyle.lineHeight) {
      const scale = newFontSize / currentFontSize;
      gujaratiOverride.lineHeight = Math.round(flatStyle.lineHeight * scale);
    }

    return (
      <RNTextInput
        ref={ref}
        style={[style, gujaratiOverride]}
        placeholder={placeholder}
        value={value}
        {...rest}
      />
    );
  }
);

AppTextInput.displayName = 'AppTextInput';

export const Text = AppText;
export const TextInput = AppTextInput;
export default AppText;
