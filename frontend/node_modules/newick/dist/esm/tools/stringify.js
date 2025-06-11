import { serialize } from './serialize';
/**
 * Converts a NewickNode tree to a full Newick string with trailing semicolon
 * @param node - Newick tree node
 * @returns Newick format string
 */
export function stringify(node) {
    return `${serialize(node)};`;
}
