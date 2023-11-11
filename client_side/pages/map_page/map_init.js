"use strict";

import { Game } from './map.js';

var game;
var socket = io({ auth: { token: document.cookie.split('token=')[1] }} );


async function start() {
	game = new Game(socket);
	document.removeEventListener('DOMContentLoaded', start);

	socket.on('map_datapack', game.setup_game.bind(game));
	socket.on('game_update', game.process_server_update.bind(game));
	socket.on('system_generated', game.switch_focus.bind(game));
	socket.on('new_report', game.add_new_report_counter);

    game.request_data();
}




if (document.readyState !== 'loading') {
	start();
} else {
	document.addEventListener("DOMContentLoaded", start);
}