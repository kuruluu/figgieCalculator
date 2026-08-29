"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const calculator = require("../src/calculator.js");

const TOLERANCE = 1e-12;

test("uses the visible Spades Clubs Diamonds Hearts suit order", function () {
  assert.deepEqual(calculator.SUITS, ["spades", "clubs", "diamonds", "hearts"]);
});

function totalFor(results, key) {
  return calculator.SUITS.reduce(function add(sum, suit) {
    return sum + results[suit][key];
  }, 0);
}

test("enumerates every valid deck hypothesis exactly once", function () {
  assert.equal(calculator.DECK_HYPOTHESES.length, 12);
  const signatures = new Set();

  calculator.DECK_HYPOTHESES.forEach(function inspect(hypothesis) {
    assert.deepEqual(hypothesis.counts.slice().sort(function ascending(a, b) { return a - b; }), [8, 10, 10, 12]);
    signatures.add(hypothesis.counts.join(","));
  });

  assert.equal(signatures.size, 12);
});

test("computes combinations and rejects impossible selections", function () {
  assert.equal(calculator.choose(12, 0), 1);
  assert.equal(calculator.choose(12, 1), 12);
  assert.equal(calculator.choose(12, 5), 792);
  assert.equal(calculator.choose(8, 9), 0);
});

test("requires integer frequencies from zero to nine totaling ten", function () {
  assert.throws(
    function calculateShortHand() {
      calculator.calculateProbabilities({ spades: 2, clubs: 2, hearts: 2, diamonds: 2 });
    },
    /total 10/,
  );
  assert.throws(
    function calculateOutOfRangeHand() {
      calculator.calculateProbabilities({ spades: 10, clubs: 0, hearts: 0, diamonds: 0 });
    },
    /0 through 9/,
  );
});

test("assigns zero rare probability to a suit observed nine times", function () {
  const results = calculator.calculateProbabilities({ spades: 9, clubs: 1, hearts: 0, diamonds: 0 });
  assert.equal(results.spades.rareProbability, 0);
});

test("preserves symmetry when same-color suit observations are swapped", function () {
  const original = calculator.calculateProbabilities({ spades: 5, clubs: 1, hearts: 2, diamonds: 2 });
  const swapped = calculator.calculateProbabilities({ spades: 1, clubs: 5, hearts: 2, diamonds: 2 });

  assert.ok(Math.abs(original.spades.goalProbability - swapped.clubs.goalProbability) < TOLERANCE);
  assert.ok(Math.abs(original.clubs.goalProbability - swapped.spades.goalProbability) < TOLERANCE);
  assert.ok(Math.abs(original.spades.rareProbability - swapped.clubs.rareProbability) < TOLERANCE);
  assert.ok(Math.abs(original.clubs.rareProbability - swapped.spades.rareProbability) < TOLERANCE);
});

test("normalizes finite nonnegative probabilities for every accepted hand", function () {
  for (let spades = 0; spades <= 9; spades += 1) {
    for (let clubs = 0; clubs <= 9; clubs += 1) {
      for (let hearts = 0; hearts <= 9; hearts += 1) {
        const diamonds = 10 - spades - clubs - hearts;
        if (diamonds < 0 || diamonds > 9) {
          continue;
        }

        const results = calculator.calculateProbabilities({ spades, clubs, hearts, diamonds });
        assert.ok(Math.abs(totalFor(results, "goalProbability") - 1) < TOLERANCE);
        assert.ok(Math.abs(totalFor(results, "rareProbability") - 1) < TOLERANCE);

        calculator.SUITS.forEach(function inspectSuit(suit) {
          assert.ok(Number.isFinite(results[suit].goalProbability));
          assert.ok(Number.isFinite(results[suit].rareProbability));
          assert.ok(results[suit].goalProbability >= 0);
          assert.ok(results[suit].rareProbability >= 0);
        });
      }
    }
  }
});
