"use strict"

import { Utils } from '../misc_modules/utils.js';
import { Base_Page } from './base_page.js';
var utils = new Utils();

class Game extends Base_Page {
    constructor(socket) {
        super();
        this.socket = socket;
        this.res_map_canvas;
        this.map_width;
        this.map_height;
        this.ctx;
        this.logic_loop;
        this.tick_time = 100;
        this.zoom = 0.25;
        this.x_spacing = 800;
        this.y_spacing = 300;
        this.tech_img_width = 100;
        this.tech_img_height = 100;
        this.dist_travelled = {x: 0, y:0};
        
        this.xOffset = 0;
        this.yOffset = 0;
        this.dragging = false;
        this.image = document.getElementById('rocket_preview');
    }

    async request_data() {
        this.socket.emit('research_datapack_request', this.layout);
    }

    async setup_game(p_datapack) {
        var datapack = JSON.parse(p_datapack);
        console.log(datapack);
        super.setup_page(datapack);
        this.technologies = datapack.technologies;
        this.research_details = datapack.research_details;
        for (var i = 0; i < this.technologies.length; i++) {
            if (this.research_details.inResearch !== undefined && this.research_details.inResearch == this.technologies[i].technology_id) {
                this.researching_tech = this.technologies[i];
            }
            this.technologies[i].x1 = this.x_spacing * this.technologies[i].col;
            this.technologies[i].x2 = this.technologies[i].x1 + this.tech_img_width;
            this.technologies[i].y1 = this.y_spacing * this.technologies[i].row;
            this.technologies[i].y2 = this.technologies[i].y1 + this.tech_img_height;
        }
        this.res_map_canvas = document.getElementById("research_map");
        this.ctx = this.res_map_canvas.getContext("2d");
        this.res_map_rect = this.res_map_canvas.getBoundingClientRect();
        window.onresize = this.window_resize_handler();
        //expecting the border to have the same width on all the sides of the canvas
        //this.res_map_canvas_border = +getComputedStyle(this.res_map_canvas).getPropertyValue('border-top-width').slice(0, -2);

        document.getElementById('research_map').addEventListener('wheel', e => {
            e.preventDefault();
            if (this.hovered_technology_index !== undefined) {
                this.res_map_canvas.style.cursor = "default";
            }
            var x = e.clientX - this.res_map_rect.left;//- this.res_map_canvas_border;
            var y = e.clientY - this.res_map_rect.top;//- this.res_map_canvas_border;
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

        this.res_map_canvas.addEventListener('mousedown', e => {
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

            var res_button_wrappers = document.getElementsByClassName("res_btn_clicked");
            if (res_button_wrappers.length != 0) {
                var button_wrapper = res_button_wrappers[0];
                button_wrapper.classList.add("res_btn");
                button_wrapper.classList.remove("res_btn_clicked");
            }
        });

        this.res_map_canvas.addEventListener('mouseup', e => {
            if (this.hovered_technology_index !== undefined) {
                var cursor = {};
                cursor.x = (e.clientX - this.xOffset - this.res_map_rect.left/*- this.res_map_canvas_border*/)/this.zoom;
                cursor.y = (e.clientY - this.yOffset - this.res_map_rect.top/*- this.res_map_canvas_border*/)/this.zoom;
                if (utils.isInsideObjects(cursor, [this.technologies[this.hovered_technology_index]], this.calc_padding(5))) {
                    var distance_travelled = Math.pow(this.dist_travelled.x, 2) + Math.pow(this.dist_travelled.y, 2);
                    if (distance_travelled < 80) {
                        this.display_tech_description(this.technologies[this.hovered_technology_index]);
                    }
                }
            }
        })

        document.addEventListener('mousemove', e => {
            if (this.dragging) {
                this.xOffset += e.movementX;
                this.yOffset += e.movementY;
                this.dist_travelled.x += Math.abs(e.movementX);
                this.dist_travelled.y += Math.abs(e.movementY);
            }

            var was_hovering_tech = this.hovered_technology_index !== undefined;
            this.hovered_technology_index = undefined;
            var cursor = {};
            cursor.x = (e.clientX - this.xOffset - this.res_map_rect.left/*- this.res_map_canvas_border*/)/this.zoom;
            cursor.y = (e.clientY - this.yOffset - this.res_map_rect.top/*- this.res_map_canvas_border*/)/this.zoom;
            for (var i = 0; i < this.technologies.length; i++) {
                if (utils.isInsideObjects(cursor, [this.technologies[i]], this.calc_padding(5))) {
                    this.hovered_technology_index = i;
                    break;
                }
            }
            if (this.hovered_technology_index !== undefined) {
                if (this.res_map_canvas.style.cursor != "pointer") {
                    this.res_map_canvas.style.cursor = "pointer";
                }
            } else if (was_hovering_tech) {
                this.res_map_canvas.style.cursor = "default";
            }
        });

        window.addEventListener("visibilitychange", () => {
            this.dragging = false;
            this.dist_travelled.x = 0;
            this.dist_travelled.y = 0;
            
            var res_button_wrappers = document.getElementsByClassName("res_btn_clicked");
            if (res_button_wrappers.length != 0) {
                var button_wrapper = res_button_wrappers[0];
                button_wrapper.classList.add("res_btn");
                button_wrapper.classList.remove("res_btn_clicked");
            }
        });

        document.getElementById('close_button').addEventListener('click', function() {
            document.getElementById('research_info_panel').style.display = "none";
        });

        document.getElementById('res_btn_wrapper').addEventListener('mousedown', function(e) {
            if (e.button == 0) {
                if (res_btn_wrapper.classList.contains('res_btn')) {
                    this.classList.add("res_btn_clicked");
                    this.classList.remove("res_btn");
                }
            }
        });

        document.getElementById('res_btn_wrapper').addEventListener('mouseup', async function(e) {
            if (e.button == 0) {
                var res_button_wrappers = document.getElementsByClassName("res_btn_clicked");
                if (res_button_wrappers.length != 0) {
                    var button_wrapper = res_button_wrappers[0];
                    button_wrapper.classList.add("res_btn");
                    button_wrapper.classList.remove("res_btn_clicked");
                    var tech_id = button_wrapper.dataset.id;
                    this.socket.emit("research_technology", tech_id);
                    this.research_details.start_timestamp = await utils.get_timestamp();
                    this.researching_tech = this.technologies.find(tech => tech.technology_id == tech_id);
                    this.disable_reseach_button(button_wrapper);
                    this.display_research_timer();
                }
            }
        }.bind(this));
        
        window.requestAnimationFrame(this.draw.bind(this));
        this.logic_loop = setTimeout(this.update.bind(this), this.tick_time);
        return;
    }

    async update() {
        var timestamp = await utils.get_timestamp();
        this.logic_loop = setTimeout(this.update.bind(this), this.tick_time);
        this.update_research_timer(timestamp);
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.res_map_width, this.res_map_height);
        this.ctx.save();
        this.ctx.translate(this.xOffset, this.yOffset);
        for (var i = 0; i < this.technologies.length; i++) {
            var x = this.technologies[i].x1 * this.zoom;
            var y = this.technologies[i].y1 * this.zoom;
            var width = this.tech_img_width * this.zoom;
            var height = this.tech_img_height * this.zoom;
            this.ctx.drawImage(this.image, x, y, width, height);
            var researched_tech = this.research_details.researched_techs.find(resed_tech => resed_tech == this.technologies[i].technology_id);
            if (researched_tech !== undefined) {
                this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
                this.ctx.beginPath();
                this.ctx.rect(x, y, width, height);
                this.ctx.fill();
            }
            if (this.technologies[i].req_tech_ids.length > 0) {
                for (var j = 0; j < this.technologies[i].req_tech_ids.length; j++) {
                    var req_tech = this.technologies.find(technology => technology.technology_id = this.technologies[i].req_tech_ids[j]);
                    if (this.technologies[i].col > req_tech.col) {
                        if (this.technologies[i].row == req_tech.row) {
                            var y = (req_tech.y2 - this.tech_img_height/2) * this.zoom;
                            this.ctx.beginPath();
                            this.ctx.moveTo(Math.floor(req_tech.x2 * this.zoom), y);
                            this.ctx.lineTo(Math.floor(this.technologies[i].x1 * this.zoom), y);
                            this.ctx.stroke();
                        } else {
                            this.ctx.beginPath();
                            var x1 = Math.floor(req_tech.x2 * this.zoom);
                            var x2 = Math.floor(this.technologies[i].x1 * this.zoom);
                            var y1 = (req_tech.y2 - this.tech_img_height/2) * this.zoom;
                            var y2 = (this.technologies[i].y2 - this.tech_img_height/2) * this.zoom;
                            var x_diff = x1 - x2;
                            this.ctx.moveTo(x1, y1);
                            this.ctx.lineTo(x1 - Math.floor(x_diff/2), y1);
                            this.ctx.lineTo(x1 - Math.floor(x_diff/2), y2);
                            this.ctx.lineTo(x2, y2);
                            this.ctx.stroke();
                        }
                    } else {
                        //todo (if it's ever neccessary)
                    }
                }
            }
        }
        this.ctx.restore();
        window.requestAnimationFrame(this.draw.bind(this));
    }

    window_resize_handler() {
        //var dpi = window.devicePixelRatio;
        var res_map_height = +getComputedStyle(this.res_map_canvas).getPropertyValue("height").slice(0, -2);
        var res_map_width = +getComputedStyle(this.res_map_canvas).getPropertyValue("width").slice(0, -2);
        this.res_map_height = res_map_height; //* dpi;
        this.res_map_width = res_map_width; //* dpi;
        this.xOffset = 50;
        this.yOffset = res_map_height/2;
        this.res_map_canvas.setAttribute('height', this.res_map_height);
        this.res_map_canvas.setAttribute('width', this.res_map_width);
        return this.window_resize_handler.bind(this);
    }

    calc_padding(px) {
        return px / (this.zoom > 1 ? this.zoom : 1);
    }

    async display_tech_description(tech) {
        var panel = document.getElementById('research_info_panel');
        panel.style.removeProperty("display");
        document.getElementById('research_image').setAttribute("src", "/client_side/images/research/" + tech.name + ".png");
        document.getElementById('research_description').textContent = tech.description;
        document.getElementById('cost').textContent = tech.research_time + ' ' + tech.cost.timber;
        var res_btn_wrapper = document.getElementById('res_btn_wrapper');
        res_btn_wrapper.setAttribute('data-id', tech.technology_id);
        if (this.researching_tech === undefined) {
            console.log(this.research_details);
            var tech_researched = this.research_details.researched_techs.find(tech_id => tech_id == tech.technology_id);
            if (tech_researched !== undefined) {
                this.disable_reseach_button(res_btn_wrapper);
            } else {
                res_btn_wrapper.classList.add('res_btn');
                res_btn_wrapper.removeAttribute('style');
            }
        } else {
            if (this.researching_tech.technology_id == tech.technology_id) {
                if (this.research_details.start_timestamp + tech.research_time > await utils.get_timestamp()) {
                    this.display_research_timer();
                } else {
                    this.complete_research();
                }
            } else {
                this.remove_research_timer();
            }
            this.disable_reseach_button(res_btn_wrapper);
        }
    }

    disable_reseach_button(btn_wrapper) {
        btn_wrapper.setAttribute('style', 'background-color: rgba(0,0,0,0.6)');
        btn_wrapper.classList.remove('res_btn');
    }

    async display_research_timer() {
        this.update_research_timer(await utils.get_timestamp());
        document.getElementById('timer').removeAttribute('style');
    }

    async update_research_timer(timestamp) {
        var panel = document.getElementById('research_info_panel');
        if (panel.style.display != 'none') {
            var timer = document.getElementById('timer');
            if (timer.style.display != 'none') {
                var time_left = this.researching_tech.research_time + this.research_details.start_timestamp - timestamp;
                if (time_left > 0) {
                    timer.textContent = await utils.seconds_to_time(time_left);
                } else {
                    this.complete_research();
                }
            }
        }
    }

    remove_research_timer() {
        document.getElementById('timer').setAttribute('style', "display: none");
    }

    complete_research() {
        this.remove_research_timer();
        this.research_details.researched_techs.push(this.researching_tech.technology_id);
        delete this.researching_tech;
    }
}

export { Game };