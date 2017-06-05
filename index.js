var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var chalk = require('chalk');

var Room = require('./room');
var rooms = [];
rooms.push(new Room('Soultz-les-Bains', io));
rooms.push(new Room('Strasbourg', io));

function findRoomByName (name) {
  return rooms.find(function (room) {
    return room.name === name;
  });
}

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', function (socket) {
  // envoyer la liste des rooms
  socket.emit('roomsList', rooms.map(function (room) { return room.name; }));

  socket.on('join', function (roomName, name) {
    var room = findRoomByName(roomName);

    if (room) {
      socket.join(roomName);
      room.join(socket);
    }
  });
});

http.listen(3000);
