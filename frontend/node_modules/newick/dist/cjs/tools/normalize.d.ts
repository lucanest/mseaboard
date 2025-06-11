import { NewickNode } from '../types';
/**
 * Normalize branch lengths of a Newick tree so total length sums to 1
 * @param s - Newick string or tree object
 * @returns Normalized tree object
 */
export declare function normalize(s: string | NewickNode): NewickNode;
