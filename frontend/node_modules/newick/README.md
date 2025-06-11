# newick

<img src="./assets/logo.png" width="256">

A lightweight and TypeScript-friendly library to parse, manipulate, and serialize trees in the [Newick format](https://en.wikipedia.org/wiki/Newick_format). Includes an OOP interface for clean and composable workflows.

## ✨ Features

- Parse and serialize Newick trees
- Traverse and map with callbacks
- Normalize branch lengths
- Compare and clone trees
- Type-safe API (written in TypeScript)

---

## 📦 Installation

```bash
npm install newick
```
Or via yarn:

```bash
yarn add newick
```

## 🔧 Usage

```ts
import { Newick } from 'newick';

const input = '(A:0.1,B:0.2)Root;';
const tree = new Newick(input);

console.log(tree.getRoot()); // "Root"

tree.map(node => {
  node.name = node.name?.toUpperCase();
  
  return node;
});

console.log(tree.serialize()); // "(A:0.1,B:0.2)ROOT"
console.log(tree.toString());  // Same as serialize
```

### 📚 API

#### 🌳 Newick class

```ts
new Newick(data: string | NewickNode)
```
Creates a new `Newick` instance from a Newick string or a tree object.

```ts
getRoot(): string | null
```
Returns the name of the root node, or `null` if not present.

```ts
dfs(callback?: (node: NewickNode) => NewickNode): Record<string, number>
```
Performs a depth-first traversal of the tree.
- `callback` (optional): applied to each node. 
- Returns a map of node names to branch lengths.

```ts
map(callback: (node: NewickNode) => NewickNode): void
```
Applies a callback to each node in-place, mutating the tree.

```ts
normalize(): NewickNode
```
Normalizes all branch lengths so they sum to 1. Returns the normalized tree.

```ts
serialize(): string
```
Serializes the tree to a valid Newick-format string without a trailing semicolon.

```ts
toString(): string
```
Alias for `serialize()`.

```ts
clone(): Newick
```
Creates a deep clone of the current tree.

```ts
equal(anotherTree: Newick): boolean
```
Returns `true` if another `Newick` instance is structurally equal (case-insensitive).

```ts
parse(input: string): NewickNode
```
Parses a Newick string into a `NewickNode` tree object.

## 🧪 Testing
```bash
npm test
```
Tests are written using [Jest](https://jestjs.io/).

## 📄 License
MIT © Kir Tribunsky