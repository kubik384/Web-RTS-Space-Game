"use strict"

import { Utils } from '../misc_modules/utils.js';
import { Base_Page } from './base_page.js';
var utils = new Utils();

class Game extends Base_Page {
    constructor(socket) {
        super();
        this.socket = socket;
        this.lastUpdateTime;
        this.updateLoop;
        this.resource_prods;
        this.resources;
        this.buildings;
        this.units;
        this.unit_ques;
        this.fetched_buildings = {};
    }

    async setup_game(p_datapack) {
        var datapack = JSON.parse(p_datapack);
        console.log(datapack);
        super.setup_page(datapack);

        this.resources = datapack.resources;
        var resource_building_ui_html = '<table id="resource_table"><tbody>';
        for(var resource in datapack.resources) {
            resource_building_ui_html += `
            <tr>
                <td>
                    <img src="/client_side/images/resources/${resource}.png" height="20px"></img>
                </td>
                <td id='${resource}'>
                </td>
            </tr>`;
        }
        
        var button_menu_html = '';
        this.buildings = datapack.building_details;
        for (var i = 0; i < datapack.buildings.length; i++) {
            var building = datapack.buildings.find(b => b.building_id == this.buildings[i].building_id);
            this.buildings[i].update_start = building.update_start;
            this.buildings[i].downgrade = building.downgrade;
            this.buildings[i].level = building.curr_level;

            resource_building_ui_html += `
            <tr>
                <td>
                    <img src="/client_side/images/buildings/${this.buildings[i].name}.png" height="20px"></img>
                </td>
                <td id='${this.buildings[i].name}' class='building_cell'>
                    <span></span><img src="/client_side/images/ui/red_cross.png" class="cancel" data-building='${this.buildings[i].name}' style='display:none;'></img>
                </td>
            </tr>`;
            
            button_menu_html += `
            <div class = 'building_update_button_wrapper'>
                <button id='upgrade-${this.buildings[i].name}' class='upgrade_btn btn'>Upgrade ${this.buildings[i].name} <br />()</button>
                <button id='downgrade-${this.buildings[i].name}' class='downgrade_btn btn'><img src="/client_side/images/ui/downgrade_building.png" height="20px"></button>
            </div>`;
        }
        resource_building_ui_html += '</tbody></table>';
        document.getElementById('resource_building_ui').innerHTML = resource_building_ui_html;
        document.getElementById('button_menu').innerHTML = button_menu_html;

        this.units = datapack.units;
        var units_building = this.buildings.find(b => b.building_id == 4);
        var b_index = units_building.level_details.findIndex(level_detail => level_detail.level == units_building.level);
        var allowed_unit_ids = units_building.level_details[b_index].units;
        var create_units_html = `
        <form id="create_units_form">
            <table id="create_units_table" style="display: ${allowed_unit_ids.length > 0 ? 'table' : 'none'}">
                <thead>
                    <tr>
                        <th>Unit</th>
                        <th>Name</th>
                        <th>Cost</th>
                        <th>Time</th>
                        <th>Build</th>
                    </tr>
                </thead>
                <tbody>`;
        for (var i = 0; i < allowed_unit_ids.length; i++) {
            var u_index;
            if (this.units[allowed_unit_ids[i] - 1].unit_id == allowed_unit_ids[i]) {
                u_index = allowed_unit_ids[i] - 1;
                
            } else {
                u_index = this.units.find(unit => unit.unit_id == allowed_unit_ids[i]).unit_id;
            }
            
            create_units_html += `
            <tr>
                <td>
                    <img src="/client_side/images/units/${this.units[u_index].name}.png" height="20px"></img>
                </td>
                <td>
                    <span>${this.units[u_index].name}</span>
                </td>
                <td>`
                    for (var resource in this.units[u_index].cost) {
                        create_units_html += `${this.units[u_index].cost[resource]} <img src="/client_side/images/resources/${resource}.png" height="20px"></img>`;
                    }
                    create_units_html += `
                </td>
                <td>
                    <span>${this.units[u_index].build_time}</span>
                </td>
                <td>
                    <input type="number" class="unit_create_count" id="unit_${this.units[u_index].unit_id}">
                </td>
            </tr>`;
        }
        create_units_html += '<tr><td colspan="10" id="submit_unit_create_cell"><input type="submit" value="Build"></input></td></tr></tbody></table></form>';
        document.getElementById('create_units_wrapper').innerHTML = create_units_html;
        document.getElementById('create_units_form').addEventListener('submit', event => { 
            event.preventDefault();
            this.build_units(event.currentTarget) ;
        });

        var units_table_html = '<table id="units_table"><tbody>';
        for (var i = 0; i < this.units.length; i++) {
            units_table_html += `
            <tr>
                <td>
                    <img src="/client_side/images/units/${this.units[i].name}.png"></img>
                </td>
                <td id="unit_count_${this.units[i].unit_id}" class="unit_cell">
                    <span>${this.units[i].count}</span>
                </td>
            </tr>`;
        }
        units_table_html += '</tbody></table>';
        document.getElementById('units_wrapper').innerHTML = units_table_html;

        this.unit_ques = datapack.unit_ques;
        var units_que_table_html = `
        <table id="units_que_table">
            <thead>
                <tr>
                    <th>
                        <span>Unit</span>
                    </th>
                    <th>
                        <span>Number</span>
                    </th>
                    <th>
                        <span>Time left</span>
                    </th>
                </tr>
            </thead>
            <tbody>`;
        for (var i = 0; i < this.unit_ques.length; i++) {
            var uq_index = this.units.findIndex(unit => unit.unit_id == this.unit_ques[i].unit_id);
            var timeLeft = this.units[uq_index].build_time * this.unit_ques[i].count - (await utils.get_timestamp() - this.unit_ques[i].calculated_timestamp);
            units_que_table_html += `
            <tr id="unit_que_row_${this.units[uq_index].unit_id}" style="display: ${this.unit_ques[i].count == 0 ? 'none' : 'table-row'}">
                <td>
                    <img src="/client_side/images/units/${this.units[uq_index].name}.png" height="15px"></img>
                    <span>${this.units[uq_index].name}</span>
                </td>
                <td>
                    <span class="count">${this.unit_ques[i].count}</span>
                </td>
                <td>
                    <span class="timeLeft">${timeLeft > 0 ? await utils.seconds_to_time(timeLeft) : 0}</span>
                </td>
            </tr>`;
        }
        units_que_table_html += '</tbody></table>';
        document.getElementById('units_que_wrapper').innerHTML = units_que_table_html;

        var buttons = document.getElementsByClassName('upgrade_btn');
        for(var i = 0; i < buttons.length; i++) {
            buttons[i].addEventListener('click', event => { this.upgrade_building(event.currentTarget.id.split('-')[1]) });
        }

        buttons = document.getElementsByClassName('downgrade_btn');
        for(var i = 0; i < buttons.length; i++) {
            buttons[i].addEventListener('click', event => { this.downgrade_building(event.currentTarget.id.split('-')[1]) });
        }

        buttons = document.getElementsByClassName('cancel');
        for(var i = 0; i < buttons.length; i++) {
            buttons[i].addEventListener('click', event => { this.cancel_building_update(event.currentTarget.dataset.building) });
        }

        var resource_generator = this.buildings.find(building => building.building_id == 2);
        this.resource_prods = resource_generator.level_details.find(ld => ld.level == resource_generator.level).production;

        this.update_resource_ui();
        for (var i = 0; i < this.buildings.length; i++) {
            this.update_building_ui(i);
        }

        this.lastUpdateTime = await utils.get_timestamp();
        this.updateLoop = setInterval(this.update_game.bind(this), 1000);
    }
    
