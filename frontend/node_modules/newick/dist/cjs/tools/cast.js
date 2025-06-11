"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cast = cast;
const parse_1 = require("./parse");
/**
 * Casts a Newick string or an object (stringified or not) to a tree object.
 * Accepts: Newick string, stringified JSON, or a NewickNode object.
 */
function cast(input) {
    if (typeof input === 'string') {
        try {
            return JSON.parse(input);
        }
        catch {
            return (0, parse_1.parse)(input);
        }
    }
    return input;
}
