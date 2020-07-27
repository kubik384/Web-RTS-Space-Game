"use strict";

import { Game } from './modules/game.js';

var game;
var socket = io();



async function start() {
	
	game = new Game(socket);
	//Document listeners
	document.removeEventListener('DOMContentLoaded', start);
	var buttons = document.getElementsByClassName('resource_btn');
	for(var i = 0; i < buttons.length; i++) {
		buttons[i].addEventListener('click', event => { game.update_resource(event.target.id.split('_')[1], 10) });
	}
	
	buttons = document.getElementsByClassName('building_btn');
	for(var i = 0; i < buttons.length; i++) {
		buttons[i].addEventListener('click', event => { game.upgrade_building(event.target.id.split('_')[1]) });
	}

	//socket events
	socket.on('message', game.process_incoming_message);
	socket.on('starter_datapack', game.display_starter_datapack.bind(game));

	game.request_data();
}




if (document.readyState !== 'loading') {
	start();
} else {
	document.addEventListener("DOMContentLoaded", start);
}