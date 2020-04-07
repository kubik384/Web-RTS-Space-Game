"use strict"

var express = require('express');
var app = express();
var http = require('http');
var path = require('path');
var server = http.Server(app);
var io = require('socket.io')(server, {pingInterval: 1500});
app.set('port', 8080);
app.use('/client_side', express.static(__dirname + '/../' + '/client_side'));// Routing
app.get('/', function(request, response) {
  response.sendFile(path.join(__dirname + '/../' + '/client_side', 'index.html'));
});

// Starts the server
server.listen(8080, function() {
	console.log('Starting server on port 8080');
});

// Add the WebSocket handlers
io.on('connection', socket => {
	socket.on('new_player', () => {
		socket.emit('Message', 'Connection established...');
		game.add_player(socket.id);
		socket.emit('Message', 'Number of players: ' + game.get_player_number());
	}); 

	socket.on('command', command => {
		socket.emit('Message', game.process_command(command));
	})

	socket.on('disconnect', () => {
		game.remove_player(socket.id);
	});
});

var Game = require('./modules/s_game.js');

var game = new Game();