"use strict";

import { Game } from './modules/game.js';

var game;
var socket = io();



async function start() {
	
	game = new Game(socket);
	//Document listeners
	document.removeEventListener('DOMContentLoaded', start);

	//socket events
	socket.on('message', game.process_incoming_message);
	socket.on('starter_datapack', game.setup_game.bind(game));
	socket.on('building_fetch_result', game.save_fetched_building.bind(game));

	game.request_data();
}




if (document.readyState !== 'loading') {
	start();
} else {
	document.addEventListener("DOMContentLoaded", start);
}