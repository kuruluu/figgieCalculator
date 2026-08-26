(function attachApp(root, factory) {
  const calculator =
    typeof module === "object" && module.exports
      ? require("./calculator.js")
      : root.FiggieCalculator;
  const api = factory(calculator);

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.FiggieApp = api;
    api.createApp(root.document);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createAppModule(calculator) {
  "use strict";

  function createHandController(onChange) {
    let frequencies = [0, 0, 0, 0];

    function snapshot() {
      const total = frequencies.reduce(function add(sum, value) {
        return sum + value;
      }, 0);

      return {
        frequencies: frequencies.slice(),
        total: total,
        isValid: total === 10,
      };
    }

    function notify() {
      if (typeof onChange === "function") {
        onChange(snapshot());
      }
    }

    function setSuit(index, value, options) {
      if (!Number.isInteger(index) || index < 0 || index >= frequencies.length) {
        return false;
      }

      const numericValue = Number(value);
      if (!Number.isInteger(numericValue) || numericValue < 0 || numericValue > 9) {
        return false;
      }

      frequencies[index] = numericValue;
      if (!options || options.notify !== false) {
        notify();
      }
      return true;
    }

    function fillFrom(startIndex, digits) {
      if (
        !Number.isInteger(startIndex) ||
        startIndex < 0 ||
        startIndex >= frequencies.length ||
        typeof digits !== "string" ||
        !/^\d+$/.test(digits) ||
        digits.length > frequencies.length - startIndex
      ) {
        return false;
      }

      digits.split("").forEach(function setDigit(digit, offset) {
        setSuit(startIndex + offset, Number(digit), { notify: false });
      });
      notify();
      return true;
    }

    return Object.freeze({
      getState: snapshot,
      setSuit: setSuit,
      fillFrom: fillFrom,
    });
  }

  function formatPercent(probability) {
    return (probability * 100).toFixed(2) + "%";
  }

  function createApp(documentObject) {
    if (!documentObject || !calculator) {
      throw new Error("Figgie Calculator could not initialize.");
    }

    const suitSections = Array.from(documentObject.querySelectorAll("[data-suit]"));
    const totalOutput = documentObject.querySelector("#hand-total");
    const calculateButton = documentObject.querySelector("#calculate-button");
    const errorOutput = documentObject.querySelector("#calculation-error");
    let hasResults = false;

    function clearResults() {
      if (!hasResults) {
        return;
      }

      suitSections.forEach(function clearSuit(section) {
        section.querySelector('[data-result="goal"]').textContent = "—";
        section.querySelector('[data-result="rare"]').textContent = "—";
      });
      hasResults = false;
    }

    function renderState(state) {
      suitSections.forEach(function renderSuit(section, index) {
        section.querySelector(".frequency-input").value = String(state.frequencies[index]);
        section.querySelector(".frequency-slider").value = String(state.frequencies[index]);
      });

      totalOutput.textContent = state.total + " / 10";
      totalOutput.classList.toggle("is-valid", state.isValid);
      calculateButton.disabled = !state.isValid;
      calculateButton.setAttribute("aria-disabled", String(!state.isValid));
      errorOutput.hidden = true;
      errorOutput.textContent = "";
      clearResults();
    }

    const controller = createHandController(renderState);

    function focusAfterEntry(index) {
      const state = controller.getState();
      if (index < suitSections.length - 1) {
        const nextInput = suitSections[index + 1].querySelector(".frequency-input");
        nextInput.focus();
        nextInput.select();
      } else if (state.isValid) {
        calculateButton.focus();
      }
    }

    suitSections.forEach(function bindSuit(section, index) {
      const textInput = section.querySelector(".frequency-input");
      const slider = section.querySelector(".frequency-slider");

      textInput.addEventListener("focus", function selectOnFocus() {
        textInput.select();
      });
      textInput.addEventListener("click", function selectOnClick() {
        textInput.select();
      });
      textInput.addEventListener("input", function handleTextInput() {
        const typed = textInput.value;
        if (/^\d$/.test(typed)) {
          controller.setSuit(index, Number(typed));
          focusAfterEntry(index);
        } else {
          textInput.value = String(controller.getState().frequencies[index]);
          textInput.select();
        }
      });
      textInput.addEventListener("paste", function handlePaste(event) {
        const digits = event.clipboardData.getData("text").trim();
        if (!/^\d+$/.test(digits) || !controller.fillFrom(index, digits)) {
          event.preventDefault();
          return;
        }

        event.preventDefault();
        const finalIndex = index + digits.length - 1;
        const state = controller.getState();
        if (finalIndex === suitSections.length - 1 && state.isValid) {
          calculateButton.focus();
        } else {
          const nextIndex = Math.min(finalIndex + 1, suitSections.length - 1);
          const nextInput = suitSections[nextIndex].querySelector(".frequency-input");
          nextInput.focus();
          nextInput.select();
        }
      });
      textInput.addEventListener("keydown", function handleBackspace(event) {
        const allSelected = textInput.selectionStart === 0 && textInput.selectionEnd === textInput.value.length;
        if (event.key === "Backspace" && index > 0 && (textInput.value === "" || allSelected)) {
          event.preventDefault();
          const previousInput = suitSections[index - 1].querySelector(".frequency-input");
          previousInput.focus();
          previousInput.select();
        }
      });
      slider.addEventListener("input", function handleSliderInput() {
        controller.setSuit(index, Number(slider.value));
      });
    });

    calculateButton.addEventListener("click", function calculate() {
      const state = controller.getState();
      if (!state.isValid) {
        return;
      }

      const hand = Object.fromEntries(
        calculator.SUITS.map(function mapSuit(suit, index) {
          return [suit, state.frequencies[index]];
        }),
      );

      try {
        const results = calculator.calculateProbabilities(hand);
        suitSections.forEach(function renderResult(section) {
          const suit = section.dataset.suit;
          section.querySelector('[data-result="goal"]').textContent = formatPercent(
            results[suit].goalProbability,
          );
          section.querySelector('[data-result="rare"]').textContent = formatPercent(
            results[suit].rareProbability,
          );
        });
        hasResults = true;
        errorOutput.hidden = true;
      } catch (error) {
        clearResults();
        errorOutput.textContent = "Unable to calculate this hand.";
        errorOutput.hidden = false;
      }
    });

    renderState(controller.getState());
    return controller;
  }

  return Object.freeze({
    createHandController: createHandController,
    formatPercent: formatPercent,
    createApp: createApp,
  });
});
