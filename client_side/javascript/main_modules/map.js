"use strict"

import { Utils } from '../misc_modules/utils.js';
import { Vector } from '../misc_modules/vector.js';
var utils = new Utils();

class Game {
    constructor(socket) {
        this.socket = socket;
        this.lastRender = 0;
        this.lastTick = 0;
        this.map_canvas;
        this.map_canvas_border;
        this.map_width;
        this.map_height;
        this.map_ctx;
        this.logic_loop;

        this.pastGameState = {
            xOffset: 0,
            yOffset: 0,
            space_objects: [],
            //system_center_object,
            galaxies: [],
            //center_galaxy,
            fleet: {},
            move_point: {},
        }

        this.presentGameState = {
            xOffset: 0,
            yOffset: 0,
            space_objects: [],
            //system_center_object,
            galaxies: [],
            //center_galaxy,
            fleet: {},
            move_point: {}
        }
        
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
                this.pastGameState.space_objects = datapack.space_objects;
                var system_center_object_index;
                for (var i = 0; i < this.pastGameState.space_objects.length; i++) {
                    this.pastGameState.space_objects[i].image = document.getElementById(this.pastGameState.space_objects[i].image);
                    if (this.pastGameState.space_objects[i].x == 0 && this.pastGameState.space_objects[i].y == 0) {
                        system_center_object_index = i;
                    }
                }
                this.pastGameState.system_center_object = this.pastGameState.space_objects.splice(system_center_object_index, 1)[0];
            } else if (this.layout === 'galaxy') {
                this.pastGameState.galaxies = datapack.galaxies;
                var center_galaxy_index;
                for (var i = 0; i < this.pastGameState.galaxies.length; i++) {
                    this.pastGameState.galaxies[i].image = document.getElementById(this.pastGameState.galaxies[i].image);
                    if (this.pastGameState.galaxies[i].x == 0 && this.pastGameState.galaxies[i].y == 0) {
                        center_galaxy_index = i;
                    }
                }
                this.pastGameState.center_galaxy = this.pastGameState.galaxies.splice(center_galaxy_index, 1)[0];
            }
            this.pastGameState.xOffset = this.map_width/2;
            this.pastGameState.yOffset = this.map_height/2;
            //expecting the border to have the same width on all the sides of the canvas
            this.map_canvas_border = +getComputedStyle(this.map_canvas).getPropertyValue('border-top-width').slice(0, -2);

            document.getElementById('assemble_fleet').addEventListener('click', e => { 
                this.assemble_fleet();
            });