    update_game() {
        utils.get_timestamp().then(async function(currTime) {
            var timePassed = currTime - this.lastUpdateTime;
            for (var resource_type in this.resource_prods) {
                this.resources[resource_type] += this.resource_prods[resource_type] * timePassed;
                this.update_resource_ui();
            }
            
            for (var i = 0; i < this.buildings.length; i++) {
                if (this.buildings[i].update_start !== null) {
                    await this.update_building_ui(i);
                    var l_index = this.buildings[i].level_details.findIndex(ld => ld.level == (this.buildings[i].level - this.buildings[i].downgrade));
                    var timeLeft = this.buildings[i].update_start + this.buildings[i].level_details[l_index].upgrade_time - currTime;
                    if (timeLeft <= 0) {
                        await this.update_building(this.buildings[i].building_id);
                    } else if (timeLeft <= 10) {
                        this.fetch_building_details(this.buildings[i].building_id, this.buildings[i].level + (this.buildings[i].downgrade ? -2 : 2));
                    }
                }
            }
            this.update_unit_que(currTime);
            this.lastUpdateTime = currTime;
        }.bind(this));
    }

    async upgrade_building(p_building) {
        var b_index = this.buildings.findIndex(building => building.name == p_building);
        var l_index = this.buildings[b_index].level_details.findIndex(ld => ld.level == this.buildings[b_index].level);
        if (this.buildings[b_index].update_start === null && this.buildings[b_index].level_details[l_index].upgrade_time >= 0) {
            var changed_resources = {};
            var sufficient_resources = true;
            for (var resource_type in this.buildings[b_index].level_details[l_index].upgrade_cost) {
                if (this.resources[resource_type] - this.buildings[b_index].level_details[l_index].upgrade_cost[resource_type] >= 0) {
                    changed_resources[resource_type] = this.resources[resource_type] - this.buildings[b_index].level_details[l_index].upgrade_cost[resource_type];
                } else {
                    sufficient_resources = false;
                    break;
                }
            }
            if (sufficient_resources && this.buildings[b_index].level_details[l_index].upgrade_time >= 0) {
                this.socket.emit('upgrade_building', p_building);
                this.resources = changed_resources;
                this.update_resource_ui();
                this.buildings[b_index].update_start = await utils.get_timestamp();
                this.update_building_ui(b_index);
            }
        }
    }

