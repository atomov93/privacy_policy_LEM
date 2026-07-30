import {useEffect, useState} from 'react';
import {AccessibilityInfo} from 'react-native';

export interface AccessibilityPrefs {
  screenReaderEnabled: boolean;
  reduceMotionEnabled: boolean;
  boldTextEnabled: boolean;
  grayscaleEnabled: boolean;
  invertColorsEnabled: boolean;
  highTextContrastEnabled: boolean;
}

const DEFAULT_PREFS: AccessibilityPrefs = {
  screenReaderEnabled: false,
  reduceMotionEnabled: false,
  boldTextEnabled: false,
  grayscaleEnabled: false,
  invertColorsEnabled: false,
  highTextContrastEnabled: false,
};

type PrefKey = keyof AccessibilityPrefs;

type AccessibilityQuery = () => Promise<boolean>;

async function safeQuery(query?: AccessibilityQuery): Promise<boolean> {
  if (!query) {
    return false;
  }
  try {
    return Boolean(await query());
  } catch {
    return false;
  }
}

async function readPrefs(): Promise<AccessibilityPrefs> {
  const info = AccessibilityInfo as typeof AccessibilityInfo & {
    isBoldTextEnabled?: () => Promise<boolean>;
    isGrayscaleEnabled?: () => Promise<boolean>;
    isInvertColorsEnabled?: () => Promise<boolean>;
    isHighTextContrastEnabled?: () => Promise<boolean>;
  };

  const [
    screenReaderEnabled,
    reduceMotionEnabled,
    boldTextEnabled,
    grayscaleEnabled,
    invertColorsEnabled,
    highTextContrastEnabled,
  ] = await Promise.all([
    safeQuery(() => AccessibilityInfo.isScreenReaderEnabled()),
    safeQuery(() => AccessibilityInfo.isReduceMotionEnabled()),
    safeQuery(info.isBoldTextEnabled?.bind(info)),
    safeQuery(info.isGrayscaleEnabled?.bind(info)),
    safeQuery(info.isInvertColorsEnabled?.bind(info)),
    safeQuery(info.isHighTextContrastEnabled?.bind(info)),
  ]);

  return {
    screenReaderEnabled,
    reduceMotionEnabled,
    boldTextEnabled,
    grayscaleEnabled,
    invertColorsEnabled,
    highTextContrastEnabled,
  };
}

function subscribe(
  eventName: string,
  key: PrefKey,
  setPrefs: React.Dispatch<React.SetStateAction<AccessibilityPrefs>>,
): {remove: () => void} | null {
  try {
    return AccessibilityInfo.addEventListener(
      eventName as 'screenReaderChanged',
      (enabled: boolean) => {
        setPrefs(prev => ({...prev, [key]: enabled}));
      },
    );
  } catch {
    return null;
  }
}

export function useAccessibilityPrefs(): AccessibilityPrefs {
  const [prefs, setPrefs] = useState<AccessibilityPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    let cancelled = false;

    readPrefs().then(next => {
      if (!cancelled) {
        setPrefs(next);
      }
    });

    const subscriptions = [
      subscribe('screenReaderChanged', 'screenReaderEnabled', setPrefs),
      subscribe('reduceMotionChanged', 'reduceMotionEnabled', setPrefs),
      subscribe('boldTextChanged', 'boldTextEnabled', setPrefs),
      subscribe('grayscaleChanged', 'grayscaleEnabled', setPrefs),
      subscribe('invertColorsChanged', 'invertColorsEnabled', setPrefs),
      subscribe('highTextContrastChanged', 'highTextContrastEnabled', setPrefs),
    ].filter((sub): sub is {remove: () => void} => sub !== null);

    return () => {
      cancelled = true;
      subscriptions.forEach(sub => sub.remove());
    };
  }, []);

  return prefs;
}

export function useReducedMotion(): boolean {
  return useAccessibilityPrefs().reduceMotionEnabled;
}

/** Dense chrome (tabs, sheet toolbars, header title). */
export const CHROME_MAX_FONT_MULTIPLIER = 1.35;
/** Body / form text. */
export const BODY_MAX_FONT_MULTIPLIER = 1.5;
