"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.map = map;
const cast_1 = require("./cast");
const dfs_1 = require("./dfs");
/**
 * Applies a callback to each node of a Newick tree, returning the modified tree.
 * @param tree - Newick string or tree object
 * @param callback - Function applied to each node
 * @returns Modified tree object
 */
function map(tree, callback = (e) => e) {
    const castedTree = (0, cast_1.cast)(tree);
    // The original code had dfs(tree, null, callback)
    // Our dfs only accepts (tree, nodeCallback)
    (0, dfs_1.dfs)(castedTree, callback);
    return castedTree;
}
