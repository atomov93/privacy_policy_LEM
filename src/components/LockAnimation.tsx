import LottieView from 'lottie-react-native';
import React from 'react';
import {StyleSheet} from 'react-native';

const lockAnimation = require('../../assets/animations/lock.json');

const SIZE = 140;

export function LockAnimation() {
  return (
    <LottieView
      source={lockAnimation}
      autoPlay
      loop
      style={styles.lottie}
    />
  );
}

const styles = StyleSheet.create({
  lottie: {
    width: SIZE,
    height: SIZE,
    marginBottom: 4,
  },
});
