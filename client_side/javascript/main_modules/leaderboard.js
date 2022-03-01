"use strict";

import { Base_Page } from './base_page.js';

var socket = io({ auth: { token: document.cookie.split('token=')[1] }} );
var page = new Base_Page(socket);
let player_list;
let loaded_page = false;

socket.on('player_list', load_player_list);
socket.emit('request_player_list');

function load_player_list(p_player_list) {
	player_list = JSON.parse(p_player_list);
	if (loaded_page) {
		display_players(player_list);
	}
}

function display_players(p_player_list, starting_rank = 1) {
    let leaderboard_table = document.getElementById('leaderboard_table');
    let rank = starting_rank;
	for (let i = 0; i < p_player_list.length; i++) {
        let player_row = leaderboard_table.insertRow(-1);
        let rank_cell = player_row.insertCell(-1);
        p_player_list[i].rank = rank;
        rank_cell.append((rank++) + '.');
        let username_p = document.createElement('p');
        username_p.append(p_player_list[i].username);
        username_p.classList.add('clickable');
        username_p.addEventListener('click', e => {
            page.open_profile_iframe(e.currentTarget.textContent);
        });
        let username_cell = player_row.insertCell(-1);
        username_cell.append(username_p);
    }
}

function init() {
	socket.on('new_report', page.add_new_report_counter);
	if (player_list !== undefined) {
		display_profile_data(player_list);
	}
    document.getElementById('player_search_form').addEventListener('submit', e => {
        e.preventDefault();
        let player_input = document.getElementById('player_search');
        let username = player_input.value;
        let found_players = player_list.filter(player => player.username.includes(username));
        let player_rows = document.querySelectorAll('#leaderboard_table tr');
        //first row is header row
        row_loop: for (let i = 1; i < player_rows.length; i++) {
            let username = player_rows[i].querySelector(':scope > td:first-of-type').textContent;
            for (let j = 0; j < found_players.length; j++) {
                if (username == found_players[j].username) {
                    found_players.splice(j, 1);
                    continue row_loop;
                }
            }
            player_rows[i].remove();
        }
        table_add_players(found_players);
    });
	loaded_page = true;
}

function table_add_players(player_list) {
    let leaderboard_table = document.getElementById('leaderboard_table');
    for (let i = 0; i < player_list.length; i++) {
        let player_row = leaderboard_table.insertRow(-1);
        let rank_cell = player_row.insertCell(-1);
        rank_cell.append(player_list[i].rank + '.');
        let username_p = document.createElement('p');
        username_p.append(player_list[i].username);
        username_p.classList.add('clickable');
        username_p.addEventListener('click', e => {
            page.open_profile_iframe(e.currentTarget.textContent);
        });
        let username_cell = player_row.insertCell(-1);
        username_cell.append(username_p);
    }
}




if (document.readyState !== 'loading') {
	init();
} else {
	document.addEventListener("DOMContentLoaded", init);
}