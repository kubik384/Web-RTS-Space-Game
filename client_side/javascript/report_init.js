"use strict";

import { Game } from './main_modules/report.js';

var socket = io();
var game = new Game(socket);
game.request_data();

//socket events
socket.on('message', game.process_incoming_message);
socket.on('report_datapack', game.save_reports.bind(game));

async function start() {
	game.setup_game();
	document.removeEventListener('DOMContentLoaded', start);
}




if (document.readyState !== 'loading') {
	start();
} else {
	document.addEventListener("DOMContentLoaded", start);
}