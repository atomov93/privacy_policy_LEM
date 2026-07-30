import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  BODY_MAX_FONT_MULTIPLIER,
  CHROME_MAX_FONT_MULTIPLIER,
  useReducedMotion,
} from './ui/accessibility';
import {Button, EmojiIcon, useTheme} from './ui';
import {MIN_TOUCH_TARGET} from './ui/theme';

const STEPS = [
  {
    icon: '🔐',
    titleKey: 'tutorial.welcomeTitle',
    bodyKey: 'tutorial.welcomeBody',
  },
  {
    icon: '🔑',
    titleKey: 'tutorial.keysTitle',
    bodyKey: 'tutorial.keysBody',
  },
  {
    icon: '✉️',
    titleKey: 'tutorial.encryptTitle',
    bodyKey: 'tutorial.encryptBody',
  },
  {
    icon: '✅',
    titleKey: 'tutorial.verifyTitle',
    bodyKey: 'tutorial.verifyBody',
  },
] as const;

/** Keep icon + copy block anchored; text length must not shift layout. */
const TEXT_BLOCK_MIN_HEIGHT = 168;
const SLIDE_DISTANCE = 28;
const EXIT_MS = 180;
const ENTER_MS = 260;

function resolveTopInset(top: number): number {
  if (Platform.OS === 'android') {
    return Math.max(top, StatusBar.currentHeight ?? 24);
  }
  return Math.max(top, 59);
}

interface OnboardingTutorialProps {
  visible: boolean;
  onComplete: () => void;
}

