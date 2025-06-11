export function parse(s) {
    const ancestors = [];
    let tree = {};
    const tokens = s.split(/\s*([;(),:])\s*/);
    let subtree;
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        switch (token) {
            case '(': {
                // new branchset
                subtree = {};
                tree.branchset = [subtree];
                ancestors.push(tree);
                tree = subtree;
                break;
            }
            case ',': {
                // another branch
                subtree = {};
                const parent = ancestors[ancestors.length - 1];
                if (!parent.branchset) {
                    parent.branchset = [];
                }
                parent.branchset.push(subtree);
                tree = subtree;
                break;
            }
            case ')': {
                // close branch
                tree = ancestors.pop();
                break;
            }
            case ':':
                // length follows — handled in default
                break;
            default: {
                const prev = tokens[i - 1];
                if (prev === ')' || prev === '(' || prev === ',') {
                    tree.name = token;
                }
                else if (prev === ':') {
                    tree.length = parseFloat(token);
                }
                break;
            }
        }
    }
    return tree;
}
