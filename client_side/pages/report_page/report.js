"use strict"

import { Canvas } from '../javascript/misc_modules/canvas.js';
import { Utils } from '../javascript/misc_modules/utils.js';
import { Vector } from '../javascript/misc_modules/vector.js';
import { Base_Page } from './base_page.js';
var utils = new Utils();

class Game extends Base_Page {
    constructor(socket) {
        super();
        this.socket = socket;
        this.displayed_reports = [];
        this.received_reports = false;
    }

    async display_reports() {
        if (this.received_reports) {
            console.log(this.report_datapack);
            var reports = this.report_datapack.reports;
            var report_table = document.getElementById('report_table');
            for (var i = 0; i < reports.length; i++) {
                var row = report_table.insertRow();
                var report_title_cell = row.insertCell();
                var report_link = document.createElement('a');
                report_link.setAttribute('id', reports[i].report_id);
                report_link.append(reports[i].title);
                if (!reports[i].gotDisplayed) {
                    var new_report_span = document.createElement('span');
                    new_report_span.append(' (New)');
                    new_report_span.setAttribute('style', 'font-weight: normal');
                    report_link.append(new_report_span);
                }
                report_link.addEventListener('click', function(e) {
                    e.preventDefault();
                    this.request_report_details(e.currentTarget.id);
                }.bind(this));
                if (!reports[i].isRead) {
                    report_link.setAttribute('style', 'font-weight: bold');
                }
                report_title_cell.append(report_link);
                if (!reports[i].gotDisplayed) {
                    this.displayed_reports.push(i);
                }
                var report_date_cell = row.insertCell();
                report_date_cell.append(await utils.miliseconds_to_date(reports[i].timestamp * 1000));
            }
            //send list of the displayed reports to the server
            this.reports = undefined;
            this.displayed_reports = undefined;
            if (reports.length > 0) {
                setTimeout(async function() { this.socket.emit('reports_displayed', reports[0].timestamp) }.bind(this), 500);
            }
        } else {
            setTimeout(this.display_reports.bind(this), 200);
        }
    }

    save_reports (report_datapack) {
        this.received_reports = true;
        this.report_datapack = JSON.parse(report_datapack);
    }

    async request_datapack() {
        this.socket.emit('report_datapack_request');
    }

    request_report_details(report_id) {
        this.socket.emit('load_report', report_id);
    }

