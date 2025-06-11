import { NewickNode } from '../types';
/**
 * Performs depth-first traversal of a Newick tree.
 * Returns a flat object mapping node names to branch lengths.
 *
 * @param tree - Newick tree or string
 * @param nodeCallback - Optional callback applied to each node
 * @returns Object mapping node names to branch lengths
 */
export declare function dfs(tree: string | NewickNode, nodeCallback?: (node: NewickNode) => NewickNode): Record<string, number>;
