import { TAbortReason } from './contracts';
export declare class AbortError extends Error {
    readonly reason?: TAbortReason;
    constructor(message?: string, reason?: TAbortReason);
}
