var Vector = require('../misc_modules/vector.js');
var Utils = require('./../misc_modules/utils.js');
var utils = new Utils();
var fs = require('fs');

module.exports = class Game {
    constructor(dbManager) {
        this.dbManager = dbManager;
        this.tick_time = 90;
        this.save_time = 120000;
        this.secondary_save_time = 300000;
        this.saving = false;
        this.updating = false;
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
                
                for (var j = 0; j < this.fleets.length; j++) {
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
                    var g_strength = Math.pow(object_radius/await vector.length(), 2);
                    var pull = g_strength * object_radius / 2500;
                    this.fleets[j].velocity = await this.fleets[j].velocity.add(await (await vector.normalize()).multiply(pull));

                    var object_radius = this.space_objects[i].width/2;
                    if (await vector.length() <= object_radius) {
                        this.fleets[j].socket.emit('fleet_destroyed');
                        this.fleets.splice(j, 1);
                    }
                }
            }

            for (var i = 0; i < this.fleets.length; i++) {
                if (this.fleets[i].move_point !== undefined) {
                    if (this.fleets[i].x != this.fleets[i].move_point.x || this.fleets[i].y != this.fleets[i].move_point.y) {
                        var vector = new Vector(this.fleets[i], this.fleets[i].move_point);
                        var distance = await vector.length();
                        var speed = await this.fleets[i].velocity.length();
                        var acceleration_input = speed/this.fleets[i].acceleration;
                        var adjusted_vector = await vector.divide(acceleration_input);
                        var slowdown_time = distance/speed;
                        var calculated_vector;
                        if ((await adjusted_vector.length() > speed) || (slowdown_time < acceleration_input)) {
                            calculated_vector = await (new Vector(this.fleets[i].velocity, adjusted_vector)).normalize();
                        } else {
                            var normalized_velocity = await this.fleets[i].velocity.isNull() ? this.fleets[i].velocity : await this.fleets[i].velocity.normalize();
                            calculated_vector = await (new Vector(normalized_velocity, await vector.normalize())).normalize();
                        }

                        this.fleets[i].velocity = await this.fleets[i].velocity.add(await calculated_vector.multiply(this.fleets[i].acceleration));
                    } else {
                        delete this.fleets[i].move_point;
                    }
                }

                this.fleets[i].x += this.fleets[i].velocity.x;
                this.fleets[i].y += this.fleets[i].velocity.y;

                this.fleets[i].socket.emit('fleet_update', JSON.stringify({x: this.fleets[i].x, y: this.fleets[i].y, velocity_x: this.fleets[i].velocity.x, velocity_y: this.fleets[i].velocity.y}));
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
        var fleets_without_socket = JSON.parse(JSON.stringify(this.fleets));
        for (var i = 0 ; i < fleets_without_socket.length; i++) {
            delete fleets_without_socket[i].socket;
        }
        return {space_objects: this.space_objects, fleets: this.fleets_without_socket};
    }
    
    async attempt_game_load(file = 'server_side/save_files/save.txt') {
        fs.readFile(file, 'utf8' , (err, data) => {
            if (err) {
                throw new Error(err);
            }
            var parsed_data = JSON.parse(data);
            this.space_objects = parsed_data.space_objects;
            this.fleets = parsed_data.fleets;
        });
    }

    async assemble_fleet(socket) {
        var player_planet = this.space_objects[1];
        var system_center_object = this.space_objects[0];
        var rads = await utils.angleToRad(player_planet.rot);
        var [origin_x, origin_y] = [player_planet.x, player_planet.y];
        var [center_x, center_y] = [system_center_object.x, system_center_object.y];
        var object_x = center_x + (origin_x - center_x) * Math.cos(rads) - (origin_y - center_y) * Math.sin(rads);
        var object_y = center_y + (origin_x - center_x) * Math.sin(rads) + (origin_y - center_y) * Math.cos(rads);

        this.fleets.push({x: object_x, y: object_y, acceleration: 0.03, velocity: new Vector(0, 0), socket: socket});
        return {x: object_x, y: object_y, acceleration: 0.03, velocity_x: 0, velocity_y: 0};
    }
}