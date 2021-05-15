var Vector = require('../misc_modules/vector.js');
var Utils = require('./../misc_modules/utils.js');
var utils = new Utils();
var fs = require('fs');

module.exports = class Game {
    constructor(dbManager, server) {
        this.dbManager = dbManager;
        this.server = server;
        this.tick_time = 90;
        this.save_time = 120000;
        this.secondary_save_time = 300000;
        this.saving = false;
        this.updating = false;
        this.players = [];
        this.deleted_fleets = [];
    }

    async setup_game() {
        if (process.argv[2].toLowerCase() == 'true') {
            this.finished_loading = false;
            await this.attempt_game_load(process.argv[3]);
        } else {
            this.space_objects = await this.dbManager.get_space_objects();
            this.fleets = [];
        }
        const timestamp = Date.now();
        this.last_tick = timestamp;
        this.last_save = timestamp;
        this.last_secondary_save = timestamp;
        this.next_logic_run = setTimeout(this.update.bind(this), this.tick_time);
    }

    async update() {
        if (!this.saving && !this.updating) {
            this.updating = true;
            //a race condition should never occur, since the functions should be running at minimal this.tick_time apart, which makes it impossible for the function that was ran before to not have set this.updating to true in this time to prevent the second function from executing
            this.next_logic_run = setTimeout(this.update.bind(this), this.tick_time);
            const timestamp = Date.now();
            const time_passed = timestamp - this.last_tick;

            for (var i = 0; i < this.space_objects.length; i++) {
                //TODO: Assign rotation speed to space objects? Make it possible to go into negative values -> rotate other way (does that happen in space? do all planets rotate the same direction?)
                //Calculates the distance from the center - the further away, the slower rotation. Rotation is sped up by 128 times for debugging purposes
                if (this.space_objects[i].x != 0 || this.space_objects[i].y != 0) {
                    var distance = Math.sqrt((Math.pow(this.space_objects[i].x, 2) + Math.pow(this.space_objects[i].y, 2)));
                    this.space_objects[i].rot += time_passed * 128/(distance * 35);
                
                    while (this.space_objects[i].rot > 360) {
                        this.space_objects[i].rot -= 360;
                    }
                }
                
                for (var j = this.fleets.length - 1; j >= 0; j--) {
                    var rads = await utils.angleToRad(this.space_objects[i].rot);
                    var system_center_object = this.space_objects[0];
                    var [origin_x, origin_y] = [this.space_objects[i].x, this.space_objects[i].y];
                    var [center_x, center_y] = [system_center_object.x, system_center_object.y];
                    var object_x = center_x + (origin_x - center_x) * Math.cos(rads) - (origin_y - center_y) * Math.sin(rads);
                    var object_y = center_y + (origin_x - center_x) * Math.sin(rads) + (origin_y - center_y) * Math.cos(rads);
                    
                    var vector;
                    vector = new Vector(this.fleets[j], new Vector(object_x, object_y));
                    //Expect all the space objects to be squares (circles) = same width and height - for now
                    var object_radius = this.space_objects[i].width/2;
                    if (await vector.length() > object_radius) {
                        var g_strength = Math.pow(object_radius/await vector.length(), 2);
                        var pull = time_passed * g_strength * object_radius / 10000000;
                        this.fleets[j].velocity = await this.fleets[j].velocity.add(await (await vector.normalize()).multiply(pull));
                    } else {
                        this.deleted_fleets.push(j);
                        this.fleets.splice(j, 1);
                    }
                }
            }

            for (var i = 0; i < this.fleets.length; i++) {
                if (this.fleets[i].move_point !== undefined) {
                    //if (this.fleets[i].x != this.fleets[i].move_point.x || this.fleets[i].y != this.fleets[i].move_point.y) {
                        var vector = new Vector(this.fleets[i], this.fleets[i].move_point);
                        var distance = await vector.length();
                        var speed = await this.fleets[i].velocity.length() * time_passed;
                        var acceleration_input = speed/(this.fleets[i].acceleration * time_passed);
                        var adjusted_vector = await vector.divide(acceleration_input);
                        var slowdown_time = distance/speed;
                        var calculated_vector;
                        if ((await adjusted_vector.length() > speed) || (slowdown_time < acceleration_input)) {
                            calculated_vector = await (new Vector(this.fleets[i].velocity, adjusted_vector)).normalize();
                        } else {
                            var normalized_velocity = await this.fleets[i].velocity.isNull() ? this.fleets[i].velocity : await this.fleets[i].velocity.normalize();
                            calculated_vector = await (new Vector(normalized_velocity, await vector.normalize())).normalize();
                        }

                        this.fleets[i].velocity = await this.fleets[i].velocity.add(await calculated_vector.multiply(this.fleets[i].acceleration * time_passed));
                    //} else { - else is currently never executed anyway since the fleet cordinates are in decimals and the chance they will get to equal the whole numbers of the move point coordinates are near 0
                    //    delete this.fleets[i].move_point;
                    //}
                }

                this.fleets[i].x += this.fleets[i].velocity.x * time_passed;
                this.fleets[i].y += this.fleets[i].velocity.y * time_passed;
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
                this.players[i].socket.emit('fleets_update', fleets, this.deleted_fleets);
                this.deleted_fleets = [];
            }

            this.attempt_game_save(timestamp);
            if (time_passed >= this.tick_time + Math.floor(this.tick_time/6)) {
                console.log('Significant time delay detected - tick took: ' + time_passed + 's instead of ' + this.tick_time + 's');
            }
            this.last_tick = timestamp;
            this.updating = false;
        } else {
            if (Date.now() - this.last_tick > this.tick_time * 3) {
                throw new Error("More than 3 ticks have been skipped at once, check the code u dum dum");
            } else {
                setTimeout(this.update.bind(this), 0);
            }
        }
    }

    async attempt_game_save(timestamp, retry = false) {
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
    }

    async extract_game_data() {
        return {space_objects: this.space_objects, fleets: this.fleets};
    }
    
    async attempt_game_load(file = 'server_side/save_files/save.txt') {
        fs.readFile(file, 'utf8' , (err, data) => {
            if (err) {
                throw new Error(err);
            }
            var parsed_data = JSON.parse(data);
            this.space_objects = parsed_data.space_objects;
            for (var i = 0; i < parsed_data.fleets.length; i++) {
                parsed_data.fleets[i].velocity = new Vector(parsed_data.fleets[i].velocity)
            }
            this.fleets = parsed_data.fleets;
        });
    }

    async assemble_fleet(socket_id) {
        var player_planet;
        var system_center_object;
        var player = this.players.find( player => player.socket.id == socket_id );
        var break_loop = false;
        for (var j = 0; j < this.space_objects.length; j++) {
            if (player.space_object_id == this.space_objects[j].space_object_id) {
                player_planet = this.space_objects[j];
                if (!break_loop)
                    break_loop = true;
                else
                    break;
            }
            if (player.galaxy_id == this.space_objects[j].galaxy_id && this.space_objects[j].x == 0 && this.space_objects[j].y == 0) {
                system_center_object = this.space_objects[j];
                if (!break_loop)
                    break_loop = true;
                else
                    break;
            }
        }
        var rads = await utils.angleToRad(player_planet.rot);
        var [origin_x, origin_y] = [player_planet.x, player_planet.y];
        var [center_x, center_y] = [system_center_object.x, system_center_object.y];
        var object_x = center_x + (origin_x - center_x) * Math.cos(rads) - (origin_y - center_y) * Math.sin(rads) - 10;
        var object_y = center_y + (origin_x - center_x) * Math.sin(rads) + (origin_y - center_y) * Math.cos(rads) - 10;
        var fleet = {owner: player.username, x: object_x, y: object_y, acceleration: 0.000005, velocity: new Vector(0, 0)};
        var f_index = this.fleets.findIndex( fleet => fleet.owner == player.username);
        if (f_index == -1) {
            this.fleets.push(fleet);
        } else {
            this.fleets[f_index] = fleet;
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
        if (layout === 'galaxy') {
            return {galaxies: this.dbManager.get_map_datapack()};
        } else if (layout === 'system') {
            for (var i = 0; i < this.players.length; i++) {
                if (this.players[i].socket.id == socket_id) {
                    var space_objects = [];
                    for (var j = 0; j < this.space_objects.length; j++) {
                        if (this.space_objects[j].galaxy_id == this.players[i].galaxy_id) {
                            space_objects.push(this.space_objects[j]);
                        }
                    }
                    return {space_objects: space_objects, last_update: this.last_tick};
                }
            }
        }
        throw new Error('Player was not found to return map datapack');
    }

    async addPlayer(socket, username) {
        //socket remains a reference - isn't deep copied
        var basic_player_map_info = (await this.dbManager.get_basic_player_map_info(username))[0];
        this.players.push({socket: socket, username: username, galaxy_id: basic_player_map_info.galaxy_id, space_object_id: basic_player_map_info.space_object_id});
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
}