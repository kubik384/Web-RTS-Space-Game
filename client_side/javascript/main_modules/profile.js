"use strict";

import { Base_Page } from './base_page.js';

var socket = io({ auth: { token: document.cookie.split('token=')[1] }} );
var page = new Base_Page(socket);
const query_string = window.location.search;
const url_parameters = new URLSearchParams(query_string);
let username = url_parameters.get('username');
let profile_datapack;
let loaded_page = false;

socket.on('profile_datapack', load_profile_data);
socket.emit('request_profile_datapack', username);

function load_profile_data(p_profile_datapack) {
	console.log(p_profile_datapack);
	if (loaded_page) {
		page.setup_page(JSON.parse(p_profile_datapack)).then(() => {;
			display_profile_data(JSON.parse(p_profile_datapack));
		});
	} else {
		profile_datapack = JSON.parse(p_profile_datapack);
	}
}

function display_profile_data(profile_datapack) {
	let profile_data = profile_datapack.profile_details;
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
	if (profile_datapack !== undefined) {
		display_profile_data(profile_datapack);
		page.setup_page(profile_datapack);
	}
	loaded_page = true;
}




if (document.readyState !== 'loading') {
	init();
} else {
	document.addEventListener("DOMContentLoaded", init);
}