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

var socket = io();

// ping pong
setInterval(function () {
  socket.emit('stillHere');
}, 3000);

socket.on('currentlyPlaying', function () {
  info('Une partie est déjà en train de se jouer.', 'Désolé…');
});

socket.on('playersNeeded', function (needed) {
  info('Il manque ' + needed + ' joueurs.');
});

function startPlaying(name) {
  socket.emit('newPlayer', name);

  socket.on('receiveHand', function (cards) {
    hand.innerHTML = '';

    buildOpponentsHands();

    cards.forEach(function (card) {
      var cardDiv = createCard(card);
      cardDiv.addEventListener('click', toggleSelectedCard.bind(cardDiv));

      hand.appendChild(cardDiv);
    });
  });

  socket.on('yourTurn', yourTurn);

  socket.on('stack', function (cards) {
    lastCards = [];

    cards.forEach(function (card) {
      var cardDiv = createCard(card, true);
      stackCards.push(cardDiv);
      lastCards.push(cardDiv);

      stack.appendChild(cardDiv);
    });
  });

  socket.on('validCoup', function () {
    selectedDivs.forEach(function (card) {
      card.parentNode.removeChild(card);
    });

    selectedCards = [];
    selectedDivs = [];
    isPlaying = false;

    playButton.setAttribute('disabled', '');
    passButton.setAttribute('disabled', '');
  });

  socket.on('playerTurn', function (who, id) {
    info('C\'est à ' + who + ' de jouer.');

    setPlayingPlayer(id);
  });

  socket.on('passed', function (who) {
    info(who + ' a passé son tour.');
  });

  socket.on('newStack', function () {
    lastCards = [];

    stack.classList.add('finished');

    setTimeout(function () {
      stack.classList.remove('finished');
      stack.innerHTML = '';
    }, 1000);
  });

  socket.on('wasSkipped', function (who, next, id) {
    setPlayingPlayer(id);
    error(who + ' a fait passer votre tour ! C\'est à ' + next + ' de jouer.');
  });

  socket.on('someoneWasSkipped', function (who, skipped, next, id) {
    setPlayingPlayer(id);
    info(who + ' a fait passer le tour de ' + skipped + ' ! C\'est à ' + next + ' de jouer.');
  });

  socket.on('skippedAndYourTurn', function (who, skipped, previous, id) {
    setPlayingPlayer(id);
    success(who + ' a fait passer le tour de ' + skipped + ' ! C\'est à vous de jouer.');

    yourTurn(previous);
  });

  socket.on('someoneWon', function (who) {
    info(who + ' est président !');
  });

  socket.on('won', function () {
    success('Vous êtes président !');
  });

  socket.on('someoneLost', function (who) {
    info(who + ' est le trou du cul !');
  });

  socket.on('lost', function () {
    error('Vous êtes le trou du cul !');
  });

  socket.on('someoneFinished', function (who) {
    info(who + ' a terminé.');
  });

  socket.on('finished', function () {
    success('Vous avez terminé.');
  });

  socket.on('opponentsCards', function (cards) {
    hands.forEach(function (hand, index) {
      var opponentsCards = hand.querySelectorAll('.opponent-card');

      for (var i = 0; i < opponentsCards.length - cards[index]; i++) {
        hand.removeChild(hand.lastChild)
      }
    });
  });

  socket.on('opponentsNames', function (names, ids) {
    opponentsNames.forEach(function (opponentName, index) {
      opponentName.dataset.id = ids[index];
      opponentName.innerHTML = names[index];
    });
  });

  socket.on('gameFinished', function (winnerName, loserName) {
    iziToast.show({
      title: 'Partie terminée !',
      timeout: 10000,
      message: 'La partie vient de se terminer.<br><b>' + winnerName + '</b> est le président.<br>' + loserName + ' est le trou du cul.',
      position: 'center',
      color: 'blue'
    });
  });

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
  startPlaying(name);
}