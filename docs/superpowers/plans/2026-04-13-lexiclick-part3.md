# Lexiclick Implementation Plan — Part 3: Frontend UI & Polish

> **Continues from:** Part 2 (`2026-04-13-lexiclick-part2.md`) — Core Logic (Tasks 3–4)
>
> **This file:** Frontend UI & Polish (Tasks 5–8)

**Prerequisites:** Before starting this part, all unit tests from Parts 1–2 must pass (`npm test` → 47 tests green).

---

## Task 5: HTML/CSS Skeleton & Input State

**Files:**
- Modify: `index.html` (replace entire file with full HTML structure, CSS, and input state logic)

This task transforms the stub `index.html` into the complete app shell. After this task, the page loads with the Input State UI: language toggle, textarea, and "Start Reading" button.

- [ ] **Step 1: Replace `index.html` with full app structure**

Replace the **entire contents** of `index.html` with the following. The `CORE LOGIC` section is identical to what you implemented in Tasks 3–4 — it's included here so the file is self-contained.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lexiclick</title>
  <style>
    :root {
      --bg: #faf9f6;
      --text: #2d2d2d;
      --text-muted: #666;
      --accent: #3b82f6;
      --border: #e5e5e5;
      --font-reading: Georgia, 'Times New Roman', serif;
      --font-ui: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      --space-sm: 0.5rem;
      --space-md: 1rem;
      --space-lg: 2rem;
      --space-xl: 3rem;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: var(--font-ui);
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-md) var(--space-lg);
      border-bottom: 1px solid var(--border);
    }
    .header h1 { font-size: 1.25rem; font-weight: 600; }

    .lang-toggle { display: flex; }
    .lang-btn {
      padding: var(--space-sm) var(--space-md);
      border: 1px solid var(--border);
      background: white;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
    }
    .lang-btn:first-child { border-radius: 4px 0 0 4px; }
    .lang-btn:last-child { border-radius: 0 4px 4px 0; border-left: none; }
    .lang-btn.active {
      background: var(--accent);
      color: white;
      border-color: var(--accent);
    }

    .input-view {
      max-width: 640px;
      margin: var(--space-xl) auto;
      padding: 0 var(--space-lg);
    }
    .input-view textarea {
      width: 100%;
      min-height: 200px;
      padding: var(--space-md);
      border: 1px solid var(--border);
      border-radius: 6px;
      font-family: var(--font-ui);
      font-size: 1rem;
      resize: vertical;
      line-height: 1.5;
    }
    .input-view textarea:focus {
      outline: none;
      border-color: var(--accent);
    }
    .start-btn {
      display: block;
      margin: var(--space-md) auto 0;
      padding: var(--space-sm) var(--space-lg);
      background: var(--accent);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 1rem;
      cursor: pointer;
    }
    .start-btn:hover { opacity: 0.9; }

    .reading-view {
      max-width: 640px;
      margin: var(--space-lg) auto;
      padding: 0 var(--space-lg);
      display: none;
    }
    .back-link {
      display: inline-block;
      margin-bottom: var(--space-md);
      color: var(--accent);
      text-decoration: none;
      font-size: 0.875rem;
    }
    .back-link:hover { text-decoration: underline; }
    .reading-view p {
      font-family: var(--font-reading);
      font-size: 1.125rem;
      line-height: 1.8;
      margin-bottom: var(--space-md);
    }
    .word {
      cursor: pointer;
      border-bottom: 1px dotted transparent;
    }
    .word:hover { border-bottom-color: var(--text-muted); }

    .modal-backdrop {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      z-index: 100;
      justify-content: center;
      align-items: center;
    }
    .modal-backdrop.open { display: flex; }
    .modal {
      background: white;
      border-radius: 8px;
      width: 90%;
      max-width: 600px;
      max-height: 70vh;
      overflow-y: auto;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-md) var(--space-lg);
      border-bottom: 1px solid var(--border);
    }
    .modal-header h2 { font-size: 1.25rem; font-weight: 600; }
    .close-btn {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: var(--text-muted);
      line-height: 1;
    }
    .modal-section {
      padding: var(--space-md) var(--space-lg);
    }
    .modal-section + .modal-section {
      border-top: 1px solid var(--border);
    }
    .modal-section h3 {
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: var(--space-sm);
    }
    .example { margin-bottom: var(--space-md); }
    .example .source { font-style: italic; }
    .example .translation {
      color: var(--text-muted);
      font-size: 0.9rem;
    }
    .wiktionary-frame {
      width: 100%;
      height: 40vh;
      border: none;
    }
    .loading {
      color: var(--text-muted);
      font-style: italic;
    }

    .hidden { display: none !important; }
  </style>