    async update_building(building_id) {
        var b_index;
        if (this.buildings[building_id - 1].building_id == building_id) {
            b_index = building_id - 1;
        } else {
            b_index = this.buildings.findIndex(building => building.building_id == building_id);
        }
        if (this.fetched_buildings[building_id] !== undefined && this.fetched_buildings[building_id].name !== undefined) {
            var upgrading = !this.buildings[b_index].downgrade;
            if (upgrading) {
                var l_index = this.buildings[b_index].level_details.findIndex(ld => ld.level == this.buildings[b_index].level - 1);
                if (l_index != -1) {
                    this.buildings[b_index].level_details.shift();
                }
                if (this.fetched_buildings[building_id].level_details[0] !== undefined) {
                    this.buildings[b_index].level_details.push(this.fetched_buildings[building_id].level_details[0]);
                }
                this.buildings[b_index].level++;
            } else {
                var l_index = this.buildings[b_index].level_details.findIndex(ld => ld.level == this.buildings[b_index].level + 1);
                if (l_index != -1) {
                    this.buildings[b_index].level_details.pop();
                }
                if (this.fetched_buildings[building_id].level_details[0] !== undefined) {
                    this.buildings[b_index].level_details.unshift(this.fetched_buildings[building_id].level_details[0]);
                }
                this.buildings[b_index].downgrade = 0;
                this.buildings[b_index].level--;
            }
            if (this.buildings[b_index].building_id == 2) {
                this.resource_prods = this.buildings[b_index].level_details.find(ld => ld.level == this.buildings[b_index].level).production;
                this.update_resource_ui();
            }
            if (this.buildings[b_index].building_id == 4) {
                await this.update_units_table(upgrading);
            }
            this.buildings[b_index].update_start = null;
            this.update_building_ui(b_index);
            delete this.fetched_buildings[building_id];
        } else if (this.fetched_buildings[building_id] === undefined) {
            var l_index = this.buildings[b_index].level_details.findIndex(ld => ld.level == this.buildings[b_index].level);
            this.fetch_building_details(building_id, this.buildings[b_index].level_details[l_index].level + (this.buildings[b_index].downgrade ? -2 : 2));
        }
    }

