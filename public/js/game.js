iziToast.settings({
  timeout: 3000,
  pauseOnHover: false,
  transitionIn: 'flipInX',
  transitionOut: 'flipOutX',
  position: 'topRight',
  layout: 1
});

function $(sel) {
  return document.querySelector(sel);
}

var loginForm = $('#login');
var board = $('#board');
var roomsSelect = $('#rooms');
var loginName = $('#name');
var playButton = $('#play');
var passButton = $('#pass');
var myself = $('#myself');
var opponentAfter = $('#opponent-after');
var opponentFront = $('#opponent-front');
var opponentBefore = $('#opponent-before');
var opponentsNames = [opponentAfter, opponentFront, opponentBefore];
var handAfter = $('#hand-after');
var handFront = $('#hand-front');
var handBefore = $('#hand-before');
var hands = [handAfter, handFront, handBefore];
var hand = $('#hand');
var stack = $('#stack');
var log = $('#log');
var selectedCards = [];
var selectedDivs = [];
var isPlaying = false;
var lastCoup = [];
var lastCards = [];
var stackCards = [];

function resetPlayingPlayer() {
  opponentsNames.concat(myself).forEach(function (name) {
    name.classList.remove('playing');
  });
}

function setPlayingPlayer(id) {
  resetPlayingPlayer();

  opponentName = $('.opponent-name[data-id="' + id + '"]');

  if (opponentName) {
    opponentName.classList.add('playing');
  } else {
    myself.classList.add('playing');
  }
}

function logMsg(msg) {
  var div = document.createElement('div');
  div.className = 'message';
  div.textContent = msg;

  log.appendChild(div);
}

function info(msg) {
  logMsg(msg);

  iziToast.show({
    color: 'blue',
    message: msg
  });
}

function success(msg) {
  logMsg(msg);

  iziToast.show({
    color: 'green',
    message: msg
  });
}

function error(msg) {
  logMsg(msg);

  iziToast.show({
    color: 'red',
    message: msg
  });
}

function createCard(card, stacked) {
  var div = document.createElement('div');
  div.className = 'card';
  div.style.background = 'url(img/cards/' + card + '.png)';
  div.dataset.value = card;

  if (stacked) {
    var rotate = Math.floor(Math.random() * (75 - (-75) + 1)) + (-75)
    var moveX = Math.floor(Math.random() * (20 - (-20) + 1)) + (-20)
    var moveY = Math.floor(Math.random() * (20 - (-20) + 1)) + (-20)

    div.style.transform = 'rotate(' + rotate + 'deg) translateX(' + moveX + 'px) translateY(' + moveY + 'px)';
  }

  return div;
}

function toggleSelectedCard() {
  if (!isPlaying) return;

  var value = this.dataset.value;
  var index = selectedCards.indexOf(value);

  if (canSelect(value, lastCoup, selectedCards) && index === -1) {
    selectedCards.push(value);
    selectedDivs.push(this);
    this.classList.add('selected');
  } else if (index !== -1) {
    selectedCards.splice(index, 1);
    selectedDivs.splice(index, 1);
    this.classList.remove('selected');
  }

  if ((lastCoup.length > 0 && selectedCards.length === lastCoup.length) || (lastCoup.length === 0 && selectedCards.length > 0)) {
    playButton.removeAttribute('disabled');
  } else {
    playButton.setAttribute('disabled', '');
  }
}

function yourTurn(previous) {
  success('C\'est à vous !');

  isPlaying = true;

  resetPlayingPlayer();
  setPlayingPlayer('myself');

  passButton.removeAttribute('disabled');
  lastCoup = previous;
}

function buildOpponentsHands() {
  hands.forEach(function (hand) {
    hand.innerHTML = '';

    for (var i = 0; i < 13; i++) {
      var div = document.createElement('div');
      div.className = 'opponent-card';
      hand.appendChild(div);
    }
  });
}

function showRooms(rooms) {
  roomsSelect.innerHTML = '';

  rooms.forEach(function (room) {
    var roomOption = document.createElement('option');
    roomOption.value = room.name;
    roomOption.textContent = room.name + ' (' + room.players + ')';

    if (room.players === 4) {
      roomOption.setAttribute('disabled');
    }

    roomsSelect.appendChild(roomOption);
  });
}

var socket = io();

socket.on('roomsList', showRooms);

// ping pong
setInterval(function () {
  socket.emit('stillHere');
}, 3000);

socket.on('playersNeeded', function (needed) {
  info('Il manque ' + needed + ' joueurs.');
});

function receiveHand (cards) {
  hand.innerHTML = '';

  buildOpponentsHands();

  cards.forEach(function (card) {
    var cardDiv = createCard(card);
    cardDiv.addEventListener('click', toggleSelectedCard.bind(cardDiv));

    hand.appendChild(cardDiv);
  });
}

