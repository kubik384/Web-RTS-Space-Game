"use strict"

import { Utils } from '../misc_modules/utils.js';
import { Vector } from '../misc_modules/vector.js';
var utils = new Utils();

class Game {
    constructor(socket) {
        this.socket = socket;
        this.map_canvas;
        this.map_canvas_border;
        this.map_width;
        this.map_height;
        this.map_ctx;
        this.logic_loop;
        this.tick_time = 50;
        this.tick_fe_time_passed;
        this.tick_be_time_passed;
        this.zoom = 0.025;

        this.xOffset = 0;
        this.yOffset = 0;
        this.space_objects = [];
        this.galaxies = [];
        this.center_galaxy;
        this.fleets = [];
        this.time_passed;
        this.lastScrollTop = 0;
        this.dragging = false;
        this.boundaries;
        this.firstUpdate = true;
        
        const query_string = window.location.search;
        const url_parameters = new URLSearchParams(query_string);
        this.layout = url_parameters.get('layout');
    }

    async request_data() {
        this.socket.emit('map_datapack_request', document.cookie.split('token=')[1], this.layout);
    }

    async setup_game(p_datapack) {
        return new Promise((resolve, reject) => {
            var datapack = JSON.parse(p_datapack);
            if (this.layout === 'system') {
                this.space_objects = datapack.space_objects;
                this.fleets = datapack.fleets;
                this.last_fe_tick = datapack.last_update;
                this.last_be_tick = datapack.last_update;
                this.boundaries = datapack.boundaries;
                for (var i = 0; i < this.space_objects.length; i++) {
                    this.space_objects[i].image = document.getElementById(this.space_objects[i].image);
                    this.space_objects[i].last_x = this.space_objects[i].x;
                    this.space_objects[i].last_y = this.space_objects[i].y;
                }
            } else if (this.layout === 'galaxy') {
                this.galaxies = datapack.galaxies;
                this.last_fe_tick = Date.now();
            }
            this.xOffset = this.map_width/2;
            this.yOffset = this.map_height/2;
            if (this.map_canvas === undefined) {
                this.map_canvas = document.getElementById("map");
                this.map_ctx = this.map_canvas.getContext("2d");
                window.onresize = this.window_resize_handler();
                //expecting the border to have the same width on all the sides of the canvas
                this.map_canvas_border = +getComputedStyle(this.map_canvas).getPropertyValue('border-top-width').slice(0, -2);

                document.getElementById('fleet_ui').addEventListener('click', e => {
                    if (e.target.localName == 'button') {
                        if (e.target.id == 'restart') {
                            this.socket.emit('request', e.target.id, this.layout);
                        } else {
                            this.socket.emit('request', e.target.id);
                        }
                    }
                });

                document.getElementById('map').addEventListener('contextmenu', e => { 
                    e.preventDefault();
                    if (this.controlled_fleet !== undefined) {
                        const rect = this.map_canvas.getBoundingClientRect();
                        var x = e.clientX - this.xOffset - rect.left - this.map_canvas_border;
                        var y = e.clientY - this.yOffset - rect.top - this.map_canvas_border;
                        this.generate_movepoint(x/this.zoom, y/this.zoom);
                    }
                });

                document.getElementById('map').addEventListener('wheel', e => {
                    e.preventDefault();
                    const rect = this.map_canvas.getBoundingClientRect();
                    var x = e.clientX - rect.left - this.map_canvas_border;
                    var y = e.clientY - rect.top - this.map_canvas_border;
                    if (e.deltaY < 0) {
                        if (this.zoom < 24) {
                            const deltaZoom = 1.25;
                            var oldZoom = this.zoom;
                            this.zoom *= deltaZoom;
                            var zoomRatio = (this.zoom - oldZoom)/oldZoom;
                            this.xOffset += (this.xOffset - x) * zoomRatio;
                            this.yOffset += (this.yOffset - y) * zoomRatio;
                        }
                    } else {
                        if (this.zoom > 0.01) {
                            const deltaZoom = 0.8;
                            var oldZoom = this.zoom;
                            this.zoom *= deltaZoom;
                            var zoomRatio = (oldZoom - this.zoom)/oldZoom;
                            this.xOffset -= (this.xOffset - x) * zoomRatio;
                            this.yOffset -= (this.yOffset - y) * zoomRatio;
                        }
                    }
                });

                document.getElementById('map').addEventListener('mousedown', e => {
                    //left click
                    if (e.button == 0) {
                        this.dragging = true;
                    }
                });

                window.addEventListener('mouseup', e => {
                    //left click
                    if (e.button == 0) {
                        this.dragging = false;
                    }
                });

                document.addEventListener('mousemove', e => {
                    if (this.dragging) {
                        this.xOffset += e.movementX;
                        this.yOffset += e.movementY;
                    }
                });

                window.addEventListener("visibilitychange", () => {
                    if (document.visibilityState == 'hidden') {
                        this.dragging = false;
                    }
                });
                
                window.requestAnimationFrame(this.draw.bind(this));
                this.logic_loop = setTimeout(this.update.bind(this), this.tick_time);
                resolve();
            };
        });
    }

