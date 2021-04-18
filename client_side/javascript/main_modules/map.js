"use strict"

import { Utils } from './misc_modules/utils.js';
var utils = new Utils();

class Game {
    constructor(socket) {
        this.socket = socket;
        this.lastRender = 0;
        this.xOffset = 0;
        this.yOffset = 0;
        this.map_canvas;
        this.map_canvas_border;
        this.map_ctx;
        this.map_width;
        this.map_height;
        this.space_objects = [];
        this.system_center_object;
        this.galaxies = [];
        this.center_galaxy;
        this.fleet = {speed: 2};
        this.move_point = {};
        this.gravitational_pull = 2;
        
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
            console.log(datapack);
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
                this.assemble_fleet();
            });

            document.getElementById('map').addEventListener('contextmenu', e => { 
                e.preventDefault();
                if (this.fleet.x !== undefined) {
                    const rect = this.map_canvas.getBoundingClientRect();
                    this.move_point.x = e.clientX - this.xOffset - rect.left - this.map_canvas_border;
                    this.move_point.y = e.clientY - this.yOffset - rect.top - this.map_canvas_border;
                }
            });
            window.requestAnimationFrame(this.loop.bind(this));
            resolve();
        });
    }

    async update(progress) {
        if (this.layout === 'system') {
            if (this.move_point.x !== undefined && this.fleet.x !== undefined) {
                if (this.fleet.x != this.move_point.x || this.fleet.y != this.move_point.y) {
                    var x_diff = this.move_point.x - this.fleet.x;
                    var y_diff = this.move_point.y - this.fleet.y;
                    var vector_length = Math.sqrt(Math.pow(x_diff, 2) + Math.pow(y_diff, 2));
                    var x_vector = x_diff/vector_length;
                    var y_vector = y_diff/vector_length;
                    var move_x = this.fleet.speed * x_vector;
                    var move_y = this.fleet.speed * y_vector;
                    if (Math.abs(move_x) > Math.abs(x_diff)) {
                        this.fleet.x = this.move_point.x;
                    } else {
                        this.fleet.x += move_x;
                    }
                    if (Math.abs(move_y) > Math.abs(y_diff)) {
                        this.fleet.y = this.move_point.y;
                    } else {
                        this.fleet.y += move_y;
                    }
                } else {
                    this.move_point = {};
                }
            }

            if (this.move_point.x !== undefined && this.fleet.x !== undefined) {
                var x_diff = this.system_center_object.x - this.fleet.x;
                var y_diff = this.system_center_object.y - this.fleet.y;
                var vector_length = Math.sqrt(Math.pow(x_diff, 2) + Math.pow(y_diff, 2));
                var x_vector = x_diff/vector_length;
                var y_vector = y_diff/vector_length;
                //Expect all the space objects to be squares - for now
                var object_radius = this.system_center_object.width/2;
                var g_strength = Math.pow(vector_length/object_radius, 2);
                var pull = this.gravitational_pull * g_strength;
                var move_x = pull * x_vector;
                var move_y = pull * y_vector;
                //this.fleet.x += move_x;
                //this.fleet.y += move_y;

                var x_diff = this.system_center_object.x - this.fleet.x;
                var y_diff = this.system_center_object.y - this.fleet.y;
                var vector_length = Math.pow(x_diff, 2) + Math.pow(y_diff, 2);
                if (vector_length <= Math.pow(object_radius, 2)) {
                    this.fleet = {speed: 2};
                    this.move_point = {};
                }
            }

            for (var i = 0; i < this.space_objects.length; i++) {
                //changes the speed of the planet according to how far it is from the sun
                //TODO: Assign rotation speed to space objects? Make it possible to go into negative values -> rotate other way (does that happen in space? do all planets rotate the same direction?)
                this.space_objects[i].rot += progress/1000/((2 + Math.abs(this.space_objects[i].x) + Math.abs(this.space_objects[i].y))/2/50*3);
                if (this.space_objects[i].rot > 360) {
                    this.space_objects[i].rot -= 360;
                }

                if (this.move_point.x !== undefined && this.fleet.x !== undefined) {
                    var rads = await utils.angleToRad(this.space_objects[i].rot * 256);
                    var [planetX, planetY] = [this.space_objects[i].x, this.space_objects[i].y];
                    var [pointX, pointY] = [this.system_center_object.x, this.system_center_object.y];
                    var object_x = pointX + (planetX - pointX) * Math.cos(rads) - (planetY - pointY) * Math.sin(rads);
                    var object_y = pointY + (planetX - pointX) * Math.sin(rads) + (planetY - pointY) * Math.cos(rads);

                    var x_diff = object_x - this.fleet.x;
                    var y_diff = object_y - this.fleet.y;
                    var vector_length = Math.sqrt(Math.pow(x_diff, 2) + Math.pow(y_diff, 2));
                    var x_vector = x_diff/vector_length;
                    var y_vector = y_diff/vector_length;
                    //Expect all the space objects to be squares - for now
                    var object_radius = this.space_objects[i].width/2;
                    var g_strength = Math.pow(vector_length/object_radius, 2);
                    var pull = this.gravitational_pull * g_strength;
                    var move_x = pull * x_vector;
                    var move_y = pull * y_vector;
                    //this.fleet.x += move_x;
                    //this.fleet.y += move_y;

                    var x_diff = object_x - this.fleet.x;
                    var y_diff = object_y - this.fleet.y;
                    var vector_length = Math.pow(x_diff, 2) + Math.pow(y_diff, 2);
                    if (vector_length <= Math.pow(object_radius, 2)) {
                        this.fleet = {speed: 2};
                        this.move_point = {};
                    }
                }
            }
        }
    }
    
    async draw() {
        return new Promise((resolve, reject) => {
            this.map_ctx.clearRect(0, 0, this.map_width, this.map_height);
            if (this.layout === 'system') {
                for (var i = 0; i < this.space_objects.length; i++) {
                    this.map_ctx.save();
                    this.map_ctx.translate(this.xOffset, this.yOffset);
                    //rotation sped up by 256 times for debugging purposes
                    this.map_ctx.rotate(utils.syncAngleToRad(this.space_objects[i].rot * 256));
                    this.map_ctx.drawImage(this.space_objects[i].image, this.space_objects[i].x - this.space_objects[i].width/2, this.space_objects[i].y - this.space_objects[i].width/2, this.space_objects[i].width, this.space_objects[i].height);
                    this.map_ctx.restore();
                }
                this.map_ctx.drawImage(this.system_center_object.image, this.system_center_object.x + this.xOffset - this.system_center_object.width/2, this.system_center_object.y + this.yOffset - this.system_center_object.width/2, this.system_center_object.width, this.system_center_object.height);

                if (this.fleet.x !== undefined) {
                    this.map_ctx.save();
                    this.map_ctx.translate(this.xOffset, this.yOffset);
                    this.map_ctx.beginPath();
                    this.map_ctx.fillStyle = "red";
                    this.map_ctx.rect(this.fleet.x - 5, this.fleet.y - 5, 10, 10);
                    this.map_ctx.fill();
                    this.map_ctx.restore();
                }

                if (this.fleet.x !== undefined && this.move_point.x !== undefined) {
                    this.map_ctx.save();
                    this.map_ctx.translate(this.xOffset, this.yOffset);
                    this.map_ctx.beginPath();
                    this.map_ctx.moveTo(this.fleet.x, this.fleet.y);
                    this.map_ctx.lineTo(this.move_point.x, this.move_point.y);
                    this.map_ctx.strokeStyle = "red";
                    this.map_ctx.stroke();
                    this.map_ctx.restore();
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
            resolve();
        });
    }
    
    async loop(timestamp) {
        var progress = timestamp - this.lastRender;
        await this.update(progress);
        await this.draw();
        
        this.lastRender = timestamp;
        window.requestAnimationFrame(this.loop.bind(this));
    }

    window_resize_handler() {
        //var dpi = window.devicePixelRatio;
        var map_height = +getComputedStyle(this.map_canvas).getPropertyValue("height").slice(0, -2);
        var map_width = +getComputedStyle(this.map_canvas).getPropertyValue("width").slice(0, -2);
        this.map_width = map_width; //* dpi;
        this.map_height =  map_height; //* dpi;
        this.xOffset = map_width/2;
        this.yOffset = map_height/2;
        this.map_canvas.setAttribute('height', this.map_height);
        this.map_canvas.setAttribute('width', this.map_width);
        return this.window_resize_handler.bind(this);
    }

    async assemble_fleet() {
        var rads = await utils.angleToRad(this.space_objects[0].rot * 256);
        var [planetX, planetY] = [this.space_objects[0].x, this.space_objects[0].y];
        var [pointX, pointY] = [this.system_center_object.x, this.system_center_object.y];
        this.fleet.x = pointX + (planetX - pointX) * Math.cos(rads) - (planetY - pointY) * Math.sin(rads);
        this.fleet.y = pointY + (planetX - pointX) * Math.sin(rads) + (planetY - pointY) * Math.cos(rads);
    }
}

export { Game };