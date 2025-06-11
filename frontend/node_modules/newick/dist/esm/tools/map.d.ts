import { NewickNode } from '../types';
/**
 * Applies a callback to each node of a Newick tree, returning the modified tree.
 * @param tree - Newick string or tree object
 * @param callback - Function applied to each node
 * @returns Modified tree object
 */
export declare function map(tree: string | NewickNode, callback?: (node: NewickNode) => NewickNode): NewickNode;