</head>
<body>
  <header class="header">
    <h1>Lexiclick</h1>
    <div class="lang-toggle">
      <button class="lang-btn active" data-lang="fr">FR</button>
      <button class="lang-btn" data-lang="de">DE</button>
    </div>
  </header>

  <main id="input-view" class="input-view">
    <textarea id="text-input" placeholder="Paste your text here..."></textarea>
    <button id="start-btn" class="start-btn">Start Reading</button>
  </main>

  <main id="reading-view" class="reading-view">
    <a href="#" id="back-link" class="back-link">&larr; New Text</a>
    <div id="reading-content"></div>
  </main>

  <div id="modal-backdrop" class="modal-backdrop">
    <div class="modal">
      <div class="modal-header">
        <h2 id="modal-word"></h2>
        <button id="close-modal" class="close-btn">&times;</button>
      </div>
      <div class="modal-section">
        <h3>Examples (Tatoeba)</h3>
        <div id="tatoeba-results"><p class="loading">Looking up...</p></div>
      </div>
      <div class="modal-section">
        <h3>Wiktionary</h3>
        <iframe id="wiktionary-frame" class="wiktionary-frame"
                sandbox="allow-scripts allow-same-origin"></iframe>
      </div>
    </div>
  </div>

  <script>
  // === CORE LOGIC ===
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
  // === END CORE LOGIC ===

  // === APP ===
  let currentLang = 'fr';

  const inputView = document.getElementById('input-view');
  const readingView = document.getElementById('reading-view');
  const textInput = document.getElementById('text-input');
  const startBtn = document.getElementById('start-btn');
  const backLink = document.getElementById('back-link');
  const readingContent = document.getElementById('reading-content');

  // Language toggle
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelector('.lang-btn.active').classList.remove('active');
      btn.classList.add('active');
      currentLang = btn.dataset.lang;
    });
  });

  // Start reading
  startBtn.addEventListener('click', () => {
    const text = textInput.value.trim();
    if (!text) return;
    inputView.classList.add('hidden');
    readingView.style.display = 'block';
  });

  // Back to input
  backLink.addEventListener('click', (e) => {
    e.preventDefault();
    readingView.style.display = 'none';
    inputView.classList.remove('hidden');
  });
  // === END APP ===
  </script>
</body>
</html>
```

- [ ] **Step 2: Run unit tests to verify nothing broke**

Run: `npm test`

Expected: All 47 tests still pass. The HTML structure changed, but the `CORE LOGIC` block is identical.

- [ ] **Step 3: Manual browser test**

Open `index.html` in a browser (double-click the file or `open index.html`). Verify:

1. Page shows header with "Lexiclick" title and FR/DE toggle buttons
2. FR button is highlighted (active) by default
3. Clicking DE highlights DE and un-highlights FR (and vice versa)
4. Textarea is visible with "Paste your text here..." placeholder
5. "Start Reading" button is visible below textarea
6. Typing text and clicking "Start Reading" hides the input and shows the reading view (empty for now — `renderText` not wired up yet)
7. "New Text" link in reading view returns to input state
8. Textarea still has the previously typed text

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: full HTML/CSS structure with input state UI"
```

---

## Task 6: Reading State

**Files:**
- Modify: `index.html` (add `renderText` function and wire it up)

After this task, clicking "Start Reading" renders the pasted text as clickable word spans with paragraph structure preserved.

- [ ] **Step 1: Add `renderText` and wire it to "Start Reading"**

In `index.html`, find the `// === APP ===` section. Replace the start-button event listener and add `renderText` right before `// === END APP ===`:

Find this code:

```js
  // Start reading
  startBtn.addEventListener('click', () => {
    const text = textInput.value.trim();
    if (!text) return;
    inputView.classList.add('hidden');
    readingView.style.display = 'block';
  });
```

Replace it with:

```js
  // Start reading
  startBtn.addEventListener('click', () => {
    const text = textInput.value.trim();
    if (!text) return;
    renderText(text);
    inputView.classList.add('hidden');
    readingView.style.display = 'block';
  });

  function renderText(text) {
    const paragraphs = tokenize(text);
    readingContent.innerHTML = '';
    for (const tokens of paragraphs) {
      const p = document.createElement('p');
      for (let i = 0; i < tokens.length; i++) {
        const span = document.createElement('span');
        span.className = 'word';
        span.dataset.raw = tokens[i];
        span.textContent = tokens[i];
        p.appendChild(span);
        if (i < tokens.length - 1) {
          p.appendChild(document.createTextNode(' '));
        }
      }
      readingContent.appendChild(p);
    }
  }
```

How `renderText` works:
1. Calls `tokenize()` to split text into paragraphs of tokens
2. Creates a `<p>` for each paragraph
3. Creates a `<span class="word" data-raw="...">` for each token
4. Adds a space text node between words (not after the last word)

