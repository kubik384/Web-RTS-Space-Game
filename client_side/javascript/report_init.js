"use strict";

import { Game } from './main_modules/report.js';

var socket = io({ auth: { token: document.cookie.split('token=')[1] }} );
var game = new Game(socket);
game.request_datapack();

socket.on('report_datapack', game.save_reports.bind(game));

async function start() {
	game.display_reports();
	socket.on('report_details', game.load_report.bind(game));
	socket.on('new_report', game.add_new_report_counter);
	socket.on('fr_availability', game.get_fr_status.bind(game));
	document.removeEventListener('DOMContentLoaded', start);
}




if (document.readyState !== 'loading') {
	start();
} else {
	document.addEventListener("DOMContentLoaded", start);
}