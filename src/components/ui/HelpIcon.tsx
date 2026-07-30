import React from 'react';
import {View} from 'react-native';
import Svg, {Circle, Path} from 'react-native-svg';

interface HelpIconProps {
  size?: number;
  color: string;
}

/**
 * Circled question mark — standard help affordance (iOS/Material).
 * Drawn with paths so size scales cleanly (SvgText + viewBox breaks sizing).
 */
export function HelpIcon({size = 40, color}: HelpIconProps) {
  const stroke = 1.75;

  return (
    <View
      style={{width: size, height: size}}
      accessibilityElementsHidden
      importantForAccessibility="no">
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle
          cx="12"
          cy="12"
          r={11 - stroke / 2}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
        />
        {/* Question-mark stem + curve */}
        <Path
          d="M9.2 9.1c0-1.85 1.4-3.1 2.95-3.1 1.55 0 2.85 1.15 2.85 2.75 0 1.15-.55 1.85-1.45 2.45-.85.55-1.25 1-1.25 1.85v.45"
          stroke={color}
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Dot */}
        <Circle cx="12" cy="17.35" r="1.15" fill={color} />
      </Svg>
    </View>
  );
}