    async save_fetched_building(building) {
        this.fetched_buildings[building.building_id] = building;
    }

    async cancel_building_update(p_building) {
        var b_index = this.buildings.findIndex(building => building.name == p_building);
        if (this.buildings[b_index].update_start !== null) {
            this.buildings[b_index].update_start = null;
            if (this.buildings[b_index].downgrade) {
                this.buildings[b_index].downgrade = 0;
            } else {
                var l_index = this.buildings[b_index].level_details.findIndex(ld => ld.level == this.buildings[b_index].level);
                var changed_resources = {};
                for (var resource_type in this.buildings[b_index].level_details[l_index].upgrade_cost) {
                        changed_resources[resource_type] = this.resources[resource_type] + this.buildings[b_index].level_details[l_index].upgrade_cost[resource_type];
                }
                this.resources = changed_resources;
            }
            this.socket.emit('cancel_building_update', p_building);
            this.update_resource_ui();
            this.update_building_ui(b_index);
            delete this.fetched_buildings[this.buildings[b_index].building_id];
        }
    }

    async downgrade_building(p_building) {
        var b_index = this.buildings.findIndex(building => building.name == p_building);
        var l_index = this.buildings[b_index].level_details.findIndex(ld => ld.level == this.buildings[b_index].level);
        if (this.buildings[b_index].update_start === null && this.buildings[b_index].level_details[l_index].level != 0) {
                this.socket.emit('downgrade_building', p_building);
                this.buildings[b_index].update_start = await utils.get_timestamp();
                this.buildings[b_index].downgrade = 1;
                this.update_building_ui(b_index);
        }
    }

    async fetch_building_details(building_id, level) {
        if (this.fetched_buildings[building_id] === undefined) {
            var b_index = this.buildings.findIndex(building => building.building_id == building_id);
            var ld_index = this.buildings[b_index].level_details.findIndex(ld => ld.level == level + (this.buildings[b_index].downgrade ? 1 : -1));
            if (ld_index != -1 && this.buildings[b_index].level_details[ld_index].upgrade_time >= 0 && level >= 0) {
                this.fetched_buildings[building_id] = {};
                this.socket.emit('fetch_building_details', [{building_id: building_id, level: level}]);
            } else {
                this.fetched_buildings[building_id] = {name: this.buildings[b_index].name, level_details: [0]};
            }
        }
    }

    async process_incoming_message(message) {
        console.log(message);
    }

    async request_data() {
        this.socket.emit('planet_datapack_request', document.cookie.split('token=')[1]);
    }

    async update_resource(resource, amount) {
        this.socket.emit('update_resource', JSON.stringify({resource: resource, amount: amount}));
        this.resources[resource] += amount;
        this.update_resource_ui();
        
    }

    async update_resource_ui() {
        for (var resource_type in this.resources) {
            document.getElementById(resource_type).textContent = Math.floor(this.resources[resource_type]) + ' (' + Math.round(this.resource_prods[resource_type]*3600 * 100)/100 + '/h)';
        }
    }

