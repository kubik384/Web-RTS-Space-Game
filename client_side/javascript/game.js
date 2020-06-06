"use strict";

import { Game } from './modules/game.js';

var game;
var preventInput = false;

var socket = io();

function request_data() {
	socket.emit('new_player');
}

function start() {
	game = new Game(socket);

	socket.on('Message', message => {
		game.process_incoming_message(message);
	});
	
	socket.on('pong', function(ms) {
		//console.log(ms);
	});

	game.process_incoming_message('Connecting to the server...', false);
	request_data();


	
	document.addEventListener("keydown", e => {
		game.process_keyDown_input(e);
	});

	document.addEventListener("keyup", e => {
		game.process_keyUp_input(e);
	});
	

	document.addEventListener("paste", e => {
		game.process_paste_input(e);
	});
}

document.addEventListener("DOMContentLoaded", start);