import { IAbortControllerFast, IAbortSignalFast } from './contracts';
export declare class AbortControllerFast implements IAbortControllerFast {
    readonly signal: IAbortSignalFast;
    constructor();
    abort(reason?: any): void;
}
