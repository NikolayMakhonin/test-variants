import { IAbortSignalFastImpl, IUnsubscribe, TAbortReason } from './contracts';
declare type Callback<TThis> = (this: TThis, reason: TAbortReason) => void;
export declare class AbortSignalFast implements IAbortSignalFastImpl {
    aborted: boolean;
    reason: any;
    private _callbacks;
    constructor();
    subscribe(callback: Callback<this>): IUnsubscribe;
    abort(reason: TAbortReason): void;
    throwIfAborted(): void;
}
export {};
