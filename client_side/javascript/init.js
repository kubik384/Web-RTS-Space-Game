"use strict";

import { Game } from './modules/game.js';

var game;
var socket = io();



async function start() {
	game = new Game(socket);

	//Document listeners
	document.removeEventListener('DOMContentLoaded', start);
	document.getElementById('get_coins').addEventListener('click', game.add_resources.bind(game));

	//socket events
	socket.on('message', game.process_incoming_message);
	socket.on('starter_datapack', game.display_data);
	socket.on('added_credits', game.add_credits);

	game.request_data();
}




if (document.readyState !== 'loading') {
	start();
} else {
	document.addEventListener("DOMContentLoaded", start);
}