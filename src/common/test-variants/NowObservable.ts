import { type IObservable, Subject } from '@flemist/simple-utils'
import {
  type ITimeController,
  timeControllerDefault,
} from '@flemist/time-controller'

export class NowObservable implements IObservable<number> {
  private readonly _timeController: ITimeController
  private readonly _subject: Subject<number>
  private _interval: number
  private _timer: any

  constructor(interval: number, timeController?: null | ITimeController) {
    this._interval = interval
    this._timeController = timeController ?? timeControllerDefault
    this._subject = new Subject({
      startStopNotifier: () => {
        this.update()
        return () => {
          this._timeController.clearTimeout(this._timer)
        }
      },
    })
  }

  private update(): void {
    this._subject.emit(this._timeController.now())
    this._timer = this._timeController.setTimeout(
      () => this.update(),
      this._interval,
    )
  }

  get interval(): number {
    return this._interval
  }
  set interval(value: number) {
    this._interval = value
    if (this._timer) {
      this._timeController.clearTimeout(this._timer)
      this.update()
    }
  }

  subscribe(callback: (value: number) => void): () => void {
    return this._subject.subscribe(callback)
  }
}
