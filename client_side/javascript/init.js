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
		buttons[i].addEventListener('click', event => { game.update_resource(event.currentTarget.id.split('_')[1], 100) });
	}
	
	buttons = document.getElementsByClassName('building_btn');
	for(var i = 0; i < buttons.length; i++) {
		buttons[i].addEventListener('click', event => { game.upgrade_building(event.currentTarget.id.split('-')[1]) });
	}

	buttons = document.getElementsByClassName('downgrade_btn');
	for(var i = 0; i < buttons.length; i++) {
		buttons[i].addEventListener('click', event => { game.downgrade_building(event.currentTarget.id.split('-')[1]) });
	}

	document.addEventListener('click',function(e) {
		if(e.target && e.target.getAttribute('class') == 'cancel'){
			game.cancel_building_update(e.target.dataset.building);
		}
	});

	//socket events
	socket.on('message', game.process_incoming_message);
	socket.on('starter_datapack', game.display_starter_datapack.bind(game));
	socket.on('building_fetch_result', game.save_fetched_building.bind(game));

	game.request_data();
}




if (document.readyState !== 'loading') {
	start();
} else {
	document.addEventListener("DOMContentLoaded", start);
}