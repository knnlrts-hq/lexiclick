# Lexiclick — Design Spec

**Date:** 2026-04-13
**Status:** Approved

## Overview

Lexiclick is a lightweight foreign-language reader app. The user pastes a text in French or German, and every word becomes clickable. Clicking a word opens a modal with example sentences from Tatoeba and a full Wiktionary page, helping the reader understand unfamiliar words in context.

## Goals

- Zero-friction reading experience: paste text, start clicking words
- Useful lookup results without leaving the page: example sentences + dictionary
- Minimal codebase: single HTML file for the frontend, ~30-line Cloudflare Worker for the backend proxy
- No build step, no framework, no bundler

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                  GitHub Pages                         │
│                                                       │
│  index.html (single file, inline JS + CSS)            │
│  ┌─────────────────────────────────────────────────┐  │
│  │  Language Toggle  [FR] [DE]                     │  │
│  │  Text Input Area (paste)                        │  │
│  │  Rendered Reading View (clickable word spans)   │  │
│  │  Modal Overlay (Tatoeba + Wiktionary results)   │  │
│  └─────────────────────────────────────────────────┘  │
└──────────────┬──────────────────────┬────────────────┘
               │                      │
               │ direct (CORS ok)     │ via proxy (CORS blocked)
               ▼                      ▼
    ┌──────────────────┐   ┌─────────────────────────┐
    │  fr.wiktionary   │   │  Cloudflare Worker       │
    │  de.wiktionary   │   │  (worker/worker.js)      │
    │  (iframe)        │   │        │                  │
    └──────────────────┘   │        ▼                  │
                           │  api.tatoeba.org          │
                           │  /v1/sentences            │
                           └─────────────────────────┘
```

### Deployable Artifacts

1. **`index.html`** → GitHub Pages. Served from repo root on `main` branch. No build step.
2. **`worker/worker.js`** → Cloudflare Workers. Deployed via `npx wrangler deploy`. Free tier.

### Why This Split

- **Wiktionary** (MediaWiki) explicitly allows unauthenticated cross-origin requests with `origin=*`. The frontend loads Wiktionary pages directly in an iframe — no API call needed.
- **Tatoeba** has a public read-only API on `/v1`, but its CORS policy is too restrictive for third-party web apps (reported and closed as "not planned"). A server-side proxy is required.

## Repository Structure

```
lexiclick/
├── index.html              # The app (single file, inline JS + CSS)
├── worker/
│   ├── worker.js           # Cloudflare Worker source
│   └── wrangler.toml       # Cloudflare Worker config
├── docs/
│   ├── superpowers/specs/  # Design specs
│   └── plans/              # Implementation plans
├── .gitignore
└── README.md
```

## Frontend UI

The app has three states: Input, Reading, and Modal.

### State 1: Input

```
┌─────────────────────────────────────────┐
│  Lexiclick                  [FR ▼] [DE] │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ Paste your text here...           │  │
│  │                                   │  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
│                                         │
│              [Start Reading]            │
│                                         │
└─────────────────────────────────────────┘
```

- Language toggle at top: FR / DE as a button group, active language highlighted
- Large textarea for pasting text
- "Start Reading" button transitions to reading view

### State 2: Reading

```
┌─────────────────────────────────────────┐
│  Lexiclick                  [FR ▼] [DE] │
│  [← New Text]                           │
├─────────────────────────────────────────┤
│                                         │
│  Du plumage des oiseaux                 │
│                                         │
│  Avant la découverte de l'Australie,    │
│  l'Ancien Monde était convaincu que     │
│  tous les cygnes sans exception         │
│  étaient blancs...                      │
│                                         │
└─────────────────────────────────────────┘
```

- Clean, book-like reading layout: generous line-height, comfortable margins
- Paragraph structure preserved from original text (double newlines → `<p>` boundaries)
- Each word wrapped in `<span class="word">` with subtle dotted underline on hover and pointer cursor
- Punctuation stays attached to the preceding word's span
- "New Text" link returns to input state
- Language toggle visible but switching re-tokenizes the text

### State 3: Modal (on word click)

```
┌─────────────────────────────────────────┐
│  ┌───────────────────────────────────┐  │
│  │  convaincu                    [X] │  │
│  ├───────────────────────────────────┤  │
│  │  Examples (Tatoeba)               │  │
│  │                                   │  │
│  │  • "Je suis convaincu qu'il a     │  │
│  │    raison."                       │  │
│  │    → "I'm convinced he's right."  │  │
│  │                                   │  │
│  │  • "Elle n'est pas convaincue."   │  │
│  │    → "She is not convinced."      │  │
│  │                                   │  │
│  ├───────────────────────────────────┤  │
│  │  Wiktionary                       │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │  (scrollable iframe,        │  │  │
│  │  │   full wiktionary page)     │  │  │
│  │  │  max-height: ~40% of modal  │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
│  (click outside / ESC to close)         │
└─────────────────────────────────────────┘
```

- Max-width: 600px, max-height: 70vh, centered with dimmed backdrop
- Headword displayed prominently at top with close button
- **Tatoeba section** (top): up to 5 example sentences, each showing source sentence and English translation. Request 5, display however many are returned (0–5)
- **Wiktionary section** (bottom): sandboxed iframe loading the word's Wiktionary page, scrollable, constrained to ~40% of modal height
- Both sections load independently with "Looking up..." placeholder while in flight
- Error states: "No examples found." for empty Tatoeba results, Wiktionary shows its own 404 page
- Dismiss: X button, click backdrop, or Escape key

### Styling Direction

- Clean, minimal, high readability
- Off-white background, dark text, generous spacing
- CSS custom properties for colors, fonts, spacing
- Responsive but primarily designed for desktop reading
- No external CSS framework — hand-written CSS

## Tokenization

Splits pasted text into clickable spans while preserving original formatting.

**Rules:**
1. Split on whitespace to get raw tokens
2. Preserve paragraph breaks: double newlines become `<p>` boundaries
3. Keep punctuation attached to the word: `"convaincu,"` is one span
4. Store the raw token: `<span class="word" data-raw="convaincu,">convaincu,</span>`

No sentence detection, no grammar parsing. Whitespace splitting and span wrapping only.

## Normalization

On word click, normalize the `data-raw` value before querying APIs.

**Steps (applied in order):**

1. **Strip leading/trailing punctuation:** `"convaincu,"` → `"convaincu"`, `«croyance»` → `"croyance"`, `"(très"` → `"très"`
2. **Lowercase:** `"Australie"` → `"australie"`
3. **French apostrophe splitting (lang=FR only):** Strip common prefixes: `l'`, `d'`, `qu'`, `j'`, `n'`, `s'`, `c'`, `m'`, `t'`. Only strip if content remains after the apostrophe. `"l'Ancien"` → `"ancien"`, `"d'autant"` → `"autant"`
4. **Result:** The normalized string is used for both Tatoeba and Wiktionary queries

