import { useState, useCallback } from 'react';

export interface RatingToastState {
  visible: boolean;
  taskId: string;
  score: number;
  maxScore?: number;
}

/**
 * useRatingToast Hook
 *
 * V4-UX-001: 管理 Rating Toast 状态
 *
 * 使用示例:
 * ```typescript
 * const { toastState, showRatingToast, hideRatingToast } = useRatingToast();
 *
 * // 任务完成后显示 Toast
 * showRatingToast('task-123', 4.5, 5);
 * ```
 */
export function useRatingToast() {
  const [toastState, setToastState] = useState<RatingToastState>({
    visible: false,
    taskId: '',
    score: 0,
    maxScore: 5,
  });

  const showRatingToast = useCallback(
    (taskId: string, score: number, maxScore: number = 5) => {
      setToastState({
        visible: true,
        taskId,
        score,
        maxScore,
      });
    },
    []
  );

  const hideRatingToast = useCallback(() => {
    setToastState((prev) => ({
      ...prev,
      visible: false,
    }));
  }, []);

  return {
    toastState,
    showRatingToast,
    hideRatingToast,
  };
}
