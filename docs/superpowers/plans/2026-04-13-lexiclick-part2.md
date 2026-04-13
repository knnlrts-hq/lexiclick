# Lexiclick Implementation Plan — Part 2: Core Logic

> **Continues from:** Part 1 (`2026-04-13-lexiclick-part1.md`) — Foundation & Worker (Tasks 1–2)
>
> **This file:** Core Logic — Tokenization & Normalization (Tasks 3–4)
>
> **Continues in:** Part 3 (`2026-04-13-lexiclick-part3.md`) — Frontend UI & Polish (Tasks 5–8)

---

## Task 3: TDD Tokenization

**Files:**
- Create: `tests/tokenize.test.js`
- Modify: `index.html` (replace `tokenize` stub with real implementation)

The tokenizer splits pasted text into an array of paragraphs, where each paragraph is an array of raw token strings. Whitespace splitting only — no grammar, no sentence detection.

**Data structure:**
```
tokenize("Hello world\n\nNew paragraph") → [["Hello", "world"], ["New", "paragraph"]]
```

Each inner array is one `<p>` in the reading view. Each string becomes one clickable `<span>`.

- [ ] **Step 1: Write tests in `tests/tokenize.test.js`**

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadCoreFunctions } from './setup.js';

const { tokenize } = loadCoreFunctions();

describe('tokenize', () => {
  it('splits text into words within a single paragraph', () => {
    assert.deepStrictEqual(tokenize('hello world'), [['hello', 'world']]);
  });

  it('splits paragraphs on double newlines', () => {
    assert.deepStrictEqual(
      tokenize('hello world\n\nnew paragraph'),
      [['hello', 'world'], ['new', 'paragraph']],
    );
  });

  it('treats 3+ newlines as one paragraph break', () => {
    assert.deepStrictEqual(
      tokenize('a\n\n\n\nb'),
      [['a'], ['b']],
    );
  });

  it('treats single newline as whitespace (not a paragraph break)', () => {
    assert.deepStrictEqual(
      tokenize('hello\nworld'),
      [['hello', 'world']],
    );
  });

  it('keeps punctuation attached to the word', () => {
    assert.deepStrictEqual(
      tokenize('hello, world!'),
      [['hello,', 'world!']],
    );
  });

  it('collapses multiple spaces between words', () => {
    assert.deepStrictEqual(
      tokenize('hello    world'),
      [['hello', 'world']],
    );
  });

  it('trims leading and trailing whitespace', () => {
    assert.deepStrictEqual(tokenize('  hello  '), [['hello']]);
  });

  it('returns empty array for empty string', () => {
    assert.deepStrictEqual(tokenize(''), []);
  });

  it('returns empty array for whitespace-only input', () => {
    assert.deepStrictEqual(tokenize('   \n\n   '), []);
  });

  it('handles single word', () => {
    assert.deepStrictEqual(tokenize('bonjour'), [['bonjour']]);
  });

  it('handles realistic French text', () => {
    const text = "Avant la découverte de l'Australie,\nl'Ancien Monde était convaincu.\n\nTous les cygnes étaient blancs.";
    const result = tokenize(text);
    assert.equal(result.length, 2);
    assert.equal(result[0].length, 9);
    assert.equal(result[0][0], 'Avant');
    assert.equal(result[0][5], "l'Australie,");
    assert.equal(result[1][0], 'Tous');
  });
});
```

**What each test verifies:**
- Basic splitting, paragraph detection, single-newline handling — the three tokenization rules from the spec
- Punctuation attachment — spec says `"convaincu,"` is one span
- Edge cases (empty, whitespace, single word) — prevents crashes on degenerate input
- Realistic French text — a smoke test with real content from the spec

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/tokenize.test.js`

Expected: All tests FAIL. The stub `tokenize()` returns `undefined`, so `assert.deepStrictEqual(undefined, [...])` fails.

- [ ] **Step 3: Implement `tokenize` in `index.html`**

In `index.html`, replace the stub `function tokenize() {}` with:

```js
  function tokenize(text) {
    return text
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p !== '')
      .map(p => p.split(/\s+/));
  }
```

How it works:
1. `.split(/\n\s*\n/)` — split on double newlines (with optional whitespace between) to get paragraphs
2. `.map(p => p.trim())` — clean whitespace from paragraph edges
3. `.filter(p => p !== '')` — drop empty paragraphs
4. `.map(p => p.split(/\s+/))` — split each paragraph into tokens on whitespace

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/tokenize.test.js`

Expected: All 11 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/tokenize.test.js index.html
git commit -m "feat: implement tokenization with tests"
```