    async update(timestamp) {
        var timestamp = Date.now();
        this.logic_loop = setTimeout(this.update.bind(this), this.tick_time);
        var time_passed = timestamp - this.last_fe_tick;
        this.tick_fe_time_passed = time_passed;
        if (this.layout === 'system') {
            /*
            for (var i = 0; i < this.space_objects.length; i++) {
                if (this.controlled_fleet !== undefined) {
                    Object.assign(this.controlled_fleet.last_velocity, this.controlled_fleet.velocity);
                    this.controlled_fleet.last_x = this.controlled_fleet.x;
                    this.controlled_fleet.last_y = this.controlled_fleet.y;
                    var rads = await utils.angleToRad(this.space_objects[i].rot);
                    var [origin_x, origin_y] = [this.space_objects[i].x, this.space_objects[i].y];
                    var [center_x, center_y] = [this.system_center_object.x, this.system_center_object.y];
                    var object_x = center_x + (origin_x - center_x) * Math.cos(rads) - (origin_y - center_y) * Math.sin(rads);
                    var object_y = center_y + (origin_x - center_x) * Math.sin(rads) + (origin_y - center_y) * Math.cos(rads);
                    
                    var vector;
                    vector = new Vector(this.controlled_fleet, new Vector(object_x, object_y));
                    //Expect all the space objects to be squares (circles) = same width and height - for now
                    var object_radius = this.space_objects[i].width/2;
                    var g_strength = Math.pow(object_radius/await vector.length(), 2);
                    var pull = g_strength * object_radius / 2500;
                    this.controlled_fleet.velocity = await this.controlled_fleet.last_velocity.add(await (await vector.normalize()).multiply(pull));

                    var object_radius = this.space_objects[i].width/2;
                    if (await vector.length() <= object_radius) {
                        this.controlled_fleet.deleted = true;
                        this.move_point.deleted = true;
                    }
                }
            }
            if (this.controlled_fleet !== undefined) {
                var object_radius = this.system_center_object.width/2;
                var vector = new Vector(this.controlled_fleet, this.system_center_object);
                if (await vector.length() <= object_radius) {
                    this.controlled_fleet.deleted = true;
                    this.move_point.deleted = true;
                } else {
                    var vector = new Vector(this.controlled_fleet, this.system_center_object);
                    //Expect all the space objects to be squares (circles) = same width and height - for now
                    var object_radius = this.system_center_object.width/2;
                    var g_strength = Math.pow(object_radius/await vector.length(), 2);
                    var pull = g_strength * object_radius / 2500;
                    this.controlled_fleet.velocity = await this.controlled_fleet.velocity.add(await (await vector.normalize()).multiply(pull));

                    if (this.move_point.x !== undefined) {
                        if (this.controlled_fleet.x != this.move_point.x || this.controlled_fleet.y != this.move_point.y) {
                            var vector = new Vector(this.controlled_fleet, this.move_point);
                            var distance = await vector.length();
                            var speed = await this.controlled_fleet.velocity.length();
                            var acceleration_input = speed/this.controlled_fleet.acceleration;
                            var adjusted_vector = await vector.divide(acceleration_input);
                            var slowdown_time = distance/speed;
                            var calculated_vector;
                            if ((await adjusted_vector.length() > speed) || (slowdown_time < acceleration_input)) {
                                calculated_vector = await (new Vector(this.controlled_fleet.velocity, adjusted_vector)).normalize();
                            } else {
                                var normalized_velocity = await this.controlled_fleet.velocity.isNull() ? this.controlled_fleet.velocity : await this.controlled_fleet.velocity.normalize();
                                calculated_vector = await (new Vector(normalized_velocity, await vector.normalize())).normalize();
                            }

                            this.controlled_fleet.velocity = await this.controlled_fleet.velocity.add(await calculated_vector.multiply(this.controlled_fleet.acceleration));
                        } else {
                            this.move_point.deleted = true;
                        }
                    }
                }
            }

            if (this.controlled_fleet !== undefined) {
                this.controlled_fleet.x += this.controlled_fleet.velocity.x;
                this.controlled_fleet.y += this.controlled_fleet.velocity.y;
            }
            */
        }
        this.last_fe_tick = timestamp;
    }
    
