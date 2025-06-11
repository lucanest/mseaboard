"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalize = normalize;
const cast_1 = require("./cast");
const dfs_1 = require("./dfs");
/**
 * Normalize branch lengths of a Newick tree so total length sums to 1
 * @param s - Newick string or tree object
 * @returns Normalized tree object
 */
function normalize(s) {
    const tree = (0, cast_1.cast)(s);
    function _local_normalize(tree) {
        const vertex = (0, dfs_1.dfs)(tree);
        const total = Object.values(vertex).reduce((acc, len) => acc + len, 0);
        // Defensive: avoid division by zero
        if (total === 0)
            return tree;
        // Here dfs takes two params: tree and optional nodeCallback
        (0, dfs_1.dfs)(tree, (e) => {
            if (typeof e.length === 'number') {
                e.length = e.length / total;
            }
            return e;
        });
        return tree;
    }
    return _local_normalize(tree);
}
