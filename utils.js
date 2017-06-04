var chalk = require('chalk');

function getRandomCard(fromDeck) {
  var card = '';

  do {
    card = fromDeck[Math.floor(Math.random() * (fromDeck.length - 1))];
  } while (fromDeck.indexOf(card) === -1);

  fromDeck.splice(fromDeck.indexOf(card), 1);

  return card;
}

function giveHand(fromDeck) {
  var hand = [];

  for (var i = 0; i < 13; i++) {
    hand.push(getRandomCard(fromDeck));
  }

  return hand;
}

function info(msg) {
  console.log(chalk.blue(msg));
}

function warn(msg) {
  console.log(chalk.yellow(msg));
}

function success(msg) {
  console.log(chalk.green(msg));
}

module.exports = {
  getRandomCard: getRandomCard,
  giveHand: giveHand,
  info: info,
  warn: warn,
  success: success
};
