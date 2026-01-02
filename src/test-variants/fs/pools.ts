import { IPool, Pool } from '@flemist/time-limits'
import os from 'node:os'

/** @deprecated Use @flemist/simple-utils */
export const poolFs: IPool = new Pool(os.cpus().length)
