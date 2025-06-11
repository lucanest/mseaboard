import { NewickNode } from '../types';
/**
 * Recursively serialize a NewickNode tree into a Newick-format string (without trailing semicolon)
 * @param node - Newick tree node
 * @returns Newick string for the node subtree
 */
export declare function serialize(node: NewickNode): string;
