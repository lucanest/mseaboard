import { cast } from './cast';
import { dfs } from './dfs';
/**
 * Normalize branch lengths of a Newick tree so total length sums to 1
 * @param s - Newick string or tree object
 * @returns Normalized tree object
 */
export function normalize(s) {
    const tree = cast(s);
    function _local_normalize(tree) {
        const vertex = dfs(tree);
        const total = Object.values(vertex).reduce((acc, len) => acc + len, 0);
        // Defensive: avoid division by zero
        if (total === 0)
            return tree;
        // Here dfs takes two params: tree and optional nodeCallback
        dfs(tree, (e) => {
            if (typeof e.length === 'number') {
                e.length = e.length / total;
            }
            return e;
        });
        return tree;
    }
    return _local_normalize(tree);
}
