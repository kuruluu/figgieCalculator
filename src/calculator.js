(function attachCalculator(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.FiggieCalculator = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createCalculator() {
  "use strict";

  const SUITS = Object.freeze(["spades", "clubs", "hearts", "diamonds"]);
  const PARTNER_INDEX = Object.freeze([1, 0, 3, 2]);

  const DECK_HYPOTHESES = Object.freeze(
    SUITS.flatMap(function forEachCommon(_, commonIndex) {
      return SUITS.flatMap(function forEachRare(__, rareIndex) {
        if (rareIndex === commonIndex) {
          return [];
        }

        const counts = [10, 10, 10, 10];
        counts[commonIndex] = 12;
        counts[rareIndex] = 8;

        return [
          Object.freeze({
            counts: Object.freeze(counts),
            commonIndex: commonIndex,
            goalIndex: PARTNER_INDEX[commonIndex],
            rareIndex: rareIndex,
          }),
        ];
      });
    }),
  );

  function choose(n, k) {
    if (!Number.isInteger(n) || !Number.isInteger(k) || n < 0 || k < 0 || k > n) {
      return 0;
    }

    const smaller = Math.min(k, n - k);
    let result = 1;

    for (let index = 1; index <= smaller; index += 1) {
      result = (result * (n - smaller + index)) / index;
    }

    return result;
  }

  function normalizeHand(hand) {
    if (!hand || typeof hand !== "object") {
      throw new TypeError("A starting hand is required.");
    }

    const counts = SUITS.map(function readSuit(suit) {
      const value = hand[suit];

      if (!Number.isInteger(value) || value < 0 || value > 9) {
        throw new RangeError("Every suit frequency must be an integer from 0 through 9.");
      }

      return value;
    });

    const total = counts.reduce(function add(sum, value) {
      return sum + value;
    }, 0);

    if (total !== 10) {
      throw new RangeError("Starting hand frequencies must total 10.");
    }

    return counts;
  }

  function calculateProbabilities(hand) {
    const observedCounts = normalizeHand(hand);
    const weightedHypotheses = DECK_HYPOTHESES.map(function weightHypothesis(hypothesis) {
      const weight = hypothesis.counts.reduce(function calculateWeight(product, deckCount, suitIndex) {
        return product * choose(deckCount, observedCounts[suitIndex]);
      }, 1);

      return { hypothesis: hypothesis, weight: weight };
    });

    const totalWeight = weightedHypotheses.reduce(function addWeight(sum, item) {
      return sum + item.weight;
    }, 0);

    if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
      throw new Error("The hand does not match any valid Figgie deck.");
    }

    const results = Object.fromEntries(
      SUITS.map(function initializeResult(suit) {
        return [suit, { goalProbability: 0, rareProbability: 0 }];
      }),
    );

    weightedHypotheses.forEach(function aggregate(item) {
      const posterior = item.weight / totalWeight;
      results[SUITS[item.hypothesis.goalIndex]].goalProbability += posterior;
      results[SUITS[item.hypothesis.rareIndex]].rareProbability += posterior;
    });

    return results;
  }

  return Object.freeze({
    SUITS: SUITS,
    DECK_HYPOTHESES: DECK_HYPOTHESES,
    choose: choose,
    calculateProbabilities: calculateProbabilities,
  });
});
