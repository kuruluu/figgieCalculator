# Figgie Calculator

A small local browser calculator for estimating the probability that each Figgie suit is the goal suit or the rare eight-card suit from a ten-card starting hand.

## Use it

1. Download or copy the project folder.
2. Extract it if it was downloaded as a ZIP file.
3. Open `index.html` in a current web browser.
4. Enter the four suit frequencies. Typing or pasting `5122` from the first field fills all four suits.
5. Select **Calculate →** once the frequencies total 10.

No installation, account, network connection, or API key is required.

## Optional local server

Directly opening `index.html` is supported. To serve the same files locally instead, run:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Tests

Node.js is needed only to run the automated tests:

```powershell
node --test tests/calculator.test.js tests/app.test.js
```

## Probability model

The calculator evaluates all 12 assignments of Figgie's `12, 10, 10, 8` suit counts. It weights each assignment by the multivariate-hypergeometric likelihood of the entered hand, normalizes those weights, and sums them to produce each suit's goal and rare probabilities.

The suit order is Spades, Clubs, Hearts, Diamonds. The goal suit is the same-color partner of the 12-card suit, and the rare suit is the 8-card suit.