---

## Task 4: TDD Normalization & URL Builders

**Files:**
- Create: `tests/normalize.test.js`
- Modify: `index.html` (replace stubs for `normalize`, `wiktionaryUrl`, `tatoebaProxyUrl`; add `LANGS` and `TATOEBA_PROXY` constants)

Normalization transforms a raw token (like `"l'Australie,"`) into a clean lookup term (like `"australie"`). The URL builders then construct the right Wiktionary/Tatoeba URLs for the current language.

**Pipeline:** strip punctuation → lowercase → strip French apostrophe prefixes → done.

- [ ] **Step 1: Write tests in `tests/normalize.test.js`**

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadCoreFunctions } from './setup.js';

const { normalize, wiktionaryUrl, tatoebaProxyUrl, LANGS } = loadCoreFunctions();

describe('normalize', () => {
  // --- Punctuation stripping ---
  it('strips trailing comma', () => {
    assert.equal(normalize('convaincu,', 'fr'), 'convaincu');
  });

  it('strips surrounding guillemets', () => {
    assert.equal(normalize('«croyance»', 'fr'), 'croyance');
  });

  it('strips leading parenthesis', () => {
    assert.equal(normalize('(très', 'fr'), 'très');
  });

  it('strips trailing ellipsis', () => {
    assert.equal(normalize('monde...', 'fr'), 'monde');
  });

  it('strips mixed punctuation on both sides', () => {
    assert.equal(normalize('"hello!"', 'fr'), 'hello');
  });

  // --- Lowercase ---
  it('lowercases words', () => {
    assert.equal(normalize('Australie', 'fr'), 'australie');
  });

  it('lowercases German words', () => {
    assert.equal(normalize('Welt', 'de'), 'welt');
  });

  // --- French apostrophe splitting ---
  it("strips l' prefix (French)", () => {
    assert.equal(normalize("l'Ancien", 'fr'), 'ancien');
  });

  it("strips d' prefix (French)", () => {
    assert.equal(normalize("d'autant", 'fr'), 'autant');
  });

  it("strips qu' prefix (French)", () => {
    assert.equal(normalize("qu'il", 'fr'), 'il');
  });

  it("strips j' prefix (French)", () => {
    assert.equal(normalize("j'ai", 'fr'), 'ai');
  });

  it("strips n' prefix (French)", () => {
    assert.equal(normalize("n'est", 'fr'), 'est');
  });

  it("strips s' prefix (French)", () => {
    assert.equal(normalize("s'il", 'fr'), 'il');
  });

  it("strips c' prefix (French)", () => {
    assert.equal(normalize("c'est", 'fr'), 'est');
  });

  it('handles curly apostrophe (U+2019)', () => {
    assert.equal(normalize("l\u2019ancien", 'fr'), 'ancien');
  });

  it('does NOT strip apostrophe prefixes in German', () => {
    assert.equal(normalize("l'ancien", 'de'), "l'ancien");
  });

  it("preserves aujourd'hui (not a prefix match)", () => {
    assert.equal(normalize("aujourd'hui", 'fr'), "aujourd'hui");
  });

  // --- Edge cases ---
  it('returns empty string for punctuation-only input', () => {
    assert.equal(normalize('...', 'fr'), '');
  });

  it('handles plain word with no punctuation', () => {
    assert.equal(normalize('bonjour', 'fr'), 'bonjour');
  });

  // --- Full pipeline (punctuation + lowercase + apostrophe) ---
  it('handles combined: punctuation + apostrophe + case', () => {
    assert.equal(normalize("«l'Ancien»", 'fr'), 'ancien');
  });
});

describe('wiktionaryUrl', () => {
  it('builds French URL (lowercase)', () => {
    assert.equal(
      wiktionaryUrl('convaincu', 'fr'),
      'https://fr.wiktionary.org/wiki/convaincu',
    );
  });

  it('builds German URL with first letter capitalized', () => {
    assert.equal(
      wiktionaryUrl('welt', 'de'),
      'https://de.wiktionary.org/wiki/Welt',
    );
  });

  it('encodes accented characters', () => {
    assert.equal(
      wiktionaryUrl('été', 'fr'),
      'https://fr.wiktionary.org/wiki/%C3%A9t%C3%A9',
    );
  });
});

