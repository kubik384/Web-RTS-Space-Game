"use strict";

import { Game } from './alliance.js';

var socket = io({ auth: { token: document.cookie.split('token=')[1] }} );
var game = new Game(socket);
socket.on('alliance_datapack', game.load_alliance_datapack.bind(game));
socket.emit('request_alliance_datapack');

async function start() {
	game.setup_page();
	socket.on('new_report', game.add_new_report_counter);
	document.removeEventListener('DOMContentLoaded', start);
}

if (document.readyState !== 'loading') {
	start();
} else {
	document.addEventListener("DOMContentLoaded", start);
}