    async update_building_ui(b_index) {
        var name = this.buildings[b_index].name;
        var level = this.buildings[b_index].level;
        var update_start = this.buildings[b_index].update_start;
        var downgrade = this.buildings[b_index].downgrade;

        var l_index = this.buildings[b_index].level_details.findIndex(ld => ld.level == (this.buildings[b_index].level - downgrade));
        var upgrade_time = this.buildings[b_index].level_details[l_index].upgrade_time;
        if (update_start !== null && !downgrade) {
            l_index = this.buildings[b_index].level_details.findIndex(ld => ld.level == (this.buildings[b_index].level + 1));
        }
        var upgrade_cost = this.buildings[b_index].level_details[l_index].upgrade_cost;
        
        //ui part
        var building_ui_element = document.getElementById(name);
        var textContent = level;
        if (update_start !== null) {
            var building_time = update_start + upgrade_time - await utils.get_timestamp();
            textContent += downgrade ? ', Downgrading: ' : ', Upgrading: ';
            textContent += (building_time < 0 ? 0 : building_time) + 's';
            building_ui_element.getElementsByClassName("cancel")[0].style.display = 'block';
        } else {
            building_ui_element.getElementsByClassName("cancel")[0].style.display = 'none';
        }
        building_ui_element.getElementsByTagName("span")[0].textContent = textContent;
        
        if (update_start !== null) {
            upgrade_time = this.buildings[b_index].level_details[l_index].upgrade_time;
        }
        
        //button part
        //upgrade time 0 = maxed out building
        if (upgrade_time >= 0) {
            var innerHTML = document.getElementById('upgrade-' + name).innerHTML.split('(')[0] + '(';
            for (var resource in upgrade_cost) {
                innerHTML += upgrade_cost[resource] + `<img src="/client_side/images/resources/${resource}.png" height="16px" class='button_image'></img>`;
            }
            document.getElementById('upgrade-' + name).innerHTML = innerHTML + upgrade_time + 's)';
        } else {
            document.getElementById('upgrade-' + name).textContent = document.getElementById('upgrade-' + name).textContent.split('(')[0] + '(MAXED OUT)';
        }
    }

    async build_units(units_form) {
        var remaining_resources = Object.assign({}, this.resources);
        var sufficient_resources = true;
        var units = [];
        //last one is the submit button - therefore length - 1
        for (var i = 0; i < units_form.elements.length - 1; i++) {
            if (units_form.elements[i].value != '' && parseInt(units_form.elements[i].value) > 0) {
                units.push({unit_id: units_form.elements[i].id.substr(5), count: units_form.elements[i].value});
                for (var resource in this.units[i].cost) {
                    remaining_resources[resource] -= this.units[i].cost[resource] * units_form.elements[i].value;
                    if (remaining_resources[resource] < 0) {
                        sufficient_resources = false;
                        break;
                    }
                }
            }
            if (!sufficient_resources) {
                break;
            }
        }

        if (sufficient_resources && units.length > 0) {
            var timestamp = await utils.get_timestamp();
            for (var i = 0; i < units.length; i++) {
                var uq_index = this.unit_ques.findIndex(unit_que => unit_que.unit_id == units[i].unit_id);
                if (this.unit_ques[uq_index].count == 0) {
                    this.unit_ques[uq_index].calculated_timestamp = timestamp;
                }
                this.unit_ques[uq_index].count += parseInt(units[i].count);
            }
            this.resources = remaining_resources;
            this.update_resource_ui();
            this.update_unit_que_ui(timestamp);
            this.socket.emit('build_units', units);
        }
    }

    async update_unit_ui() {
        for (var i = 0; i < this.units.length; i++) {
            var elementId = 'unit_count_' + this.units[i].unit_id;
            document.getElementById(elementId).textContent = this.units[i].count;
        }
    }

