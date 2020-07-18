"use strict";

import { Game } from './modules/game.js';

var game;
var socket = io();



async function start() {
	game = new Game(socket);

	//Document listeners
	document.removeEventListener('DOMContentLoaded', start);
	document.getElementsByName('button').addEventListener('click', game.send_res_update.bind(game));

	//socket events
	socket.on('message', game.process_incoming_message);
	socket.on('starter_datapack', game.display_data);
	socket.on('updated_resource', game.update_resource);

	game.request_data();
}




if (document.readyState !== 'loading') {
	start();
} else {
	document.addEventListener("DOMContentLoaded", start);
}