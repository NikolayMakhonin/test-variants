import { IAbortSignal } from '../contracts';
interface _AbortSignal extends IAbortSignal {
}
declare const _AbortSignal: {
    new (): IAbortSignal;
    prototype: IAbortSignal;
};
export declare function createAbortSignal(): EventTarget;
export declare function abortSignalAbort(signal: IAbortSignal, reason: any): void;
export { _AbortSignal as AbortSignalImpl };
