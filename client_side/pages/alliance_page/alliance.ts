"use strict"

import { Utils } from '../javascript/misc_modules/utils.js';
import { Base_Page } from '../base_page/base_page.js';
let utils = new Utils();

class Game extends Base_Page {
    constructor(socket) {
        super();
        this.socket = socket;
        this.selected_all_el = document.querySelector('#alliance_navbar > p:first-of-type');
        this.page_loaded = false;
    }

    setup_page() {
        if (this.alliance_datapack !== undefined) {
            super.setup_page(this.alliance_datapack);
            let alliance_navbar_els = document.querySelectorAll('#alliance_navbar > p');
            for (let i = 0; i < alliance_navbar_els.length; i++) {
                alliance_navbar_els[i].addEventListener('click', e => {
                    if (e.currentTarget.id !== this.selected_all_el.id) {
                        e.currentTarget.classList.remove('clickable');
                        document.getElementById(e.currentTarget.id + '_container').style.display = '';
                        this.selected_all_el.classList.add('clickable');
                        document.getElementById(this.selected_all_el.id + '_container').style.display = 'none';
                        this.selected_all_el = e.currentTarget;
                    }
                });
            }
            if (this.alliance_datapack.alliance_details !== undefined) {
                document.getElementById('alliance_navbar').style.display = '';
                document.getElementById('preview_container').style.display = '';
                document.getElementById('name').append(this.alliance_datapack.alliance_details.name);
                document.getElementById('acronym').append(this.alliance_datapack.alliance_details.acronym);
                document.getElementById('description').append(this.alliance_datapack.alliance_details.description);
                document.getElementById('member_count').append(this.alliance_datapack.alliance_details.member_count);
                let member_table = document.getElementById('members_table');
                let rank = 1;
                for (let i = 0; i < this.alliance_datapack.members.length; i++) {
                    let member_row = member_table.insertRow(-1);
                    let rank_cell = member_row.insertCell(-1);
                    rank_cell.append(rank++ + '.');
                    let username_cell = member_row.insertCell(-1);
                    let username_p = document.createElement('p');
                    username_p.append(this.alliance_datapack.members[i].username);
                    username_p.classList.add('clickable');
                    username_p.addEventListener('click', e => {
                        this.open_profile_iframe(e.currentTarget.textContent);
                    });
                    username_cell.append(username_p);
                }
            } else {
                document.getElementById('no_alliance_container').style.display = '';
            }
        }
        document.getElementById('invite_member_form').addEventListener('submit', async e => {
            e.preventDefault();
            let input_els = this.getElementsByTagName('input');
            let username_el = input_els[0];
            let username = username_el.value;
            subject_el.value = '';
            this.socket.emit('invite_player', username);
        });
        this.page_loaded = true;
    }

    load_alliance_datapack(p_alliance_datapack) {
        console.log(p_alliance_datapack);
        this.alliance_datapack = JSON.parse(p_alliance_datapack);
        if (this.page_loaded) {
            this.setup_page();
        }
    }
    /*
    const query_string = window.location.search;
    const url_parameters = new URLSearchParams(query_string);
    let alliance = url_parameters.get('alliance');
    if (alliance !== null) {
        this.open_alliance_preview(alliance);
    }
    */
}

export { Game };