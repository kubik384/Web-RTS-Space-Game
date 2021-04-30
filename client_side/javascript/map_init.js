"use strict";

import { Game } from './main_modules/map.js';

var game;
var socket = io();


async function start() {
	game = new Game(socket);
	document.removeEventListener('DOMContentLoaded', start);

	//socket events
	socket.on('map_datapack', game.setup_game.bind(game));

	socket.on('fleet_assembled', game.assemble_fleet.bind(game));

	socket.on('movepoint_set', game.set_movepoint.bind(game));

	socket.on('fleet_update', game.update_fleet.bind(game));

	socket.on('fleet_destroyed', game.destroy_fleet.bind(game));

    game.request_data();
}




if (document.readyState !== 'loading') {
	start();
} else {
	document.addEventListener("DOMContentLoaded", start);
}