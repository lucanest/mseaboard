import { cast } from '../tools/cast';
import { getRoot } from '../tools/getRoot';
import { dfs } from '../tools/dfs';
import { map } from '../tools/map';
import { normalize } from '../tools/normalize';
import { serialize } from '../tools/serialize';
import { parse } from '../tools/parse';
export class Newick {
    constructor(data) {
        this.tree = cast(data);
    }
    getRoot() {
        return getRoot(this.tree);
    }
    dfs(callback) {
        return dfs(this.tree, callback);
    }
    map(callback) {
        this.tree = map(this.tree, callback);
    }
    normalize() {
        return normalize(this.tree);
    }
    serialize() {
        return serialize(this.tree);
    }
    toString() {
        return serialize(this.tree);
    }
    clone() {
        // Deep clone by serializing and reparsing
        return new Newick(this.serialize());
    }
    equal(anotherTree) {
        return (this.serialize().toLowerCase() === anotherTree.serialize().toLowerCase());
    }
    parse(string) {
        return parse(string);
    }
}
