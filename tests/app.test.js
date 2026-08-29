"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const app = require("../src/app.js");

test("keeps the static shell compatible with direct local opening", function () {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

  assert.match(html, /<title>Figgie Calculator<\/title>/);
  assert.match(html, /<script defer src="src\/calculator\.js"><\/script>/);
  assert.match(html, /<script defer src="src\/app\.js"><\/script>/);
  assert.equal((html.match(/data-suit=/g) || []).length, 4);
  assert.doesNotMatch(html, /type=["']module["']/);
  assert.match(html, /href="https:\/\/www\.figgie\.com\/play\/"/);
  assert.match(html, /target="_blank" rel="noopener noreferrer"/);
  assert.doesNotMatch(html, /<(?:script|link)[^>]+https?:\/\//);
});

test("includes an accessible theme toggle and official game link", function () {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

  assert.match(html, /id="theme-toggle"/);
  assert.match(html, /aria-label="Switch to light mode"/);
  assert.match(html, /data-theme-label>Light</);
  assert.match(html, />\s*Play Figgie\s*</);
});

test("keeps the cards and documentation in Spades Clubs Diamonds Hearts order", function () {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const readme = fs.readFileSync(path.join(__dirname, "..", "README.md"), "utf8");
  const cardOrder = Array.from(html.matchAll(/data-suit="([^"]+)"/g), function readSuit(match) {
    return match[1];
  });

  assert.deepEqual(cardOrder, ["spades", "clubs", "diamonds", "hearts"]);
  assert.match(html, /for Spades, Clubs, Diamonds, and\s+Hearts/);
  assert.match(readme, /The suit order is Spades, Clubs, Diamonds, Hearts\./);
});

test("includes the credit, relocated total, and two-part explanation", function () {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const actionRow = html.match(/<div class="action-row">([\s\S]*?)<\/div>/);

  assert.match(html, /by Enric Duong/);
  assert.ok(actionRow, "expected an action row");
  assert.match(actionRow[1], /id="hand-total"/);
  assert.match(actionRow[1], /id="calculate-button"/);
  assert.match(html, /<h2>How to use<\/h2>/);
  assert.match(html, /<h2>How probabilities are calculated<\/h2>/);
  assert.match(html, /same-color partner/);
});

test("documents only the verified 5 2 3 0 probability example", function () {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

  assert.match(html, /5 \/ 2 \/ 3 \/ 0/);
  assert.match(html, /18\.03%/);
  assert.match(html, /47\.80%/);
  assert.match(html, /9\.55%/);
  assert.match(html, /24\.62%/);
  assert.match(html, /6\.96%/);
  assert.match(html, /27\.07%/);
  assert.match(html, /19\.06%/);
  assert.match(html, /46\.91%/);
});

test("defines the approved dark theme and compact control invariants", function () {
  const css = fs.readFileSync(path.join(__dirname, "..", "styles.css"), "utf8");

  assert.match(css, /color-scheme:\s*dark/);
  assert.match(css, /--page:\s*#090d18/i);
  assert.match(css, /--purple:\s*#9a86fd/i);
  assert.match(css, /--green:\s*#5ddba5/i);
  assert.match(css, /\.suit-card\s*{[\s\S]*?padding:\s*14px;/);
  assert.match(css, /\.suit-card\s*{[\s\S]*?border-radius:\s*8px;/);
  assert.match(css, /\.frequency-input\s*{[\s\S]*?border:\s*0;/);
  assert.match(css, /\.frequency-input\s*{[\s\S]*?background:\s*transparent;/);
});

test("defines a light theme while preserving the dark palette", function () {
  const css = fs.readFileSync(path.join(__dirname, "..", "styles.css"), "utf8");

  assert.match(css, /:root\[data-theme="light"\]/);
  assert.match(css, /--page:\s*#f3f1f8/i);
  assert.match(css, /@media\s*\(prefers-color-scheme:\s*light\)/);
  assert.match(css, /\.header-actions\s*{/);
  assert.match(css, /\.theme-toggle/);
});

test("uses a card-back pattern without numbered or divided explanation sections", function () {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "..", "styles.css"), "utf8");

  assert.doesNotMatch(html, /class="section-number"/);
  assert.doesNotMatch(html, />01<|>02</);
  assert.doesNotMatch(css, /radial-gradient/);
  assert.match(css, /repeating-linear-gradient/);
  assert.match(css, /\.explanation\s*{[\s\S]*?margin-top:\s*8px;/);
  assert.match(css, /\.explanation\s*{[\s\S]*?border-top:\s*0;/);
  assert.match(css, /\.explanation-section\s*{[\s\S]*?border-bottom:\s*0;/);
});

test("keeps the description close and strongly fades disabled Calculate", function () {
  const css = fs.readFileSync(path.join(__dirname, "..", "styles.css"), "utf8");

  assert.match(css, /\.explanation\s*{[\s\S]*?margin-top:\s*8px;/);
  assert.match(css, /\.explanation-section:first-child\s*{[\s\S]*?padding-top:\s*16px;/);
  assert.match(css, /\.calculate-button:disabled\s*{[\s\S]*?opacity:\s*0\.48;/);
  assert.match(css, /transition:[^;]*opacity/);
});

test("starts with four zero frequencies and an invalid total", function () {
  const controller = app.createHandController();
  assert.deepEqual(controller.getState(), {
    frequencies: [0, 0, 0, 0],
    total: 0,
    isValid: false,
  });
});

test("sets individual suits and reports validity only at ten", function () {
  const states = [];
  const controller = app.createHandController(function record(state) {
    states.push(state);
  });

  assert.equal(controller.setSuit(0, 5), true);
  assert.equal(controller.setSuit(1, 1), true);
  assert.equal(controller.setSuit(2, 2), true);
  assert.equal(controller.setSuit(3, 2), true);
  assert.equal(states.at(-1).total, 10);
  assert.equal(states.at(-1).isValid, true);

  controller.setSuit(3, 3);
  assert.equal(controller.getState().total, 11);
  assert.equal(controller.getState().isValid, false);
});

test("distributes 5122 across all four suits in one update", function () {
  let notifications = 0;
  const controller = app.createHandController(function notify() {
    notifications += 1;
  });

  assert.equal(controller.fillFrom(0, "5122"), true);
  assert.deepEqual(controller.getState(), {
    frequencies: [5, 1, 2, 2],
    total: 10,
    isValid: true,
  });
  assert.equal(notifications, 1);
});

test("rejects invalid or overflowing sequential input atomically", function () {
  const controller = app.createHandController();
  assert.equal(controller.fillFrom(2, "122"), false);
  assert.equal(controller.fillFrom(0, "51x2"), false);
  assert.equal(controller.setSuit(0, 10), false);
  assert.equal(controller.setSuit(8, 1), false);
  assert.deepEqual(controller.getState().frequencies, [0, 0, 0, 0]);
});

test("formats probabilities with two decimal places", function () {
  assert.equal(app.formatPercent(0), "0.00%");
  assert.equal(app.formatPercent(0.12345), "12.35%");
  assert.equal(app.formatPercent(1), "100.00%");
});

test("normalizes and resolves stored themes safely", function () {
  assert.equal(app.normalizeTheme("light"), "light");
  assert.equal(app.normalizeTheme("dark"), "dark");
  assert.equal(app.normalizeTheme("sepia"), null);

  const storage = {
    value: "light",
    getItem: function getItem(key) {
      assert.equal(key, app.THEME_STORAGE_KEY);
      return this.value;
    },
    setItem: function setItem(key, value) {
      assert.equal(key, app.THEME_STORAGE_KEY);
      this.value = value;
    },
  };

  assert.equal(app.readStoredTheme(storage), "light");
  assert.equal(app.storeTheme(storage, "dark"), true);
  assert.equal(app.readStoredTheme(storage), "dark");
});

test("theme storage failures fall back without throwing", function () {
  const failingStorage = {
    getItem: function getItem() {
      throw new Error("unavailable");
    },
    setItem: function setItem() {
      throw new Error("unavailable");
    },
  };

  assert.equal(app.readStoredTheme(failingStorage), null);
  assert.equal(app.storeTheme(failingStorage, "light"), false);
  assert.equal(app.getSystemTheme({ matchMedia: function matchMedia() { return { matches: true }; } }), "light");
  assert.equal(app.getSystemTheme({ matchMedia: function matchMedia() { return { matches: false }; } }), "dark");
  assert.equal(app.getSystemTheme(null), "dark");
});
