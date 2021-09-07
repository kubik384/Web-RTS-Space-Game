"use strict";

import { Game } from './main_modules/planet.js';

var game;
var socket = io({ auth: { token: document.cookie.split('token=')[1] }} );


async function start() {
	game = new Game(socket);
	document.removeEventListener('DOMContentLoaded', start);

	socket.on('message', game.process_incoming_message);
	socket.on('starter_datapack', game.setup_game.bind(game));
	socket.on('building_fetch_result', game.save_fetched_building.bind(game));
	socket.on('new_report', game.add_new_report_counter);

	game.request_data();
}




if (document.readyState !== 'loading') {
	start();
} else {
	document.addEventListener("DOMContentLoaded", start);
}