**German capitalization handling:**
- For Wiktionary: capitalize the first letter (German nouns are capitalized; Wiktionary redirects lowercase to capitalized when the entry exists). No automatic fallback — cross-origin iframe content cannot be inspected.
- For Tatoeba: always use lowercase (full-text search is case-insensitive)

**What normalization does NOT handle (deferred to Phase 2):**
- Verb conjugation: `étaient` → `être`
- Plural forms: `blancs` → `blanc`, `oiseaux` → `oiseau`
- These degrade gracefully: Wiktionary often has redirects for inflected forms, Tatoeba does full-text search

## API Integration

### Wiktionary (direct from browser, via iframe)

Load the word's Wiktionary page directly in a sandboxed iframe.

**URL pattern:**
```
https://{lang}.wiktionary.org/wiki/{word}
```

**Examples:**
- French: `https://fr.wiktionary.org/wiki/convaincu`
- German: `https://de.wiktionary.org/wiki/Welt`

**Iframe configuration:**
- `sandbox="allow-scripts allow-same-origin"` — allows Wiktionary's JS for rendering, prevents navigation of parent page
- Constrained height with `overflow-y: scroll`
- If the page doesn't exist, Wiktionary shows its own "page not found" — no special error handling needed

**German capitalization handling:**
- For German: capitalize the first letter of the word for the iframe URL (German nouns are capitalized, and Wiktionary typically redirects lowercase to capitalized entries when they exist)
- If the capitalized form doesn't exist, Wiktionary displays its own search results page inside the iframe, which is still useful
- Cross-origin iframe content cannot be inspected, so automatic fallback is not feasible — the single capitalized attempt is the MVP behavior
- For French: always use lowercase

### Tatoeba (via Cloudflare Worker)

**Frontend request:**
```
GET https://{worker-url}/tatoeba?q={word}&from={lang_code}&to=eng
```

**Worker proxies to:**
```
GET https://api.tatoeba.org/v1/sentences?lang={from}&q={word}&trans_lang={to}&limit=5
```

**Tatoeba response structure (relevant fields):**
```json
{
  "results": [
    {
      "text": "Je suis convaincu qu'il a raison.",
      "translations": [
        [
          { "text": "I'm convinced he's right." }
        ]
      ]
    }
  ]
}
```

