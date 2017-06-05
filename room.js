var utils = require('./utils');

var room = function (name, io) {
  var cards = require('./public/js/cards');
  // teste si une carte est plus forte ou la même qu'une autre
  var isStrongerThanOrEqual = cards.isStrongerThanOrEqual;
  var deck = [],            // liste des cartes
      stack = [],           // cartes empilées, réinitialisée à chaque tour
      playersFinished = []; // liste des index des joueurs ayant terminé leur paquet
  var players = {};         // liste des joueurs. clés = ID socket, valeurs = {name,cards}
  var playerPlaying = -1,   // index du joueur en train de jouer
      lastPlayer = -1,      // index du dernier joueur ayant joué
      loser = -1,           // index du perdant
      winner = -1;          // index du gagnant
  var passes = 0;           // nombre de tours passés
  var skippedLast = false,  // indique si le dernier tour a déjà été sauté
      gameRunning = false;  // indique si une partie est en cours

  var roomName = name;
  this.name = name;

  /**
   * Indique le nombre de passes maximum
   * @return {int}
   */
  function maxPasses() {
    return 4 - playersFinished.length;
  }

  /**
   * Indique si la pile de cartes doit être vidée si plus personne ne peut joueur
   * @return {boolean}
   */
  function shouldRestartAfterPass() {
    if (passes === maxPasses()) {
      passes = 0;
      return true;
    }

    return false;
  }

  /**
   * Le dernier coup joué
   * @return {array} Liste de cartes jouées au dernier tour
   */
  function lastCoup() {
    return stack.length > 0 ? stack[stack.length - 1] : [];
  }

  /**
   * Nombre de cartes au dernier coup
   * @return {int}
   */
  function lastCoupLength() {
    return lastCoup().length;
  }

  /**
   * Dernière carte ayant été jouée
   * @return {string}
   */
  function lastCard() {
    return lastCoupLength() > 0 ? lastCoup()[0] : '';
  }

  /**
   * Retourne la liste des IDs sockets
   * @return {array}
   */
  function getPlayers() {
    return Object.keys(players);
  }

  /**
   * Retourne le nombre de joueurs
   * @return {int}
   */
  function getPlayersLength() {
    return getPlayers().length;
  }

  this.players = getPlayersLength;

  /**
   * Retourne l'objet du joueur en train de jouer
   * @return {object}
   */
  function getCurrentPlayer() {
    return players[getPlayers()[playerPlaying]];
  }

  /**
   * Retourne l'objet du joueur en fonction de son index
   * @param  {int} index L'index du joueur à récupérer
   * @return {object}
   */
  function getPlayerFromIndex(index) {
    return players[getPlayers()[index]];
  }

  /**
   * Retourne l'ID socket d'un joueur à partir de son index
   * @param  {int} index L'index du joueur à récupérer
   * @return {string}    L'ID socket du joueur
   */
  function getPlayerId(index) {
    return getPlayers()[index];
  }

  /**
   * Retourne le nom d'un joueur à partir d'un socket
   * @param  {object} socket Le socket
   * @return {string}        Le nom du joueur
   */
  function getNameFromSocket(socket) {
    return players[socket.id].name;
  }

  /**
   * Retourne le nom d'un joueur avec son index
   * @param  {int} index L'index du joueur
   * @return {string}       Le nom du joueur
   */
  function getNameFromIndex(index) {
    return getPlayerFromIndex(index).name;
  }

  function newGame() {
    gameRunning = true;
    utils.success('Starting new game');

    getPlayers().forEach(function (id) {
      var hand = utils.giveHand(deck);

      players[id].cards = hand;
      players[id].conn.emit('receiveHand', hand);
    });

    var firstPlayerIndex = Math.floor(Math.random() * 3);
    playerPlaying = firstPlayerIndex;
    givePlayerTurn();
  }

  function reset() {
    utils.info('Resetting game');

    deck = cards.cards.slice();

    playersFinished = [];
    winner = -1;
    loser = -1;
    lastPlayer = -1;
    passes = 0;
    skippedLast = false;
    newStack();

    getPlayers().forEach(function (id) {
      players[id].cards = [];
      players[id].conn.emit('receiveHand', []);
    });

    if (getPlayersLength() === 4) {
      newGame();
    }
  }

  function givePlayerTurn() {
    if (!gameRunning) return;

    var player = getCurrentPlayer();
    var name = player.name;

    if (player) {
      utils.info('It\'s ' + name + '\'s turn');
      player.conn.emit('yourTurn', lastCoup());
      player.conn.to(roomName).broadcast.emit('playerTurn', name, getPlayerId(playerPlaying));
    }
  }

  function nextPlayerIndex() {
    var index = playerPlaying;

    do {
      index = ++index % 4;
    } while (playersFinished.indexOf(index) !== -1);

    return index;
  }

  function nextPlayer() {
    if (!gameRunning) return;

    playerPlaying = nextPlayerIndex();
    givePlayerTurn();
  }

  function newStack() {
    // vider la pile de carte pour une nouvelle série
    stack = [];
    io.to(roomName).emit('newStack');
    showRemainingCards();
  }

  function removeCardsFromPlayer(cards) {
    var player = getCurrentPlayer();
    var hand = player.cards;

    cards.forEach(function (card) {
      hand.splice(hand.indexOf(card), 1);
    });

    var hasOnly2s = hand.every(function (card) {
      return card.slice(0, -1) === '2';
    });

    // si le joueur n'a plus de carte dans sa main, il a gagné
    if (hand.length === 0) {
      playersFinished.push(playerPlaying);

      // s'il n'y a pas déjà un vainceur et qu'il n'est pas le trou du cul
      if (winner === -1 && loser !== playerPlaying) {
        player.conn.emit('won');
        player.conn.to(roomName).broadcast.emit('someoneWon', player.name);
        winner = playerPlaying;
      } else {
        player.conn.emit('finished');
        player.conn.to(roomName).broadcast.emit('someoneFinished', player.name);
      }
    }
    // s'il ne reste que des 2, le joueur a perdu
    else if (hasOnly2s) {
      player.conn.emit('lost');
      player.conn.to(roomName).broadcast.emit('someoneLost', player.name);
      loser = playerPlaying;
      playersFinished.push(playerPlaying);
      nextPlayer();
    } else if (playersFinished.length === 3) {
      endGame();
    }
  }

  function endGame() {
    var loserName = '';

    if (loser !== -1) {
      loserName = getNameFromIndex(loser);
    } else {
      loserName = getNameFromIndex(playersFinished[3]);
    }

    var winnerName = getNameFromIndex(winner);

    io.to(roomName).emit('gameFinished', winnerName, loserName);
  }

  function showRemainingCards() {
    getPlayers().forEach(function (player, index) {
      var currentPlayer = players[player];
      var cards = []; // dans l'ordre : joueur après, joueur encore après, joueur avant

      for (var i = 1; i <= 3; i++) {
        cards.push(getPlayerFromIndex((index + i) % 4).cards.length);
      }

      currentPlayer.conn.emit('opponentsCards', cards);
    });
  }

  function sendNames() {
    getPlayers().forEach(function (player, index) {
      var currentPlayer = players[player];
      var names = []; // dans l'ordre : joueur après, joueur encore après, joueur avant
      var ids = [];

      for (var i = 1; i <= 3; i++) {
        var curr = ((index + i) % 4);
        names.push(getNameFromIndex(curr));
        ids.push(getPlayerId(curr));
      }

      currentPlayer.conn.emit('opponentsNames', names, ids);
    });
  }

  // if (getPlayersLength() < 4) {
  //   socket.emit('playersNeeded', 4 - getPlayersLength());
  // } else if (getPlayersLength() > 4) {
  //   socket.emit('currentlyPlaying');
  // }

  this.join = function (socket) {
    function newPlayer (name) {
      utils.info('Bienvenue, ' + name);
      players[socket.id] = {conn: socket, cards: [], name: name};

      if (getPlayersLength() < 4) {
        io.to(roomName).emit('playersNeeded', 4 - getPlayersLength());
      }

      if (getPlayersLength() === 4) {
        sendNames();
        reset();
      }
    }

    function coup (cards) {
      var name = getNameFromSocket(socket);
      utils.info('New coup from ' + name);

      var playerIndex = getPlayers().indexOf(socket.id);

      // ne pas autoriser le coup si pas le bon joueur
      if (playerIndex !== playerPlaying) return;

      // fin du pli si c'est un 2
      if (cards[0].slice(0, -1) === '2') {
        utils.info(name + ' won this stack');
        socket.emit('validCoup');
        removeCardsFromPlayer(cards);
        newStack();
        givePlayerTurn();
        return;
      }

      var allTheSameCards = cards.every(function (card) {
        return card.slice(0, -1) === cards[0].slice(0, -1);
      });

      if ((lastCoupLength() === 0 || (lastCoupLength() > 0 && lastCoupLength() === cards.length)) && isStrongerThanOrEqual(cards[0], lastCard()) && allTheSameCards) {
        socket.emit('validCoup');
        io.to(roomName).emit('stack', cards);
        lastPlayer = playerPlaying;

        removeCardsFromPlayer(cards);
        showRemainingCards();

        // test si deux fois la même carte pour passer le tour
        if (lastCard() && lastCard().slice(0, -1) === cards[0].slice(0, -1) && !skippedLast) {
          var skipper = getCurrentPlayer();
          playerPlaying = nextPlayerIndex();
          var skipped = getCurrentPlayer();
          playerPlaying = nextPlayerIndex();
          var nowPlaying = getCurrentPlayer();

          skipped.conn.emit('wasSkipped', skipper.name, nowPlaying.name, getPlayerId(playerPlaying));
          skipped.conn.to(roomName).broadcast.emit('someoneWasSkipped', skipper.name, skipped.name, nowPlaying.name, getPlayerId(playerPlaying));
          utils.info(skipper.name + ' has skipped ' + skipped.name + '\'s turn. Now ' + nowPlaying.name);

          stack.push(cards);

          skippedLast = true;

          nowPlaying.conn.emit('skippedAndYourTurn', skipper.name, skipped.name, lastCoup());
        } else {
          stack.push(cards);
          skippedLast = false;
          nextPlayer();
        }
      }
    }

    function pass () {
      var name = getNameFromSocket(socket);
      utils.info(name + ' passed');

      io.to(roomName).emit('passed', name);

      socket.emit('validCoup');

      if (playerPlaying === lastPlayer || shouldRestartAfterPass()) {
        utils.info('No more coups available, starting new stack');
        newStack();
        givePlayerTurn();
      } else {
        nextPlayer();
      }
    }

    function disconnect () {
      utils.warn('Player disconnected');
      delete players[socket.id];

      if (getPlayersLength() < 4) {
        gameRunning = false;
      }
    }

    socket.on('newPlayer', newPlayer);
    socket.on('coup', coup);
    socket.on('pass', pass);
    socket.on('disconnect', disconnect);
  };

  return this;
};

module.exports = room;
