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
