"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serialize = serialize;
/**
 * Recursively serialize a NewickNode tree into a Newick-format string (without trailing semicolon)
 * @param node - Newick tree node
 * @returns Newick string for the node subtree
 */
function serialize(node) {
    let newick = '';
    if (node.branchset && node.branchset.length > 0) {
        newick += `(${node.branchset.map(serialize).join(',')})`;
    }
    if (node.name) {
        newick += node.name;
    }
    if (typeof node.length === 'number') {
        newick += `:${node.length}`;
    }
    return newick;
}
