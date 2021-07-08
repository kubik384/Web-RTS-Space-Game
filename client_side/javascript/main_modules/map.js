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
        this.zoom = 0.025;

        this.xOffset = 0;
        this.yOffset = 0;
        this.systems = [];
        this.center_system;
        this.fleets = [];
        this.time_passed;
        this.lastScrollTop = 0;
        this.dragging = false;
        this.boundaries;
        
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
            this.updates = [{}];
            if (this.layout === 'system') {
                var space_objects = datapack.space_objects;
                this.updates[0].fleets = datapack.fleets;
                this.last_fe_tick = datapack.last_update;
                this.updates[0].tick_timestamp = datapack.last_update;
                this.updates[0].tick_be_time_passed = datapack.time_passed;
                this.boundaries = datapack.boundaries;
                for (var i = 0; i < space_objects.length; i++) {
                    space_objects[i].HTMLimage = document.getElementById(space_objects[i].image);
                    space_objects[i].last_x = space_objects[i].x;
                    space_objects[i].last_y = space_objects[i].y;
                }
                this.updates[0].space_objects = space_objects;
            } else if (this.layout === 'galaxy') {
                this.updates[0].systems = datapack.systems;
                this.last_fe_tick = Date.now();
            }
            if (this.map_canvas === undefined) {
                this.map_canvas = document.getElementById("map");
                this.map_ctx = this.map_canvas.getContext("2d");
                window.onresize = this.window_resize_handler();
                var home_planet = this.updates[0].space_objects.find(space_object => space_object.space_object_id = datapack.home_planet_id);
                var home_system = this.updates[0].space_objects.find(space_object => space_object.space_object_id = home_planet.centerrot_id);
                this.switch_focus(home_system);
                //expecting the border to have the same width on all the sides of the canvas
                this.map_canvas_border = +getComputedStyle(this.map_canvas).getPropertyValue('border-top-width').slice(0, -2);

                document.getElementById('fleet_ui').addEventListener('click', e => {
                    if (e.target.localName == 'button') {
                        if (e.target.id == 'switch_space_object') {
                            var string_space_object_id = document.getElementById('space_object_id').value
                            if (string_space_object_id.length !== 0) {
                                var space_object_id = +string_space_object_id;
                                if (space_object_id > 0) {
                                    var space_object = this.updates[0].space_objects.find(space_object => space_object.space_object_id == space_object_id);
                                    if (space_object !== undefined) {
                                        this.switch_focus(space_object);
                                    } else {
                                        console.log('Space object with space object id: ' + space_object_id + ' does not exist/has been destroyed/removed');
                                    }
                                }
                            }
                        } else if (e.target.id == 'restart') {
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
                        if (this.zoom > 0.00025) {
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
                    var [center_x, center_y] = [this.center_system_object.x, this.center_system_object.y];
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
                var object_radius = this.center_system_object.width/2;
                var vector = new Vector(this.controlled_fleet, this.center_system_object);
                if (await vector.length() <= object_radius) {
                    this.controlled_fleet.deleted = true;
                    this.move_point.deleted = true;
                } else {
                    var vector = new Vector(this.controlled_fleet, this.center_system_object);
                    //Expect all the space objects to be squares (circles) = same width and height - for now
                    var object_radius = this.center_system_object.width/2;
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
        this.check_updates(timestamp);
        var update = this.updates[0];
        var be_interpolation_coefficient = (timestamp - update.tick_timestamp)/update.tick_be_time_passed;
        //var fe_interpolation_coefficient = (timestamp - this.last_fe_tick)/this.tick_fe_time_passed;
        this.map_ctx.clearRect(0, 0, this.map_width, this.map_height);
        if (this.layout === 'system') {
            var space_objects = update.space_objects;
            for (var i = 0; i < space_objects.length; i++) {
                var x_position = ((space_objects[i].x - space_objects[i].last_x) * be_interpolation_coefficient + space_objects[i].last_x) * this.zoom - space_objects[i].width/2 * this.zoom;
                var y_position = ((space_objects[i].y - space_objects[i].last_y) * be_interpolation_coefficient + space_objects[i].last_y) * this.zoom - space_objects[i].height/2 * this.zoom;
                this.map_ctx.save();
                this.map_ctx.translate(this.xOffset, this.yOffset);
                this.map_ctx.drawImage(space_objects[i].HTMLimage, x_position, y_position, space_objects[i].width * this.zoom, space_objects[i].height * this.zoom);
                this.map_ctx.restore();
            }
            var fleets = update.fleets;
            for (var i = 0; i < fleets.length; i++) {
                var x_position = ((fleets[i].x - fleets[i].last_x) * be_interpolation_coefficient + fleets[i].last_x);
                var y_position = ((fleets[i].y - fleets[i].last_y) * be_interpolation_coefficient + fleets[i].last_y);
                this.map_ctx.save();
                this.map_ctx.translate(this.xOffset, this.yOffset);
                this.map_ctx.beginPath();
                this.map_ctx.fillStyle = "red";
                this.map_ctx.rect(x_position  * this.zoom - 2 * this.zoom, y_position  * this.zoom - 2 * this.zoom, 4 * this.zoom, 4 * this.zoom);
                this.map_ctx.fill();
                this.map_ctx.restore();

                if (fleets[i].move_point !== undefined) {
                    this.map_ctx.save();
                    this.map_ctx.translate(this.xOffset, this.yOffset);
                    this.map_ctx.beginPath();
                    this.map_ctx.moveTo(x_position * this.zoom, y_position * this.zoom);
                    this.map_ctx.lineTo(fleets[i].move_point.x * this.zoom, fleets[i].move_point.y * this.zoom);
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
            var systems = update.systems;
            for (var i = 0; i < systems.length; i++) {
                this.map_ctx.save();
                this.map_ctx.translate(this.xOffset, this.yOffset);
                this.map_ctx.drawImage(systems[i].HTMLimage, systems[i].x - systems[i].width/2, systems[i].y - systems[i].width/2, systems[i].width, systems[i].height);
                this.map_ctx.restore();
            }
            var center_system = update.center_system;
            this.map_ctx.drawImage(center_system.HTMLimage, center_system.x + this.xOffset - center_system.width/2, center_system.y + this.yOffset - center_system.width/2, center_system.width, center_system.height);
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
        var space_objects = this.updates[0].space_objects;
        var assigned = false;
        for (var i = 0; i < space_objects.length; i++) {
            if (x < space_objects[i].x + space_objects[i].width/2 && x > space_objects[i].x - space_objects[i].width/2 && y < space_objects[i].y + space_objects[i].height/2 && y > space_objects[i].y - space_objects[i].height/2) {
                this.socket.emit('assign_fleet', space_objects[i].space_object_id);
                assigned = true;
                break;
            }
        }
        if (!assigned) {
            this.socket.emit('set_movepoint', x, y);
        }
    }

    async process_server_update(p_update) {
        this.check_updates(Date.now());
        if (this.updates.length < 3) {
            var updated_fleets = p_update[0];
            var deleted_fleets = p_update[1];
            var updated_space_objects = p_update[2];
            var deleted_space_objects = p_update[3];
            var tick_be_time_passed = p_update[p_update.length-1];



            
            //causes the update to lose all the images - resulting in an error when attempting to draw the broken image
            var update = JSON.parse(JSON.stringify(this.updates[this.updates.length - 1]));
            update.tick_be_time_passed = tick_be_time_passed;
            update.tick_timestamp = Date.now();
            
            //when a player joins, server can send new data, where the fleets are already deleted with what has been deleted from old data - which the user never received, so they cannot remove the fleets from them. Same goes for anything else (space objects)
            for (var i = deleted_fleets.length - 1; i >= 0; i--) {
                //if the fleet has a username attribute, it's the controlled fleet - temporary solution
                if (update.fleets[deleted_fleets[i]].owner !== undefined) {
                    this.controlled_fleet = undefined;
                }
                update.fleets.splice(deleted_fleets[i], 1);
            }

            var no_this_fleets = update.fleets.length;
            var number_of_fleets = updated_fleets.length;
            if (number_of_fleets > no_this_fleets) {
                update.fleets = update.fleets.concat(updated_fleets.slice(no_this_fleets - number_of_fleets));
            }

            var fleets = update.fleets;
            for (var i = 0; i < fleets.length; i++) {
                //if the fleet has an owner attribute, it's the controlled fleet - temporary solution
                if (fleets[i].owner !== undefined) {
                    this.controlled_fleet = fleets[i];
                }
                if (updated_fleets[i].move_point !== undefined) {
                    fleets[i].move_point = updated_fleets[i].move_point;
                } else if (fleets[i].move_point !== undefined) {
                    if (fleets[i].move_point.deleted !== undefined) {
                        delete fleets[i].move_point;
                    } else {
                        fleets[i].move_point.deleted = true;
                    }
                }
                fleets[i].last_x = fleets[i].x;
                fleets[i].last_y = fleets[i].y;
                fleets[i].x = updated_fleets[i].x;
                fleets[i].y = updated_fleets[i].y;
                /* Velocity is not currently used anywhere anyway
                if (this.fleets.velocity !== undefined) {
                    this.fleets[i].last_velocity = this.fleets[i].velocity;
                    this.fleets[i].velocity = new Vector(fleets[i].velocity.x, fleets[i].velocity.y);
                }
                */
            }

            var space_objects = update.space_objects;
            for (var i = 0; i < deleted_space_objects.length; i++) {
                space_objects.splice(deleted_space_objects[i], 1);
            }

            var no_this_so = space_objects.length;
            var number_of_so = updated_space_objects.length;
            if (number_of_so > no_this_so) {
                for (var i = no_this_so; i < number_of_so; i++) {
                    updated_space_objects[i]. HTMLimage = document.getElementById(updated_space_objects[i].image);
                    space_objects.push(updated_space_objects[i]);
                }
            }
            for (var i = 0; i < space_objects.length; i++) {
                space_objects[i].last_x = space_objects[i].x;
                space_objects[i].last_y = space_objects[i].y;
                space_objects[i].x = updated_space_objects[i].x;
                space_objects[i].y = updated_space_objects[i].y;
                space_objects[i].HTMLimage = document.getElementById(space_objects[i].image);
                /* Velocity is not currently used anywhere anyway
                if (this.moving_space_objects.velocity !== undefined) {
                    this.moving_space_objects[i].last_velocity = this.moving_space_objects[i].velocity;
                    this.moving_space_objects[i].velocity = new Vector(moving_space_objects[i].velocity.x, moving_space_objects[i].velocity.y);
                }
                */
            }
            
            this.updates.push(update);
        } else {
            throw new Error('More than 3 updates stored');
        }
    }

    check_updates(timestamp) {
        for (var i = this.updates.length - 1; i >= 0; i--) {
            var update = this.updates[i];
            if (timestamp - update.tick_timestamp > update.tick_be_time_passed) {
                if (this.updates.length < 2) {
                    //console.log('Ran out of updates');
                } else {
                    this.updates.splice(i,1);
                }
            }
        }
    }

    async switch_focus(a, b) {
        if (typeof a === "number" && !isNaN(a) && typeof b === "number" && !isNaN(b)) {
            //a = system_center_x, b = system_center_y
            this.xOffset = Math.floor(this.map_width/2) - a * this.zoom;
            this.yOffset = Math.floor(this.map_height/2) - b * this.zoom;
        } else if (typeof a === "object") {
            //a = system_center
            this.xOffset = Math.floor(this.map_width/2) - a.x * this.zoom;
            this.yOffset = Math.floor(this.map_height/2) - a.y * this.zoom;
        } else {
            throw new Error('Invalid input for focus_system');
        }
    }
}

export { Game };