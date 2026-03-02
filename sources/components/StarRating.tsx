import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface StarRatingProps {
  /** Current rating value (0-5) */
  value: number;
  /** Callback when rating changes */
  onChange?: (rating: number) => void;
  /** Whether the rating is interactive */
  editable?: boolean;
  /** Size of each star */
  size?: number;
  /** Color of filled stars */
  filledColor?: string;
  /** Color of empty stars */
  emptyColor?: string;
  /** Whether to show half stars (for display only, not editing) */
  allowHalf?: boolean;
  /** Gap between stars */
  gap?: number;
}

/**
 * StarRating Component
 *
 * Interactive star rating input/display component.
 *
 * Usage:
 * ```tsx
 * // Interactive rating input
 * <StarRating value={rating} onChange={setRating} editable={true} />
 *
 * // Display only
 * <StarRating value={4} editable={false} size={24} />
 * ```
 */
export function StarRating({
  value = 0,
  onChange,
  editable = true,
  size = 24,
  filledColor = '#FFD700',
  emptyColor = '#CCCCCC',
  allowHalf = false,
  gap = 4,
}: StarRatingProps) {
  const handlePress = (rating: number) => {
    if (editable && onChange) {
      // If tapping the same star, toggle between full and nothing
      // Otherwise set to the tapped star
      if (value === rating) {
        onChange(rating - 1);
      } else {
        onChange(rating);
      }
    }
  };

  const renderStar = (index: number) => {
    const starValue = index + 1;
    const isFilled = value >= starValue;
    const isHalfFilled = allowHalf && !isFilled && value > index && value < starValue;

    return (
      <Pressable
        key={index}
        onPress={() => editable ? handlePress(starValue) : undefined}
        disabled={!editable}
        style={({ pressed }) => [
          styles.star,
          { marginRight: gap },
          pressed && editable && styles.pressed,
        ]}
        hitSlop={8}
      >
        <Ionicons
          name={isFilled || isHalfFilled ? 'star' : 'star-outline'}
          size={size}
          color={isFilled || isHalfFilled ? filledColor : emptyColor}
          style={isHalfFilled ? styles.halfStar : undefined}
        />
      </Pressable>
    );
  };

  return (
    <View style={styles.container} accessibilityLabel={`Rating: ${value} out of 5 stars`}>
      {[0, 1, 2, 3, 4].map(renderStar)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    padding: 2,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.9 }],
  },
  halfStar: {
    // For future half-star support
  },
});
