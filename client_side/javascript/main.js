"use strict";

var socket = io();

//Requests game_state from server
function request_data() {
	socket.emit('new_player');
}

//On server respond with game_state data call start_game
socket.on('Message', data => {
	console.log(data);
});

socket.on('pong', function(ms) {
	console.log(ms);
});