    async load_report(p_report_details) {
        let canvas_control_func_p;
        let report_details = JSON.parse(p_report_details);
        let dialog_id = 'report_container';
        let dialog_overlay_id = 'report_overlay';
        let old_report = document.getElementById(dialog_id);
        if (old_report !== null) {
            let old_overlay = document.getElementById(dialog_overlay_id);
            old_report.remove();
            old_overlay.remove();
        }
        let report_container_id = dialog_id;
        let report_overlay_id = dialog_overlay_id;
        let report_container = document.createElement('div');
        report_container.setAttribute("id", report_container_id);
        let report_text_paragraph = document.createElement('p');
        report_text_paragraph.append(report_details.text);
        let report_time_paragraph = document.createElement('p');
        report_time_paragraph.append(await utils.miliseconds_to_date(report_details.timestamp * 1000));
        if (report_details.fr_timestamp !== undefined && report_details.fr_timestamp !== null) {
            let fight_record_link = document.createElement('a');
            this.fr_timestamp = report_details.fr_timestamp;
            this.fr_duration = report_details.duration;
            this.curr_report_id = report_details.report_id;
            this.fr_link = fight_record_link;
            this.update_fr_timer();
            this.fr_interval = setInterval(this.update_fr_timer.bind(this), 1000);
            let _that = this;
            fight_record_link.addEventListener('click', async function() {
                _that.load_fight_report(report_details.report_id).then((fr_data) => {
                    _that.fr_canvas = document.createElement('canvas');
                    _that.fr_canvas.setAttribute('id', 'fr_canvas');
                    document.body.append(_that.fr_canvas);
                    let record_controls = {tick: 30, paused: false, pause_timestamp: Date.now(), update_canvas: false, pause_records: []};
                    _that.display_fight_report(_that.fr_canvas, fr_data, record_controls);
                    let canvas_control_func = function(e) {
                        switch (e.code) {
                            case 'Space':
                                record_controls.paused = record_controls.paused ? false : true;
                                if (record_controls.paused) {
                                    record_controls.pause_timestamp = Date.now();
                                    record_controls.pause_records.push({start: record_controls.pause_timestamp});
                                } else {
                                    record_controls.pause_records[record_controls.pause_records.length - 1].end = Date.now();
                                    if (record_controls.unpause_func !== undefined) {
                                        record_controls.unpause_func();
                                        record_controls.unpause_func = undefined;
                                    }
                                }
                                break;
                            case 'ArrowRight':
                                //TODO: Fix - Changing tick while it is being drawn on the canvas fucks with the interpolation values
                                record_controls.tick -= record_controls.tick > 80 ? 50 : record_controls.tick - 30;
                                break;
                            case 'ArrowLeft':
                                record_controls.tick += 50;
                                break;
                        }
                    };
                    canvas_control_func_p = canvas_control_func;
                    document.addEventListener('keyup', canvas_control_func);
                }).catch(err => {
                    console.log(err);
                    console.log('Error cause: ' + err.cause);
                    if (err.cause == 404) {
                        this.textContent = 'The recording has been deleted';
                        this.classList.add('id', 'unavailable_link');
                    }
                });
            });
            report_container.append(fight_record_link);
        }
        report_container.append(report_text_paragraph);
        report_container.append(report_time_paragraph);
        let report_overlay = document.createElement('div');
        report_overlay.setAttribute("id", report_overlay_id);
        report_overlay.addEventListener('click', async function() {
            if (this.fr_canvas !== undefined) {
                await this.remove_fr_canvas();
                document.removeEventListener('keyup', canvas_control_func_p);
            }
            clearInterval(this.fr_interval);
            report_container.remove();
            report_overlay.remove();
        }.bind(this));
        document.body.append(report_container, report_overlay);
        document.getElementById(report_details.report_id).style.fontWeight = 'normal';
        setTimeout(async function() { this.socket.emit('report_read', report_details.report_id) }.bind(this), 300);
    }

    async load_fight_report(report_id) {
        let response = await fetch('/game/report?id=' + report_id);
        if (!response.ok) {
            throw new Error('There was an issue with fetching a fight record from the server', { cause: response.status });
        }
        return response.json();
    }

