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
        this.playing_fight_record = false;
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
        this.playing_fight_record = true;
        var tick = 30;
        var units = [[],[]];
        var projectiles = [];
        var disabled_units = [];
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
        var draw_func = async function() {
            var timestamp = Date.now();
            var time_passed = timestamp - this.tick_timestamp;
            var ctx = this.ctx;
            var interpol_ratio = time_passed/tick;
            ctx.clearRect(0, 0, this.width, this.height);
            ctx.save();
            ctx.translate(this.xOffset, this.yOffset);
            ctx.fillStyle = 'red';
            //TODO: Need to add angle to projectiles
            for (var i = projectiles.length - 1; i >= 0; i--) {
                var weapon_details = await _that.get_unit_weapon_dts(1);
                var projectile = projectiles[i];
                var target_unit = units[projectile.target_indices[0]][projectile.target_indices[1]];
                if (target_unit === undefined) {
                    console.log(JSON.stringify(units));
                    console.log(JSON.stringify(projectiles));
                }
                var target_unit_x = target_unit.x + (target_unit.next_x - target_unit.x) * interpol_ratio;
                var y_adj = target_unit.next_y > projectile.y ? -projectile_height : 0;
                var target_unit_y = target_unit.y + (target_unit.next_y - target_unit.y) * interpol_ratio + y_adj;
                var p_vector = new Vector(projectile, {x: target_unit_x, y: target_unit_y});
                var p_vector_2 = await p_vector.normalize();
                p_vector_2 = await p_vector_2.multiply(interpol_ratio * weapon_details.velocity/10);
                if (Math.abs(p_vector_2.x) >= Math.abs(p_vector.x) && Math.abs(p_vector_2.y) >= Math.abs(p_vector.y)) {
                    target_unit.projectiles_count--;
                    if (target_unit.projectiles_count == 0) {
                        if (target_unit.destroyed) {
                            units[projectile.target_indices[0]].splice(projectile.target_indices[1],1);
                        } else if (target_unit.disabled) {
                            disabled_units.push(target_unit);
                            units[projectile.target_indices[0]].splice(projectile.target_indices[1],1);
                        }
                    }
                    console.log(JSON.stringify(projectiles));   
                    projectiles.splice(i,1);
                    continue;
                }
                projectile.x += p_vector_2.x;
                projectile.y += p_vector_2.y;
                ctx.beginPath();
                ctx.rect((projectile.x - projectile_width/2) * this.zoom, projectile.y * this.zoom, projectile_width * this.zoom, projectile_height * this.zoom);
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
                    ctx.beginPath();
                    ctx.rect((unit.x + (unit.next_x - unit.x) * interpol_ratio - width/2) * this.zoom, (unit.y + (unit.next_y - unit.y) * interpol_ratio - height/2) * this.zoom, width * this.zoom, height * this.zoom);
                    ctx.fill();
                }
            }
            ctx.fillStyle = "rgb(211,211,211)";
            width = 20;
            height = 20;
            for (var i = 0; i < disabled_units.length; i++) {
                var unit = disabled_units[i];
                ctx.beginPath();
                ctx.rect((unit.x - width/2) * this.zoom, (unit.y - height/2) * this.zoom, width * this.zoom, height * this.zoom);
                ctx.fill();
            }
            ctx.restore();
            if (_that.fr_canvas !== undefined) {
                window.requestAnimationFrame(this.draw.bind(this));
            }
        }
        this.fight_record_canvas = new Canvas(canvas, draw_func);
        for (var i = 2; i < fr_data.length; i++) {
            projectiles = [];
            var height = 0;
            for (var j = 0; j < fr_data[i].length; j++) {
                for (var k = 0; k < fr_data[i][j].length; k++) {
                    var unit = units[j][k];
                    unit.x = units[j][k].next_x;
                    unit.y = units[j][k].next_y;
                    unit.next_x = fr_data[i][j][k][0];
                    unit.next_y = fr_data[i][j][k][1];
                    unit.disabled = fr_data[i][j][k][fr_data[i][j][k].length - 2];
                    unit.destroyed = fr_data[i][j][k][fr_data[i][j][k].length - 1];
                    var next_unit = units[j][k + 1];
                    if (unit.destroyed || unit.disabled) {
                        if (next_unit !== undefined) {
                            if (unit.color !== undefined && next_unit.color === undefined) {
                                next_unit.color = unit.color;
                            }
                            if (unit.width !== undefined && next_unit.width === undefined) {
                                next_unit.width = unit.width;
                            }
                            if (unit.height !== undefined && next_unit.height === undefined) {
                                next_unit.height = unit.height;
                            }
                        }
                    }
                    if (unit.height !== undefined) {
                        height = unit.height;
                    }
                    for (var l = 2; l < fr_data[i][j][k].length - 2; l += 2) {
                        var unit_index = (j == 0 ? 1 : 0);
                        var target_unit = units[unit_index][fr_data[i][j][k][l]];
                        var y_adj = (target_unit.next_y > unit.y ? height/2 : -height/2 - projectile_height);
                        projectiles.push({x: unit.x, y: unit.y + y_adj, target_indices: [[unit_index],[fr_data[i][j][k][l]]], hit: fr_data[i][j][k][l + 1]});
                        if (target_unit.projectiles_count === undefined) {
                            target_unit.projectiles_count = 1;
                        } else {
                            target_unit.projectiles_count++;
                        }
                        tick = 1500;
                    }
                }
            }
            projectiles.sort((a,b) => {
                if (a.target_indices[0] > b.target_indices[0]) {
                    return 1;
                } else if (a.target_indices[0] < b.target_indices[0]) {
                    return -1;
                } else {
                    return a.target_indices[1] - b.target_indices[1];
                }
            });
            await new Promise((resolve, reject) => setTimeout(resolve, tick));
            this.fight_record_canvas.tick_timestamp = Date.now();
            if (this.fr_canvas === undefined) {
                return;
            }
        }
        //TODO: This does not produce the last projectiles that disable or destroy the remaining ships
        for (var i = 0; i < units.length; i++) {
            for (var j = units[i].length - 1; j >= 0; j--) {
                var unit = units[i][j];
                var next_unit = units[i][j + 1];
                if (unit.destroyed || unit.disabled) {
                    if (next_unit !== undefined) {
                        if (unit.color !== undefined && next_unit.color === undefined) {
                            next_unit.color = unit.color;
                        }
                        if (unit.width !== undefined && next_unit.width === undefined) {
                            next_unit.width = unit.width;
                        }
                        if (unit.height !== undefined && next_unit.height === undefined) {
                            next_unit.height = unit.height;
                        }
                    }
                    if (unit.destroyed) {
                        units[i].splice(j,1);
                    } else if (unit.disabled) {
                        disabled_units.push(unit);
                        units[i].splice(j,1);
                    }
                }
            }
        }
        this.playing_fight_record = false;
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