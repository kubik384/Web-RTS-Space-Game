"use strict"

import { Utils } from '../misc_modules/utils.js';
import { Vector } from '../misc_modules/vector.js';
var utils = new Utils();

class Game {
    constructor(socket) {
        this.socket = socket;
        this.last_render = 0;
        this.last_tick = 0;
        this.map_canvas;
        this.map_canvas_border;
        this.map_width;
        this.map_height;
        this.map_ctx;
        this.logic_loop;
        this.tick_time = 50;
        this.tick_time_passed;

        this.xOffset = 0;
        this.yOffset = 0;
        this.space_objects = [];
        this.system_center_object;
        this.galaxies = [];
        this.center_galaxy;
        this.fleet = {};
        this.move_point = {};
        this.time_passed;
        
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
            console.log(JSON.parse(p_datapack));
            this.map_canvas = document.getElementById("map");
            this.map_ctx = this.map_canvas.getContext("2d");
            window.onresize = this.window_resize_handler();
            if (this.layout === 'system') {
                this.space_objects = datapack.space_objects;
                var system_center_object_index;
                for (var i = 0; i < this.space_objects.length; i++) {
                    this.space_objects[i].image = document.getElementById(this.space_objects[i].image);
                    if (this.space_objects[i].x == 0 && this.space_objects[i].y == 0) {
                        system_center_object_index = i;
                    } else {
                        this.space_objects[i].last_x = this.space_objects[i].x;
                        this.space_objects[i].last_y = this.space_objects[i].y;
                        this.space_objects[i].last_rot = this.space_objects[i].rot;
                    }
                }
                this.system_center_object = this.space_objects.splice(system_center_object_index, 1)[0];
            } else if (this.layout === 'galaxy') {
                this.galaxies = datapack.galaxies;
                var center_galaxy_index;
                for (var i = 0; i < this.galaxies.length; i++) {
                    this.galaxies[i].image = document.getElementById(this.galaxies[i].image);
                    if (this.galaxies[i].x == 0 && this.galaxies[i].y == 0) {
                        center_galaxy_index = i;
                    }
                }
                this.center_galaxy = this.galaxies.splice(center_galaxy_index, 1)[0];
            }
            this.xOffset = this.map_width/2;
            this.yOffset = this.map_height/2;
            //expecting the border to have the same width on all the sides of the canvas
            this.map_canvas_border = +getComputedStyle(this.map_canvas).getPropertyValue('border-top-width').slice(0, -2);

            document.getElementById('assemble_fleet').addEventListener('click', e => { 
                this.request_fleet_assembly();
            });

            document.getElementById('map').addEventListener('contextmenu', e => { 
                e.preventDefault();
                if (this.fleet.x !== undefined) {
                    const rect = this.map_canvas.getBoundingClientRect();
                    this.move_point.x = e.clientX - this.xOffset - rect.left - this.map_canvas_border;
                    this.move_point.y = e.clientY - this.yOffset - rect.top - this.map_canvas_border;
                    //this is to prevent the move_point x and y being 0, which would result in an error when normalizing the point's vector
                    if (this.move_point.x == 0) {
                        this.move_point.x++;
                    }
                }
            });
            window.requestAnimationFrame(this.draw.bind(this));
            this.logic_loop = setTimeout(this.update.bind(this), this.tick_time, Date.now());
            resolve();
        });
    }

    async update(timestamp) {
        var time_passed = timestamp - this.last_tick;
        this.tick_time_passed = time_passed;
        if (this.layout === 'system') {
            for (var i = 0; i < this.space_objects.length; i++) {
                //changes the speed of the planet according to how far it is from the sun
                //TODO: Assign rotation speed to space objects? Make it possible to go into negative values -> rotate other way (does that happen in space? do all planets rotate the same direction?)

                //Calculates the distance from the center - the further away, the slower rotation. Rotation is sped up by 128 times for debugging purposes
                this.space_objects[i].last_rot = this.space_objects[i].rot;
                this.space_objects[i].rot += time_passed/((Math.abs(this.space_objects[i].x) + Math.abs(this.space_objects[i].y))*35) * 128;
                while (this.space_objects[i].rot > 360) {
                    this.space_objects[i].rot -= 360;
                    this.space_objects[i].last_rot -= 360;
                }

                if (this.fleet.deleted !== undefined) {
                    this.fleet = {};
                }
                if (this.move_point.deleted !== undefined) {
                    this.move_point = {};
                }

                if (this.fleet.x !== undefined) {
                    Object.assign(this.fleet.last_velocity, this.fleet.velocity);
                    this.fleet.last_x = this.fleet.x;
                    this.fleet.last_y = this.fleet.y;
                    var rads = await utils.angleToRad(this.space_objects[i].rot);
                    var [origin_x, origin_y] = [this.space_objects[i].x, this.space_objects[i].y];
                    var [center_x, center_y] = [this.system_center_object.x, this.system_center_object.y];
                    var object_x = center_x + (origin_x - center_x) * Math.cos(rads) - (origin_y - center_y) * Math.sin(rads);
                    var object_y = center_y + (origin_x - center_x) * Math.sin(rads) + (origin_y - center_y) * Math.cos(rads);
                    
                    var vector;
                    vector = new Vector(this.fleet, new Vector(object_x, object_y));
                    //Expect all the space objects to be squares (circles) = same width and height - for now
                    var object_radius = this.space_objects[i].width/2;
                    var g_strength = Math.pow(object_radius/await vector.length(), 2);
                    var pull = g_strength * object_radius / 2500;
                    this.fleet.velocity = await this.fleet.last_velocity.add(await (await vector.normalize()).multiply(pull));

                    var object_radius = this.space_objects[i].width/2;
                    if (await vector.length() <= object_radius) {
                        this.fleet.deleted = true;
                        this.move_point.deleted = true;
                    }
                }
            }

            if (this.fleet.x !== undefined) {
                var object_radius = this.system_center_object.width/2;
                var vector = new Vector(this.fleet, this.system_center_object);
                if (await vector.length() <= object_radius) {
                    this.fleet.deleted = true;
                    this.move_point.deleted = true;
                } else {
                    var vector = new Vector(this.fleet, this.system_center_object);
                    //Expect all the space objects to be squares (circles) = same width and height - for now
                    var object_radius = this.system_center_object.width/2;
                    var g_strength = Math.pow(object_radius/await vector.length(), 2);
                    var pull = g_strength * object_radius / 2500;
                    this.fleet.velocity = await this.fleet.velocity.add(await (await vector.normalize()).multiply(pull));

                    if (this.move_point.x !== undefined) {
                        if (this.fleet.x != this.move_point.x || this.fleet.y != this.move_point.y) {
                            var vector = new Vector(this.fleet, this.move_point);
                            var distance = await vector.length();
                            var speed = await this.fleet.velocity.length();
                            var acceleration_input = speed/this.fleet.acceleration;
                            var adjusted_vector = await vector.divide(acceleration_input);
                            var slowdown_time = distance/speed;
                            var calculated_vector;
                            if ((await adjusted_vector.length() > speed) || (slowdown_time < acceleration_input)) {
                                calculated_vector = await (new Vector(this.fleet.velocity, adjusted_vector)).normalize();
                            } else {
                                var normalized_velocity = await this.fleet.velocity.isNull() ? this.fleet.velocity : await this.fleet.velocity.normalize();
                                calculated_vector = await (new Vector(normalized_velocity, await vector.normalize())).normalize();
                            }

                            this.fleet.velocity = await this.fleet.velocity.add(await calculated_vector.multiply(this.fleet.acceleration));
                        } else {
                            this.move_point.deleted = true;
                        }
                    }
                }
            }

            if (this.fleet.x !== undefined) {
                this.fleet.x += this.fleet.velocity.x;
                this.fleet.y += this.fleet.velocity.y;
            }
        }
        this.last_tick = timestamp;
        this.logic_loop = setTimeout(this.update.bind(this), this.tick_time, Date.now());
    }
    
    draw(timestamp) {
        var time_passed = timestamp - this.last_render;
        var interpolation_coefficient = (Date.now() - this.last_tick)/this.tick_time_passed;
        this.map_ctx.clearRect(0, 0, this.map_width, this.map_height);
        if (this.layout === 'system') {
            for (var i = 0; i < this.space_objects.length; i++) {
                this.map_ctx.save();
                this.map_ctx.translate(this.xOffset, this.yOffset);
                var rotation = ((this.space_objects[i].rot - this.space_objects[i].last_rot) * interpolation_coefficient + this.space_objects[i].last_rot);
                this.map_ctx.rotate(utils.syncAngleToRad(rotation));
                var x_position = this.space_objects[i].x - this.space_objects[i].width/2;
                var y_position = this.space_objects[i].y - this.space_objects[i].width/2;
                this.map_ctx.drawImage(this.space_objects[i].image, x_position, y_position, this.space_objects[i].width, this.space_objects[i].height);
                this.map_ctx.restore();
            }
            this.map_ctx.drawImage(this.system_center_object.image, this.system_center_object.x + this.xOffset - this.system_center_object.width/2, this.system_center_object.y + this.yOffset - this.system_center_object.width/2, this.system_center_object.width, this.system_center_object.height);

            if (this.fleet.x !== undefined) {
                var x_position = ((this.fleet.x - this.fleet.last_x) * interpolation_coefficient + this.fleet.last_x);
                var y_position = ((this.fleet.y - this.fleet.last_y) * interpolation_coefficient + this.fleet.last_y);
                this.map_ctx.save();
                this.map_ctx.translate(this.xOffset, this.yOffset);
                this.map_ctx.beginPath();
                this.map_ctx.fillStyle = "red";
                this.map_ctx.rect(x_position - 5, y_position - 5, 10, 10);
                this.map_ctx.fill();
                this.map_ctx.restore();

                if (this.move_point.x !== undefined) {
                    this.map_ctx.save();
                    this.map_ctx.translate(this.xOffset, this.yOffset);
                    this.map_ctx.beginPath();
                    this.map_ctx.moveTo(x_position, y_position);
                    this.map_ctx.lineTo(this.move_point.x, this.move_point.y);
                    this.map_ctx.strokeStyle = "red";
                    this.map_ctx.stroke();
                    this.map_ctx.restore();
                }
            }
        } else if (this.layout = 'galaxy') {
            for (var i = 0; i < this.galaxies.length; i++) {
                this.map_ctx.save();
                this.map_ctx.translate(this.xOffset, this.yOffset);
                this.map_ctx.drawImage(this.galaxies[i].image, this.galaxies[i].x - this.galaxies[i].width/2, this.galaxies[i].y - this.galaxies[i].width/2, this.galaxies[i].width, this.galaxies[i].height);
                this.map_ctx.restore();
            }
            this.map_ctx.drawImage(this.center_galaxy.image, this.center_galaxy.x + this.xOffset - this.center_galaxy.width/2, this.center_galaxy.y + this.yOffset - this.center_galaxy.width/2, this.center_galaxy.width, this.center_galaxy.height);
        }
        this.last_render = timestamp;
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

    async request_fleet_assembly() {
        this.socket.emit('assemble_fleet');
    }

    async assemble_fleet(fleet) {
        console.log(fleet);
        var fleet_data = JSON.parse(fleet);
        this.fleet.x = fleet_data.x;
        this.fleet.y = fleet_data.y;
        this.fleet.last_x = this.fleet.x;
        this.fleet.last_y = this.fleet.y;
        this.fleet.velocity = new Vector(fleet_data.velocity_x, fleet_data.velocity_y);
        this.fleet.last_velocity = this.fleet.velocity;
        this.fleet.acceleration = fleet_data.acceleration;
        /*
        var interpolation_coefficient = (Date.now() - this.last_tick)/this.tick_time_passed;
        var rotation = ((this.space_objects[0].rot - this.space_objects[0].last_rot) * interpolation_coefficient + this.space_objects[0].last_rot);
        var rads = await utils.angleToRad(rotation);
        var [planetX, planetY] = [this.space_objects[0].x, this.space_objects[0].y];
        var [pointX, pointY] = [this.system_center_object.x, this.system_center_object.y];
        this.fleet.x = pointX + (planetX - pointX) * Math.cos(rads) - (planetY - pointY) * Math.sin(rads) - 10;
        this.fleet.y = pointY + (planetX - pointX) * Math.sin(rads) + (planetY - pointY) * Math.cos(rads) - 10;
        this.fleet.last_x = this.fleet.x;
        this.fleet.last_y = this.fleet.y;
        this.fleet.acceleration = 0.03;
        this.fleet.velocity = new Vector(0, 0);
        this.fleet.last_velocity = this.fleet.velocity;
        */
    }
}

export { Game };