- [ ] **Step 2: Run unit tests**

Run: `npm test`

Expected: All 47 tests still pass.

- [ ] **Step 3: Manual browser test**

Refresh `index.html` in the browser. Verify:

1. Paste this text into the textarea:
   ```
   Avant la découverte de l'Australie, l'Ancien Monde était convaincu.

   Tous les cygnes étaient blancs.
   ```
2. Click "Start Reading"
3. Text renders as two paragraphs (separated visually)
4. Each word is individually hoverable (dotted underline appears on hover)
5. Cursor changes to pointer on hover
6. Punctuation stays attached to words (`l'Australie,` is one clickable unit)
7. "New Text" link returns to input, text is preserved
8. Clicking "Start Reading" again re-renders correctly

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: reading state with clickable word spans"
```

---

## Task 7: Modal & API Integration

**Files:**
- Modify: `index.html` (add modal handling, Tatoeba fetch, Wiktionary iframe, dismiss behavior)

This is the final feature task. After this, clicking a word opens the modal with Tatoeba examples and a Wiktionary page.

- [ ] **Step 1: Add DOM references for modal elements**

In `index.html`, find the DOM reference section (after `const readingContent = ...`). Add these lines after it:

```js
  const modalBackdrop = document.getElementById('modal-backdrop');
  const modalWord = document.getElementById('modal-word');
  const closeModalBtn = document.getElementById('close-modal');
  const tatoebaResults = document.getElementById('tatoeba-results');
  const wiktionaryFrame = document.getElementById('wiktionary-frame');
```

- [ ] **Step 2: Add click handler to word spans**

In the `renderText` function, find `span.textContent = tokens[i];` and add a click handler right after it:

```js
        span.addEventListener('click', () => openModal(tokens[i]));
```

- [ ] **Step 3: Add modal functions before `// === END APP ===`**

Add the following code right before `// === END APP ===`:

```js
  function openModal(raw) {
    const word = normalize(raw, currentLang);
    if (!word) return;

    modalWord.textContent = word;
    tatoebaResults.innerHTML = '<p class="loading">Looking up...</p>';
    wiktionaryFrame.src = wiktionaryUrl(word, currentLang);
    modalBackdrop.classList.add('open');

    fetchTatoeba(word);
  }

  async function fetchTatoeba(word) {
    try {
      const resp = await fetch(tatoebaProxyUrl(word, currentLang));
      if (!resp.ok) throw new Error(resp.status);
      const data = await resp.json();
      renderTatoeba(data.results || []);
    } catch {
      tatoebaResults.innerHTML = '<p>Failed to load examples.</p>';
    }
  }

  function renderTatoeba(results) {
    if (results.length === 0) {
      tatoebaResults.innerHTML = '<p>No examples found.</p>';
      return;
    }
    tatoebaResults.innerHTML = '';
    for (const r of results) {
      const div = document.createElement('div');
      div.className = 'example';
      const translation = r.translations?.[0]?.[0]?.text || 'No translation available';
      div.innerHTML =
        '<p class="source">\u201c' + escapeHtml(r.text) + '\u201d</p>' +
        '<p class="translation">\u2192 \u201c' + escapeHtml(translation) + '\u201d</p>';
      tatoebaResults.appendChild(div);
    }
  }

  function escapeHtml(str) {
    const el = document.createElement('div');
    el.textContent = str;
    return el.innerHTML;
  }

  function dismissModal() {
    modalBackdrop.classList.remove('open');
    wiktionaryFrame.src = '';
  }

  closeModalBtn.addEventListener('click', dismissModal);
  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) dismissModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') dismissModal();
  });
```

**What each function does:**
- `openModal(raw)` — normalizes the clicked token, sets the modal header, triggers both lookups (Tatoeba + Wiktionary), opens the modal
- `fetchTatoeba(word)` — calls the worker proxy, handles errors
- `renderTatoeba(results)` — renders 0–5 example sentences with translations
- `escapeHtml(str)` — prevents XSS from Tatoeba content by using DOM text content assignment
- `dismissModal()` — closes modal, clears iframe (stops loading)
- Event listeners — close on X button, backdrop click, or Escape key

- [ ] **Step 4: Run unit tests**

Run: `npm test`

Expected: All 47 tests still pass.

- [ ] **Step 5: Manual browser test**

Refresh `index.html` in the browser. Verify:

