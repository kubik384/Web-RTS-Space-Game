"use strict";

import { Game } from './modules/game.js';

var game;
var socket = io();



async function start() {
	//TODO figure out how to do a game loop (1 loop/sec) - use setInterval? Update resources regularly
	
	game = new Game(socket);
	//Document listeners
	document.removeEventListener('DOMContentLoaded', start);
	var buttons = document.getElementsByClassName('resource_btn');
	for(var i = 0; i < buttons.length; i++) {
		buttons[i].addEventListener('click', game.update_resources.bind(game));
	}
	
	buttons = document.getElementsByClassName('building_btn');
	for(var i = 0; i < buttons.length; i++) {
		buttons[i].addEventListener('click', game.upgrade_building.bind(game));
	}

	//socket events
	socket.on('message', game.process_incoming_message);
	socket.on('starter_datapack', game.display_data);

	game.request_data();
}




if (document.readyState !== 'loading') {
	start();
} else {
	document.addEventListener("DOMContentLoaded", start);
}