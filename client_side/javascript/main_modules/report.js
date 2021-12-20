"use strict"

import { Canvas } from '../misc_modules/canvas.js';
import { Utils } from '../misc_modules/utils.js';
import { Vector } from '../misc_modules/vector.js';
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
            console.log(this.report_datapack)
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
        var report_details = JSON.parse(p_report_details);
        var dialog_id = 'report_container';
        var dialog_overlay_id = 'report_overlay';
        var old_report = document.getElementById(dialog_id);
        if (old_report !== null) {
            var old_overlay = document.getElementById(dialog_overlay_id);
            old_report.remove();
            old_overlay.remove();
        }
        var report_container_id = dialog_id;
        var report_overlay_id = dialog_overlay_id;
        var report_container = document.createElement('div');
        report_container.setAttribute("id", report_container_id);
        var report_text_paragraph = document.createElement('p');
        report_text_paragraph.append(report_details.text);
        var report_time_paragraph = document.createElement('p');
        report_time_paragraph.append(await utils.miliseconds_to_date(report_details.timestamp * 1000));
        if (report_details.fr_timestamp !== undefined && report_details.fr_timestamp !== null) {
            var fight_record_link = document.createElement('a');
            this.fr_timestamp = report_details.fr_timestamp;
            this.fr_duration = report_details.duration;
            this.curr_report_id = report_details.report_id;
            this.fr_link = fight_record_link;
            this.update_fr_timer();
            this.fr_interval = setInterval(this.update_fr_timer.bind(this), 1000);
            var _that = this;
            fight_record_link.addEventListener('click', async function() {
                _that.load_fight_report(report_details.report_id).then((fr_data) => {
                    _that.fr_canvas = document.createElement('canvas');
                    _that.fr_canvas.setAttribute('id', 'fr_canvas');
                    document.body.append(_that.fr_canvas);
                    _that.display_fight_report(_that.fr_canvas, fr_data);
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
        var report_overlay = document.createElement('div');
        report_overlay.setAttribute("id", report_overlay_id);
        report_overlay.addEventListener('click', async function() {
            if (this.fr_canvas !== undefined) {
                await this.remove_fr_canvas();
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
        var response = await fetch('/game/report?id=' + report_id);
        if (!response.ok) {
            throw new Error('There was an issue with fetching a fight record from the server', { cause: response.status });
        }
        return response.json();
    }

    async display_fight_report(canvas, fr_data) {
        var tick = 30;
        var units = [[],[]];
        var projectiles = [];
        var unit_id;
        for (var i = 0; i < units.length; i++) {
            for (var j = 0; j < fr_data[i].length; j++) {
                if (j == 0 && unit_id !== undefined) {
                    fr_data[i].unshift([unit_id]);
                }
                if (Array.isArray(fr_data[i][j])) {
                    unit_id = fr_data[i][j][0];
                    var color = 'white';
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
        const projectile_width = 4;
        const projectile_height = 14;
        var _that = this;
        //TODO: The entire FE for loading fr needs to be updated since BE part has been updated
        var draw_func = async function() {
            var timestamp = Date.now();
            var tick_time_passed = timestamp - this.tick_timestamp;
            var ctx = this.ctx;
            var interpol_ratio = tick_time_passed/tick;
            ctx.clearRect(0, 0, this.width, this.height);
            ctx.save();
            ctx.translate(this.xOffset, this.yOffset);
            ctx.fillStyle = 'red';
            //TODO: Need to add angle to projectiles
            for (var i = projectiles.length - 1; i >= 0; i--) {
                var weapon_details = await _that.get_unit_weapon_dts(1);
                var projectile = projectiles[i];
                var move_by = await (await projectile.future_pos.subtract(projectile.pos)).multiply(interpol_ratio);
                var x = projectile.pos.x + move_by.x;
                var y = projectile.pos.y + move_by.y;
                //TODO: Make sure this is the correct calculation of the current projectile height under the set angle
                var y_hit_calc_adj = move_by.y < 0 ? -projectile_height * Math.abs(projectile.angle / Math.PI) : 0;
                if (interpol_ratio < 1) {
                    if (projectile.hit) {
                        //TODO: instead of splicing the projectile once it reaches it's target, make it appear as if it was slowly disappearing while hitting the ship? Make the height of the projectile smaller by the amount of distance passed by the target position, until the height reaches 0 or < 0, deleting it
                        if (await (new Vector({x: projectile.pos.x, y: projectile.pos.y + y_hit_calc_adj}, projectile.target_position)).length() < 10) {
                            console.log('reached');
                        }
                        if (Math.sign(projectile.target_position.x - x) != Math.sign(projectile.target_position.x - projectile.pos.x) || Math.sign(projectile.target_position.y - (y + y_hit_calc_adj)) != Math.sign(projectile.target_position.y - projectile.pos.y)) {
                            projectiles.splice(i,1);
                            continue;
                        }
                    } else {
                        if (projectile.travelled + weapon_details.velocity * interpol_ratio >= weapon_details.range) {
                            projectiles.splice(i,1);
                            continue;
                        }
                    }
                }
                x = (x - projectile_width/2) * this.zoom;
                y = y * this.zoom;
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(projectile.angle + 0.5 * Math.PI);
                ctx.translate(-x, -y);
                if (projectile.projectile_id == 6) {
                    ctx.fillStyle = 'purple';
                } else {
                    ctx.fillStyle = 'red';
                }
                ctx.beginPath();
                ctx.rect(x, y, projectile_width * this.zoom, projectile_height * this.zoom);
                ctx.fill();
                ctx.restore();

                ctx.fillStyle = 'green';
                ctx.beginPath();
                ctx.arc(projectile.target_position.x * this.zoom, projectile.target_position.y * this.zoom, 5 * this.zoom, 0, 2 * Math.PI);
                ctx.fill();
            }
            var width = 0;
            var height = 0;
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
            if (_that.fr_canvas !== undefined) {
                window.requestAnimationFrame(this.draw.bind(this));
            }
        }
        this.fight_record_canvas = new Canvas(canvas, draw_func);
        for (var i = 2; i < fr_data.length; i++) {
            for (var j = 0; j < fr_data[i].length - 1; j++) {
                var func_units_count = 0;
                var u_index = 0;
                for (var k = 0; k < fr_data[i][j].length; k++) {
                    for (var m = u_index; m < units[j].length; m++) {
                        if (units[j][m].neutralized === undefined) {
                            if (func_units_count == k) {
                                u_index = m;
                                break;
                            }
                            func_units_count++;
                        }
                    }
                    var unit = units[j][u_index];
                    unit.x = unit.next_x;
                    unit.y = unit.next_y;
                    var unit_data = fr_data[i][j][k];
                    unit.next_x = unit_data[unit_data.length - 2];
                    unit.next_y = unit_data[unit_data.length - 1];
                    for (var l = 0; l < unit_data.length - 2; l += 2) {
                        var fleet_index = (j == 0 ? 1 : 0);
                        //l + 1 = index of the target unit in units array
                        var target_unit = units[fleet_index][unit_data[l + 1]];
                        //originally was also + or - height/2, but on the BE the projectile is generated on the x and y of the ship (which is drawn as the middle). If the projectile was drawn starting from the edge of the ship, it would take less time to reach the target, which could cause it to arrive a tick earlier than planned, causing issues
                        var y_adj = (target_unit.next_y > unit.y ? 0 : -projectile_height);
                        projectiles.push({projectile_id: fr_data[i][j][k][l], pos: new Vector(unit.x, unit.y + y_adj)});
                        tick = 1000;
                        for (var m = i; m < fr_data.length; m++) {
                            for (var n = 0; n < fr_data[m][2].length; n += 3) {
                                if (fr_data[m][2][n] == fr_data[i][j][k][l]) {
                                    var oppf_index = j == 0 ? 1 : 0;
                                    var unit_index = fr_data[i][j][k][l + 1];
                                    var target_unit_data = fr_data[i][oppf_index][unit_index];
                                    var x;
                                    var y;
                                    if (target_unit_data === undefined) {
                                        x = units[oppf_index][unit_index].next_x;
                                        y = units[oppf_index][unit_index].next_y;
                                    } else {
                                        x = target_unit_data[target_unit_data.length - 2];
                                        y = target_unit_data[target_unit_data.length - 1];
                                    }
                                    var projectile = projectiles[projectiles.length - 1];
                                    projectile.target_unit = target_unit;
                                    projectile.target_status = fr_data[m][2][n + 1];
                                    projectile.hit = projectile.target_status > 1;
                                    var weapon_details = await _that.get_unit_weapon_dts(1);
                                    var unit_prev_index = fr_data[m][2][n + 2];
                                    if (unit_prev_index != -1) {
                                        var unit_prev_data = fr_data[m - 1][oppf_index][unit_prev_index];
                                        var prev_target_pos = {x: unit_prev_data[unit_prev_data.length - 2], y: unit_prev_data[unit_prev_data.length - 1]};
                                        var prev_to_curr = new Vector(prev_target_pos, {x: x, y: y});
                                        var distance = await prev_to_curr.length();
                                        var interpol_ratio = (distance % weapon_details.velocity)/weapon_details.velocity;
                                        prev_to_curr = await prev_to_curr.multiply(interpol_ratio != 0 ? interpol_ratio : 1);
                                        projectile.target_position = await prev_to_curr.add(prev_target_pos);
                                    } else {
                                        projectile.target_position = new Vector(x,y);
                                    }
                                    
                                    var future_pos = projectile.pos;
                                    var move_by = await (await future_pos.subtract(projectile.pos)).multiply(0.007);
                                    var y_hit_calc_adj = move_by.y < 0 ? -projectile_height * Math.abs(projectile.angle / Math.PI) : 0;
                                    var dist = await (new Vector({x: projectile.pos.x, y: projectile.pos.y + y_hit_calc_adj}, projectile.target_position)).length();
                                    if (dist > 250 && unit_prev_index != -1) {
                                        console.log('debug');
                                    }
                                    break;
                                }
                            }
                        }
                    }
                }
            }
            for (var j = projectiles.length - 1; j >= 0; j--) {
                var projectile = projectiles[j];
                if (projectile.delete) {
                    projectiles.splice(j, 1);
                    continue;
                }
                var weapon_details = await _that.get_unit_weapon_dts(1);
                if (projectile.velocity_vector === undefined) {
                    var p_vector_2 = new Vector(projectile.pos, projectile.target_position);
                    var p_vector = await p_vector_2.normalize();
                    projectile.velocity_vector = p_vector;
                    projectile.angle = await p_vector.angle();
                    if (!projectile.hit) {
                        //velocity gets added in the same tick -> travelled value ends up being 0 and during drawing is calculated as travelled + weapon_velocity * interpolation_ratio 
                        projectile.travelled = -weapon_details.velocity;
                    }
                    projectile.future_pos = projectile.pos;
                }
                var p_vector = await projectile.velocity_vector.multiply(weapon_details.velocity);
                if (projectile.hit) {
                    var target_unit = projectile.target_unit;
                    if (Math.abs(p_vector.x) >= Math.abs(p_vector_2.x) || Math.abs(p_vector.y) >= Math.abs(p_vector_2.y)) {
                        //the draw function should delete the projectile once it reaches the destination, however, the interpol doesn't usually reach the value of 1, so if the hit happened right at the end of a tick, it won't get drawn and therefore deleted -> check in the next tick if it was supposed to get deleted and delete
                        projectile.delete = true;
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
                } else {
                    projectile.travelled += weapon_details.velocity;
                }
                projectile.pos = projectile.future_pos;
                projectile.future_pos = await p_vector.add(projectile.pos);
            }
            await new Promise((resolve, reject) => setTimeout(resolve, tick));
            this.fight_record_canvas.tick_timestamp = Date.now();
            if (this.fr_canvas === undefined) {
                return;
            }
        }
        if (this.fr_canvas === undefined) {
            return;
        }
    }

    async update_fr_timer() {
        var fr_time_left = this.fr_timestamp + this.fr_duration - await utils.get_timestamp();
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