describe('tatoebaProxyUrl', () => {
  it('builds French proxy URL with correct lang code', () => {
    const url = tatoebaProxyUrl('bonjour', 'fr');
    assert.ok(url.includes('q=bonjour'));
    assert.ok(url.includes('from=fra'));
    assert.ok(url.includes('to=eng'));
  });

  it('builds German proxy URL with correct lang code', () => {
    const url = tatoebaProxyUrl('hallo', 'de');
    assert.ok(url.includes('q=hallo'));
    assert.ok(url.includes('from=deu'));
    assert.ok(url.includes('to=eng'));
  });

  it('encodes special characters in query', () => {
    const url = tatoebaProxyUrl('aujourd\'hui', 'fr');
    assert.ok(url.includes("q=aujourd'hui") || url.includes('q=aujourd%27hui'));
  });
});

describe('LANGS config', () => {
  it('has French config', () => {
    assert.equal(LANGS.fr.wiktionary, 'fr.wiktionary.org');
    assert.equal(LANGS.fr.tatoeba, 'fra');
  });

  it('has German config', () => {
    assert.equal(LANGS.de.wiktionary, 'de.wiktionary.org');
    assert.equal(LANGS.de.tatoeba, 'deu');
  });
});
```

**What each test group verifies:**
- `normalize` — each step of the normalization pipeline individually, then combined; both languages; edge cases
- `wiktionaryUrl` — French=lowercase, German=capitalized first letter, accented chars encoded
- `tatoebaProxyUrl` — correct Tatoeba language codes (`fra`/`deu`), query encoding
- `LANGS config` — the language-to-API mapping table is correct

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/normalize.test.js`

Expected: All tests FAIL. The stubs return `undefined`.

- [ ] **Step 3: Implement in `index.html`**

In `index.html`, replace the contents of the `// === CORE LOGIC ===` block (everything between the markers) with:

```js
  const LANGS = {
    fr: { wiktionary: 'fr.wiktionary.org', tatoeba: 'fra' },
    de: { wiktionary: 'de.wiktionary.org', tatoeba: 'deu' },
  };

  const TATOEBA_PROXY = 'https://lexiclick-tatoeba.YOURACCOUNTHERE.workers.dev';

  function tokenize(text) {
    return text
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p !== '')
      .map(p => p.split(/\s+/));
  }

  function normalize(raw, lang) {
    let word = raw.replace(/^[\p{P}]+/u, '').replace(/[\p{P}]+$/u, '');
    if (word === '') return '';
    word = word.toLowerCase();
    if (lang === 'fr') {
      word = word.replace(/^(l|d|qu|j|n|s|c|m|t)['\u2019]/, '');
    }
    return word;
  }

  function wiktionaryUrl(word, lang) {
    const term = lang === 'de'
      ? word.charAt(0).toUpperCase() + word.slice(1)
      : word;
    return 'https://' + LANGS[lang].wiktionary + '/wiki/' + encodeURIComponent(term);
  }

  function tatoebaProxyUrl(word, lang) {
    return TATOEBA_PROXY + '/tatoeba?q=' + encodeURIComponent(word)
      + '&from=' + LANGS[lang].tatoeba + '&to=eng';
  }
```

**Keep the `tokenize` function** — it was implemented in Task 3. You're adding `LANGS`, `TATOEBA_PROXY`, `normalize`, `wiktionaryUrl`, and `tatoebaProxyUrl` around it.

How `normalize` works:
1. `raw.replace(/^[\p{P}]+/u, '')` — strip leading Unicode punctuation
2. `.replace(/[\p{P}]+$/u, '')` — strip trailing Unicode punctuation
3. `.toLowerCase()` — lowercase everything
4. French only: `.replace(/^(l|d|qu|j|n|s|c|m|t)['\u2019]/, '')` — strip common elision prefixes (handles both straight `'` and curly `'` apostrophes)

- [ ] **Step 4: Run ALL tests to verify they pass**

Run: `npm test`

Expected: All tests pass — tokenize (11 tests) + normalize (29 tests) + worker (7 tests) = 47 tests total.

- [ ] **Step 5: Commit**

```bash
git add tests/normalize.test.js index.html
git commit -m "feat: implement normalization and URL builders with tests"
```

---

**End of Part 2.** Continue with Part 3: `docs/superpowers/plans/2026-04-13-lexiclick-part3.md`