1. Paste French text, click "Start Reading"
2. Click any word → modal opens with the normalized word as the header
3. **Wiktionary section:** iframe loads the word's Wiktionary page (may take a moment; if the word doesn't exist, Wiktionary shows its own "page not found")
4. **Tatoeba section:** shows "Looking up..." then either example sentences or "Failed to load examples." (expected to fail until the worker is deployed — that's OK)
5. Click the X button → modal closes
6. Click a word → modal opens; click the dimmed backdrop → modal closes
7. Click a word → modal opens; press Escape → modal closes
8. Click `l'Australie,` → modal header shows "australie" (punctuation stripped, apostrophe prefix stripped, lowercased)
9. Switch to DE, paste `Die Welt ist schön.`, click "Start Reading", click "Welt" → Wiktionary loads `de.wiktionary.org/wiki/Welt` (capitalized)

**Note:** Tatoeba results will show "Failed to load examples." until you deploy the worker (Task 2 deployment note). This is expected. To test Tatoeba integration without deploying, you can temporarily change `TATOEBA_PROXY` to `https://api.tatoeba.org/v1` and call directly (this won't work due to CORS in some browsers, but may work in others).

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat: modal with Tatoeba examples and Wiktionary iframe"
```

---

## Task 8: Polish & Final Testing

**Files:**
- Modify: `index.html` (minor polish)

This task handles edge cases and does a final verification pass.

- [ ] **Step 1: Handle language switching in reading view**

The spec says: "Language toggle visible but switching re-tokenizes the text." If the user switches languages while in reading view, re-render the text so subsequent word clicks use the new language.

In `index.html`, find the language toggle event listener:

```js
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelector('.lang-btn.active').classList.remove('active');
      btn.classList.add('active');
      currentLang = btn.dataset.lang;
    });
  });
```

Replace it with:

```js
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelector('.lang-btn.active').classList.remove('active');
      btn.classList.add('active');
      currentLang = btn.dataset.lang;
      if (readingView.style.display === 'block') {
        renderText(textInput.value.trim());
      }
    });
  });
```

- [ ] **Step 2: Prevent "Start Reading" with empty input**

Already handled — the `startBtn` click handler checks `if (!text) return;`. Verify this works: click "Start Reading" with empty textarea → nothing happens.

- [ ] **Step 3: Run all unit tests one final time**

Run: `npm test`

Expected: All 47 tests PASS.

- [ ] **Step 4: Full manual test pass**

Open `index.html` in a browser. Run through this checklist:

**Input state:**
- [ ] Page loads with FR selected, textarea empty
- [ ] Clicking DE switches active state; clicking FR switches back
- [ ] Clicking "Start Reading" with empty textarea does nothing
- [ ] Pasting text and clicking "Start Reading" transitions to reading view

**Reading state:**
- [ ] Paragraph structure matches the input (double newlines → separate paragraphs)
- [ ] Each word shows dotted underline on hover
- [ ] Punctuation is attached to words (e.g., `convaincu,` is one span)
- [ ] "New Text" link returns to input; textarea still has the text
- [ ] Can start reading again after going back

**Modal (French):**
- [ ] Clicking a word opens modal with normalized word as header
- [ ] `l'Australie,` → header shows `australie`
- [ ] `«croyance»` → header shows `croyance`
- [ ] Wiktionary iframe loads the French page
- [ ] Tatoeba shows "Looking up..." then results (or "Failed to load" if worker not deployed)
- [ ] Close via X button, backdrop click, and Escape all work
- [ ] Clicking a different word updates the modal content

**Modal (German):**
- [ ] Switch to DE, paste German text, start reading
- [ ] Click `Welt` → Wiktionary loads `de.wiktionary.org/wiki/Welt` (capitalized)
- [ ] `d'autant` does NOT strip the `d'` prefix (German mode)

**Language switching:**
- [ ] Switch language while in reading view → text re-renders
- [ ] Word clicks after switch use the new language for lookups

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: language switch re-tokenization and final polish"
```

---

## Done!

After completing all 8 tasks:

- **47 automated tests** cover tokenization, normalization, URL building, and the Cloudflare Worker
- **`index.html`** is the complete frontend — open in any browser, no server needed
- **`worker/worker.js`** is ready to deploy to Cloudflare Workers

### Deployment (when ready)

1. **Worker:** `cd worker && npx wrangler deploy` — note the URL it prints
2. **Update proxy URL:** In `index.html`, change `TATOEBA_PROXY` to the deployed worker URL
3. **Frontend:** Push to `main` branch, enable GitHub Pages (Settings → Pages → Source: `main`, directory: `/`)
4. **Verify:** Visit the GitHub Pages URL, paste text, click words, confirm Tatoeba examples load

### What's NOT in this plan (by design)

- Lemmatization (Phase 2 — see spec)
- EPUB support (Phase 3)
- Additional languages beyond FR/DE (Phase 4)
- Vocabulary tracking (Phase 5)
