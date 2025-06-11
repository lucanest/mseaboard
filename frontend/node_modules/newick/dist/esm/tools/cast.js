import { parse } from './parse';
/**
 * Casts a Newick string or an object (stringified or not) to a tree object.
 * Accepts: Newick string, stringified JSON, or a NewickNode object.
 */
export function cast(input) {
    if (typeof input === 'string') {
        try {
            return JSON.parse(input);
        }
        catch {
            return parse(input);
        }
    }
    return input;
}
