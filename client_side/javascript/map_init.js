"use strict";

import { Game } from './modules/map.js';

var game;
var socket = io();


async function start() {
	game = new Game(socket);
	window.onresize = game.window_resize_handler();
	document.removeEventListener('DOMContentLoaded', start);

	//socket events
	socket.on('map_datapack', game.setup_game.bind(game));

    game.request_data();
}




if (document.readyState !== 'loading') {
	start();
} else {
	document.addEventListener("DOMContentLoaded", start);
}