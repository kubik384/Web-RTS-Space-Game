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
        this.removed_unit_ques = [];
        this.updating = false;
        this.prod_upd_details = {timestamp: null, building_id: -1, downgrading: false};

        /*
        this.planet_map_canvas;
        this.map_width;
        this.map_height;
        this.ctx;
        this.logic_loop;
        this.tick_time = 100;
        this.zoom = 0.25;
        this.dist_travelled = {x: 0, y:0};
        */
    }

    async setup_game(p_datapack) {
        var datapack = JSON.parse(p_datapack);
        console.log(datapack);
        super.setup_page(datapack);
        /*
        this.planet_map_canvas = document.getElementById("planet_map");
        this.ctx = this.planet_map_canvas.getContext("2d");
        this.planet_map_rect = this.planet_map_canvas.getBoundingClientRect();
        window.onresize = this.window_resize_handler();
        //expecting the border to have the same width on all the sides of the canvas
        //this.planet_map_canvas_border = +getComputedStyle(this.planet_map_canvas).getPropertyValue('border-top-width').slice(0, -2);

        document.getElementById('planet_map').addEventListener('wheel', e => {
            e.preventDefault();
            var x = e.clientX - this.planet_map_rect.left;//- this.planet_map_canvas_border;
            var y = e.clientY - this.planet_map_rect.top;//- this.planet_map_canvas_border;
            if (e.deltaY < 0) {
                if (this.zoom < 12) {
                    const deltaZoom = 1.25;
                    var oldZoom = this.zoom;
                    this.zoom *= deltaZoom;
                    var zoomRatio = (this.zoom - oldZoom)/oldZoom;
                    this.xOffset += (this.xOffset - x) * zoomRatio;
                    this.yOffset += (this.yOffset - y) * zoomRatio;
                }
            } else {
                if (this.zoom > 0.05) {
                    const deltaZoom = 0.8;
                    var oldZoom = this.zoom;
                    this.zoom *= deltaZoom;
                    var zoomRatio = (oldZoom - this.zoom)/oldZoom;
                    this.xOffset -= (this.xOffset - x) * zoomRatio;
                    this.yOffset -= (this.yOffset - y) * zoomRatio;
                }
            }
        });

        this.planet_map_canvas.addEventListener('mousedown', e => {
            //left click
            if (e.button == 0) {
                this.dragging = true;
            }
        });

        window.addEventListener('mouseup', e => {
            //left click
            if (e.button == 0) {
                this.dragging = false;
                this.dist_travelled.x = 0;
                this.dist_travelled.y = 0;
            }
        });

        document.addEventListener('mousemove', e => {
            if (this.dragging) {
                this.xOffset += e.movementX;
                this.yOffset += e.movementY;
                this.dist_travelled.x += Math.abs(e.movementX);
                this.dist_travelled.y += Math.abs(e.movementY);
            }
        });

        window.addEventListener("visibilitychange", () => {
            this.dragging = false;
            this.dist_travelled.x = 0;
            this.dist_travelled.y = 0;
        });
        */

        this.resources = datapack.resources;
        var resource_building_ui_html = '<table id="resource_table"><tbody>';
        for(var resource in datapack.resources) {
            var split_resource = resource.split('reserved_');
            if (split_resource.length > 1) {
                resource = split_resource[1];
            }
            resource_building_ui_html += `
            <tr>
                <td>
                    <img src="/client_side/images/resources/${resource.toLowerCase()}.png" height="20px"></img>
                </td>
                <td id='${resource}'>
                </td>
            </tr>`;
        }
        
        var button_menu_html = '';
        this.buildings = datapack.buildings.sort((a,b) => a.building_id - b.building_id);
        for (var i = 0; i < this.buildings.length; i++) {
            var building_details = await this.get_bld_details(this.buildings[i].building_id);
            resource_building_ui_html += `
            <tr>
                <td>
                    <img src="/client_side/images/buildings/${building_details.name.toLowerCase()}.png" height="20px"></img>
                </td>
                <td id='${building_details.name}' class='building_cell'>
                    <span></span><img src="/client_side/images/ui/red_cross.png" class="cancel" data-building='${building_details.building_id}' style='display:none;'></img>
                </td>
            </tr>`;
            
            button_menu_html += `
            <div class = 'building_update_button_wrapper'>
                <button id='upgrade-${building_details.building_id}' class='upgrade_btn btn'>Upgrade ${building_details.name} <br />()</button>
                <button id='downgrade-${building_details.building_id}' class='downgrade_btn btn'><img src="/client_side/images/ui/downgrade_building.png" height="20px"></button>
            </div>`;
        }
        resource_building_ui_html += '</tbody></table>';
        document.getElementById('resource_building_ui').innerHTML = resource_building_ui_html;
        document.getElementById('button_menu').innerHTML = button_menu_html;

        this.units = datapack.units;
        var units_building = await this.get_building(3);
        if (units_building !== undefined) {
            var allowed_unit_ids = (await this.get_bld_lvl_dts(await this.get_bld_details(units_building.building_id), units_building.level)).units;
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
                var unit = await this.get_unit_dts(allowed_unit_ids[i]);
                create_units_html += `
                <tr>
                    <td>
                        <img src="/client_side/images/units/${unit.name.toLowerCase()}.png" height="20px"></img>
                    </td>
                    <td>
                        <span>${unit.name}</span>
                    </td>
                    <td>`
                        for (var resource in unit.cost) {
                            create_units_html += `${unit.cost[resource]} <img src="/client_side/images/resources/${resource.toLowerCase()}.png" height="20px"></img>`;
                        }
                        create_units_html += `
                    </td>
                    <td>
                        <span>${unit.build_time}</span>
                    </td>
                    <td>
                        <input type="number" class="unit_create_count" id="unit_${unit.unit_id}">
                    </td>
                </tr>`;
            }
            create_units_html += '<tr><td colspan="10" id="submit_unit_create_cell"><input type="submit" value="Build"></input></td></tr></tbody></table></form>';
            document.getElementById('create_units_wrapper').innerHTML = create_units_html;
            document.getElementById('create_units_form').addEventListener('submit', event => { 
                event.preventDefault();
                this.build_units(event.currentTarget) ;
            });
        }

        var units_table_html = '<table id="units_table"><tbody>';
        for (var i = 0; i < this.units.length; i++) {
            var unit = this.units[i];
            var unit_details = await this.get_unit_dts(this.units[i].unit_id);
            units_table_html += `
            <tr id="unit_id_${unit.unit_id}" ${unit.count == 0 ? 'style = "display: none;"' : ''}>
                <td>
                    <img src="/client_side/images/units/${unit_details.name.toLowerCase()}.png"></img>
                </td>
                <td id="unit_count_${unit.unit_id}" class="unit_cell">
                    <span>${unit.count}</span>
                </td>
            </tr>`;
        }
        units_table_html += '</tbody></table>';
        document.getElementById('units_wrapper').innerHTML = units_table_html;

        this.unit_ques = datapack.unit_ques.sort((a,b) => a.unit_que_id - b.unit_que_id);
        this.curr_unit_que_id = this.unit_ques[0] !== undefined ? this.unit_ques[this.unit_ques.length - 1].unit_que_id++ : 0;
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
                        <span>Build Time</span>
                    </th>
                </tr>
            </thead>
            <tbody>`;
        for (var i = 0; i < this.unit_ques.length; i++) {
            var units_details = await this.get_unit_dts(this.unit_ques[i].unit_id);
            var time_left = units_details.build_time * this.unit_ques[i].count - (i == 0 ? (await utils.get_timestamp() - this.unit_ques[i].calculated_timestamp) : 0);
            units_que_table_html += `
            <tr id="unit_que_row_${this.unit_ques[i].unit_que_id}">
                <td>
                    <img src="/client_side/images/units/${units_details.name.toLowerCase()}.png" height="15px"></img>
                    <span>${units_details.name}</span>
                </td>
                <td>
                    <span class="count">${this.unit_ques[i].count}</span>
                </td>
                <td>
                    <span class="time_left">${await utils.seconds_to_time(time_left)}</span>
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

        var prod_building = await this.get_building(2);
        this.resource_prods = (await this.get_bld_lvl_dts(await this.get_bld_details(prod_building.building_id), prod_building.level)).production;
        this.update_resource_ui();
        for (var i = 0; i < this.buildings.length; i++) {
            this.update_building_ui(i);
        }

        this.lastUpdateTime = await utils.get_timestamp();
        this.updateLoop = setInterval(this.update_game.bind(this), 1000);
        //window.requestAnimationFrame(this.draw.bind(this));
    }
    
    async update_game() {
        if (!this.updating) {
            this.updating = true;
            var timestamp = await utils.get_timestamp();
            var time_passed = timestamp - this.lastUpdateTime;
            await this.update_resources(timestamp, time_passed);
            await this.update_buildings(timestamp);
            await this.update_unit_que(timestamp);
            this.lastUpdateTime = timestamp;
            this.updating = false;
        }
    }

    /*
    draw() {
        this.ctx.clearRect(0, 0, this.planet_map_width, this.planet_map_height);
        this.ctx.save();
        this.ctx.translate(this.xOffset, this.yOffset);
        this.draw_grid(this.ctx, 0, 0, 0, 0, 100, 100, 2000, 2000, this.zoom, 60, false);
        this.ctx.restore();
        window.requestAnimationFrame(this.draw.bind(this));
    }
    */

    /**
     * 
     * @param {Number} p_building Building id
     */
    async upgrade_building(p_building) {
        var b_index = this.buildings.findIndex(building => building.building_id == p_building);
        var building = this.buildings[b_index];
        var lvl_details = await this.get_bld_lvl_dts(await this.get_bld_details(p_building), building.level);
        if (building.update_start === null && lvl_details.upgrade_time >= 0) {
            var changed_resources = {};
            var upgrade_building = true;
            for (var resource_type in lvl_details.upgrade_cost) {
                if (resource_type == 'pop') {
                    var pop_building = this.buildings.find(building => building.building_id == 5);
                    var available_pop = (await this.get_bld_lvl_dts(await this.get_bld_details(pop_building.building_id), pop_building.level)).production['pop'];
                    var res_type = 'reserved_' + resource_type;
                    if (this.resources[res_type] + lvl_details.upgrade_cost[resource_type] > available_pop) {
                        upgrade_building = false;
                        break;
                    } else {
                        changed_resources[res_type] = this.resources[res_type] + lvl_details.upgrade_cost[resource_type];
                    }
                } else {
                    if (this.resources[resource_type] - lvl_details.upgrade_cost[resource_type] >= 0) {
                        changed_resources[resource_type] = this.resources[resource_type] - lvl_details.upgrade_cost[resource_type];
                    } else {
                        upgrade_building = false;
                        break;
                    }
                }
            }
            if (lvl_details.req_buildings !== undefined) {
                for (var i = 0; i < lvl_details.req_buildings.length; i++) {
                    var req_bld = this.buildings.find(building => building.building_id == lvl_details.req_buildings[i].building_id);
                    if (req_bld.level < lvl_details.req_buildings[i].level) {
                        upgrade_building = false;
                    }
                }
            }
            if (upgrade_building && lvl_details.upgrade_time >= 0) {
                this.socket.emit('upgrade_building', p_building);
                for (var changed_resource in changed_resources) {
                    this.resources[changed_resource] = changed_resources[changed_resource];
                }
                this.update_resource_ui();
                building.update_start = await utils.get_timestamp();
                this.update_building_ui(b_index);
            }
        }
    }

    async update_buildings(timestamp) {
        var update_resource_ui = false;
        var update_resources = false;
        for (var i = 0; i < this.buildings.length; i++) {
            if (this.buildings[i].update_start !== null) {
                var building = this.buildings[i];
                var building_id = building.building_id;
                var building_details = await this.get_bld_details(building.building_id);
                var level_details = await this.get_bld_lvl_dts(building_details, building.level - building.downgrade);
                var time_left = building.update_start + level_details.upgrade_time - timestamp;
                if (time_left <= 0) {
                    var upgrading = building.downgrade !== 1;
                    if (upgrading) {
                        building.level++;
                    } else {
                        building.downgrade = 0;
                        building.level--;
                        if (level_details.upgrade_cost['pop'] !== undefined) {
                            this.resources['reserved_pop'] -= level_details.upgrade_cost['pop'];
                            update_resource_ui = true;
                        }
                        if (building.building_id == 4) {
                            update_resources = true;
                        }
                    }
                    if (building.building_id == 2) {
                        this.prod_upd_details.timestamp = building.update_start + level_details.upgrade_time;
                        this.prod_upd_details.building_id = building.building_id;
                        this.prod_upd_details.downgrade = upgrading;
                        this.resource_prods = (await this.get_bld_lvl_dts(building_details, building.level)).production;
                        update_resource_ui = true;
                    }
                    if (building.building_id == 5 || building.building_id == 4) {
                        update_resource_ui = true;
                    }
                    if (building.building_id == 3) {
                        await this.update_units_table(upgrading);
                    }
                    building.update_start = null;
                    this.update_building_ui(i);
                }
                await this.update_building_ui(i);
            }
        }
        if (update_resources) {
            await this.update_resources(timestamp, 0);
        }
        if (update_resource_ui) {
            await this.update_resource_ui();
        }
    }

    /**
     * 
     * @param {Number} p_building Building id
     */
    async cancel_building_update(p_building) {
        var b_index = this.buildings.findIndex(building => building.building_id == p_building);
        var building = this.buildings[b_index];
        if (building.update_start !== null) {
            building.update_start = null;
            if (building.downgrade) {
                building.downgrade = 0;
            } else {
                var lvl_details = (await this.get_bld_lvl_dts(await this.get_bld_details(building.building_id), building.level));
                var changed_resources = {};
                for (var resource_type in lvl_details.upgrade_cost) {
                    if (resource_type == 'pop') {
                        var res_type = 'reserved_' + resource_type;
                        changed_resources[res_type] = this.resources[res_type] - lvl_details.upgrade_cost[resource_type];
                    } else {
                        var storage_building = this.buildings.find(building => building.building_id == 4);
                        var storage = (await this.get_bld_lvl_dts(await this.get_bld_details(storage_building.building_id), storage_building.level)).storage;
                        changed_resources[resource_type] = this.resources[resource_type] + lvl_details.upgrade_cost[resource_type];
                        if (changed_resources[resource_type] > storage[resource_type]) {
                            changed_resources[resource_type] = storage[resource_type];
                        }
                    }
                }
                for (var changed_resource in changed_resources) {
                    this.resources[changed_resource] = changed_resources[changed_resource];
                }
            }
            this.socket.emit('cancel_building_update', p_building);
            this.update_resource_ui();
            this.update_building_ui(b_index);
        }
    }

    async downgrade_building(p_building) {
        var b_index = this.buildings.findIndex(building => building.building_id == p_building);
        var building = this.buildings[b_index];
        var building_details = await this.get_bld_details(building.building_id);
        var lvl_details = (await this.get_bld_lvl_dts(building_details, building.level));
        var update_res_ui = false;
        var downgrade_building = true;
        if (building.update_start === null && lvl_details.level != 0) {
            if (building.building_id == 5) {
                lvl_details = (await this.get_bld_lvl_dts(building_details, building.level - 1));
                if (this.resources['reserved_pop'] <= lvl_details.production['pop']) {
                    update_res_ui = true;
                } else {
                    downgrade_building = false;
                }
            }
            if (downgrade_building) {
                this.socket.emit('downgrade_building', p_building);
                building.update_start = await utils.get_timestamp();
                building.downgrade = 1;
                this.update_building_ui(b_index);
                if (update_res_ui) {
                    this.update_resource_ui();
                }
            }
        }
    }

    async process_incoming_message(message) {
        console.log(message);
    }

    async request_data() {
        this.socket.emit('planet_datapack_request');
    }

    async update_resources(timestamp, time_passed) {
        var storage_bld = await this.get_building(4);
        var storage = (await this.get_bld_lvl_dts(await this.get_bld_details(storage_bld.building_id), storage_bld.level)).storage;
        var time_passed_before_update;
        var production_before_update;
        if (this.prod_upd_details.timestamp !== null) {
            time_passed_before_update = timestamp - this.prod_upd_details.timestamp;
            var building_details = await this.get_bld_details(this.prod_upd_details.building_id);
            var building_level = this.buildings.find(building => building.building_id == this.prod_upd_details.building_id).level;
            production_before_update = (await this.get_bld_lvl_dts(building_details, building_level + (this.prod_upd_details.downgrading ? 1 : -1))).production;
            time_passed -= time_passed_before_update;
            this.prod_upd_details.timestamp = null;
        }
        for (var resource_type in this.resource_prods) {
            if (time_passed_before_update !== undefined) {
                this.resources[resource_type] += production_before_update[resource_type] * time_passed_before_update;
            }
            this.resources[resource_type] += this.resource_prods[resource_type] * time_passed;
            if (this.resources[resource_type] > storage[resource_type]) {
                this.resources[resource_type] = storage[resource_type];
            }
        }
        this.update_resource_ui();
    }

    async update_resource_ui() {
        for (var resource_type in this.resources) {
            var split_resource = resource_type.split('reserved_');
            if (split_resource.length > 1) {
                var pop_building = this.buildings.find(building => building.building_id == 5);
                var available_pop = (await this.get_bld_lvl_dts(await this.get_bld_details(pop_building.building_id), pop_building.level - pop_building.downgrade)).production['pop'];
                document.getElementById(split_resource[1]).textContent = Math.floor(this.resources[resource_type]) + '/' + available_pop;
            } else {
                var storage_building = this.buildings.find(building => building.building_id == 4);
                var storage = (await this.get_bld_lvl_dts(await this.get_bld_details(storage_building.building_id), storage_building.level)).storage[resource_type];
                document.getElementById(resource_type).textContent = Math.floor(this.resources[resource_type]) + '/' + storage + ' (' + Math.round(this.resource_prods[resource_type]*3600 * 100)/100 + '/h)';
            }
        }
    }

    async update_building_ui(b_index) {
        var building = this.buildings[b_index];
        var building_details = await this.get_bld_details(building.building_id);
        var name = building_details.name;
        var level = building.level;
        var update_start = building.update_start;
        var downgrade = building.downgrade;

        var lvl_details = (await this.get_bld_lvl_dts(building_details, building.level - building.downgrade));
        var upgrade_time = lvl_details.upgrade_time;
        if (update_start !== null && !downgrade) {
            lvl_details = (await this.get_bld_lvl_dts(await this.get_bld_details(building.building_id), building.level + 1));
        }
        var upgrade_cost = lvl_details.upgrade_cost;
        
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
            upgrade_time = lvl_details.upgrade_time;
        }
        
        //button part
        //upgrade time 0 = maxed out building
        if (upgrade_time >= 0) {
            var innerHTML = document.getElementById('upgrade-' + building.building_id).innerHTML.split('(')[0] + '(';
            for (var resource in upgrade_cost) {
                innerHTML += upgrade_cost[resource] + `<img src="/client_side/images/resources/${resource}.png" height="16px" class='button_image'></img>`;
            }
            document.getElementById('upgrade-' + building.building_id).innerHTML = innerHTML + upgrade_time + 's)';
        } else {
            document.getElementById('upgrade-' + building.building_id).textContent = document.getElementById('upgrade-' + building.building_id).textContent.split('(')[0] + '(MAXED OUT)';
        }
    }

    async build_units(units_form) {
        var remaining_resources = Object.assign({}, this.resources);
        var sufficient_resources = true;
        var units = [];
        //last one is the submit button - therefore length - 1
        for (var i = 0; i < units_form.elements.length - 1; i++) {
            var value = units_form.elements[i].value;
            units_form.elements[i].value = '';
            if (value != '' && parseInt(value) > 0) {
                units.push({unit_id: units_form.elements[i].id.substr(5), count: value});
                var unit_details = await this.get_unit_dts(units[units.length - 1].unit_id);
                for (var resource in unit_details.cost) {
                    remaining_resources[resource] -= unit_details.cost[resource] * value;
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
            var uq_table = document.getElementById('units_que_table');
            uq_table = uq_table.getElementsByTagName('tbody')[0];
            for (var i = 0; i < units.length; i++) {
                var unit_que = await this.generate_unit_que(units[i], timestamp);
                var unit_details = await this.get_unit_dts(units[i].unit_id);
                var time_left = unit_details.build_time * units[i].count;
                var uq_row = uq_table.insertRow();
                uq_row.setAttribute('id','unit_que_row_' + unit_que.unit_que_id);
                var uq_img_cell = uq_row.insertCell();
                var unit_img = document.createElement("img");
                unit_img.setAttribute('src','/client_side/images/units/' + unit_details.name + '.png');
                unit_img.setAttribute('height','15px');
                var name_span = document.createElement("span");
                name_span.append(unit_details.name);
                uq_img_cell.append(unit_img, name_span);
                var uq_count_cell = uq_row.insertCell();
                var count_span = document.createElement("span");
                count_span.classList.add('count');
                count_span.append(units[i].count);
                uq_count_cell.append(count_span);
                var uq_time_left_cell = uq_row.insertCell();
                var time_left_span = document.createElement("span");
                time_left_span.classList.add('time_left');
                time_left_span.append(await utils.seconds_to_time(time_left));
                uq_time_left_cell.append(time_left_span);
            }
            this.resources = remaining_resources;
            this.update_resource_ui();
            this.socket.emit('build_units', units);
        }
    }

    async update_unit_ui() {
        for (var i = 0; i < this.units.length; i++) {
            var element_id = 'unit_id_' + this.units[i].unit_id;
            if (this.units[i].count == 0) {
                document.getElementById(element_id).style.display = 'none';
            } else {
                document.getElementById(element_id).removeAttribute('style');
                element_id = 'unit_count_' + this.units[i].unit_id;
                document.getElementById(element_id).textContent = this.units[i].count;
            }
        }
    }

    async update_units_table(upgrading) {
        var units_building = this.buildings.find(b => b.building_id == 3);
        var units_bld_dts = await this.get_bld_details(units_building.building_id);
        var allowed_unit_ids = (await this.get_bld_lvl_dts(units_bld_dts, units_building.level)).units;
        var previously_allowed_unit_ids = (await this.get_bld_lvl_dts(units_bld_dts, units_building.level + (upgrading ? -1 : 1))).units;
        var changed_unit_ids = allowed_unit_ids.filter(allowed_unit_id => previously_allowed_unit_ids.indexOf(allowed_unit_id) === -1);
        changed_unit_ids = changed_unit_ids.concat(previously_allowed_unit_ids.filter(previously_allowed_unit_id => allowed_unit_ids.indexOf(previously_allowed_unit_id) === -1));

        if (changed_unit_ids.length > 0) {
            var create_units_table = document.getElementById("create_units_table");
            if (upgrading) {
                if (previously_allowed_unit_ids.length == 0) {
                    create_units_table.style.display = 'table';
                }
                for (var i = 0; i < changed_unit_ids.length; i++) {unit_details
                    var unit_details = await this.get_unit_dts(changed_unit_ids[i]);
                    var create_unit_row = create_units_table.insertRow(create_units_table.rows.length - 1);
                    var create_unit_row_html = `
                    <tr>
                        <td><img src="/client_side/images/units/${unit_details.name}.png" height="20px"></img></td>
                        <td>${unit_details.name}</td>
                        <td>`
                        for (var resource in unit_details.cost) {
                            create_unit_row_html += `${unit_details.cost[resource]} <img src="/client_side/images/resources/${resource}.png" height="20px"></img>`;
                        }
                        create_unit_row_html += `</td>
                        <td>${unit_details.build_time}</td>
                        <td><input type="number" class="unit_create_count" id="unit_${unit_details.unit_id}"></td>
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
        var update_unit_ui = false;
        var update_timestamp = false;
        var time_remainder = 0;
        for (var i = 0; i < this.unit_ques.length; i++) {
            var unit_build_time = (await this.get_unit_dts(this.unit_ques[i].unit_id)).build_time;
            var calculated_timestamp = (update_timestamp ? timestamp : this.unit_ques[i].calculated_timestamp) - time_remainder;
            var max_created_units = Math.floor((timestamp - calculated_timestamp) / unit_build_time);
            var created_units = Math.min(max_created_units, this.unit_ques[i].count);
            if (created_units < 1) {
                if (!update_timestamp) {
                    break;
                } else {
                    this.unit_ques[i].calculated_timestamp = calculated_timestamp;
                }
            } else {
                update_unit_ui = true;
                time_remainder = (timestamp - calculated_timestamp) % unit_build_time + unit_build_time * (max_created_units - created_units);
                var u_index = this.units.findIndex(unit => unit.unit_id == this.unit_ques[i].unit_id);
                this.units[u_index].count += created_units;
                this.unit_ques[i].count -= created_units;
                if (this.unit_ques[i].count == 0) {
                    update_timestamp = true;
                    this.removed_unit_ques.push(this.unit_ques.splice(i--,1)[0]);
                } else {
                    this.unit_ques[i].calculated_timestamp = timestamp - time_remainder;
                    break;
                }
            }
        }
        if (update_unit_ui) {
            this.update_unit_ui();
        }
        this.update_unit_que_ui(timestamp);
    }

    async update_unit_que_ui(timestamp) {
        for (var i = 0; i < this.unit_ques.length; i++) {
            var unit_details = await this.get_unit_dts(this.unit_ques[i].unit_id);
            var time_left = unit_details.build_time * this.unit_ques[i].count - (i == 0 ? (timestamp - this.unit_ques[i].calculated_timestamp) : 0);
            var unit_que_column = document.getElementById('unit_que_row_' + this.unit_ques[i].unit_que_id);
            unit_que_column.getElementsByClassName('count')[0].innerHTML = this.unit_ques[i].count;
            unit_que_column.getElementsByClassName('time_left')[0].innerHTML = await utils.seconds_to_time(time_left);
        }
        for (var i = 0; i < this.removed_unit_ques.length; i++) {
            var unit_que_column = document.getElementById('unit_que_row_' + this.removed_unit_ques[i].unit_que_id);
            unit_que_column.remove();
            this.removed_unit_ques.splice(i--,1);
        }
    }

    /**
     * 
     * @param {Object} units {unit_id, count}
     * @param {Number} timestamp Unix timestamp
     * @returns {Object} The newly created unit que object
     */
    async generate_unit_que(units, timestamp) {
        this.unit_ques.push({unit_que_id: this.curr_unit_que_id++, unit_id: units.unit_id, count: units.count, calculated_timestamp: timestamp});
        return this.unit_ques[this.unit_ques.length - 1];
    }

    async get_building(building_id) {
        return this.buildings.find(building => building.building_id == building_id);
    }

    /*
    window_resize_handler() {
        //var dpi = window.devicePixelRatio;
        console.log(this.planet_map_canvas);
        var planet_map_height = +getComputedStyle(this.planet_map_canvas).getPropertyValue("height").slice(0, -2);
        var planet_map_width = +getComputedStyle(this.planet_map_canvas).getPropertyValue("width").slice(0, -2);
        this.planet_map_height = planet_map_height; //* dpi;
        this.planet_map_width = planet_map_width; //* dpi;
        this.xOffset = 50;
        this.yOffset = planet_map_height/2;
        this.planet_map_canvas.setAttribute('height', this.planet_map_height);
        this.planet_map_canvas.setAttribute('width', this.planet_map_width);
        return this.window_resize_handler.bind(this);
    }
    */
}

export { Game };