import { IAbortControllerFast, IAbortSignalFast } from './contracts';
import { IAbortController, IAbortSignal } from '../contracts';
export declare function toAbortSignal(abortSignalFast: IAbortSignalFast): IAbortSignal;
export declare function toAbortSignalFast(abortSignal: IAbortSignal): IAbortSignalFast;
export declare function toAbortController(abortControllerFast: IAbortControllerFast): IAbortController;
export declare function toAbortControllerFast(abortController: IAbortController): IAbortControllerFast;
