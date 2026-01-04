import type { ITimeController } from '@flemist/time-controller'

/** Check if time limit exceeded */
export function isTimeLimitExceeded(
  timeController: ITimeController,
  startTime: number,
  limitTime: number | null | undefined,
): boolean {
  return limitTime != null && timeController.now() - startTime >= limitTime
}
