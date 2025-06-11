import { cast } from './cast';
import { dfs } from './dfs';
/**
 * Applies a callback to each node of a Newick tree, returning the modified tree.
 * @param tree - Newick string or tree object
 * @param callback - Function applied to each node
 * @returns Modified tree object
 */
export function map(tree, callback = (e) => e) {
    const castedTree = cast(tree);
    // The original code had dfs(tree, null, callback)
    // Our dfs only accepts (tree, nodeCallback)
    dfs(castedTree, callback);
    return castedTree;
}
