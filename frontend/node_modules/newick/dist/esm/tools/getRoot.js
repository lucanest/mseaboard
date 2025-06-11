import { cast } from './cast';
/**
 * Returns the name of the root node of a Newick tree
 * @param tree - Newick string or tree object
 * @returns Root node name or null
 */
export function getRoot(tree) {
    const obj = cast(tree);
    if (typeof obj.name === 'string') {
        if (obj.name === '') {
            return null;
        }
        return obj.name;
    }
    return null;
}
