import LottieView from 'lottie-react-native';
import React from 'react';
import {StyleSheet, View} from 'react-native';

import {EmojiIcon, useReducedMotion} from './ui';

const lockAnimation = require('../../assets/animations/lock.json');

const SIZE = 140;

export function LockAnimation() {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <View
        style={styles.staticWrap}
        accessibilityElementsHidden
        importantForAccessibility="no">
        <EmojiIcon emoji="🔒" size={64} />
      </View>
    );
  }

  return (
    <View
      style={styles.lottie}
      accessibilityElementsHidden
      importantForAccessibility="no">
      <LottieView
        source={lockAnimation}
        autoPlay
        loop
        style={styles.lottieFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  lottie: {
    width: SIZE,
    height: SIZE,
    marginBottom: 4,
  },
  lottieFill: {
    width: SIZE,
    height: SIZE,
  },
  staticWrap: {
    width: SIZE,
    height: SIZE,
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
