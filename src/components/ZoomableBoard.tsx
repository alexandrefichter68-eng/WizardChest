import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const MIN_SCALE = 1;
const MAX_SCALE = 2.5;

function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

/**
 * Wraps the board with pinch-to-zoom and two-finger pan. Deliberately requires 2+ pointers for
 * both gestures, so it never competes with the board's own single-finger tap/drag-and-drop
 * gesture for pieces.
 */
export function ZoomableBoard({ size, children }: { size: number; children: ReactNode }) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const maxTranslate = (currentScale: number) => (size * (currentScale - 1)) / 2;

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = clamp(savedScale.value * event.scale, MIN_SCALE, MAX_SCALE);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      const bound = maxTranslate(scale.value);
      translateX.value = withSpring(clamp(translateX.value, -bound, bound));
      translateY.value = withSpring(clamp(translateY.value, -bound, bound));
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const panGesture = Gesture.Pan()
    .minPointers(2)
    .onUpdate((event) => {
      const bound = maxTranslate(scale.value);
      translateX.value = clamp(savedTranslateX.value + event.translationX, -bound, bound);
      translateY.value = clamp(savedTranslateY.value + event.translationY, -bound, bound);
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(250)
    .onEnd(() => {
      scale.value = withSpring(1);
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      savedScale.value = 1;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture, doubleTapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <View style={[styles.clip, { width: size, height: size }]}>
        <Animated.View style={animatedStyle}>{children}</Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'visible',
  },
});
