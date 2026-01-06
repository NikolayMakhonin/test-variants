don't use setTimeout/setInterval/Date.now() etc directly - use timeController, it allow you to test all time related cases with maximum performance, because it allows you manually control the time

import type {
  ITimeController,
  TimeControllerMock, // manually control only
  timeControllerDefault, // based on setTimeout
} from '@flemist/time-controller'
import { delay, waitMicrotasks } from '@flemist/async-utils'

const timeController = new TimeControllerMock()

export declare function delay(milliseconds: number, abortSignal?: IAbortSignalFast, timeController?: ITimeController): Promise<void>;

export declare function waitMicrotasks(abortSignalOrPromise?: null | IAbortSignalFast | PromiseLike<any>): Promise<void>;

export interface ITimeController<THandle = any> {
  now(): number;
  /**
   * Auto-incrementing timestamp
   * @return a value greater than now() by at least 1 and greater than previous nowUnique() by exactly 1
   */
  nowUnique(): number;
  setTimeout(handler: () => void, timeout: number): THandle;
  clearTimeout(handle: THandle): void;
}

options: {
  timeController?: null | ITimeController // if null use timeControllerDefault
}

await delay(1, void 0, timeController) // wait for time using timeController
timeController.addTime(1)
timeController.now() // instead of Date.now()
await waitMicrotasks() // wait all promises after change timeController time