**Frontend extraction:**
- Iterate `results` (up to 5)
- Display `.text` as the source sentence
- Display `translations[0][0].text` as the English translation
- If a result has no translations, show source sentence with "No translation available"

### Language Configuration

| Setting | French | German |
|---------|--------|--------|
| Wiktionary host | `fr.wiktionary.org` | `de.wiktionary.org` |
| Tatoeba `from` lang | `fra` | `deu` |
| Tatoeba `to` lang | `eng` | `eng` |
| Apostrophe handling | Strip `l'`, `d'`, `qu'`, `j'`, `n'`, `s'`, `c'`, `m'`, `t'` | None |
| Wiktionary case | Lowercase | Capitalized first (no auto-fallback) |

## Cloudflare Worker

A transparent proxy that forwards requests to Tatoeba's API and adds CORS headers.

**Responsibilities:**
1. Receive request from frontend
2. Validate `q`, `from`, `to` query parameters
3. Forward to `https://api.tatoeba.org/v1/sentences`
4. Return the response with `Access-Control-Allow-Origin: *`
5. Set `Cache-Control` headers for repeated lookups

**Not included:** Rate limiting, authentication, logging, caching layer. Just fetch-and-forward with CORS.

**Config (`wrangler.toml`):**
- Worker name: `lexiclick-tatoeba`
- Entry point: `worker.js`
- Free tier

**Frontend constant:**
```javascript
const TATOEBA_PROXY = 'https://lexiclick-tatoeba.{account}.workers.dev';
```
Updated once after first deployment.

## Deployment

### GitHub Pages

- Source: `main` branch, root directory (`/`)
- No build step — GitHub Pages serves `index.html` directly
- The `worker/` directory is present in the repo but ignored by GitHub Pages (it only serves static files)

### Cloudflare Worker

- Deploy via `cd worker/ && npx wrangler deploy`
- Free tier (100k requests/day)
- Gets a `*.workers.dev` URL automatically

### No CI/CD

Both deployments are manual. Fine for a personal tool.

## Data Flow (Complete)

1. User selects language (FR/DE) and pastes text
2. User clicks "Start Reading"
3. Tokenizer splits text on whitespace, preserves paragraphs, wraps each token in `<span class="word" data-raw="...">`
4. User clicks a word
5. Normalize: strip punctuation → lowercase → split apostrophes (FR) → get lookup term
6. Fire two parallel requests:
   - **Wiktionary:** Set iframe `src` to `https://{lang}.wiktionary.org/wiki/{word}`
   - **Tatoeba:** `GET {worker-url}/tatoeba?q={word}&from={lang}&to=eng`
7. Display modal: Tatoeba examples on top (loading independently), Wiktionary iframe below (loading independently)
8. User reads results, closes modal, continues reading
9. User clicks another word — repeat from step 4

## Out of Scope (Future Phases)

These are explicitly not part of the MVP. They are documented here as the planned evolution path.

### Phase 2: Heuristic Lemmatization (fast-follow)

Basic suffix stripping rules for common French and German inflections. No external library — a small hand-rolled rule set of ~20 rules per language.

**Approach:**
1. Try the normalized form first against Wiktionary
2. If the Wiktionary iframe loads a "page not found," try stripped variants
3. Common rules: remove `-ent`, `-ait`, `-és`, `-ées` (FR verb/adjective endings), `-en`, `-er`, `-es` (DE noun/verb endings)

This covers a meaningful percentage of inflected forms without introducing a real lemmatizer.

### Phase 3: EPUB Support

File upload accepting `.epub` files with client-side parsing.

**Approach:**
- EPUB is a zip of XHTML files — parse using a library like epub.js or jszip + manual extraction
- Chapter-based navigation provides natural pagination (replaces the "render all at once" MVP approach)
- All processing in-memory, no server-side component
- The reading view gains prev/next chapter navigation

This phase naturally introduces the pagination UI deferred from the MVP.

### Phase 4: Additional Languages

Extend the language configuration mapping to support more languages.

**Easy additions (Latin script, similar tokenization):** Spanish, Italian, Portuguese, Dutch.

**Per-language config required:**
- Wiktionary subdomain (e.g., `es.wiktionary.org`)
- Tatoeba ISO 639-3 code (e.g., `spa`)
- Language-specific normalization rules (apostrophe handling, capitalization, etc.)

The language toggle evolves from a two-button group to a dropdown.

### Phase 5: Personal Vocabulary

Track which words the user has looked up.

**Approach:**
- Store looked-up words in `localStorage`
- Highlight previously-looked-up words differently in the reading view (e.g., faint background color)
- Provide a vocabulary list view with export (CSV or plain text)
- Optional: track lookup count per word, sort by frequency
