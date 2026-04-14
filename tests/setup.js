import { readFileSync } from 'node:fs';

export function loadCoreFunctions() {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const match = html.match(/\/\/ === CORE LOGIC ===\n([\s\S]*?)\/\/ === END CORE LOGIC ===/);
  if (!match) throw new Error('Could not find CORE LOGIC block in index.html');

  const exports = [
    'LANGS',
    'tokenize', 'normalize', 'wiktionaryUrl', 'tatoebaUrl',
  ];
  const returnExpr = exports
    .map(name => `${name}: typeof ${name} !== 'undefined' ? ${name} : undefined`)
    .join(', ');

  const fn = new Function(match[1] + `\nreturn { ${returnExpr} };`);
  return fn();
}
