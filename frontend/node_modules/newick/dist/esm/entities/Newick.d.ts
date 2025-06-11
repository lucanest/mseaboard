import { NewickNode } from '../types';
export declare class Newick {
    private tree;
    constructor(data: string | NewickNode);
    getRoot(): string | null;
    dfs(callback?: (node: NewickNode) => NewickNode): Record<string, number>;
    map(callback?: (node: NewickNode) => NewickNode): void;
    normalize(): NewickNode;
    serialize(): string;
    toString(): string;
    clone(): Newick;
    equal(anotherTree: Newick): boolean;
    parse(string: string): NewickNode;
}
