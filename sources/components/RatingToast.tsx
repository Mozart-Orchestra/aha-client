import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export interface RatingToastProps {
  visible: boolean;
  taskId: string;
  score: number;
  maxScore?: number;
  onClose: () => void;
  autoDismissMs?: number;
}

/**
 * RatingToast Component
 *
 * V4-UX-001: 评分完成 Toast 通知
 *
 * 验收标准:
 * - [x] 任务完成时显示 Toast
 * - [x] Toast 包含评分和快捷入口
 * - [x] Toast 在 5 秒后自动消失
 * - [x] 支持手动关闭
 * - [ ] Typecheck passes
 */
export function RatingToast({
  visible,
  taskId,
  score,
  maxScore = 5,
  onClose,
  autoDismissMs = 5000,
}: RatingToastProps) {
  const router = useRouter();
  const [fadeAnim] = useState(new Animated.Value(0));

  // Auto-dismiss logic
  useEffect(() => {
    if (visible) {
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        handleClose();
      }, autoDismissMs);

      return () => clearTimeout(timer);
    } else {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const handleViewDetails = () => {
    // Navigate to task rating details
    router.push(`/task/${taskId}/rating`);
    handleClose();
  };

  if (!visible) {
    return null;
  }

  // Generate star icons based on score
  const stars = [];
  for (let i = 1; i <= maxScore; i++) {
    stars.push(
      <Ionicons
        key={i}
        name={i <= score ? 'star' : 'star-outline'}
        size={16}
        color="#FFD700"
      />
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>评分完成</Text>
          <View style={styles.scoreContainer}>
            {stars}
            <Text style={styles.scoreText}>
              {score.toFixed(1)}/{maxScore}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable onPress={handleViewDetails} style={styles.detailsButton}>
            <Text style={styles.detailsButtonText}>查看详情</Text>
          </Pressable>

          <Pressable onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={20} color="#999" />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  content: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  detailsButton: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
  },
  detailsButtonText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '500',
  },
  closeButton: {
    padding: 4,
  },
});
