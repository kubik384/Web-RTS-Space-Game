"use strict";

import { Base_Page } from './base_page.js';

var socket = io({ auth: { token: document.cookie.split('token=')[1] }} );
var page = new Base_Page(socket);
const query_string = window.location.search;
const url_parameters = new URLSearchParams(query_string);
let username = url_parameters.get('username');
let profile_details;
let loaded_page = false;

socket.on('profile_details', load_profile_data);
socket.emit('request_profile_details', username);

function load_profile_data(profile_data) {
	if (loaded_page) {
		display_profile_data(JSON.parse(profile_data));
	} else {
		profile_details = JSON.parse(profile_data);
	}
}

function display_profile_data(profile_data) {
	if (profile_data !== null) {
		document.getElementById('player_name').textContent = username;
		document.getElementById('home_planet').textContent = 'Home planet: ' + page.get_object_name(profile_data.space_object_id);
	} else {
		document.getElementById('player_name').textContent = 'User does not exist!';
		document.getElementById('send_message').style.display = 'none';
	}
}

function init() {
	let send_message_el = document.getElementById('send_message');
	send_message_el.setAttribute('href', '/game/messages?username=' + username);
	if (page.inIframe()) {
		document.getElementById('navbar').style.display = 'none';
	}
	send_message_el.addEventListener('click', e => {
		e.preventDefault();
		window.top.location.href = e.currentTarget.getAttribute('href');
	});
	socket.on('new_report', page.add_new_report_counter);
	if (profile_details !== undefined) {
		display_profile_data(profile_details);
	}
	loaded_page = true;
}




if (document.readyState !== 'loading') {
	init();
} else {
	document.addEventListener("DOMContentLoaded", init);
}