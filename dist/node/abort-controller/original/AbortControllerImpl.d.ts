import { AbortSignalImpl } from './AbortSignalImpl';
import { IAbortController } from '../contracts';
declare const kSignal: unique symbol;
declare class AbortController implements IAbortController {
    constructor();
    private readonly [kSignal];
    get signal(): AbortSignalImpl;
    abort(): void;
    abort(reason?: any): void;
}
export { AbortController as AbortControllerImpl };
