export declare type IUnsubscribe = () => void;
export interface IEventTargetFast<TThis, TEvent> {
    subscribe(callback: (this: TThis, event: TEvent) => void): IUnsubscribe;
}
export interface IEventEmitterFast<TEvent> {
    emit(event: TEvent): void;
}
export declare type TAbortReason = any;
export interface IAbortSignalFast extends IEventTargetFast<IAbortSignalFast, TAbortReason> {
    readonly aborted: boolean;
    readonly reason: TAbortReason;
    throwIfAborted(): any;
}
export interface IAbortControllerFast {
    readonly signal: IAbortSignalFast;
    abort(reason: TAbortReason): void;
}
export interface IAbortSignalFastImpl extends IAbortSignalFast {
    abort(reason: TAbortReason): void;
}