    draw() {
        var timestamp = Date.now();
        var be_interpolation_coefficient = (timestamp - this.last_be_tick)/this.tick_be_time_passed;
        //var fe_interpolation_coefficient = (timestamp - this.last_fe_tick)/this.tick_fe_time_passed;
        this.map_ctx.clearRect(0, 0, this.map_width, this.map_height);
        if (this.layout === 'system') {                
            for (var i = 0; i < this.space_objects.length; i++) {
                var x_position = ((this.space_objects[i].x - this.space_objects[i].last_x) * be_interpolation_coefficient + this.space_objects[i].last_x) * this.zoom - this.space_objects[i].width/2 * this.zoom;
                var y_position = ((this.space_objects[i].y - this.space_objects[i].last_y) * be_interpolation_coefficient + this.space_objects[i].last_y) * this.zoom - this.space_objects[i].height/2 * this.zoom;
                this.map_ctx.save();
                this.map_ctx.translate(this.xOffset, this.yOffset);
                this.map_ctx.drawImage(this.space_objects[i].image, x_position, y_position, this.space_objects[i].width * this.zoom, this.space_objects[i].height * this.zoom);
                this.map_ctx.restore();
            }
            for (var i = 0; i < this.fleets.length; i++) {
                var x_position = ((this.fleets[i].x - this.fleets[i].last_x) * be_interpolation_coefficient + this.fleets[i].last_x);
                var y_position = ((this.fleets[i].y - this.fleets[i].last_y) * be_interpolation_coefficient + this.fleets[i].last_y);
                this.map_ctx.save();
                this.map_ctx.translate(this.xOffset, this.yOffset);
                this.map_ctx.beginPath();
                this.map_ctx.fillStyle = "red";
                this.map_ctx.rect(x_position  * this.zoom - 5 * this.zoom, y_position  * this.zoom - 5 * this.zoom, 10 * this.zoom, 10 * this.zoom);
                this.map_ctx.fill();
                this.map_ctx.restore();

                if (this.fleets[i].move_point !== undefined) {
                    this.map_ctx.save();
                    this.map_ctx.translate(this.xOffset, this.yOffset);
                    this.map_ctx.beginPath();
                    this.map_ctx.moveTo(x_position * this.zoom, y_position * this.zoom);
                    this.map_ctx.lineTo(this.fleets[i].move_point.x * this.zoom, this.fleets[i].move_point.y * this.zoom);
                    this.map_ctx.strokeStyle = "red";
                    this.map_ctx.stroke();
                    this.map_ctx.restore();
                }
            }
            this.map_ctx.save();
            this.map_ctx.translate(this.xOffset, this.yOffset);
            this.map_ctx.beginPath();
            this.map_ctx.strokeStyle = "purple";
            this.map_ctx.lineWidth = 5;
            this.map_ctx.strokeRect(-this.boundaries * this.zoom, -this.boundaries * this.zoom, this.boundaries * 2 * this.zoom, this.boundaries * 2 * this.zoom);
            this.map_ctx.restore();
        } else if (this.layout = 'galaxy') {
            for (var i = 0; i < this.galaxies.length; i++) {
                this.map_ctx.save();
                this.map_ctx.translate(this.xOffset, this.yOffset);
                this.map_ctx.drawImage(this.galaxies[i].image, this.galaxies[i].x - this.galaxies[i].width/2, this.galaxies[i].y - this.galaxies[i].width/2, this.galaxies[i].width, this.galaxies[i].height);
                this.map_ctx.restore();
            }
            this.map_ctx.drawImage(this.center_galaxy.image, this.center_galaxy.x + this.xOffset - this.center_galaxy.width/2, this.center_galaxy.y + this.yOffset - this.center_galaxy.width/2, this.center_galaxy.width, this.center_galaxy.height);
        }
        window.requestAnimationFrame(this.draw.bind(this));
    }

