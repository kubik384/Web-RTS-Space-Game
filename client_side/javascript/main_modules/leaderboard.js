"use strict";

import { Base_Page } from './base_page.js';

var socket = io({ auth: { token: document.cookie.split('token=')[1] }} );
var page = new Base_Page(socket);
let leaderboard_datapack;
let selected_lb_el = document.querySelector('#leaderboard_toggle > p:first-of-type');
let page_loaded = false;
const query_string = window.location.search;
const url_parameters = new URLSearchParams(query_string);
let leaderboard = url_parameters.get('toggle');

socket.on('leaderboard_datapack', load_leaderboard_datapack);
socket.emit('request_leaderboard_datapack');

function load_leaderboard_datapack(p_leaderboard_datapack) {
    console.log(p_leaderboard_datapack);
	leaderboard_datapack = JSON.parse(p_leaderboard_datapack);
    if (page_loaded) {
        page.setup_page(leaderboard_datapack);
        display_datapack(leaderboard_datapack);
    }
}

function display_datapack(p_leaderboard_datapack) {
    let rank = p_leaderboard_datapack.p_starting_rank;
    let list = p_leaderboard_datapack.player_list;
	for (let i = 0; i < list.length; i++) {
        list[i].rank = rank++;
    }
    table_add_players(list);
    rank = p_leaderboard_datapack.a_starting_rank;
    list = p_leaderboard_datapack.alliance_list;
	for (let i = 0; i < list.length; i++) {
        list[i].rank = rank++;
    }
    table_add_alliances(list);
    if (leaderboard !== null) {
        if (leaderboard == 'alliance') {
            document.getElementById('alliance_leaderboard_container').style.display = '';
            selected_lb_el.classList.add('clickable');
            selected_lb_el = document.getElementById('alliance_toggle');
            selected_lb_el.classList.remove('clickable');
        } else {
            document.getElementById('player_leaderboard_container').style.display = '';
        }
    } else {
        document.getElementById('player_leaderboard_container').style.display = '';
    }
    document.getElementById('leaderboard_toggle').style.display = '';
}

function init() {
	socket.on('new_report', page.add_new_report_counter);
    let leaderboard_toggle_els = document.querySelectorAll('#leaderboard_toggle > p');
    for (let i = 0; i < leaderboard_toggle_els.length; i++) {
        leaderboard_toggle_els[i].addEventListener('click', e => {
            if (e.currentTarget.id!== selected_lb_el.id) {
                e.currentTarget.classList.remove('clickable');
                selected_lb_el.classList.add('clickable');
                selected_lb_el = e.currentTarget;
                if (e.currentTarget.id == 'player_toggle') {
                    document.getElementById('player_leaderboard_container').style.display = '';
                    document.getElementById('alliance_leaderboard_container').style.display = 'none';
                } else {
                    document.getElementById('player_leaderboard_container').style.display = 'none';
                    document.getElementById('alliance_leaderboard_container').style.display = '';
                }
            }
        });
    } 
    document.getElementById('player_search_form').addEventListener('submit', e => {
        e.preventDefault();
        let player_input = document.getElementById('player_search');
        let username = player_input.value;
        let found_players = leaderboard_datapack.player_list.filter(player => player.username.includes(username));
        let player_rows = document.querySelectorAll('#player_leaderboard_table tr');
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

    document.getElementById('alliance_search_form').addEventListener('submit', e => {
        e.preventDefault();
        let alliance_input = document.getElementById('alliance_search');
        let name = alliance_input.value;
        let found_alliances = leaderboard_datapack.alliance_list.filter(alliance => (alliance.name.includes(name) || alliance.acronym.includes(name)));
        let alliance_rows = document.querySelectorAll('#leaderboard_table tr');
        //first row is header row
        row_loop: for (let i = 1; i < alliance_rows.length; i++) {
            let name = alliance_rows[i].querySelector(':scope > td:first-of-type').textContent;
            for (let j = 0; j < found_alliances.length; j++) {
                if (name == found_alliances[j].name) {
                    found_alliances.splice(j, 1);
                    continue row_loop;
                }
            }
            alliance_rows[i].remove();
        }
        table_add_alliances(found_alliances);
    });
    if (leaderboard_datapack !== undefined) {
        page.setup_page(leaderboard_datapack);
        display_datapack(leaderboard_datapack);
    } else {
        page_loaded = true;
    }
}

function table_add_players(player_list) {
    let leaderboard_table = document.getElementById('player_leaderboard_table');
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

function table_add_alliances(alliance_list) {
    let leaderboard_table = document.getElementById('alliance_leaderboard_table');
    for (let i = 0; i < alliance_list.length; i++) {
        let alliance_row = leaderboard_table.insertRow(-1);
        let rank_cell = alliance_row.insertCell(-1);
        rank_cell.append(alliance_list[i].rank + '.');
        let name_p = document.createElement('p');
        name_p.append(alliance_list[i].name);
        name_p.classList.add('clickable');
        name_p.addEventListener('click', e => {
            page.open_alliance_iframe(e.currentTarget.textContent);
        });
        let name_cell = alliance_row.insertCell(-1);
        name_cell.append(name_p);
        let member_count_cell = alliance_row.insertCell(-1);
        member_count_cell.append(alliance_list[i].member_count);
    }
}




if (document.readyState !== 'loading') {
	init();
} else {
	document.addEventListener("DOMContentLoaded", init);
}