function stack (cards) {
  lastCards = [];

  cards.forEach(function (card) {
    var cardDiv = createCard(card, true);
    stackCards.push(cardDiv);
    lastCards.push(cardDiv);

    stack.appendChild(cardDiv);
  });
}

function validCoup () {
  selectedDivs.forEach(function (card) {
    card.parentNode.removeChild(card);
  });

  selectedCards = [];
  selectedDivs = [];
  isPlaying = false;

  playButton.setAttribute('disabled', '');
  passButton.setAttribute('disabled', '');
}

function playerTurn (who, id) {
  info('C\'est à ' + who + ' de jouer.');

  setPlayingPlayer(id);
}

function passed (who) {
  info(who + ' a passé son tour.');
}

function newStack () {
  lastCards = [];

  stack.classList.add('finished');

  setTimeout(function () {
    stack.classList.remove('finished');
    stack.innerHTML = '';
  }, 1000);
}

function wasSkipped (who, next, id) {
  setPlayingPlayer(id);
  error(who + ' a fait passer votre tour ! C\'est à ' + next + ' de jouer.');
}

function someoneWasSkipped (who, skipped, next, id) {
  setPlayingPlayer(id);
  info(who + ' a fait passer le tour de ' + skipped + ' ! C\'est à ' + next + ' de jouer.');
}

function skippedAndYourTurn (who, skipped, previous, id) {
  setPlayingPlayer(id);
  success(who + ' a fait passer le tour de ' + skipped + ' ! C\'est à vous de jouer.');

  yourTurn(previous);
}

function someoneWon (who) {
  info(who + ' est président !');
}

function won () {
  success('Vous êtes président !');
}

function someoneLost (who) {
  info(who + ' est le trou du cul !');
}

function lost () {
  error('Vous êtes le trou du cul !');
}

function someoneFinished (who) {
  info(who + ' a terminé.');
}

function finished () {
  success('Vous avez terminé.');
}

function opponentsCards (cards) {
  hands.forEach(function (hand, index) {
    var opponentsCards = hand.querySelectorAll('.opponent-card');

    for (var i = 0; i < opponentsCards.length - cards[index]; i++) {
      hand.removeChild(hand.lastChild)
    }
  });
}

function opponentsNames (names, ids) {
  opponentsNames.forEach(function (opponentName, index) {
    opponentName.dataset.id = ids[index];
    opponentName.innerHTML = names[index];
  });
}

function gameFinished (winnerName, loserName) {
  iziToast.show({
    title: 'Partie terminée !',
    timeout: 10000,
    message: 'La partie vient de se terminer.<br><b>' + winnerName + '</b> est le président.<br>' + loserName + ' est le trou du cul.',
    position: 'center',
    color: 'blue'
  });
}

function startPlaying (name, roomName) {
  socket.emit('newPlayer', name);

  socket.on('receiveHand', receiveHand);
  socket.on('yourTurn', yourTurn);
  socket.on('stack', stack);
  socket.on('validCoup', validCoup);
  socket.on('playerTurn', playerTurn);
  socket.on('passed', passed);
  socket.on('newStack', newStack);
  socket.on('wasSkipped', wasSkipped);
  socket.on('someoneWasSkipped', someoneWasSkipped);
  socket.on('skippedAndYourTurn', skippedAndYourTurn);
  socket.on('someoneWon', someoneWon);
  socket.on('won', won);
  socket.on('someoneLost', someoneLost);
  socket.on('lost', lost);
  socket.on('someoneFinished', someoneFinished);
  socket.on('finished', finished);
  socket.on('opponentsCards', opponentsCards);
  socket.on('opponentsNames', opponentsNames);
  socket.on('gameFinished', gameFinished);

  stack.addEventListener('click', function () {
    lastCards.forEach(function (card) {
      if (card.classList.contains('exposed')) {
        card.classList.remove('exposed');
      } else {
        card.classList.add('exposed');
      }
    })
  });

  playButton.addEventListener('click', function () {
    socket.emit('coup', selectedCards);
  });

  passButton.addEventListener('click', function () {
    selectedDivs.forEach(function (div) {
      toggleSelectedCard.call(div);
    });

    selectedDivs = [];

    socket.emit('pass');
  });
}

loginName.addEventListener('keyup', function (e) {
  if (e.key === 'Enter') {
    login(this.value);
  }
});

function login(name) {
  loginForm.classList.add('hidden');
  board.classList.remove('hidden');
  myself.innerHTML = name;
  socket.emit('join', roomsSelect.value, name);
  startPlaying(name, roomsSelect.value);
}
