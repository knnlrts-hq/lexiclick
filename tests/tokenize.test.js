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
    assert.equal(result[0][4], "l'Australie,");
    assert.equal(result[1][0], 'Tous');
  });
});
