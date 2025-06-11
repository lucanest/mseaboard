"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringify = stringify;
const serialize_1 = require("./serialize");
/**
 * Converts a NewickNode tree to a full Newick string with trailing semicolon
 * @param node - Newick tree node
 * @returns Newick format string
 */
function stringify(node) {
    return `${(0, serialize_1.serialize)(node)};`;
}