    async update_units_table(upgrading) {
        var units_building = this.buildings.find(b => b.building_id == 4);
        var allowed_unit_ids = units_building.level_details.find(level_detail => level_detail.level == units_building.level).units;
        var previously_allowed_unit_ids = units_building.level_details.find(level_detail => level_detail.level == units_building.level + (upgrading ? -1 : 1)).units;
        var changed_unit_ids = allowed_unit_ids.filter(allowed_unit_id => previously_allowed_unit_ids.indexOf(allowed_unit_id) === -1);
        changed_unit_ids = changed_unit_ids.concat(previously_allowed_unit_ids.filter(previously_allowed_unit_id => allowed_unit_ids.indexOf(previously_allowed_unit_id) === -1));

        if (changed_unit_ids.length > 0) {
            var create_units_table = document.getElementById("create_units_table");
            if (upgrading) {
                if (previously_allowed_unit_ids.length == 0) {
                    create_units_table.style.display = 'table';
                }
                for (var i = 0; i < changed_unit_ids.length; i++) {
                    var u_index = this.units.findIndex(unit => unit.unit_id == changed_unit_ids[i]);
                    var create_unit_row = create_units_table.insertRow(create_units_table.rows.length - 1);
                    var create_unit_row_html = `
                    <tr>
                        <td><img src="/client_side/images/units/${this.units[u_index].name}.png" height="20px"></img></td>
                        <td>${this.units[u_index].name}</td>
                        <td>`
                        for (var resource in this.units[u_index].cost) {
                            create_unit_row_html += `${this.units[u_index].cost[resource]} <img src="/client_side/images/resources/${resource}.png" height="20px"></img>`;
                        }
                        create_unit_row_html += `</td>
                        <td>${this.units[u_index].build_time}</td>
                        <td><input type="number" class="unit_create_count" id="unit_${this.units[u_index].unit_id}"></td>
                    </tr>`;
                    create_unit_row.innerHTML = create_unit_row_html;
                }
            } else {
                if (allowed_unit_ids.length == 0) {
                    create_units_table.style.display = 'none';
                }
                for (var i = 0; i < changed_unit_ids.length; i++) {
                    create_units_table.deleteRow(create_units_table.rows.length - 2);
                }
            }
        }
    }

    async update_unit_que(timestamp) {
        for (var i = 0; i < this.unit_ques.length; i++) {
            if (this.unit_ques[i].count == 0) {
                continue;
            }
            var unit_build_time = this.units.find(unit => unit.unit_id == this.unit_ques[i].unit_id).build_time;
            var created_units = Math.min(Math.floor((timestamp - this.unit_ques[i].calculated_timestamp) / unit_build_time), this.unit_ques[i].count);
            if (created_units < 1) {
                this.update_unit_que_ui(timestamp);
                continue;
            } else {
                this.unit_ques[i].count = this.unit_ques[i].count - created_units;
                var time_remainder = (await utils.get_timestamp() - this.unit_ques[i].calculated_timestamp) % unit_build_time;
                this.unit_ques[i].calculated_timestamp = this.unit_ques[i].count < 1 ? 0 : timestamp - time_remainder;
                this.update_unit_que_ui(timestamp);
                var u_index = this.units.findIndex(unit => unit.unit_id == this.unit_ques[i].unit_id);
                this.units[u_index].count += created_units;
                this.update_unit_ui();
            }
        }
    }

    async update_unit_que_ui(timestamp) {
        for(var i = 0; i < this.unit_ques.length; i++) {
            var uq_index = this.units.findIndex(unit => unit.unit_id == this.unit_ques[i].unit_id);
            var timeLeft = this.units[uq_index].build_time * this.unit_ques[i].count - (timestamp - this.unit_ques[i].calculated_timestamp);
            var unit_que_column = document.getElementById('unit_que_row_' + this.unit_ques[i].unit_id);
            if ((this.unit_ques[i].count == 0) || (this.unit_ques[i].count == 1 && timeLeft < 1)) {
                if (unit_que_column.style.display != 'none') {
                    unit_que_column.style.display = 'none';
                }
            } else {
                if (unit_que_column.style.display == 'none') {
                    unit_que_column.style.display = 'table-row';
                }
                unit_que_column.getElementsByClassName('count')[0].innerHTML = this.unit_ques[i].count;
                unit_que_column.getElementsByClassName('timeLeft')[0].innerHTML = await utils.seconds_to_time(timeLeft);
            }
        }
    }
}

export { Game };