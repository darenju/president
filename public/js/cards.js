var cards = [];
var heads = ['K','Q','J'];
var numbers = [].concat(heads);

for (var i = 10; i > 1; i--) {
  numbers.push(i);
}

numbers.push('A');

var colors = ['D','S','H','C'];

colors.forEach(function (color) {
  cards = cards.concat(numbers.map(function (number) {
    return number + color;
  }));
});

function isStrongerThanOrEqual(card1, card2) {
  if (card2.length === 0) return true;

  var number1 = card1.slice(0, -1);
  var number2 = card2.slice(0, -1);

  // si c'est un 2 ou un As, on peut forcément jouer le coup
  if (number1 === '2' || number1 === 'A') return true;

  // têtes
  if (isNaN(card1[0])) {
    if (!isNaN(card2[0])) {
      return true;
    }

    return heads.indexOf(card1[0]) <= heads.indexOf(card2[0]);
  }

  // number comparison
  return parseInt(card1.slice(0, -1)) >= parseInt(card2.slice(0, -1));
}

function canSelect(card, lastCoup, selectedCards) {
  // s'il n'y a pas de coup avant…
  if (lastCoup.length === 0 && selectedCards.length === 0) return true;

  // ne pas sélectionner s'il y a le même nombre de cartes
  if (lastCoup.length > 0 && lastCoup.length === selectedCards.length) return false;

  var lastCard = lastCoup[0];

  if (selectedCards.length === 0) {
    return isStrongerThanOrEqual(card, lastCard);
  }

  return selectedCards[0].slice(0, -1) === card.slice(0, -1);
}

if (typeof module !== 'undefined') {
  module.exports = {
    cards: cards,
    isStrongerThanOrEqual: isStrongerThanOrEqual,
    canSelect: canSelect
  };
}