    window_resize_handler() {
        //var dpi = window.devicePixelRatio;
        var map_height = +getComputedStyle(this.map_canvas).getPropertyValue("height").slice(0, -2);
        var map_width = +getComputedStyle(this.map_canvas).getPropertyValue("width").slice(0, -2);
        this.map_width = map_width; //* dpi;
        this.map_height = map_height; //* dpi;
        this.xOffset = map_width/2;
        this.yOffset = map_height/2;
        this.map_canvas.setAttribute('height', this.map_height);
        this.map_canvas.setAttribute('width', this.map_width);
        return this.window_resize_handler.bind(this);
    }

    async generate_movepoint(x, y) {
        this.socket.emit('set_movepoint', x, y);
    }

    async process_server_update(data) {
        var fleets = data[0];
        var deleted_fleets = data[1];
        var space_objects = data[2];
        var deleted_space_objects = data[3];
        var new_last_be_tick = data[data.length-1];
        var time_passed = new_last_be_tick - this.last_be_tick;
        this.tick_be_time_passed = time_passed;
        
        //when a player joins, server can send new data, where the fleets are already deleted with what has been deleted from old data - which the user never received, so they cannot remove the fleets from them. Same goes for anything else (space objects)
        for (var i = deleted_fleets.length - 1; i >= 0; i--) {
            //if the fleet has a username attribute, it's the controlled fleet - temporary solution
            if (this.fleets[deleted_fleets[i]].owner !== undefined) {
                this.controlled_fleet = undefined;
            }
            this.fleets.splice(deleted_fleets[i], 1);
        }

        var no_this_fleets = this.fleets.length;
        var number_of_fleets = fleets.length;
        if (number_of_fleets > no_this_fleets) {
            this.fleets = this.fleets.concat(fleets.slice(no_this_fleets - number_of_fleets));
        }

        for (var i = 0; i < this.fleets.length; i++) {
            //if the fleet has an owner attribute, it's the controlled fleet - temporary solution
            if (this.fleets[i].owner !== undefined) {
                this.controlled_fleet = this.fleets[i];
            }
            if (fleets[i].move_point !== undefined) {
                this.fleets[i].move_point = fleets[i].move_point;
            } else if (this.fleets[i].move_point !== undefined) {
                if (this.fleets[i].move_point.deleted !== undefined) {
                    delete this.fleets[i].move_point;
                } else {
                    this.fleets[i].move_point.deleted = true;
                }
            }
            this.fleets[i].last_x = this.fleets[i].x;
            this.fleets[i].last_y = this.fleets[i].y;
            this.fleets[i].x = fleets[i].x;
            this.fleets[i].y = fleets[i].y;
            /* Velocity is not currently used anywhere anyway
            if (this.fleets.velocity !== undefined) {
                this.fleets[i].last_velocity = this.fleets[i].velocity;
                this.fleets[i].velocity = new Vector(fleets[i].velocity.x, fleets[i].velocity.y);
            }
            */
        }

        for (var i = 0; i < deleted_space_objects.length; i++) {
            this.space_objects.splice(deleted_space_objects[i], 1);
        }

        var no_this_so = this.space_objects.length;
        var number_of_so = space_objects.length;
        if (number_of_so > no_this_so) {
            for (var i = no_this_so; i < number_of_so; i++) {
                space_objects[i].image = document.getElementById(space_objects[i].image);
                this.space_objects.push(space_objects[i]);
            }
        }
        for (var i = 0; i < this.space_objects.length; i++) {
            this.space_objects[i].last_x = this.space_objects[i].x;
            this.space_objects[i].last_y = this.space_objects[i].y;
            this.space_objects[i].x = space_objects[i].x;
            this.space_objects[i].y = space_objects[i].y;
            /* Velocity is not currently used anywhere anyway
            if (this.moving_space_objects.velocity !== undefined) {
                this.moving_space_objects[i].last_velocity = this.moving_space_objects[i].velocity;
                this.moving_space_objects[i].velocity = new Vector(moving_space_objects[i].velocity.x, moving_space_objects[i].velocity.y);
            }
            */
        }
        this.last_be_tick = new_last_be_tick;
    }
}

export { Game };