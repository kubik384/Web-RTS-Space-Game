"use strict"

import { Utils } from '../misc_modules/utils.js';
import { Base_Page } from './base_page.js';
let utils = new Utils();
const building_dialog_id = 'building_dialog_div';
const unit_dialog_id = 'unit_dialog_div';
const dialog_overlay_class = 'dialog_overlay';

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
        let datapack = JSON.parse(p_datapack);
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
            let x = e.clientX - this.planet_map_rect.left;//- this.planet_map_canvas_border;
            let y = e.clientY - this.planet_map_rect.top;//- this.planet_map_canvas_border;
            if (e.deltaY < 0) {
                if (this.zoom < 12) {
                    const deltaZoom = 1.25;
                    let oldZoom = this.zoom;
                    this.zoom *= deltaZoom;
                    let zoomRatio = (this.zoom - oldZoom)/oldZoom;
                    this.xOffset += (this.xOffset - x) * zoomRatio;
                    this.yOffset += (this.yOffset - y) * zoomRatio;
                }
            } else {
                if (this.zoom > 0.05) {
                    const deltaZoom = 0.8;
                    let oldZoom = this.zoom;
                    this.zoom *= deltaZoom;
                    let zoomRatio = (oldZoom - this.zoom)/oldZoom;
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
        this.research_details = datapack.research_details;
        
        let resource_building_ui_html = '<table id="resource_table"><tbody>';
        for(let resource in datapack.resources) {
            let split_resource = resource.split('reserved_');
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
        
        this.buildings = datapack.buildings.sort((a,b) => a.building_id - b.building_id);
        for (let i = 0; i < this.buildings.length; i++) {
            let building = this.buildings[i];
            let building_details = await this.get_bld_details(building.building_id);
            let building_el = document.createElement('div');
            let building_img = document.createElement('img');
            let building_lvl = document.createElement('p');
            let bld_arrowUp_img = document.createElement('img');
            let bld_arrowDown_img = document.createElement('img');
            let building_timer_container = document.createElement('div');
            let building_timer = document.createElement('p');
            let building_cancel_img = document.createElement('img');
            building_el.setAttribute('id', `building_${building_details.building_id}`);
            building_img.setAttribute('src', `/client_side/images/buildings/${building_details.name}.png`);
            building_img.addEventListener('click', function (event) { this.open_building_dialog(event.target.parentNode.id.split('_')[1]); }.bind(this));
            let upgrade_arrow_img_el = document.createElement('img');
            upgrade_arrow_img_el.setAttribute('src', '/client_side/images/ui/upgrade_arrow.png');
            upgrade_arrow_img_el.style.display = 'none';
            let downgrade_arrow_img_el = document.createElement('img');
            downgrade_arrow_img_el.setAttribute('src', '/client_side/images/ui/downgrade_arrow.png');
            downgrade_arrow_img_el.style.display = 'none';
            building_lvl.append(building.level);
            building_timer_container.style.display = 'none';
            building_cancel_img.classList.add('cancel');
            building_cancel_img.dataset.building_id = building_details.building_id;
            building_cancel_img.setAttribute('src', '/client_side/images/ui/red_cross.png');
            bld_arrowUp_img.setAttribute('src', '/client_side/images/ui/arrow_up.png');
            bld_arrowDown_img.setAttribute('src', '/client_side/images/ui/arrow_down.png');
            building_timer_container.classList.add('building_timer_container');
            building_timer_container.append(building_timer, building_cancel_img);
            let building_level_container = document.createElement('div');
            let building_lvl_container = document.createElement('div');
            building_lvl_container.append(building_lvl, upgrade_arrow_img_el, downgrade_arrow_img_el);
            building_level_container.append(building_lvl_container, building_timer_container);
            building_el.append(building_img, building_level_container);
            document.getElementById('button_menu').append(building_el);
        }
        resource_building_ui_html += '</tbody></table>';
        document.getElementById('resource_building_ui').innerHTML = resource_building_ui_html;

        this.units = datapack.units;
        let units_building = await this.get_building(3);
        if (units_building !== undefined) {
            let create_units_html = `
            <form id="create_units_form">
                <table id="create_units_table">
                    <thead>
                        <tr>
                            <th>Unit</th>
                            <th>Cost</th>
                            <th>Time</th>
                            <th>Build</th>
                        </tr>
                    </thead>
                    <tbody>`;
            create_units_html += '<tr><td colspan="10" id="submit_unit_create_cell"><input type="submit" value="Build"></input></td></tr></tbody></table></form>';
            document.getElementById('create_units_wrapper').innerHTML = create_units_html;
            document.getElementById('create_units_form').addEventListener('submit', event => { 
                event.preventDefault();
                this.build_units(event.currentTarget) ;
            });
        }

        let create_units_table = document.getElementById("create_units_table");
        let units = await this.get_units_details();
        for (let i = 0; i < units.length; i++) {
            let unit_details = units[i];
            let create_unit_row = create_units_table.insertRow(create_units_table.rows.length - 1);
            let create_unit_row_html = `
            <tr>
                <td><div class="unit_preview_container" data-unit_id="${unit_details.unit_id}"><img src="/client_side/images/units/${unit_details.name}.png"></img></div></td>
                <td><div class="unit_res_cost_container">`
                for (let resource in unit_details.cost) {
                    create_unit_row_html += `<div class="unit_res_cost"><img src="/client_side/images/resources/${resource}.png" height="20px"></img><span id="unit_${unit_details.unit_id}_${resource}_cost">${unit_details.cost[resource]}</span></div>`;
                }
                create_unit_row_html += `</div></td>
                <td><div class="unit_time_cost_container"><span id="unit_${unit_details.unit_id}_time_cost">${unit_details.build_time}s</span></div></td>
                <td><input type="number" class="unit_create_count" id="unit_${unit_details.unit_id}_input"><p id="max_${unit_details.unit_id}_units">(0)</span></td>
            </tr>`;
            create_unit_row.innerHTML = create_unit_row_html;
            let _that = this;
            let max_units_el = document.getElementById(`max_${unit_details.unit_id}_units`);
            max_units_el.addEventListener('click', function() {
                let unit_id = this.id.split('_')[1];
                let to_max_unit_count = +this.textContent.substr(1, this.textContent.length - 2);
                let input = document.getElementById(`unit_${unit_id}_input`);
                let unit_count = +input.value;
                let new_value = (to_max_unit_count >= 0 ? (to_max_unit_count == '0' ? '' : unit_count + to_max_unit_count) : unit_count + to_max_unit_count);
                input.value = new_value;
                _that.update_unit_costs(input).then(_that.update_units_table.bind(_that));
            });
        }
        await this.update_units_table();
        let _that = this;
        let unit_preview_containers = document.getElementsByClassName('unit_preview_container');
        for (let i = 0; i < unit_preview_containers.length; i++) {
            unit_preview_containers[i].addEventListener('click', function() {
                let unit_id = this.dataset.unit_id;
                _that.open_unit_dialog(unit_id);
            });
        }

        let units_table_html = '<table id="units_table"><tbody>';
        for (let i = 0; i < this.units.length; i++) {
            let unit = this.units[i];
            let unit_details = await this.get_unit_dts(this.units[i].unit_id);
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
        this.curr_unit_que_id = this.unit_ques[0] !== undefined ? this.unit_ques[this.unit_ques.length - 1].unit_que_id++ : undefined;
        let units_que_table_html = `
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
        for (let i = 0; i < this.unit_ques.length; i++) {
            let units_details = await this.get_unit_dts(this.unit_ques[i].unit_id);
            let time_left = units_details.build_time * this.unit_ques[i].count - (i == 0 ? (await utils.get_timestamp() - this.unit_ques[i].calculated_timestamp) : 0);
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

        let buttons = document.getElementsByClassName('cancel');
        for(let i = 0; i < buttons.length; i++) {
            buttons[i].addEventListener('click', event => { this.cancel_building_update(event.currentTarget.dataset.building_id) });
        }

        let prod_building = await this.get_building(2);
        this.resource_prods = (await this.get_bld_lvl_dts(await this.get_bld_details(prod_building.building_id), prod_building.level)).production;
        this.update_resource_ui();
        for (let i = 0; i < this.buildings.length; i++) {
            this.update_building_ui(i);
        }
        let input_fields = create_units_table.getElementsByTagName('input');
        for (let i = 0; i < input_fields.length; i++) {
            input_fields[i].addEventListener('input', function() {
                _that.update_unit_costs(this).then(_that.update_units_table.bind(_that));
            });
        }

        this.lastUpdateTime = await utils.get_timestamp();
        this.updateLoop = setInterval(this.update_game.bind(this), 1000);
        //window.requestAnimationFrame(this.draw.bind(this));
    }
    
    async update_game() {
        if (!this.updating) {
            this.updating = true;
            let timestamp = await utils.get_timestamp();
            let time_passed = timestamp - this.lastUpdateTime;
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
    async update_building(p_building, downgrade = 0) {
        if (downgrade == 0) {
            let b_index = this.buildings.findIndex(building => building.building_id == p_building);
            let building = this.buildings[b_index];
            let lvl_details = await this.get_bld_lvl_dts(await this.get_bld_details(p_building), building.level);
            if (building.update_start === null && lvl_details.upgrade_time >= 0) {
                let changed_resources = {};
                let upgrade_building = true;
                for (let resource_type in lvl_details.upgrade_cost) {
                    if (resource_type == 'pop') {
                        let pop_building = this.buildings.find(building => building.building_id == 5);
                        let available_pop = (await this.get_bld_lvl_dts(await this.get_bld_details(pop_building.building_id), pop_building.level)).production['pop'];
                        let res_type = 'reserved_' + resource_type;
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
                    for (let i = 0; i < lvl_details.req_buildings.length; i++) {
                        let req_bld = this.buildings.find(building => building.building_id == lvl_details.req_buildings[i].building_id);
                        if (req_bld.level < lvl_details.req_buildings[i].level) {
                            upgrade_building = false;
                        }
                    }
                }
                if (upgrade_building && lvl_details.upgrade_time >= 0) {
                    this.socket.emit('update_building', p_building, downgrade);
                    for (let changed_resource in changed_resources) {
                        this.resources[changed_resource] = changed_resources[changed_resource];
                    }
                    this.update_resource_ui();
                    building.update_start = await utils.get_timestamp();
                    this.update_building_ui(b_index);
                }
            }
        } else {
            let b_index = this.buildings.findIndex(building => building.building_id == p_building);
            let building = this.buildings[b_index];
            let building_details = await this.get_bld_details(building.building_id);
            let lvl_details = (await this.get_bld_lvl_dts(building_details, building.level));
            let update_res_ui = false;
            let downgrade_building = true;
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
                    this.socket.emit('update_building', p_building, downgrade);
                    building.update_start = await utils.get_timestamp();
                    building.downgrade = 1;
                    this.update_building_ui(b_index);
                    if (update_res_ui) {
                        this.update_resource_ui();
                    }
                }
            }
        }
    }

    async update_buildings(timestamp) {
        let update_resource_ui = false;
        let update_resources = false;
        for (let i = 0; i < this.buildings.length; i++) {
            if (this.buildings[i].update_start !== null) {
                let building = this.buildings[i];
                let building_id = building.building_id;
                let building_details = await this.get_bld_details(building_id);
                let level_details = await this.get_bld_lvl_dts(building_details, building.level - building.downgrade);
                let time_left = building.update_start + level_details.upgrade_time - timestamp;
                if (time_left <= 0) {
                    let upgrading = building.downgrade !== 1;
                    if (upgrading) {
                        building.level++;
                    } else {
                        building.downgrade = 0;
                        building.level--;
                        if (level_details.upgrade_cost['pop'] !== undefined) {
                            this.resources['reserved_pop'] -= level_details.upgrade_cost['pop'];
                            update_resource_ui = true;
                        }
                        if (building_id == 4) {
                            update_resources = true;
                        }
                    }
                    if (building_id == 2) {
                        this.prod_upd_details.timestamp = building.update_start + level_details.upgrade_time;
                        this.prod_upd_details.building_id = building_id;
                        this.prod_upd_details.downgrade = upgrading;
                        this.resource_prods = (await this.get_bld_lvl_dts(building_details, building.level)).production;
                        update_resource_ui = true;
                    }
                    if (building_id == 5 || building_id == 4) {
                        update_resource_ui = true;
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
        let b_index = this.buildings.findIndex(building => building.building_id == p_building);
        let building = this.buildings[b_index];
        if (building.update_start !== null) {
            building.update_start = null;
            if (building.downgrade) {
                building.downgrade = 0;
            } else {
                let lvl_details = (await this.get_bld_lvl_dts(await this.get_bld_details(building.building_id), building.level));
                let changed_resources = {};
                for (let resource_type in lvl_details.upgrade_cost) {
                    if (resource_type == 'pop') {
                        let res_type = 'reserved_' + resource_type;
                        changed_resources[res_type] = this.resources[res_type] - lvl_details.upgrade_cost[resource_type];
                    } else {
                        let storage_building = this.buildings.find(building => building.building_id == 4);
                        let storage = (await this.get_bld_lvl_dts(await this.get_bld_details(storage_building.building_id), storage_building.level)).storage;
                        changed_resources[resource_type] = this.resources[resource_type] + lvl_details.upgrade_cost[resource_type];
                        if (changed_resources[resource_type] > storage[resource_type]) {
                            changed_resources[resource_type] = storage[resource_type];
                        }
                    }
                }
                for (let changed_resource in changed_resources) {
                    this.resources[changed_resource] = changed_resources[changed_resource];
                }
            }
            this.socket.emit('cancel_building_update', p_building);
            this.update_resource_ui();
            this.update_building_ui(b_index);
        }
    }

    async process_incoming_message(message) {
        console.log(message);
    }

    async request_data() {
        this.socket.emit('planet_datapack_request');
    }

    async update_resources(timestamp, time_passed) {
        let storage_bld = await this.get_building(4);
        let storage = (await this.get_bld_lvl_dts(await this.get_bld_details(storage_bld.building_id), storage_bld.level)).storage;
        let time_passed_before_update;
        let production_before_update;
        if (this.prod_upd_details.timestamp !== null) {
            time_passed_before_update = timestamp - this.prod_upd_details.timestamp;
            let building_details = await this.get_bld_details(this.prod_upd_details.building_id);
            let building_level = this.buildings.find(building => building.building_id == this.prod_upd_details.building_id).level;
            production_before_update = (await this.get_bld_lvl_dts(building_details, building_level + (this.prod_upd_details.downgrading ? 1 : -1))).production;
            time_passed -= time_passed_before_update;
            this.prod_upd_details.timestamp = null;
        }
        for (let resource_type in this.resource_prods) {
            if (time_passed_before_update !== undefined) {
                this.resources[resource_type] += production_before_update[resource_type] * time_passed_before_update;
            }
            this.resources[resource_type] += this.resource_prods[resource_type] * time_passed;
            if (this.resources[resource_type] > storage[resource_type]) {
                this.resources[resource_type] = storage[resource_type];
            }
        }
        await this.update_resource_ui();
        await this.update_building_dialog();
        await this.update_unit_dialog();
    }

    async update_resource_ui() {
        for (let resource_type in this.resources) {
            let split_resource = resource_type.split('reserved_');
            if (split_resource.length > 1) {
                let pop_building = this.buildings.find(building => building.building_id == 5);
                let available_pop = (await this.get_bld_lvl_dts(await this.get_bld_details(pop_building.building_id), pop_building.level - pop_building.downgrade)).production['pop'];
                document.getElementById(split_resource[1]).textContent = Math.floor(this.resources[resource_type]) + '/' + available_pop;
            } else {
                let storage_building = this.buildings.find(building => building.building_id == 4);
                let storage = (await this.get_bld_lvl_dts(await this.get_bld_details(storage_building.building_id), storage_building.level)).storage[resource_type];
                document.getElementById(resource_type).textContent = Math.floor(this.resources[resource_type]) + '/' + storage + ' (' + Math.round(this.resource_prods[resource_type]*3600 * 100)/100 + '/h)';
            }
        }
        await this.update_units_table();
        await this.update_unit_costs();
    }

    async update_building_ui(b_index) {
        let building = this.buildings[b_index];
        let building_details = await this.get_bld_details(building.building_id);
        let level = building.level;
        let update_start = building.update_start;
        let downgrade = building.downgrade;

        let lvl_details = (await this.get_bld_lvl_dts(building_details, building.level - building.downgrade));
        let upgrade_time = lvl_details.upgrade_time;
        if (update_start !== null && !downgrade) {
            lvl_details = (await this.get_bld_lvl_dts(await this.get_bld_details(building.building_id), building.level + 1));
        }
        let building_container = document.getElementById(`building_${building.building_id}`);
        let building_level_container = building_container.getElementsByTagName('div')[0];
        let building_timer_container = building_level_container.getElementsByTagName('div')[1];
        let building_building_els = building_level_container.querySelectorAll('p');
        let building_imgs = building_level_container.getElementsByTagName('img');
        let upgrade_arrow_img_el = building_imgs[0];
        let downgrade_arrow_img_el = building_imgs[1];
        let building_level = building_building_els[0];
        let building_timer = building_building_els[1];
        //let 
        if (update_start !== null) {
            if (downgrade == 0) {
                upgrade_arrow_img_el.style.display = '';
            } else {
                downgrade_arrow_img_el.style.display = '';
            }
            building_level.textContent = level;
            let building_time = update_start + upgrade_time - await utils.get_timestamp();
            building_timer.textContent = await utils.seconds_to_time(building_time);
            building_timer_container.style.display = 'flex';
        } else {
            upgrade_arrow_img_el.style.display = 'none';
            downgrade_arrow_img_el.style.display = 'none';
            building_level.textContent = level;
            building_timer_container.style.display = 'none';
        }
        
        if (update_start !== null) {
            upgrade_time = lvl_details.upgrade_time;
        }
        await this.update_building_dialog();
        await this.update_unit_dialog();
        await this.update_units_table();
    }

    async build_units(units_form) {
        let res_costs = {};
        let units = [];
        //last one is the submit button, hence length - 1
        for (let i = 0; i < units_form.elements.length - 1; i++) {
            let input_field = units_form.elements[i];
            let unit_count = Math.floor(input_field.value);
            let unit_id = input_field.id.split('_')[1];
            if (unit_count > 0 && !input_field.disabled) {
                let unit_details = await this.get_unit_dts(unit_id);
                for (let resource in unit_details.cost) {
                    let res_cost = unit_details.cost[resource] * unit_count;
                    let res_available = this.resources[resource] - (res_costs[resource] !== undefined ? res_costs[resource] : 0);
                    if (res_cost > res_available) {
                        let overcost = res_cost - res_available;
                        unit_count -= Math.ceil(overcost/unit_details.cost[resource]);
                    }
                }
                if (unit_count > 0) {
                    for (let resource in unit_details.cost) {
                        if (res_costs[resource] === undefined) {
                            res_costs[resource] = unit_details.cost[resource] * unit_count;
                        } else {
                            res_costs[resource] += unit_details.cost[resource] * unit_count;
                        }
                    }
                    input_field.value = Math.floor(input_field.value) - unit_count;
                    units.push({unit_id: unit_id, count: unit_count});
                }
            }
        }
        if (units.length > 0) {
            let timestamp = await utils.get_timestamp();
            let uq_table = document.getElementById('units_que_table');
            uq_table = uq_table.getElementsByTagName('tbody')[0];
            for (let i = 0; i < units.length; i++) {
                let unit_que = await this.generate_unit_que(units[i], timestamp);
                let unit_details = await this.get_unit_dts(units[i].unit_id);
                let time_left = unit_details.build_time * units[i].count;
                let uq_row = uq_table.insertRow();
                uq_row.setAttribute('id','unit_que_row_' + unit_que.unit_que_id);
                let uq_img_cell = uq_row.insertCell();
                let unit_img = document.createElement("img");
                unit_img.setAttribute('src','/client_side/images/units/' + unit_details.name + '.png');
                unit_img.setAttribute('height','15px');
                let name_span = document.createElement("span");
                name_span.append(unit_details.name);
                uq_img_cell.append(unit_img, name_span);
                let uq_count_cell = uq_row.insertCell();
                let count_span = document.createElement("span");
                count_span.classList.add('count');
                count_span.append(units[i].count);
                uq_count_cell.append(count_span);
                let uq_time_left_cell = uq_row.insertCell();
                let time_left_span = document.createElement("span");
                time_left_span.classList.add('time_left');
                time_left_span.append(await utils.seconds_to_time(time_left));
                uq_time_left_cell.append(time_left_span);
            }
            for (let resource in res_costs) {
                this.resources[resource] -= res_costs[resource];
            }
            this.update_resource_ui();
            this.socket.emit('build_units', units);
        }
        await this.update_unit_costs();
        await this.update_units_table();
    }

    async update_unit_ui() {
        for (let i = 0; i < this.units.length; i++) {
            let element_id = 'unit_id_' + this.units[i].unit_id;
            if (this.units[i].count == 0) {
                document.getElementById(element_id).style.display = 'none';
            } else {
                document.getElementById(element_id).removeAttribute('style');
                element_id = 'unit_count_' + this.units[i].unit_id;
                document.getElementById(element_id).textContent = this.units[i].count;
            }
        }
    }

    async update_units_table() {
        let units = await this.get_units_details();
        for (let i = 0; i < units.length; i++) {
            let unit_details = await this.get_unit_dts(units[i].unit_id);
            let buildable = true;
            for (let j = 0; j < unit_details.req_buildings.length; j++) {
                let req_bld = unit_details.req_buildings[j];
                let building = this.buildings.find(building => building.building_id == req_bld.building_id);
                if (building === undefined) {
                    building = {level: 0};
                }
                if (building.level < req_bld.level) {
                    buildable = false;
                }
            }
            let input_field = document.getElementById(`unit_${unit_details.unit_id}_input`);
            let max_el = document.getElementById(`max_${unit_details.unit_id}_units`);
            input_field.disabled = !buildable;
            max_el.style.display = buildable ? '' : 'none';
        }

        let create_units_table = document.getElementById('create_units_table');
        let input_fields = create_units_table.getElementsByTagName('input');
        let res_costs = {};
        //last one is the submit button, hence length - 1
        for (let i = 0; i < input_fields.length - 1; i++) {
            let unit_count = Math.floor(input_fields[i].value);
            let unit_id = input_fields[i].id.split('_')[1];
            let unit_details = await this.get_unit_dts(unit_id);
            if (unit_count < 0) {
                unit_count = 0;
            }
            for (let resource in unit_details.cost) {
                if (res_costs[resource] === undefined) {
                    res_costs[resource] = unit_details.cost[resource] * unit_count;
                } else {
                    res_costs[resource] += unit_details.cost[resource] * unit_count;
                }
            }
        }
        for (let i = 0; i < input_fields.length - 1; i++) {
            let unit_id = input_fields[i].id.split('_')[1];
            let unit_count = Math.floor(input_fields[i].value);
            let max_unit_el = document.getElementById(`max_${unit_id}_units`);
            let unit_details = await this.get_unit_dts(unit_id);
            let max_units;
            for (let resource in unit_details.cost) {
                if (max_units !== undefined) {
                    max_units = Math.min(max_units, Math.floor((this.resources[resource] - res_costs[resource])/unit_details.cost[resource]));
                } else {
                    max_units = Math.floor((this.resources[resource] - res_costs[resource])/unit_details.cost[resource]);
                }
            }
            if (max_units <= 0 && unit_count <= 0) {
                max_units = 0;
            } else if (max_units <= 0 && Math.abs(max_units) > unit_count) {
                max_units = -unit_count;
            }
            max_unit_el.textContent = `(${max_units})`;
        }
    }

    async update_unit_que(timestamp) {
        let update_unit_ui = false;
        let update_timestamp = false;
        let time_remainder = 0;
        for (let i = 0; i < this.unit_ques.length; i++) {
            let unit_build_time = (await this.get_unit_dts(this.unit_ques[i].unit_id)).build_time;
            let calculated_timestamp = (update_timestamp ? timestamp : this.unit_ques[i].calculated_timestamp) - time_remainder;
            let max_created_units = Math.floor((timestamp - calculated_timestamp) / unit_build_time);
            let created_units = Math.min(max_created_units, this.unit_ques[i].count);
            if (created_units < 1) {
                if (!update_timestamp) {
                    break;
                } else {
                    this.unit_ques[i].calculated_timestamp = calculated_timestamp;
                }
            } else {
                update_unit_ui = true;
                time_remainder = (timestamp - calculated_timestamp) % unit_build_time + unit_build_time * (max_created_units - created_units);
                let u_index = this.units.findIndex(unit => unit.unit_id == this.unit_ques[i].unit_id);
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
            this.update_unit_dialog();
        }
        this.update_unit_que_ui(timestamp);
    }

    async update_unit_que_ui(timestamp) {
        for (let i = 0; i < this.unit_ques.length; i++) {
            let unit_details = await this.get_unit_dts(this.unit_ques[i].unit_id);
            let time_left = unit_details.build_time * this.unit_ques[i].count - (i == 0 ? (timestamp - this.unit_ques[i].calculated_timestamp) : 0);
            let unit_que_column = document.getElementById('unit_que_row_' + this.unit_ques[i].unit_que_id);
            unit_que_column.getElementsByClassName('count')[0].innerHTML = this.unit_ques[i].count;
            unit_que_column.getElementsByClassName('time_left')[0].innerHTML = await utils.seconds_to_time(time_left);
        }
        for (let i = 0; i < this.removed_unit_ques.length; i++) {
            let unit_que_column = document.getElementById('unit_que_row_' + this.removed_unit_ques[i].unit_que_id);
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
        //let dpi = window.devicePixelRatio;
        console.log(this.planet_map_canvas);
        let planet_map_height = +getComputedStyle(this.planet_map_canvas).getPropertyValue("height").slice(0, -2);
        let planet_map_width = +getComputedStyle(this.planet_map_canvas).getPropertyValue("width").slice(0, -2);
        this.planet_map_height = planet_map_height; //* dpi;
        this.planet_map_width = planet_map_width; //* dpi;
        this.xOffset = 50;
        this.yOffset = planet_map_height/2;
        this.planet_map_canvas.setAttribute('height', this.planet_map_height);
        this.planet_map_canvas.setAttribute('width', this.planet_map_width);
        return this.window_resize_handler.bind(this);
    }
    */

    async open_building_dialog(building_id) {
        let building_details = await this.get_bld_details(building_id);
        let old_dialog = document.getElementById(building_dialog_id);
        if (old_dialog !== null) {
            let old_overlay = document.getElementById(dialog_overlay_id);
            old_dialog.remove();
            old_overlay.remove();
        }
        let dialog = document.createElement('div');
        dialog.classList.add('dialog_div');
        dialog.setAttribute("id", building_dialog_id);
        let dialog_overlay = document.createElement('div');
        dialog_overlay.classList.add(dialog_overlay_class);
        dialog_overlay.addEventListener('contextmenu', function(event) {
            event.preventDefault();
            dialog_overlay.style.display = 'none';
            let new_event = new event.constructor(event.type, event);
            document.elementFromPoint(event.clientX, event.clientY).dispatchEvent(new_event);
            dialog_overlay.style.display = 'block';
        });
        dialog_overlay.addEventListener('click', function() {
            dialog.remove();
            dialog_overlay.remove();
        });
        let disable_upgrade = false;
        let building_name = document.createElement('h1');
        building_name.append(building_details.name);
        building_name.dataset.building_id = building_id;
        let building_img = document.createElement('img');
        building_img.setAttribute('src', `/client_side/images/buildings/${building_details.name}.png`);
        let building_img_container = document.createElement('div');
        building_img_container.setAttribute('id', 'building_img_container');
        let building = this.buildings.find(building => building.building_id == building_id);
        if (building === undefined) {
            building = {level: 0};
        }
        let building_level = document.createElement('p');
        building_level.append(building.level);
        building_img_container.append(building_img);
        building_img_container.append(building_level);
        let building_description_title = document.createElement('h4');
        building_description_title.append('Description');
        let building_description = document.createElement('p');
        building_description.append(building_details.description);
        let building_desc_container = document.createElement('div');
        building_desc_container.setAttribute('id', 'building_description');
        building_desc_container.append(building_description_title, building_description);
        let upgrade_cost = document.createElement('div');
        upgrade_cost.setAttribute('id', 'upgrade_cost');
        let resource_title = document.createElement('h4');
        resource_title.append('Resource cost: ');
        upgrade_cost.append(resource_title);
        let level_index = building_details.level_details.findIndex(lvl_detail => lvl_detail.level == building.level);
        let building_req_container = document.createElement('div');
        building_req_container.setAttribute('id', 'building_requirements');
        let building_req_title = document.createElement('h4');
        building_req_title.append('Building requirements: ');
        building_req_container.append(building_req_title);
        let req_technology_container = document.createElement('div');
        req_technology_container.setAttribute('id', 'technology_requirements');
        let req_technology_title = document.createElement('h4');
        req_technology_title.append('Technology requirements: ');
        req_technology_container.append(req_technology_title);
        let button_container = document.createElement('div');
        button_container.setAttribute('id', 'building_dialog_buttons');
        let upgrade_button = document.createElement('button');
        upgrade_button.dataset.building_id = building_details.building_id;
        upgrade_button.setAttribute('id', 'upgrade_dialog_button');
        let cancel_img_el = document.createElement('img');
        cancel_img_el.setAttribute('src', '/client_side/images/ui/red_cross.png');
        cancel_img_el.classList.add('dialog_cancel_img');
        cancel_img_el.style.display = 'none';
        let upgrade_arrow_img_el = document.createElement('img');
        upgrade_arrow_img_el.setAttribute('src', '/client_side/images/ui/upgrade_arrow.png');
        upgrade_arrow_img_el.classList.add('dialog_arrow_img');
        let button_text_el = document.createElement('span');
        //upgrade time -1 = building is maxed out
        button_text_el.append(building_details.level_details[level_index].upgrade_time >= 0 ? 'Upgrade' : 'MAXED OUT');
        let button_timer_el = document.createElement('span');
        button_timer_el.style.display = 'none';
        upgrade_button.append(cancel_img_el, upgrade_arrow_img_el, button_text_el, button_timer_el);
        let _that = this;
        upgrade_button.addEventListener('click', function() {
            if (this.dataset.action == 'upgrade') {
                _that.update_building(building_id);
            } else if (this.dataset.action == 'cancel') {
                _that.cancel_building_update(this.dataset.building_id);
            }
        });
        if (disable_upgrade || building_details.level_details[level_index].upgrade_time < 0) {
            upgrade_button.disabled = true;
        }
        let downgrade_button = document.createElement('button');
        let downgrade_arrow_img_el = document.createElement('img');
        downgrade_arrow_img_el.setAttribute('src', '/client_side/images/ui/downgrade_arrow.png');
        downgrade_arrow_img_el.classList.add('dialog_arrow_img');
        let button_text = document.createElement('span');
        //upgrade time -1 = building is maxed out
        button_text.append('Downgrade');
        downgrade_button.append(downgrade_arrow_img_el, button_text);
        downgrade_button.addEventListener('click', function() {
            this.update_building(building_id, 1);
        }.bind(this));
        if (building.level == 0) {
            downgrade_button.disabled = true;
        }
        button_container.append(upgrade_button, downgrade_button);
        dialog.append(building_name, building_img_container, building_desc_container, upgrade_cost, building_req_container, button_container);
        document.body.append(dialog, dialog_overlay);
        await this.update_building_dialog();
    }

    async update_building_dialog() {
        let dialog = document.getElementById(building_dialog_id);
        if (dialog !== null) {
            let disable_upgrade = false;
            let building_id = document.getElementsByTagName('h1')[0].dataset.building_id;
            let building_details = await this.get_bld_details(building_id);
            let building = this.buildings.find(building => building.building_id == building_id);
            if (building === undefined) {
                building = {level: 0, update_start: null};
            }
            document.querySelector('#building_img_container > p').textContent = building.level;
            let level_index = building_details.level_details.findIndex(lvl_detail => lvl_detail.level == building.level);
            let resource_containers = document.querySelectorAll('#upgrade_cost > div');
            let container_array = [];
            resource_containers.forEach(res_cr => container_array.push(res_cr));
            for (let resource in building_details.level_details[level_index].upgrade_cost) {
                let resource_container = document.getElementById(`bld_${resource}_cost`);
                let resource_cost = building_details.level_details[level_index].upgrade_cost[resource];
                let resource_cost_el;
                if (resource_container === null) {
                    resource_container = document.createElement('div');
                    resource_container.setAttribute('id', `bld_${resource}_cost`);
                    let resource_img = document.createElement('img');
                    resource_img.setAttribute('src', `/client_side/images/resources/${resource}.png`);
                    resource_img.setAttribute('title', resource);
                    resource_cost_el = document.createElement('p');
                    resource_container.append(resource_img, resource_cost_el);
                    upgrade_cost.append(resource_container);
                } else {
                    resource_cost_el = resource_container.getElementsByTagName('p')[0];
                }
                resource_cost_el.textContent = building_details.level_details[level_index].upgrade_cost[resource];
                if (resource == 'pop') {
                    let pop_building = this.buildings.find(building => building.building_id == 5);
                    let available_pop = (await this.get_bld_lvl_dts(await this.get_bld_details(pop_building.building_id), pop_building.level)).production['pop'];
                    let res_type = 'reserved_' + resource;
                    if (this.resources[res_type] + resource_cost > available_pop) {
                        if (!resource_cost_el.classList.contains('missing_requirement')) {
                            resource_cost_el.classList.add('missing_requirement');
                        }
                        disable_upgrade = true;
                    } else if (resource_cost_el.classList.contains('missing_requirement')) {
                        resource_cost_el.classList.remove('missing_requirement');
                    }
                } else if (resource_cost > this.resources[resource]) {
                    if (!resource_cost_el.classList.contains('missing_requirement')) {
                        resource_cost_el.classList.add('missing_requirement');
                    }
                    disable_upgrade = true;
                } else if (resource_cost_el.classList.contains('missing_requirement')) {
                    resource_cost_el.classList.remove('missing_requirement');
                }
                for (let i = container_array.length - 1; i >= 0; i--) {
                    if (container_array[i].id == resource_container.id) {
                        container_array.splice(i,1);
                        break;
                    }
                }
            }
            for (let i = container_array.length - 1; i >= 0; i--) {
                container_array[i].remove();
            }
            container_array = [];
            let req_building_containers = document.querySelectorAll('#building_requirements > div');
            req_building_containers.forEach(req_bld_cr => container_array.push(req_bld_cr));
            let req_buildings_container = document.getElementById('building_requirements');
            if (building_details.level_details[level_index].req_buildings !== undefined) {
                if (req_buildings_container.style.display == 'none') {
                    req_buildings_container.style.display = '';
                }
                for (let i = 0; i < building_details.level_details[level_index].req_buildings.length; i++) {
                    let req_bld_lvl_el;
                    let req_bld = building_details.level_details[level_index].req_buildings[i];
                    let req_bld_container = document.getElementById(`bld_${req_bld.building_id}_req`);
                    if (req_bld_container == null) {
                        let req_bld_container = document.createElement('div');
                        req_bld_container.setAttribute('id', `bld_${req_bld.building_id}_req`);
                        let req_building_img = document.createElement('img');
                        let req_bld_details = await this.get_bld_details(req_bld.building_id);
                        req_building_img.setAttribute('src', `/client_side/images/buildings/${req_bld_details.name}.png`);
                        req_building_img.setAttribute('title', req_bld_details.name);
                        req_bld_lvl_el = document.createElement('p');
                        req_bld_container.append(req_building_img, req_bld_lvl_el);
                        req_buildings_container.append(req_bld_container);
                    } else {
                        req_bld_lvl_el = req_bld_container.getElementsByTagName('p')[0];
                    }
                    let req_building = this.buildings.find(building => building.building_id == req_bld.building_id);
                    if (req_building === undefined) {
                        req_building = {level: 0};
                    }
                    req_bld_lvl_el.textContent = req_bld.level;
                    if (req_building.level < req_bld.level) {
                        if (req_bld_lvl_el.classList.length == 0) {
                            req_bld_lvl_el.classList.add('missing_requirement');
                        }
                        disable_upgrade = true;
                    } else if (req_bld_lvl_el.classList.length == 1) {
                        req_bld_lvl_el.classList.remove('missing_requirement');
                    }
                    for (let i = container_array.length - 1; i >= 0; i--) {
                        if (container_array[i].id == req_bld_container.id) {
                            container_array.splice(i,1);
                            break;
                        }
                    }
                }
            } else if (req_buildings_container.style.display == '') {
                req_buildings_container.style.display = 'none';
            }
            for (let i = container_array.length - 1; i >= 0; i--) {
                container_array[i].remove();
            }
            
            let update_buttons = document.querySelectorAll('#building_dialog_buttons > button');
            let upgrade_button = update_buttons[0];
            let downgrade_button = update_buttons[1];
            let cancel_img_el = upgrade_button.getElementsByTagName('img')[0];
            let arrow_img_el = upgrade_button.getElementsByTagName('img')[1];
            let button_span_els = upgrade_button.querySelectorAll('span');
            let up_button_txt_el = button_span_els[0];
            let button_timer_el = button_span_els[1];
            if (building.update_start !== null) {
                let lvl_index = level_index;
                if (building.downgrade == 1) {
                    lvl_index = building_details.level_details.findIndex(lvl_detail => lvl_detail.level == building.level - 1);
                }
                let upgrade_time = building_details.level_details[lvl_index].upgrade_time;
                let building_time = building.update_start + upgrade_time - await utils.get_timestamp();
                button_timer_el.textContent = `(${await utils.seconds_to_time(building_time)})`;
                if (upgrade_button.dataset.action != 'cancel') {
                    button_timer_el.style.display = '';
                    cancel_img_el.style.display = '';
                    arrow_img_el.style.display = 'none';
                    downgrade_button.style.display = 'none';
                    up_button_txt_el.textContent = `Cancel ${building.downgrade == 0 ? 'Upgrade' : 'Downgrade'}`;
                    upgrade_button.dataset.action = 'cancel';
                    upgrade_button.setAttribute('id', 'cancel_dialog_button');
                    upgrade_button.disabled = false;
                }
            } else {
                if (upgrade_button.dataset.action != 'upgrade') {
                    button_timer_el.style.display = 'none';
                    cancel_img_el.style.display = 'none';
                    downgrade_button.style.display = '';
                    arrow_img_el.style.display = '';
                    upgrade_button.dataset.action = 'upgrade';
                    upgrade_button.setAttribute('id', 'upgrade_dialog_button');
                    up_button_txt_el.textContent = (building_details.level_details[level_index].upgrade_time < 0 ? 'MAX LEVEL' : 'Upgrade');
                    if (building.level == 0) {
                        downgrade_button.disabled = true;
                    } else {
                        downgrade_button.disabled = false;
                    }
                }
                upgrade_button.disabled = disable_upgrade || building_details.level_details[level_index].upgrade_time < 0;
            }
        }
    }

    /**
     * 
     * @param {*} field_el If undefined, updates all the unit costs
     */
    async update_unit_costs(field_el) {
        if (field_el === undefined) {
            let create_units_table = document.getElementById('create_units_table');
            let input_fields = create_units_table.getElementsByTagName('input');
            //- 1 because last is submit button
            for (let i = 0; i < input_fields.length - 1; i++) {
                await this._update_unit_costs(input_fields[i]);
            }
        } else {
            await this._update_unit_costs(field_el);
        }
    }

    /**
     * 
     * @param {WebElement} field_el Input field element has been updated
     */
    async _update_unit_costs(field_el) {
        let unit_count = field_el.value;
        let unit_id = field_el.id.split('_')[1];
        let unit_details = await this.get_unit_dts(unit_id);
        let time_cost_el = document.getElementById(`unit_${unit_id}_time_cost`);
        if (unit_count < 1) {
            unit_count = 1;
            time_cost_el.textContent = unit_details.build_time + 's';
        } else {
            unit_count = unit_count;
            time_cost_el.textContent = await utils.seconds_to_time(unit_details.build_time * unit_count);
        }
        for (let resource in unit_details.cost) {
            let res_cost_el = document.getElementById(`unit_${unit_details.unit_id}_${resource}_cost`);
            let cost = unit_details.cost[resource] * unit_count;
            res_cost_el.textContent = cost;
            if (+field_el.value > 0 && this.resources[resource] < cost) {
                res_cost_el.classList.add('missing_requirement');
            } else if (res_cost_el.classList.contains('missing_requirement')) {
                res_cost_el.classList.remove('missing_requirement');
            }
        }
    }

    async open_unit_dialog(unit_id) {
        let unit_details = await this.get_unit_dts(unit_id);
        let old_dialog = document.getElementById(unit_dialog_id);
        if (old_dialog !== null) {
            let old_overlay = document.getElementById(dialog_overlay_id);
            old_dialog.remove();
            old_overlay.remove();
        }
        let dialog = document.createElement('div');
        dialog.classList.add('dialog_div');
        dialog.setAttribute("id", unit_dialog_id);
        let dialog_overlay = document.createElement('div');
        dialog_overlay.classList.add(dialog_overlay_class);
        dialog_overlay.addEventListener('contextmenu', function(event) {
            event.preventDefault();
            dialog_overlay.style.display = 'none';
            let new_event = new event.constructor(event.type, event);
            document.elementFromPoint(event.clientX, event.clientY).dispatchEvent(new_event);
            dialog_overlay.style.display = 'block';
        });
        dialog_overlay.addEventListener('click', function() {
            dialog.remove();
            dialog_overlay.remove();
        });
        let unit_name = document.createElement('h1');
        unit_name.append(unit_details.name);
        unit_name.dataset.unit_id = unit_id;
        let unit_img = document.createElement('img');
        unit_img.setAttribute('src', `/client_side/images/units/${unit_details.name}.png`);
        let unit_img_container = document.createElement('div');
        unit_img_container.setAttribute('id', 'unit_img_container');
        let unit = this.units.find(unit => unit.unit_id == unit_id);
        if (unit === undefined) {
            unit = {count: 0};
        }
        let unit_count_el = document.createElement('p');
        unit_count_el.append(unit.count);
        unit_img_container.append(unit_img, unit_count_el);
        let unit_description_title = document.createElement('h4');
        unit_description_title.append('Description');
        let unit_description = document.createElement('p');
        unit_description.append(unit_details.description);
        let unit_desc_container = document.createElement('div');
        unit_desc_container.setAttribute('id', 'building_description');
        unit_desc_container.append(unit_description_title, unit_description);
        let unit_cost = document.createElement('div');
        unit_cost.setAttribute('id', 'upgrade_cost');
        let resource_title = document.createElement('h4');
        resource_title.append('Resource cost: ');
        unit_cost.append(resource_title);
        let building_req_container = document.createElement('div');
        building_req_container.setAttribute('id', 'building_requirements');
        let building_req_title = document.createElement('h4');
        building_req_title.append('Building requirements: ');
        building_req_container.append(building_req_title);

        let technology_req_container = document.createElement('div');
        technology_req_container.setAttribute('id', 'technology_requirements');
        let technology_req_title = document.createElement('h4');
        technology_req_title.append('Technology requirements: ');
        technology_req_container.append(technology_req_title);
        /*
        //let level_index = building_details.level_details.findIndex(lvl_detail => lvl_detail.level == building.level);
        let button_container = document.createElement('div');
        button_container.setAttribute('id', 'building_dialog_buttons');
        let upgrade_button = document.createElement('button');
        upgrade_button.dataset.building_id = building_details.building_id;
        upgrade_button.setAttribute('id', 'upgrade_dialog_button');
        let cancel_img_el = document.createElement('img');
        cancel_img_el.setAttribute('src', '/client_side/images/ui/red_cross.png');
        cancel_img_el.classList.add('dialog_cancel_img');
        cancel_img_el.style.display = 'none';
        let upgrade_arrow_img_el = document.createElement('img');
        upgrade_arrow_img_el.setAttribute('src', '/client_side/images/ui/upgrade_arrow.png');
        upgrade_arrow_img_el.classList.add('dialog_arrow_img');
        let button_text_el = document.createElement('span');
        //upgrade time -1 = building is maxed out
        button_text_el.append(building_details.level_details[level_index].upgrade_time >= 0 ? 'Upgrade' : 'MAXED OUT');
        let button_timer_el = document.createElement('span');
        button_timer_el.style.display = 'none';
        upgrade_button.append(cancel_img_el, upgrade_arrow_img_el, button_text_el, button_timer_el);
        let _that = this;
        upgrade_button.addEventListener('click', function() {
            if (this.dataset.action == 'upgrade') {
                _that.update_building(building_id);
            } else if (this.dataset.action == 'cancel') {
                _that.cancel_building_update(this.dataset.building_id);
            }
        });
        if (disable_upgrade || building_details.level_details[level_index].upgrade_time < 0) {
            upgrade_button.disabled = true;
        }
        let downgrade_button = document.createElement('button');
        let downgrade_arrow_img_el = document.createElement('img');
        downgrade_arrow_img_el.setAttribute('src', '/client_side/images/ui/downgrade_arrow.png');
        downgrade_arrow_img_el.classList.add('dialog_arrow_img');
        let button_text = document.createElement('span');
        //upgrade time -1 = building is maxed out
        button_text.append('Downgrade');
        downgrade_button.append(downgrade_arrow_img_el, button_text);
        downgrade_button.addEventListener('click', function() {
            this.update_building(building_id, 1);
        }.bind(this));
        if (building.level == 0) {
            downgrade_button.disabled = true;
        }
        button_container.append(upgrade_button, downgrade_button);
        */
        dialog.append(unit_name, unit_img_container, unit_desc_container, unit_cost, building_req_container, technology_req_container);//, button_container);
        document.body.append(dialog, dialog_overlay);
        await this.update_unit_dialog();
    }

    async update_unit_dialog() {
        let dialog = document.getElementById(unit_dialog_id);
        if (dialog !== null) {
            let unit_id = document.getElementsByTagName('h1')[0].dataset.unit_id;
            let unit_details = await this.get_unit_dts(unit_id);
            let unit = this.units.find(unit => unit.unit_id == unit_id);
            if (unit === undefined) {
                unit = {count: 0};
            }
            document.querySelector('#unit_img_container > p').textContent = unit.count;
            //let level_index = building_details.level_details.findIndex(lvl_detail => lvl_detail.level == building.level);
            for (let resource in unit_details.cost) {
                let resource_container = document.getElementById(`bld_${resource}_cost`);
                let resource_cost_el;
                if (resource_container === null) {
                    resource_container = document.createElement('div');
                    resource_container.setAttribute('id', `bld_${resource}_cost`);
                    let resource_img = document.createElement('img');
                    resource_img.setAttribute('src', `/client_side/images/resources/${resource}.png`);
                    resource_img.setAttribute('title', resource);
                    resource_cost_el = document.createElement('p');
                    resource_container.append(resource_img, resource_cost_el);
                    upgrade_cost.append(resource_container);
                } else {
                    resource_cost_el = resource_container.getElementsByTagName('p')[0];
                }
                resource_cost_el.textContent = unit_details.cost[resource];
            }
            let req_buildings_container = document.getElementById('building_requirements');
            if (unit_details.req_buildings !== undefined) {
                if (req_buildings_container.style.display == 'none') {
                    req_buildings_container.style.display = '';
                }
                for (let i = 0; i < unit_details.req_buildings.length; i++) {
                    let req_bld_lvl_el;
                    let req_bld = unit_details.req_buildings[i];
                    let req_bld_container = document.getElementById(`bld_${req_bld.building_id}_req`);
                    if (req_bld_container == null) {
                        let req_bld_container = document.createElement('div');
                        req_bld_container.setAttribute('id', `bld_${req_bld.building_id}_req`);
                        let req_building_img = document.createElement('img');
                        let req_bld_details = await this.get_bld_details(req_bld.building_id);
                        req_building_img.setAttribute('src', `/client_side/images/buildings/${req_bld_details.name}.png`);
                        req_building_img.setAttribute('title', req_bld_details.name);
                        req_bld_lvl_el = document.createElement('p');
                        req_bld_container.append(req_building_img, req_bld_lvl_el);
                        req_buildings_container.append(req_bld_container);
                    } else {
                        req_bld_lvl_el = req_bld_container.getElementsByTagName('p')[0];
                    }
                    let req_building = this.buildings.find(building => building.building_id == req_bld.building_id);
                    if (req_building === undefined) {
                        req_building = {level: 0};
                    }
                    req_bld_lvl_el.textContent = req_bld.level;
                    if (req_building.level < req_bld.level) {
                        if (req_bld_lvl_el.classList.length == 0) {
                            req_bld_lvl_el.classList.add('missing_requirement');
                        }
                    } else if (req_bld_lvl_el.classList.length == 1) {
                        req_bld_lvl_el.classList.remove('missing_requirement');
                    }
                }
            } else if (req_buildings_container.style.display == '') {
                req_buildings_container.style.display = 'none';
            }

            let req_technology_container = document.getElementById('technology_requirements');
            if (unit_details.req_technologies !== undefined) {
                if (req_technology_container.style.display == 'none') {
                    req_technology_container.style.display = '';
                }
                for (let i = 0; i < unit_details.req_technologies.length; i++) {
                    let req_tech_lvl_el;
                    let req_technology = unit_details.req_technologies[i];
                    let req_tech_container = document.getElementById(`bld_${req_technology.technology_id}_req`);
                    if (req_tech_container == null) {
                        let req_tech_container = document.createElement('div');
                        req_tech_container.setAttribute('id', `bld_${req_technology.technology_id}_req`);
                        let req_technology_img = document.createElement('img');
                        let req_tech_details = await this.get_tech_details(req_technology.technology_id);
                        req_technology_img.setAttribute('src', `/client_side/images/research/${req_tech_details.name}_preview.png`);
                        req_technology_img.setAttribute('title', req_tech_details.name);
                        req_tech_lvl_el = document.createElement('p');
                        req_tech_lvl_el.append('1');
                        req_tech_container.append(req_technology_img, req_tech_lvl_el);
                        req_technology_container.append(req_tech_container);
                    } else {
                        req_tech_lvl_el = req_tech_container.getElementsByTagName('p')[0];
                    }
                    await this.update_technologies();
                    let req_tech = this.research_details.researched_techs.find(tech_id => tech_id == req_technology.technology_id);
                    if (req_tech === undefined) {
                        if (req_tech_lvl_el.classList.length == 0) {
                            req_tech_lvl_el.classList.add('missing_requirement');
                        }
                    } else if (req_tech_lvl_el.classList.length == 1) {
                        req_tech_lvl_el.classList.remove('missing_requirement');
                    }
                }
            } else if (req_technology_container.style.display == '') {
                req_technology_container.style.display = 'none';
            }
        }
    }

    async update_technologies() {
        if (this.research_details.inResearch !== undefined) {
            let tech_details = await this.get_tech_details(this.research_details.inResearch);
            let time_left = this.research_details.start_timestamp + tech_details.research_time - await utils.get_timestamp();
            if (time_left <= 0) {
                this.research_details.researched_techs.push(this.research_details.inResearch);
                delete this.research_details.inResearch;
            }
        }
    }
}

export { Game };