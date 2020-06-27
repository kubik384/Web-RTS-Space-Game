"use strict";

import { Game } from './modules/game.js';

var game;
var socket = io();

function start() {
	document.removeEventListener('DOMContentLoaded', start);
	game = new Game(socket);

	socket.on('Message', message => {
		game.process_incoming_message(message);
	});
	
	socket.on('pong', function(ms) {
		//console.log(ms);
	});

	game.process_incoming_message('Connecting to the server...', false);
	game.request_data();
}

if (document.readyState !== 'loading') {
	start();
} else {
	document.addEventListener("DOMContentLoaded", start);
}