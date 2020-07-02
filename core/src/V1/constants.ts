import { IbGib_V1 } from './types';

export const IB = 'ib';
export const GIB = 'gib';
export const ROOT: IbGib_V1 = { ib: IB, gib: GIB, }
export const IBGIB_DELIMITER = '^';
export const ROOT_ADDR = 'ib^gib'; // `${IB}${IBGIB_DELIMITER}${GIB}`;

/**
 * Some rel8ns should not be able to be renamed or removed.
 */
export const FORBIDDEN_RENAME_REMOVE_REL8N_NAMES = ['past', 'ancestor', 'dna'];