            document.getElementById('map').addEventListener('contextmenu', e => { 
                e.preventDefault();
                if (this.pastGameState.fleet.x !== undefined) {
                    const rect = this.map_canvas.getBoundingClientRect();
                    this.pastGameState.move_point.x = e.clientX - this.pastGameState.xOffset - rect.left - this.map_canvas_border;
                    this.pastGameState.move_point.y = e.clientY - this.pastGameState.yOffset - rect.top - this.map_canvas_border;
                    //this is to prevent the move_point x and y being 0, which would result in an error when normalizing the point's vector
                    if (this.pastGameState.move_point.x == 0) {
                        this.pastGameState.move_point.x++;
                    }
                }
            });
            this.presentGameState = this.pastGameState;
            window.requestAnimationFrame(this.draw.bind(this));
            this.logic_loop = setTimeout(this.update.bind(this), 50, Date.now());
            resolve();
        });
    }

    async update(timestamp) {
        var time_passed = timestamp - this.lastTick;
        this.pastGameState = this.presentGameState;
        if (this.layout === 'system') {
            if (this.presentGameState.fleet.x !== undefined) {
                var object_radius = this.presentGameState.system_center_object.width/2;
                var vector = new Vector(this.presentGameState.fleet, this.presentGameState.system_center_object);
                if (await vector.length() <= object_radius) {
                    this.presentGameState.fleet = {};
                    this.presentGameState.move_point = {};
                }
            }

            if (this.presentGameState.fleet.x !== undefined) {
                var vector = new Vector(this.presentGameState.fleet, this.presentGameState.system_center_object);
                //Expect all the space objects to be squares (circles) = same width and height - for now
                var object_radius = this.presentGameState.system_center_object.width/2;
                var g_strength = Math.pow(object_radius/await vector.length(), 2);
                var pull = g_strength * object_radius / 2000 / time_passed;
                this.presentGameState.fleet.velocity = await this.presentGameState.fleet.velocity.add(await (await vector.normalize()).multiply(pull));
            }

            for (var i = 0; i < this.presentGameState.space_objects.length; i++) {
                //changes the speed of the planet according to how far it is from the sun
                //TODO: Assign rotation speed to space objects? Make it possible to go into negative values -> rotate other way (does that happen in space? do all planets rotate the same direction?)
                this.presentGameState.space_objects[i].rot += time_passed/1000/((2 + Math.abs(this.presentGameState.space_objects[i].x) + Math.abs(this.presentGameState.space_objects[i].y))/2/50*3);
                if (this.presentGameState.space_objects[i].rot > 360) {
                    this.presentGameState.space_objects[i].rot -= 360;
                }

                var rads = await utils.angleToRad(this.presentGameState.space_objects[i].rot * 256);
                var [origin_x, origin_y] = [this.presentGameState.space_objects[i].x, this.presentGameState.space_objects[i].y];
                var [center_x, center_y] = [this.presentGameState.system_center_object.x, this.presentGameState.system_center_object.y];
                var object_x = center_x + (origin_x - center_x) * Math.cos(rads) - (origin_y - center_y) * Math.sin(rads);
                var object_y = center_y + (origin_x - center_x) * Math.sin(rads) + (origin_y - center_y) * Math.cos(rads);
                
                var vector;
                if (this.presentGameState.fleet.x !== undefined) {
                    vector = new Vector(this.presentGameState.fleet, new Vector(object_x, object_y));
                    //Expect all the space objects to be squares (circles) = same width and height - for now
                    var object_radius = this.presentGameState.space_objects[i].width/2;
                    var g_strength = Math.pow(object_radius/await vector.length(), 2);
                    var pull = g_strength * object_radius / 2000 / time_passed;
                    this.presentGameState.fleet.velocity = await this.presentGameState.fleet.velocity.add(await (await vector.normalize()).multiply(pull));
                }

                if (this.presentGameState.fleet.x !== undefined) {
                    var object_radius = this.presentGameState.space_objects[i].width/2;
                    if (await vector.length() <= object_radius) {
                        this.presentGameState.fleet = {};
                        this.presentGameState.move_point = {};
                    }
                }
            }

            
            if (this.presentGameState.move_point.x !== undefined && this.presentGameState.fleet.x !== undefined) {
                if (this.presentGameState.fleet.x != this.presentGameState.move_point.x || this.presentGameState.fleet.y != this.presentGameState.move_point.y) {
                    var vector = new Vector(this.presentGameState.fleet, this.presentGameState.move_point);
                    var distance = await vector.length();
                    var speed = await this.presentGameState.fleet.velocity.length();
                    var acceleration_input = speed/this.presentGameState.fleet.acceleration;
                    var adjusted_vector = await vector.divide(acceleration_input);
                    var slowdown_time = distance/speed;
                    var calculated_vector;
                    if ((await adjusted_vector.length() > speed) || (slowdown_time < acceleration_input)) {
                        calculated_vector = await (new Vector(this.presentGameState.fleet.velocity, adjusted_vector)).normalize();
                    } else {
                        var normalized_velocity = await this.presentGameState.fleet.velocity.isNull() ? this.presentGameState.fleet.velocity : await this.presentGameState.fleet.velocity.normalize();
                        calculated_vector = await (new Vector(normalized_velocity, await vector.normalize())).normalize();
                    }

                    this.presentGameState.fleet.velocity = await this.presentGameState.fleet.velocity.add(await calculated_vector.multiply(this.presentGameState.fleet.acceleration));
                } else {
                    this.presentGameState.move_point = {};
                }
            }

            if (this.presentGameState.fleet.x !== undefined) {
                this.presentGameState.fleet.x += this.presentGameState.fleet.velocity.x;
                this.presentGameState.fleet.y += this.presentGameState.fleet.velocity.y;
            }
        }
        this.lastTick = timestamp;
        this.logic_loop = setTimeout(this.update.bind(this), 50, Date.now());
    }
    
    draw(timestamp) {
        var time_passed = timestamp - this.lastRender;
        this.map_ctx.clearRect(0, 0, this.map_width, this.map_height);
        if (this.layout === 'system') {
            for (var i = 0; i < this.pastGameState.space_objects.length; i++) {
                this.map_ctx.save();
                this.map_ctx.translate(this.pastGameState.xOffset, this.pastGameState.yOffset);
                //rotation sped up by 256 times for debugging purposes
                this.map_ctx.rotate(utils.syncAngleToRad(this.pastGameState.space_objects[i].rot * 256));
                this.map_ctx.drawImage(this.pastGameState.space_objects[i].image, this.pastGameState.space_objects[i].x - this.pastGameState.space_objects[i].width/2, this.pastGameState.space_objects[i].y - this.pastGameState.space_objects[i].width/2, this.pastGameState.space_objects[i].width, this.pastGameState.space_objects[i].height);
                this.map_ctx.restore();
            }
            this.map_ctx.drawImage(this.pastGameState.system_center_object.image, this.pastGameState.system_center_object.x + this.pastGameState.xOffset - this.pastGameState.system_center_object.width/2, this.pastGameState.system_center_object.y + this.pastGameState.yOffset - this.pastGameState.system_center_object.width/2, this.pastGameState.system_center_object.width, this.pastGameState.system_center_object.height);

            if (this.pastGameState.fleet.x !== undefined) {
                this.map_ctx.save();
                this.map_ctx.translate(this.pastGameState.xOffset, this.pastGameState.yOffset);
                this.map_ctx.beginPath();
                this.map_ctx.fillStyle = "red";
                this.map_ctx.rect(this.pastGameState.fleet.x - 5, this.pastGameState.fleet.y - 5, 10, 10);
                this.map_ctx.fill();
                this.map_ctx.restore();
            }

            if (this.pastGameState.fleet.x !== undefined && this.pastGameState.move_point.x !== undefined) {
                this.map_ctx.save();
                this.map_ctx.translate(this.pastGameState.xOffset, this.pastGameState.yOffset);
                this.map_ctx.beginPath();
                this.map_ctx.moveTo(this.pastGameState.fleet.x, this.pastGameState.fleet.y);
                this.map_ctx.lineTo(this.pastGameState.move_point.x, this.pastGameState.move_point.y);
                this.map_ctx.strokeStyle = "red";
                this.map_ctx.stroke();
                this.map_ctx.restore();
            }
        } else if (this.layout = 'galaxy') {
            for (var i = 0; i < this.pastGameState.galaxies.length; i++) {
                this.map_ctx.save();
                this.map_ctx.translate(this.pastGameState.xOffset, this.pastGameState.yOffset);
                this.map_ctx.drawImage(this.pastGameState.galaxies[i].image, this.pastGameState.galaxies[i].x - this.pastGameState.galaxies[i].width/2, this.pastGameState.galaxies[i].y - this.pastGameState.galaxies[i].width/2, this.pastGameState.galaxies[i].width, this.pastGameState.galaxies[i].height);
                this.map_ctx.restore();
            }
            this.map_ctx.drawImage(this.pastGameState.center_galaxy.image, this.pastGameState.center_galaxy.x + this.pastGameState.xOffset - this.pastGameState.center_galaxy.width/2, this.pastGameState.center_galaxy.y + this.pastGameState.yOffset - this.pastGameState.center_galaxy.width/2, this.pastGameState.center_galaxy.width, this.pastGameState.center_galaxy.height);
        }
        this.lastRender = timestamp;
        window.requestAnimationFrame(this.draw.bind(this));
    }

    window_resize_handler() {
        //var dpi = window.devicePixelRatio;
        var map_height = +getComputedStyle(this.map_canvas).getPropertyValue("height").slice(0, -2);
        var map_width = +getComputedStyle(this.map_canvas).getPropertyValue("width").slice(0, -2);
        this.map_width = map_width; //* dpi;
        this.map_height = map_height; //* dpi;
        this.pastGameState.xOffset = map_width/2;
        this.pastGameState.yOffset = map_height/2;
        this.map_canvas.setAttribute('height', this.map_height);
        this.map_canvas.setAttribute('width', this.map_width);
        return this.window_resize_handler.bind(this);
    }

    async assemble_fleet() {
        var rads = await utils.angleToRad(this.pastGameState.space_objects[0].rot * 256);
        var [planetX, planetY] = [this.pastGameState.space_objects[0].x, this.pastGameState.space_objects[0].y];
        var [pointX, pointY] = [this.pastGameState.system_center_object.x, this.pastGameState.system_center_object.y];
        this.pastGameState.fleet.x = pointX + (planetX - pointX) * Math.cos(rads) - (planetY - pointY) * Math.sin(rads) - 10;
        this.pastGameState.fleet.y = pointY + (planetX - pointX) * Math.sin(rads) + (planetY - pointY) * Math.cos(rads) - 10;
        this.pastGameState.fleet.acceleration = 0.005;
        this.pastGameState.fleet.velocity = new Vector(0, 0);
    }
}

export { Game };