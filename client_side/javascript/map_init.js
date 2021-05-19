"use strict";

import { Game } from './main_modules/map.js';

var game;
var socket = io();


async function start() {
	game = new Game(socket);
	document.removeEventListener('DOMContentLoaded', start);

	//socket events
	socket.on('map_datapack', game.setup_game.bind(game));

	socket.on('fleets_update', game.update_fleets.bind(game));

	socket.on('deleted_so', game.delete_so.bind(game));

	socket.on('added_so', game.add_so.bind(game))

    game.request_data();
}




if (document.readyState !== 'loading') {
	start();
} else {
	document.addEventListener("DOMContentLoaded", start);
}