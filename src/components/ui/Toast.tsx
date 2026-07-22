import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {Animated, Modal, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useTheme} from './theme';

interface ToastContextValue {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({children}: {children: React.ReactNode}) {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (text: string) => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
      }
      setMessage(text);
      opacity.setValue(0);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      hideTimer.current = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(({finished}) => {
          if (finished) {
            setMessage(null);
          }
        });
      }, 1800);
    },
    [opacity],
  );

  useEffect(() => {
    return () => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
      }
    };
  }, []);

  return (
    <ToastContext.Provider value={{showToast}}>
      {children}
      {/* Modal so the toast appears above other RN Modals (copy/paste sheets). */}
      <Modal
        transparent
        visible={message != null}
        animationType="none"
        statusBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={() => {}}>
        <View style={styles.overlay} pointerEvents="box-none">
          {message ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.toast,
                {
                  bottom: insets.bottom + 72,
                  backgroundColor: colors.label,
                  opacity,
                },
              ]}
              accessibilityLiveRegion="polite"
              accessibilityRole="alert">
              <Text
                style={[styles.toastText, {color: colors.groupedBackground}]}>
                {message}
              </Text>
            </Animated.View>
          ) : null}
        </View>
      </Modal>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  toastText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
