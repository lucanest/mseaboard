"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRoot = getRoot;
const cast_1 = require("./cast");
/**
 * Returns the name of the root node of a Newick tree
 * @param tree - Newick string or tree object
 * @returns Root node name or null
 */
function getRoot(tree) {
    const obj = (0, cast_1.cast)(tree);
    if (typeof obj.name === 'string') {
        if (obj.name === '') {
            return null;
        }
        return obj.name;
    }
    return null;
}
