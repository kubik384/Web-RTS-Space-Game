"use strict";

import { Game } from './main_modules/message.js';

var socket = io({ auth: { token: document.cookie.split('token=')[1] }} );
var game = new Game(socket);
game.request_datapack();
socket.on('message_datapack', game.save_conversations.bind(game));

async function start() {
	game.display_conversations();
	socket.on('new_report', game.add_new_report_counter);
	socket.on('message_received', game.server_message_confirmation.bind(game));
	socket.on('conversation_created', game.display_created_conversation.bind(game));
	document.removeEventListener('DOMContentLoaded', start);
}

if (document.readyState !== 'loading') {
	start();
} else {
	document.addEventListener("DOMContentLoaded", start);
}