    async display_fight_report(canvas, fr_data, record_controls) {
        let units = [[],[]];
        let projectiles = [];
        for (let i = 0; i < units.length; i++) {
            for (let j = 0; j < fr_data[i].length; j++) {
                if (Array.isArray(fr_data[i][j])) {
                    let color = 'deeppink';
                    switch (fr_data[i][j][0]) {
                        case 1:
                            color = 'red';
                            break;
                        case 2:
                            color = 'blue';
                            break;
                        case 3:
                            color = 'green';
                            break;
                        case 4:
                        case 5:
                        case 6:
                        case 7: 
                        case 8: 
                        case 9: 
                        case 10:
                            break;
                    }
                    units[i].push({color: color, width: 20, height: 20});
                    continue;
                }
                if (units[i].length == 0) {
                    units[i].push({x: fr_data[i][j], next_x: fr_data[i][j]});
                } else {
                    if (units[i][units[i].length - 1].x !== undefined) {
                        if (units[i][units[i].length - 1].y === undefined) {
                            units[i][units[i].length - 1].y = fr_data[i][j];
                            units[i][units[i].length - 1].next_y = fr_data[i][j];
                        } else {
                            units[i].push({x: fr_data[i][j], next_x: fr_data[i][j]});
                        }
                    } else {
                        units[i][units[i].length - 1].x = fr_data[i][j];
                        units[i][units[i].length - 1].next_x = fr_data[i][j];
                    }
                }
                if (this.fr_canvas === undefined) {
                    return;
                }
            }
        }
        class projectile_size {
            constructor(weapon_id) {
                if (weapon_id == 4 || weapon_id == 5) {
                    this.width = 2;
                    this.height = 0;
                } else {
                    this.width = 4;
                    this.height = 14;
                }
            }
        }
        let replay_finished = false;
        let _that = this;
        //TODO: The entire FE for loading fr needs to be updated since BE part has been updated
        let draw_func = async function() {
            if (!record_controls.paused || record_controls.update_canvas) {
                let timestamp = record_controls.paused ? record_controls.pause_timestamp : Date.now();
                let tick_time_passed = timestamp - this.tick_timestamp;
                let ctx = this.ctx;
                let interpol_ratio = tick_time_passed/record_controls.tick;
                if (replay_finished && interpol_ratio > 1) interpol_ratio = 1;
                ctx.clearRect(0, 0, this.width, this.height);
                ctx.save();
                ctx.translate(this.xOffset, this.yOffset);
                ctx.fillStyle = 'red';
                //TODO: Need to add angle to projectiles
                for (let i = projectiles.length - 1; i >= 0; i--) {
                    let projectile = projectiles[i];
                    let weapon_details = await _that.get_unit_weapon_dts(projectile.weapon_id);
                    let proj_size = new projectile_size(projectile.weapon_id);
                    let move_by = await (await projectile.future_pos.subtract(projectile.pos)).multiply(interpol_ratio);
                    let x = projectile.pos.x + move_by.x;
                    let y = projectile.pos.y + move_by.y;
                    //TODO: Make sure this is the correct calculation of the current projectile height under the set angle
                    //let y_hit_calc_adj = move_by.y < 0 ? -projectile_height * Math.abs(projectile.angle / Math.PI) : 0;
                    //has to be only less than one, else a projectile might get deleted earlier than intended
                    if ((interpol_ratio < 1 && projectile.delete) && (projectile.weapon_id != 4 || projectile.weapon_id != 5)) {
                        if (projectile.hit) {
                            //TODO: instead of splicing the projectile once it reaches it's target, make it appear as if it was slowly disappearing while hitting the ship? Make the height of the projectile smaller by the amount of distance passed by the target position, until the height reaches 0 or < 0, deleting it
                            if (projectile.travelled + weapon_details.velocity * 100 * interpol_ratio >= projectile.init_target_dist) {
                                let target_unit = projectile.target_unit;
                                switch (projectile.target_status) {
                                    case 3:
                                        target_unit.neutralized = true;
                                        target_unit.disabled = true;
                                    break;
                                    case 4:
                                        target_unit.neutralized = true;
                                        //was disabled, but additional shot fired, before it got disabled, which destroyed it
                                        if (target_unit.disabled == true) {
                                            target_unit.disabled = false;
                                        }
                                    break;
                                }
                                projectiles.splice(i,1);
                                continue;
                            }
                        } else {
                            if (projectile.travelled + weapon_details.velocity * 100 * interpol_ratio >= weapon_details.range) {
                                projectiles.splice(i,1);
                                continue;
                            }
                        }
                    }
                    x = (x - proj_size.width/2) * this.zoom;
                    y = y * this.zoom;
                    if (projectile.weapon_id != 4 && projectile.weapon_id != 5) {
                        ctx.save();
                        ctx.translate(x, y);
                        ctx.rotate(projectile.angle + 0.5 * Math.PI);
                        ctx.translate(-x, -y);
                    }
                    let color = 'red';
                    if (projectile.weapon_id == 4) {
                        color = 'lightskyblue';                    
                    }
                    ctx.strokeStyle = color;
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    if (projectile.weapon_id == 4 || projectile.weapon_id == 5) {
                        ctx.lineWidth = proj_size.width * this.zoom;
                        ctx.moveTo((projectile.source_unit.x + (projectile.source_unit.next_x - projectile.source_unit.x) * interpol_ratio) * this.zoom, (projectile.source_unit.y + (projectile.source_unit.next_y - projectile.source_unit.y) * interpol_ratio) * this.zoom);
                        ctx.lineTo((projectile.target_unit.x + (projectile.target_unit.next_x - projectile.target_unit.x) * interpol_ratio) * this.zoom, (projectile.target_unit.y + (projectile.target_unit.next_y - projectile.target_unit.y) * interpol_ratio) * this.zoom);
                        ctx.stroke();
                    } else {
                        ctx.lineWidth = 1;
                        ctx.rect(x, y, proj_size.width * this.zoom, proj_size.height * this.zoom);
                        ctx.fill();
                    }
                    if (projectile.weapon_id != 4 && projectile.weapon_id != 5) {
                        ctx.restore();
                    }

                    ctx.fillStyle = 'green';
                    ctx.beginPath();
                    ctx.arc(projectile.target_position.x * this.zoom, projectile.target_position.y * this.zoom, 5 * this.zoom, 0, 2 * Math.PI);
                    ctx.fill();
                }
                ctx.lineWidth = 1;
                let width = 0;
                let height = 0;
                for (var i = 0; i < units.length; i++) {
                    for (var j = 0; j < units[i].length; j++) {
                        var unit = units[i][j];
                        if (unit.color !== undefined) {
                            ctx.fillStyle = unit.color;
                        }
                        if (unit.width !== undefined) {
                            width = unit.width;
                        }
                        if (unit.height !== undefined) {
                            height = unit.height;
                        }
                        if (unit.neutralized === undefined) {
                            ctx.beginPath();
                            ctx.rect((unit.x + (unit.next_x - unit.x) * interpol_ratio - width/2) * this.zoom, (unit.y + (unit.next_y - unit.y) * interpol_ratio - height/2) * this.zoom, width * this.zoom, height * this.zoom);
                            ctx.fill();
                        }
                    }
                }
                ctx.fillStyle = "rgb(211,211,211)";
                width = 20;
                height = 20;
                for (var i = 0; i < units.length; i++) {
                    for (var j = 0; j < units[i].length; j++) {
                        var unit = units[i][j];
                        if (unit.disabled) {
                            ctx.beginPath();
                            ctx.rect((unit.x - width/2) * this.zoom, (unit.y - height/2) * this.zoom, width * this.zoom, height * this.zoom);
                            ctx.fill();
                        }
                    }
                }
                ctx.restore();
                if (record_controls.update_canvas) {
                    record_controls.update_canvas = false;
                }
            }
            if (_that.fr_canvas !== undefined) {
                window.requestAnimationFrame(this.draw.bind(this));
            }
        }
        this.fight_record_canvas = new Canvas(canvas, draw_func, undefined, undefined, undefined, record_controls);
        for (let i = 2; i < fr_data.length; i++) {
            for (let j = projectiles.length - 1; j >= 0; j--) {
                let projectile = projectiles[j];
                if (projectile.delete) {
                    if (projectile.hit) {
                        let target_unit = projectile.target_unit;
                        switch (projectile.target_status) {
                            case 3:
                                target_unit.neutralized = true;
                                target_unit.disabled = true;
                            break;
                            case 4:
                                target_unit.neutralized = true;
                                //was disabled, but additional shot fired, before it got disabled, which destroyed it
                                if (target_unit.disabled == true) {
                                    target_unit.disabled = false;
                                }
                            break;
                        }
                    }
                    projectiles.splice(j, 1);
                    continue;
                }
            }
            for (let j = 0; j < fr_data[i].length - 1; j++) {
                let func_units_count = 0;
                let u_index = 0;
                for (let k = 0; k < fr_data[i][j].length; k++) {
                    for (let m = u_index; m < units[j].length; m++) {
                        if (units[j][m].neutralized === undefined) {
                            if (func_units_count == k) {
                                u_index = m;
                                break;
                            }
                            func_units_count++;
                        }
                    }
                    let unit = units[j][u_index];
                    unit.x = unit.next_x;
                    unit.y = unit.next_y;
                    let unit_data = fr_data[i][j][k];
                    unit.next_x = unit_data[0];
                    unit.next_y = unit_data[1];
                    for (let l = 2; l < unit_data.length; l += 3) {
                        let oppf_index = j == 0 ? 1 : 0;
                        let projectile_id = fr_data[i][j][k][l];
                        //l + 1 = index of the target unit in units array
                        let target_unit = units[oppf_index][unit_data[l + 1]];
                        let weapon_id = fr_data[i][j][k][l + 2];
                        //originally was also + or - height/2, but on the BE the projectile is generated on the x and y of the ship (which is drawn as the middle). If the projectile was drawn starting from the edge of the ship, it would take less time to reach the target, which could cause it to arrive a tick earlier than planned, causing issues
                        let proj_size = new projectile_size(weapon_id);
                        let y_adj = (target_unit.next_y > unit.y ? 0 : -proj_size.height);
                        projectiles.push({projectile_id: projectile_id, pos: new Vector(unit.x, unit.y + y_adj), weapon_id: weapon_id});
                        if (weapon_id == 4 || weapon_id == 5) {
                            projectiles[projectiles.length - 1].source_unit = unit;
                            projectiles[projectiles.length - 1].duration = 2;
                        }
                        for (var m = i; m < fr_data.length; m++) {
                            for (var n = 0; n < fr_data[m][2].length; n += 3) {
                                if (fr_data[m][2][n] == projectile_id) {
                                    let unit_index = fr_data[i][j][k][l + 1];
                                    let target_unit_data = fr_data[i][oppf_index][unit_index];
                                    let x;
                                    let y;
                                    if (target_unit_data === undefined) {
                                        x = units[oppf_index][unit_index].next_x;
                                        y = units[oppf_index][unit_index].next_y;
                                    } else {
                                        x = target_unit_data[0];
                                        y = target_unit_data[1];
                                    }
                                    let projectile = projectiles[projectiles.length - 1];
                                    projectile.target_unit = target_unit;
                                    projectile.target_status = fr_data[m][2][n + 1];
                                    projectile.hit = projectile.target_status > 1;
                                    let unit_prev_index = fr_data[m][2][n + 2];
                                    if (unit_prev_index != -1) {
                                        let unit_prev_data = fr_data[m][oppf_index][unit_prev_index];
                                        projectile.target_position = new Vector(unit_prev_data[0], unit_prev_data[1]);
                                    } else {
                                        projectile.target_position = new Vector(x,y);
                                    }
                                    break;
                                }
                            }
                        }
                    }
                }
            }
            for (let j = projectiles.length - 1; j >= 0; j--) {
                let projectile = projectiles[j];
                let to_target_vector = new Vector(projectile.pos, projectile.target_position);
                let weapon_details = await _that.get_unit_weapon_dts(projectile.weapon_id);
                if (projectile.velocity_vector === undefined) {
                    projectile.velocity_vector = await to_target_vector.normalize();
                    projectile.angle = await projectile.velocity_vector.angle();
                    projectile.travelled = -weapon_details.velocity * 100;
                    if (projectile.hit) {
                        projectile.init_target_dist = await to_target_vector.length();
                    }
                    projectile.future_pos = projectile.pos;
                }
                let found = false;
                for (let j = 0; j < fr_data[i][2].length; j += 3) {
                    if (fr_data[i][2][j] == projectile.projectile_id) {
                        found = true;
                        break;
                    }
                }
                projectile.travelled += weapon_details.velocity * 100;
                if (projectile.duration !== undefined) {
                    projectile.duration--;
                }
                if (projectile.hit) {
                    //the draw function should delete the projectile once it reaches the destination, however, the interpol doesn't usually reach the value of 1, so if the hit happened right at the end of a tick, it won't get drawn and therefore deleted -> checked in the next tick if it was supposed to get deleted and deletes. Another issue, why (projectile.travelled + weapon_details.velocity * 100 >= distance) check was removed is because of rounding errors (a projectile would reach target position (e.g. x = 185), which should've been reached the next tick (the actual x coordinate reached is e.g. 185.1 and the actual target x coordinate is 185.5, but due to usage of Math.floor to save space, this results in a rounding error, causing the unit to get neutralized a tick too early, which completely messes up other units coordinates, since the next coordinates for the neutralized unit are now applied to the unit after it in the array, it's coordinates to the one after, etc.)
                    //Also, now beam weapons are being drawn for the entire tick, only being deleted in the next tick
                    if (projectile.duration === undefined) {
                        if (found) {
                            projectile.delete = true;
                        }
                    } else if (projectile.duration < 1) {
                        projectile.delete = true;
                    }
                } else if (projectile.duration === undefined && projectile.travelled + weapon_details.velocity * 100 >= weapon_details.range) {
                    projectile.delete = true;
                } else if (projectile.duration !== undefined && projectile.duration < 1) {
                    projectile.delete = true;
                }
                projectile.pos = projectile.future_pos;
                let p_move_vector = await projectile.velocity_vector.multiply(weapon_details.velocity * 100);
                projectile.future_pos = await p_move_vector.add(projectile.pos);
            }
            if (this.fr_canvas === undefined) {
                return;
            }
            //right now, all of the code expects the "logic loop" to be done instaneously. If not, some inconsistencies could arise (e.g. a pause is always expected to be caught after the await "tick promise"), but this is unlikely as of rn at the very least
            //let tick_time_left = 0;
            //end can also be undefined -> fix to expect this (same in the for loop below this one)
            /*for (let j = record_controls.pause_records.length - 1; j >= 0; j--) {
                let pr = record_controls.pause_records[j];
                tick_time_left += pr.end - pr.start;
                record_controls.pause_records.splice(j,1);
            }
            this.fight_record_canvas.tick_timestamp = Date.now() - tick_time_left;
            */
            this.fight_record_canvas.tick_timestamp = Date.now();
            await new Promise((resolve, reject) => setTimeout(resolve, record_controls.tick));// + tick_time_left));
            let previous_dpt = record_controls.tick;
            while (record_controls.pause_records.length != 0) {
                let draw_time = 0;
                let previous_pr = {end: this.fight_record_canvas.tick_timestamp};
                for (let j = record_controls.pause_records.length - 1; j >= 0; j--) {
                    let pr = record_controls.pause_records[j];
                    if (pr.end === undefined) {
                        await new Promise((resolve, reject) => {record_controls.unpause_func = resolve});
                    }
                    draw_time += pr.start - previous_pr.end;
                    previous_pr = pr;
                    record_controls.pause_records.splice(j,1);
                }
                let draw_pause_time = previous_dpt - draw_time;
                previous_dpt = draw_pause_time;
                if (draw_pause_time > 0) {
                    this.fight_record_canvas.tick_timestamp = Date.now() - draw_time;
                    await new Promise((resolve, reject) => setTimeout(resolve, draw_pause_time));
                }
            }
            if (this.fr_canvas === undefined) {
                return;
            }
        }
        replay_finished = true;
    }

    async update_fr_timer() {
        let fr_time_left = this.fr_timestamp + this.fr_duration - await utils.get_timestamp();
        if (fr_time_left == 0) {
            clearInterval(this.fr_interval);
            this.fr_interval = setInterval(this.request_fr_status.bind(this), 2500);
        }
        this.fr_link.textContent = 'Click here to play the recording of the fight (recording expires in: ' + (fr_time_left > 0 ? await utils.seconds_to_time(fr_time_left) : '0 - queued up for deleting') + ')';
    }

    async request_fr_status() {
        this.socket.emit('get_fr_status', this.curr_report_id);
    }

    async get_fr_status(available) {
        if (!available) {
            clearInterval(this.fr_interval);
            this.fr_link.textContent = 'The recording has been deleted';
            this.fr_link.classList.add('id', 'unavailable_link');
        }
    }

    async remove_fr_canvas() {
        this.fr_canvas.remove();
        delete this.fr_canvas;
    }
}

export { Game };