function TutorialContent({
  visible,
  onComplete,
}: OnboardingTutorialProps) {
  const {colors} = useTheme();
  const {t} = useTranslation();
  const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const [stepIndex, setStepIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const isLast = stepIndex === STEPS.length - 1;
  const step = STEPS[stepIndex];

  const topInset = resolveTopInset(insets.top);
  const bottomInset = Math.max(insets.bottom, 12);
  const sideInset = Math.max(insets.left, insets.right, 20);

  useEffect(() => {
    if (!visible) {
      setStepIndex(0);
      setAnimating(false);
      opacity.setValue(1);
      translateX.setValue(0);
      return;
    }
    const announcement = t('tutorial.stepOf', {
      current: stepIndex + 1,
      total: STEPS.length,
    });
    AccessibilityInfo.announceForAccessibility(
      `${announcement}. ${t(step.titleKey)}. ${t(step.bodyKey)}`,
    );
  }, [visible, stepIndex, step, t, opacity, translateX]);

  const finish = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const changeStep = useCallback(
    (nextIndex: number) => {
      if (nextIndex === stepIndex || animating) {
        return;
      }
      if (reduceMotion) {
        setStepIndex(nextIndex);
        return;
      }

      const direction = nextIndex > stepIndex ? 1 : -1;
      setAnimating(true);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: EXIT_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: -direction * SLIDE_DISTANCE,
          duration: EXIT_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({finished}) => {
        if (!finished) {
          setAnimating(false);
          return;
        }

        setStepIndex(nextIndex);
        translateX.setValue(direction * SLIDE_DISTANCE);

        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: ENTER_MS,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: 0,
            duration: ENTER_MS,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start(() => {
          setAnimating(false);
        });
      });
    },
    [animating, opacity, reduceMotion, stepIndex, translateX],
  );

  const goNext = useCallback(() => {
    if (isLast) {
      finish();
      return;
    }
    changeStep(Math.min(stepIndex + 1, STEPS.length - 1));
  }, [changeStep, finish, isLast, stepIndex]);

  const goBack = useCallback(() => {
    changeStep(Math.max(stepIndex - 1, 0));
  }, [changeStep, stepIndex]);

  const dots = useMemo(
    () =>
      STEPS.map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            {
              backgroundColor:
                index === stepIndex ? colors.securityTint : colors.fill,
            },
          ]}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      )),
    [colors.fill, colors.securityTint, stepIndex],
  );

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <View
        style={[
          styles.toolbar,
          {
            paddingTop: topInset + 10,
            paddingLeft: sideInset,
            paddingRight: sideInset,
          },
        ]}>
        <Pressable
          onPress={finish}
          accessibilityRole="button"
          accessibilityLabel={t('tutorial.skipA11y')}
          hitSlop={12}
          style={({pressed}) => [
            styles.skipButton,
            {opacity: pressed ? 0.6 : 1},
          ]}>
          <Text
            style={[styles.skipText, {color: colors.securityTint}]}
            maxFontSizeMultiplier={CHROME_MAX_FONT_MULTIPLIER}>
            {t('tutorial.skip')}
          </Text>
        </Pressable>
      </View>

      <View style={styles.content} importantForAccessibility="yes">
        <Text
          style={[styles.progress, {color: colors.tertiaryLabel}]}
          accessibilityLiveRegion="polite"
          maxFontSizeMultiplier={CHROME_MAX_FONT_MULTIPLIER}>
          {t('tutorial.stepOf', {
            current: stepIndex + 1,
            total: STEPS.length,
          })}
        </Text>

        <Animated.View
          style={[
            styles.stepBody,
            {
              opacity,
              transform: [{translateX}],
            },
          ]}>
          <View
            style={[
              styles.iconWrap,
              {backgroundColor: colors.securityBackground},
            ]}
            accessibilityElementsHidden
            importantForAccessibility="no">
            <EmojiIcon emoji={step.icon} size={48} />
          </View>

          <View style={styles.textBlock}>
            <Text
              style={[styles.title, {color: colors.label}]}
              accessibilityRole="header"
              maxFontSizeMultiplier={BODY_MAX_FONT_MULTIPLIER}>
              {t(step.titleKey)}
            </Text>
            <Text
              style={[styles.body, {color: colors.secondaryLabel}]}
              maxFontSizeMultiplier={BODY_MAX_FONT_MULTIPLIER}>
              {t(step.bodyKey)}
            </Text>
          </View>
        </Animated.View>

        <View style={styles.contentSpacer} />

        <View style={styles.dots} accessibilityElementsHidden>
          {dots}
        </View>
      </View>

      <View
        style={[
          styles.footer,
          {
            paddingLeft: sideInset,
            paddingRight: sideInset,
            paddingBottom: bottomInset + 8,
          },
        ]}>
        {stepIndex > 0 ? (
          <Button
            title={t('tutorial.back')}
            variant="secondary"
            onPress={goBack}
            flex
            disabled={animating}
            accessibilityLabel={t('tutorial.backA11y')}
          />
        ) : (
          <View style={styles.footerSpacer} />
        )}
        <Button
          title={isLast ? t('tutorial.getStarted') : t('tutorial.next')}
          variant="primary"
          onPress={goNext}
          flex
          disabled={animating}
          accessibilityLabel={
            isLast ? t('tutorial.getStartedA11y') : t('tutorial.nextA11y')
          }
        />
      </View>
    </View>
  );
}

export function OnboardingTutorial({
  visible,
  onComplete,
}: OnboardingTutorialProps) {
  const reduceMotion = useReducedMotion();

  return (
    <Modal
      visible={visible}
      animationType={reduceMotion ? 'none' : 'fade'}
      transparent={false}
      statusBarTranslucent
      onRequestClose={onComplete}
      accessibilityViewIsModal>
      <SafeAreaProvider>
        <TutorialContent visible={visible} onComplete={onComplete} />
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  toolbar: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  skipButton: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
  },
  skipText: {
    fontSize: 17,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 12,
    alignItems: 'center',
  },
  progress: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 20,
    letterSpacing: 0.2,
  },
  stepBody: {
    width: '100%',
    alignItems: 'center',
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  textBlock: {
    minHeight: TEXT_BLOCK_MIN_HEIGHT,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.28,
  },
  body: {
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center',
  },
  contentSpacer: {
    flex: 1,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
  },
  footerSpacer: {
    flex: 1,
  },
});
