"use strict";

import { Terminal } from './modules/terminal.js';
import { Game } from './modules/game.js';

var terminal;
var game;
var preventInput = false;

var socket = io();

function request_data() {
	socket.emit('new_player');
}

socket.on('Message', data => {
	console.log(data);
});

socket.on('pong', function(ms) {
	//console.log(ms);
});

function start() {
	request_data();
	terminal = new Terminal(document.getElementById("command_line"));
	game = new Game();
	
	document.addEventListener("keydown", e => {
		if (!preventInput) {
			if (e.key === 'Enter') {
				terminal.send_command();
			} else {
				if (e.key !== 'Control' && e.key !== 'Alt') {
					terminal.enter_input(e.key);
				} else {
					preventInput = true;
					console.log('prev_input');
				}
			}
		}
	});

	document.addEventListener("keyup", e => {
		if (e.key === 'Control' || e.key === 'Alt') {
			preventInput = false;
		}
	});
	

	document.addEventListener("paste", e => {
		e.preventDefault();
		terminal.enter_input(e.clipboardData.getData('text'), true);
	});
}

document.addEventListener("DOMContentLoaded", start);