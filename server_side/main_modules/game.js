var Vector = require('../misc_modules/vector.js');
var Utils = require('./../misc_modules/utils.js');
var utils = new Utils();
var fs = require('fs');

module.exports = class Game {
    constructor(dbManager, server) {
        this.dbManager = dbManager;
        this.server = server;
        this.interval_time = 20;
        this.overall_time_passed = 0;
        this.tick_time = 90;
        this.tick_offset = 0;
        this.save_time = 120000;
        this.secondary_save_time = 300000;
        this.saving = false;
        this.updating = false;
        this.sending_datapack = false;
        this.players = [];
        this.deleted_fleets = [];
        this.deleted_space_objects = [];
        this.boundaries = 10000;
        this.time_passed = this.tick_time + this.tick_offset;
    }

    async setup_game() {
        this.finished_loading = false;
        await this.attempt_game_load(process.argv[2]);
        const timestamp = Date.now();
        this.last_tick = timestamp;
        this.last_save = timestamp;
        this.last_secondary_save = timestamp;
        this.logic_loop = setInterval(this.update.bind(this), this.interval_time);
    }

    async update() {
        if (!this.saving && !this.updating && !this.sending_datapack) {
            this.updating = true;
            //a race condition should never occur, since the functions should be running at minimal this.tick_time apart, which makes it impossible for the function that was ran before to not have set this.updating to true in this time to prevent the second function from executing
            const timestamp = Date.now();
            var time_passed = timestamp - this.last_tick;
            this.last_tick = timestamp;
            this.overall_time_passed += time_passed;
            if (this.overall_time_passed >= this.tick_time - this.interval_time/2) {
                this.overall_time_passed -= this.tick_time;
                this.time_passed = this.tick_time + this.tick_offset;

                space_objects_loop:
                for (var i = this.space_objects.length - 1; i >= 0; i--) {
                    if (Math.abs(this.space_objects[i].x) > this.boundaries
                    || Math.abs(this.space_objects[i].y) > this.boundaries) {
                        this.deleted_space_objects.push(i);
                        this.space_objects.splice(i, 1);
                        continue;
                    }
                    if (this.space_objects[i].centerrot_id != 0 && this.space_objects[i].centerrot_id != this.space_objects[i].space_object_id) {
                        this.space_objects[i].rot += 0.1;
                        if (this.space_objects[i].rot >= 360) {
                            this.space_objects[i].rot -= 360;
                        }
                        var rads = await utils.angleToRad(this.space_objects[i].rot);
                        var centerrot_object = this.space_objects.find(space_object => space_object.space_object_id == this.space_objects[i].centerrot_id);
                        var [center_x, center_y] = [centerrot_object.x, centerrot_object.y];
                        var [original_x, original_y] = [this.space_objects[i].original_x, this.space_objects[i].original_y];
                        this.space_objects[i].x = center_x + (original_x - center_x) * Math.cos(rads) - (original_y - center_y) * Math.sin(rads);
                        this.space_objects[i].y = center_y + (original_x - center_x) * Math.sin(rads) + (original_y - center_y) * Math.cos(rads);
                    }
                    for (var j = 0; j < this.space_objects.length; j++) {
                        if (i !== j) {
                            var vector = new Vector(this.space_objects[i], this.space_objects[j]);
                            //Expect all the space objects to be squares (circles) = same width and height - for now
                            var object_radius = this.space_objects[j].width/2;
                            var distance = await vector.length();
                            if (distance <= object_radius) {
                                this.deleted_space_objects.push(i);
                                this.space_objects.splice(i, 1);
                                continue space_objects_loop;
                            }
                        }
                    }
                    this.space_objects[i].x += this.space_objects[i].velocity.x * this.time_passed;
                    this.space_objects[i].y += this.space_objects[i].velocity.y * this.time_passed;
                }

                for (var i = 0; i < this.fleets.length; i++) {
                    if (this.fleets[i].move_point !== undefined) {
                        var vector = new Vector(this.fleets[i], this.fleets[i].move_point);
                        var distance = await vector.length();
                        var speed = await this.fleets[i].velocity.length() * this.time_passed;
                        if (this.fleets[i].acceleration != 0) {
                            var acceleration_input = speed/(this.fleets[i].acceleration * this.time_passed);
                            var adjusted_vector = acceleration_input != 0 ? await vector.divide(acceleration_input) : vector;
                            var time_to_slowdown = distance/speed;
                            var calculated_vector;
                            if ((await adjusted_vector.length() > speed) || (time_to_slowdown < acceleration_input)) {
                                calculated_vector = await (new Vector(this.fleets[i].velocity, adjusted_vector)).normalize();
                            } else {
                                var normalized_velocity = await this.fleets[i].velocity.isNull() ? this.fleets[i].velocity : await this.fleets[i].velocity.normalize();
                                calculated_vector = await (new Vector(normalized_velocity, await vector.normalize())).normalize();
                            }
                            this.fleets[i].velocity = await this.fleets[i].velocity.add(await calculated_vector.multiply(this.fleets[i].acceleration * this.time_passed));
                        }
                    }
                    this.fleets[i].x += this.fleets[i].velocity.x * this.time_passed;
                    this.fleets[i].y += this.fleets[i].velocity.y * this.time_passed;
                }

                //very inefficient and resource intensive solution
                for (var i = 0; i < this.players.length; i++) {
                    var fleets = [];
                    for (var j = 0; j < this.fleets.length; j++) {
                        if (this.fleets[j].owner == this.players[i].username) {
                            fleets.push(this.fleets[j]);
                        } else {
                            fleets.push({x: this.fleets[j].x, y: this.fleets[j].y});
                        }
                    }
                    this.players[i].socket.emit('game_update', [fleets, this.deleted_fleets, this.space_objects, this.deleted_space_objects, this.time_passed]);
                }
                this.deleted_fleets = [];
                this.deleted_space_objects = [];

                this.attempt_game_save(timestamp);
                if (timestamp - this.last_tick >= this.tick_time + Math.floor(this.tick_time/4)) {
                    console.log('Significant time delay detected - tick took: ' + (timestamp - this.last_tick) + 's instead of ' + this.tick_time + 's');
                }
            }
            this.updating = false;
        } else {
            if (Date.now() - this.last_tick > this.tick_time * 3) {
                throw new Error("More than 3 ticks have been skipped at once, check the code u dum dum");
            }
        }
    }

    async attempt_game_save(timestamp, retry = false) {
        /*
        if ((timestamp - this.last_save >= this.save_time && !this.saving) || retry) {
            this.saving = true;
            fs.writeFile("server_side/save_files/save.txt", JSON.stringify(await this.extract_game_data()), function(err) {
                if (err) {
                    console.log(err);
                    return this.attempt_game_save(timestamp, true);
                }
                this.last_save = timestamp;
                this.saving = false;
            }.bind(this));
        } else if (timestamp - this.last_secondary_save >= this.secondary_save_time && !this.saving) {
            this.saving = true;
            fs.writeFile("server_side/save_files/secondary_save.txt", JSON.stringify(await this.extract_game_data()), function(err) {
                this.saving = true;
                if (err) {
                    console.log(err);
                    return this.attempt_game_save(timestamp, true);
                }
                this.last_secondary_save = timestamp;
                this.saving = false;
            }.bind(this));
        }
        */
    }

    async extract_game_data() {
        return {space_objects: this.space_objects, fleets: this.fleets, space_object_id: this.space_object_id};
    }
    
    async attempt_game_load(file = 'server_side/save_files/save.txt') {
        fs.readFile(file, 'utf8' , async (err, data) => {
            if (err) {
                throw new Error(err);
            }
            var parsed_data = JSON.parse(data);
            for (var i = 0; i < parsed_data.space_objects.length; i++) {
                    parsed_data.space_objects[i].velocity = new Vector(parsed_data.space_objects[i].velocity);
            }
            this.space_objects = parsed_data.space_objects;
            for (var i = 0; i < parsed_data.fleets.length; i++) {
                parsed_data.fleets[i].velocity = new Vector(parsed_data.fleets[i].velocity);
            }
            this.fleets = parsed_data.fleets;
            this.space_object_id = parsed_data.space_object_id;
        });
    }

    async assemble_fleet(socket_id) {
        var player_planet;
        var player = this.players.find( player => player.socket.id == socket_id );
        for (var i = 0; i < this.space_objects.length; i++) {
            if (player.space_object_id == this.space_objects[i].space_object_id) {
                player_planet = this.space_objects[i];
                break;
            }
        }
        if (player_planet !== undefined) {
            var fleet = {owner: player.username, x: player_planet.x - player_planet.width, y: player_planet.y - player_planet.height, acceleration: 0.00025, velocity: new Vector(player_planet.velocity)};
            var f_index = this.fleets.findIndex( fleet => fleet.owner == player.username);
            if (f_index == -1) {
                this.fleets.push(fleet);
            } else {
                this.fleets[f_index] = fleet;
            }
        }
    }

    async set_movepoint(socket_id, x, y) {
        var username = this.players.find( player => player.socket.id == socket_id ).username;
        var player_fleet = this.fleets.find( fleet => fleet.owner == username );
        if (player_fleet !== undefined) {
            player_fleet.move_point = {x:x, y:y};
        }
    }

    async get_map_datapack(layout, socket_id) {
        if (this.updating) {
            await new Promise((resolve, reject) => {setTimeout(resolve, 0)});
            return this.get_map_datapack();
        } else {
            return new Promise(async (resolve, reject) => {
                this.sending_datapack = true;
                if (layout === 'galaxy') {
                    resolve({systems: []});
                    return;
                } else if (layout === 'system') {
                    for (var i = 0; i < this.players.length; i++) {
                        if (this.players[i].socket.id == socket_id) {
                            var space_objects = [];
                            var player_planet = this.space_objects.find(space_object => space_object.space_object_id == this.players[i].space_object_id);
                            if (player_planet !== undefined) {
                                //will need to recalculate what is in the view range as it moves around
                                for (var j = 0; j < this.space_objects.length; j++) {
                                    var object_distance = await (new Vector(player_planet, this.space_objects[j])).length();
                                    //Expect all the space objects to be squares (circles) = same width and height - for now
                                    var calculated_view_range = this.players[i].view_range * this.space_objects[j].width;
                                    if (calculated_view_range > object_distance) {
                                        space_objects.push(this.space_objects[j]);
                                    }
                                }
                            }
                            resolve({space_objects: space_objects, fleets: this.fleets, last_update: this.last_tick, time_passed: this.time_passed, boundaries: this.boundaries});
                            return;
                        }
                    }
                }
                reject(new Error('Player was not found to return map datapack'));
            }).then(datapack => {
                this.sending_datapack = false;
                return datapack;
            });
        }
    }

    async addPlayer(socket, username) {
        //socket remains a reference - isn't deep copied
        var basic_player_map_info = (await this.dbManager.get_basic_player_map_info(username))[0];
        this.players.push({socket: socket, username: username, space_object_id: basic_player_map_info.space_object_id, view_range: 100});
    }

    async removePlayer(socket) {
        for (var i = 0; i < this.players.length; i++) {
            if (this.players[i].socket.id == socket.id) {
                this.players.splice(i, 1);
                return;
            }
        }
        throw new Error('Did not find player to get them removed from the players array');
    }

    async generate_asteroid(number, coordinates_range) {
        
    }

    async generate_system() {
        
    }

    async process_request(socket, username, request_id) {
        if (typeof request_id === 'string') {
            if (!this.updating) {
                switch(request_id) {
                    case 'assemble_fleet':
                        this.assemble_fleet(socket.id);
                        break;
                    case '=':
                        this.tick_offset = 0;
                        break;
                    case '+':
                    case '-':
                        var tick_change = request_id == '+' ? 20 : -20;
                        var tick_offset = this.tick_offset + tick_change;
                        if (tick_offset + this.tick_time > 1) {
                            if (tick_offset < 400) {
                                this.tick_offset = tick_offset;
                            } else {
                                this.tick_offset = 399;
                            }
                        } else {
                            this.tick_offset = 1 - this.tick_time;
                        }
                        break;
                    case 'cancel':
                        for (var i = 0; i < this.fleets.length; i++) {
                            if (this.fleets[i].owner == username) {
                                this.fleets[i].move_point = undefined;
                                break;
                            }
                        }
                        break;
                    case 'switch_system':
                        break;
                    case 'generate_system':
                        this.generate_system();
                        break;
                }
            } else {
                setTimeout(this.process_request, 0, username, request_id);
            }
        } else {
            console.log('Type of request_id is not string!');
        }
    }

    async stop() {
		clearTimeout(this.logic_loop);
    }
}