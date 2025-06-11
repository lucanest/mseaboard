"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Newick = void 0;
const cast_1 = require("../tools/cast");
const getRoot_1 = require("../tools/getRoot");
const dfs_1 = require("../tools/dfs");
const map_1 = require("../tools/map");
const normalize_1 = require("../tools/normalize");
const serialize_1 = require("../tools/serialize");
const parse_1 = require("../tools/parse");
class Newick {
    constructor(data) {
        this.tree = (0, cast_1.cast)(data);
    }
    getRoot() {
        return (0, getRoot_1.getRoot)(this.tree);
    }
    dfs(callback) {
        return (0, dfs_1.dfs)(this.tree, callback);
    }
    map(callback) {
        this.tree = (0, map_1.map)(this.tree, callback);
    }
    normalize() {
        return (0, normalize_1.normalize)(this.tree);
    }
    serialize() {
        return (0, serialize_1.serialize)(this.tree);
    }
    toString() {
        return (0, serialize_1.serialize)(this.tree);
    }
    clone() {
        // Deep clone by serializing and reparsing
        return new Newick(this.serialize());
    }
    equal(anotherTree) {
        return (this.serialize().toLowerCase() === anotherTree.serialize().toLowerCase());
    }
    parse(string) {
        return (0, parse_1.parse)(string);
    }
}
exports.Newick = Newick;
