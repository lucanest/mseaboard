import { NewickNode } from '../types';
/**
 * Casts a Newick string or an object (stringified or not) to a tree object.
 * Accepts: Newick string, stringified JSON, or a NewickNode object.
 */
export declare function cast(input: string | NewickNode): NewickNode;
