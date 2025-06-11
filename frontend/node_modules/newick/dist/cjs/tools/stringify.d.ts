import { NewickNode } from '../types';
/**
 * Converts a NewickNode tree to a full Newick string with trailing semicolon
 * @param node - Newick tree node
 * @returns Newick format string
 */
export declare function stringify(node: NewickNode): string;
