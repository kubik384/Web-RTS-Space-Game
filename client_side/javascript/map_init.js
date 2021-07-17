"use strict";

import { Game } from './main_modules/map.js';

var game;
var socket = io();


async function start() {
	game = new Game(socket);
	document.removeEventListener('DOMContentLoaded', start);

	//socket events
	socket.on('map_datapack', game.setup_game.bind(game));
	socket.on('game_update', game.process_server_update.bind(game));
	socket.on('system_generated', game.switch_focus.bind(game));

    game.request_data();
}




if (document.readyState !== 'loading') {
	start();
} else {
	document.addEventListener("DOMContentLoaded", start);
}