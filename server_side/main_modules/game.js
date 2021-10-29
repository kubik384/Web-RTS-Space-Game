var Vector = require('../misc_modules/vector.js');
var Utils = require('../misc_modules/utils.js');
var utils = new Utils();
var expedition_results = require('./../game_properties/expedition_results.json');
var fs = require('fs');
var fsPromises = fs.promises;
var path = require('path');

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
        this.boundaries = 350000;
        this.speed_crash_constant = 0.03;
        this.fleet_abandon_time_constant = 30000;
        this.time_passed = this.tick_time + this.tick_offset;
        this.available_space_objects = [];
        this.all_habitable_space_objects = [];
        this.no_space_systems = 1;
        this.systems = [{}];
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
                    if (this.space_objects[i].centerrot_id !== undefined && this.space_objects[i].centerrot_id != this.space_objects[i].space_object_id) {
                        this.space_objects[i].rot += 0.001 * this.time_passed;
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

                for (var i = this.fleets.length - 1; i >= 0; i--) {
                    if (this.fleets[i].abandon_timer !== undefined) {
                        this.fleets[i].abandon_timer -= this.time_passed;
                        if (this.fleets[i].abandon_timer + 1000 <= 0) {
                            this.fleets[i].abandon_timer = undefined;
                            this.fleets[i].owner = undefined;
                            this.fleets[i].abandoned = true;
                            var resources = 0;
                            var unit_details = await this.dbManager.get_unit_details(this.fleets[i].units);
                            for (var j = 0; j < this.fleets[i].units.length; j++) {
                                var unit_detail = unit_details.find(unit_detail => unit_detail.unit_id == this.fleets[i].units[j].unit_id);
                                resources += unit_detail.cost.metal * this.fleets[i].units[j].count;
                            }
                            this.fleets[i].resources += Math.floor(resources * 0.35);
                            if (this.fleets[i].resources <= 0) {
                                this.deleted_fleets.push(i);
                                this.fleets.splice(i, 1);
                                continue;
                            }
                        }
                    } else if (this.fleets[i].expedition_timer !== undefined) {
                        this.fleets[i].expedition_timer -= this.time_passed;
                        if (this.fleets[i].expedition_timer <= 0) {
                            this.resolve_expedition(this.fleets[i]);
                            continue;
                        }
                    }
                    if (this.fleets[i].engaged_fleet_id === undefined) {
                        if (this.fleets[i].assigned_object_type !== undefined && this.fleets[i].assigned_object_id !== undefined) {
                            switch (this.fleets[i].assigned_object_type) {
                                case 'space_object':
                                    var space_object = this.space_objects.find(space_object => space_object.space_object_id == this.fleets[i].assigned_object_id);
                                    if (space_object !== undefined) {
                                        var previous_space_object_position;
                                        var space_object_velocity = space_object.velocity;
                                        if (space_object.centerrot_id !== undefined) {
                                            if (space_object.centerrot_id !== space_object.space_object_id) {
                                                var rads = await utils.angleToRad(space_object.rot - 0.001 * this.time_passed);
                                                var centerrot_object = this.space_objects.find(space_obj => space_obj.space_object_id == space_object.centerrot_id);
                                                var [center_x, center_y] = [centerrot_object.x, centerrot_object.y];
                                                var [original_x, original_y] = [space_object.original_x, space_object.original_y];
                                                var x = center_x + (original_x - center_x) * Math.cos(rads) - (original_y - center_y) * Math.sin(rads);
                                                var y = center_y + (original_x - center_x) * Math.sin(rads) + (original_y - center_y) * Math.cos(rads);
                                                previous_space_object_position = new Vector(x, y);
                                                space_object_velocity = await new Vector(previous_space_object_position, space_object).divide(this.time_passed);
                                            } else {
                                                previous_space_object_position = new Vector(space_object);
                                            }
                                        } else {
                                            previous_space_object_position = await new Vector(space_object).subtract(await (this.space_objects[i].velocity).multiply(this.time_passed));
                                        }
                                        var distance = await new Vector(this.fleets[i], previous_space_object_position).length();
                                        if (distance < 100) {
                                            this.fleets[i].move_point = undefined;
                                            this.fleets[i].velocity = space_object_velocity;
                                            if (distance != 0) {
                                                this.fleets[i].status_cooldown = 10000;
                                                this.fleets[i].x = previous_space_object_position.x;
                                                this.fleets[i].y = previous_space_object_position.y;
                                            } else {
                                                if (this.fleets[i].status_cooldown < 1) {
                                                    var username = this.fleets[i].owner;
                                                    var player_space_object_id = (await this.dbManager.get_basic_player_map_info(username))[0].space_object_id;
                                                    if (space_object.space_object_id == player_space_object_id) {
                                                        if (this.fleets[i].resources !== undefined && this.fleets[i].resources > 0) {
                                                            this.dbManager.add_resource(username, 'metal', this.fleets[i].resources);
                                                            this.fleets[i].resources = 0;
                                                        }
                                                    } else {
                                                        var resources;
                                                        if (this.fleets[i].status_cooldown != 0) {
                                                            resources = Math.abs(this.fleets[i].status_cooldown)/100;
                                                            this.fleets[i].status_cooldown = 0;
                                                        } else {
                                                            resources = this.time_passed/100;
                                                        }
                                                        if (this.fleets[i].resources != this.fleets[i].capacity && space_object.resources !== undefined && space_object.resources > 0) {
                                                            if (this.fleets[i].resources + resources <= this.fleets[i].capacity) {
                                                                if (space_object.resources - resources > 0) {
                                                                    this.fleets[i].resources += resources;
                                                                    space_object.resources -= resources;
                                                                } else {
                                                                    this.fleets[i].resources += space_object.resources;
                                                                    space_object.resources = 0;
                                                                }
                                                            } else {
                                                                resources = this.fleets[i].capacity - this.fleets[i].resources;
                                                                if (space_object.resources - resources > 0) {
                                                                    this.fleets[i].resources += resources;
                                                                    space_object.resources -= resources;
                                                                } else {
                                                                    this.fleets[i].resources += space_object.resources;
                                                                    space_object.resources = 0;
                                                                }
                                                            }
                                                        }
                                                    }
                                                } else {
                                                    this.fleets[i].status_cooldown -= this.time_passed;
                                                }
                                            }
                                        } else {
                                            this.fleets[i].move_point = {x: space_object.x, y: space_object.y};
                                        }
                                    } else {
                                        this.fleets[i].assigned_object_id = undefined;
                                        this.fleets[i].assigned_object_type = undefined;
                                        this.fleets[i].move_point = undefined;
                                    }
                                    break;
                                case 'fleet': 
                                    var fleet = this.fleets.find(fleet => fleet.fleet_id == this.fleets[i].assigned_object_id);
                                    if (fleet !== undefined) {
                                        var distance = await new Vector(this.fleets[i], fleet).length();
                                        if (distance < 100 && this.fleets[i].fleet_id != fleet.fleet_id) {
                                            if (fleet.abandoned !== undefined) {
                                                this.fleets[i].move_point = undefined;
                                                this.fleets[i].velocity = fleet.velocity;
                                                if (distance != 0) {
                                                    this.fleets[i].status_cooldown = 10000;
                                                    this.fleets[i].x = fleet.x;
                                                    this.fleets[i].y = fleet.y;
                                                } else {
                                                    if (this.fleets[i].status_cooldown < 1) {
                                                    var resources;
                                                    if (this.fleets[i].status_cooldown != 0) {
                                                        resources = Math.abs(this.fleets[i].status_cooldown)/100;
                                                        this.fleets[i].status_cooldown = 0;
                                                    } else {
                                                        resources = this.time_passed/100;
                                                    }
                                                    if (this.fleets[i].resources != this.fleets[i].capacity && fleet.resources > 0) {
                                                        if (this.fleets[i].resources + resources <= this.fleets[i].capacity) {
                                                            if (fleet.resources - resources > 0) {
                                                                this.fleets[i].resources += resources;
                                                                fleet.resources -= resources;
                                                            } else {
                                                                this.fleets[i].resources += fleet.resources;
                                                                var fleet_index = this.fleets.findIndex(f_fleet => f_fleet.fleet_id == fleet.fleet_id);
                                                                this.deleted_fleets.push(fleet_index);
                                                                this.fleets.splice(fleet_index, 1);
                                                                continue;
                                                            }
                                                        } else {
                                                            resources = this.fleets[i].capacity - this.fleets[i].resources;
                                                            if (fleet.resources - resources > 0) {
                                                                this.fleets[i].resources += resources;
                                                                fleet.resources -= resources;
                                                            } else {
                                                                this.fleets[i].resources += fleet.resources;
                                                                var fleet_index = this.fleets.findIndex(f_fleet => f_fleet.fleet_id == fleet.fleet_id);
                                                                this.deleted_fleets.push(fleet_index);
                                                                this.fleets.splice(fleet_index, 1);
                                                                continue;
                                                            }
                                                        }
                                                    }
                                                    } else {
                                                        this.fleets[i].status_cooldown -= this.time_passed;
                                                    }
                                                }
                                            } else {
                                                this.fleets[i].move_point = undefined;
                                                this.fleets[i].velocity = new Vector(0,0);
                                                fleet.velocity = new Vector(0,0);
                                                fleet.move_point = undefined;
                                                if (distance != 0) {
                                                    this.fleets[i].x = fleet.x;
                                                    this.fleets[i].y = fleet.y;
                                                }
                                                //engage the fleet somehow
                                                this.fleets[i].fighting_cooldown = 1000;
                                                this.fleets[i].engaged_fleet_id = fleet.fleet_id;
                                                fleet.engaged_fleet_id = this.fleets[i].fleet_id;
                                            }
                                        } else {
                                            this.fleets[i].move_point = {x: fleet.x, y: fleet.y};
                                        }
                                    } else {
                                        this.fleets[i].assigned_object_id = undefined;
                                        this.fleets[i].assigned_object_type = undefined;
                                        this.fleets[i].move_point = undefined;
                                    }
                                    break;
                            }
                        }
                        if (this.fleets[i].move_point !== undefined) {
                            if (Math.abs(this.fleets[i].x - this.fleets[i].move_point.x) < 1 && Math.abs(this.fleets[i].y - this.fleets[i].move_point.y) < 1 && await this.fleets[i].velocity.length() < 0.6) {
                                this.fleets[i].x = this.fleets[i].move_point.x;
                                this.fleets[i].y = this.fleets[i].move_point.y;
                                this.fleets[i].velocity.x = 0;
                                this.fleets[i].velocity.y = 0;
                                delete this.fleets[i].move_point;
                            } else {
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
                            /*
                            var calculated_vector;
                            if (this.fleets[i].acceleration != 0) {
                                //The calculations need to be significantly tweaked, which will take forever to get done
                                if (this.fleets[i].assigned_space_object_id !== undefined && this.fleets[i].assigned_space_object_id !== this.fleets[i].safe_space_object_id) {
                                    var speed_vector;
                                    var speed;
                                    var space_object = this.space_objects.find(space_object => space_object.space_object_id == this.fleets[i].assigned_space_object_id);
                                    if (space_object.centerrot_id !== undefined) {
                                        if (space_object.centerrot_id !== space_object.space_object_id) {
                                            var rads = await utils.angleToRad(space_object.rot - 0.001 * this.time_passed);
                                            var centerrot_object = this.space_objects.find(space_obj => space_obj.space_object_id == space_object.centerrot_id);
                                            var [center_x, center_y] = [centerrot_object.x, centerrot_object.y];
                                            var [original_x, original_y] = [space_object.original_x, space_object.original_y];
                                            var x = center_x + (original_x - center_x) * Math.cos(rads) - (original_y - center_y) * Math.sin(rads);
                                            var y = center_y + (original_x - center_x) * Math.sin(rads) + (original_y - center_y) * Math.cos(rads);
                                            previous_space_object_position = new Vector(x, y);
                                            space_object_velocity = await new Vector(previous_space_object_position, space_object).divide(this.time_passed);
                                            speed_vector = await this.fleets[i].velocity.subtract(space_object_velocity);
                                        } else {
                                            speed_vector = this.fleets[i].velocity;
                                        }
                                    } else {
                                        speed_vector = await this.fleets[i].velocity.subtract(space_object.velocity);
                                    }
                                    speed = await speed_vector.length();
                                    var normalized_speed_vector = await speed_vector.normalize();
                                    var norm_vector = await vector.normalize();
                                    var space_speed_vector = await norm_vector.subtract(normalized_speed_vector);
                                    var space_speed_vector_length = await space_speed_vector.length();
                                    var actual_speed;
                                    //if more than or equal to 1, the speed vector is not in x or y direction of the space object, therefore never getting closer
                                    if (space_speed_vector_length < 1) {
                                        //add into calculation also the 1 - (1 - space_speed_vector_length) - because that's the speed of "getting away". Will need to probably take in account this speed in the wrong direction
                                        actual_speed = speed * (1 - space_speed_vector_length);
                                        var tick_speed = actual_speed * this.time_passed;
                                        distance -= space_object.width/2;
                                        var ticks_to_slowdown = distance/tick_speed;
                                        var slowdown_ticks = (actual_speed - (this.speed_crash_constant - 0.05))/this.fleets[i].acceleration;
                                        if (actual_speed <= this.speed_crash_constant - 0.05) {
                                            //calc if i can speed up, have to keep the speed same speed or ...
                                            var extra_ticks = slowdown_ticks - ticks_to_slowdown;
                                            if (extra_ticks > 0 && extra_ticks < 3) {
                                                calculated_vector = 0;
                                            } else {
                                                var acceleration_input = speed/(this.fleets[i].acceleration * this.time_passed);
                                                var adjusted_vector = acceleration_input != 0 ? await vector.divide(acceleration_input) : vector;
                                                var time_to_slowdown = distance/speed;
                                                var speed = await this.fleets[i].velocity.length() * this.time_passed;
                                                if ((await adjusted_vector.length() > speed) || (time_to_slowdown < acceleration_input)) {
                                                    calculated_vector = await (new Vector(this.fleets[i].velocity, adjusted_vector)).normalize();
                                                } else {
                                                    var normalized_velocity = await this.fleets[i].velocity.isNull() ? this.fleets[i].velocity : await this.fleets[i].velocity.normalize();
                                                    calculated_vector = await (new Vector(normalized_velocity, await vector.normalize())).normalize();
                                                }
                                            }
                                        }
                                        if (ticks_to_slowdown > slowdown_ticks) {
                                            var extra_ticks = slowdown_ticks - ticks_to_slowdown;
                                            if (extra_ticks > 0 && extra_ticks < 1) {
                                                //can't just pull the throttle full-speed back when I'm e.g. 20px off from the object at 0.04 speed, which would result the actual speed in being 0, since the fleet will start moving other way altogether. Need to calculate how much do I need to pull the speed back
                                                //calculated_vector = await (await (await speed_vector.reverse()).normalize()).multiply(1 - extra_ticks);
                                                calculated_vector = 0;
                                            } else if (extra_ticks > 1 && extra_ticks < 3) {
                                                calculated_vector = 0;
                                            } else {
                                                //free to speed up, since if the extra ticks is > 3, then by adding a full tick speed up, I take away 2 extra ticks, so > 1 extra ticks remain before the need to slow down
                                                var acceleration_input = speed/(this.fleets[i].acceleration * this.time_passed);
                                                var adjusted_vector = acceleration_input != 0 ? await vector.divide(acceleration_input) : vector;
                                                var time_to_slowdown = distance/speed;
                                                var speed = await this.fleets[i].velocity.length() * this.time_passed;
                                                if ((await adjusted_vector.length() > speed) || (time_to_slowdown < acceleration_input)) {
                                                    calculated_vector = await (new Vector(this.fleets[i].velocity, adjusted_vector)).normalize();
                                                } else {
                                                    var normalized_velocity = await this.fleets[i].velocity.isNull() ? this.fleets[i].velocity : await this.fleets[i].velocity.normalize();
                                                    calculated_vector = await (new Vector(normalized_velocity, await vector.normalize())).normalize();
                                                }
                                            }
                                        } else {
                                            //what do I do if there's not enough time to slow down? Attempt to slow down anyway?
                                            calculated_vector = await (await speed_vector.reverse()).normalize();
                                        }
                                    } else {
                                        //need to calculate how close the object is, how much extra speed up can be used without overshooting and crashing into the object
                                        var acceleration_input = speed/(this.fleets[i].acceleration * this.time_passed);
                                        var adjusted_vector = acceleration_input != 0 ? await vector.divide(acceleration_input) : vector;
                                        var time_to_slowdown = distance/speed;
                                        var speed = await this.fleets[i].velocity.length() * this.time_passed;
                                        if ((await adjusted_vector.length() > speed) || (time_to_slowdown < acceleration_input)) {
                                            calculated_vector = await (new Vector(this.fleets[i].velocity, adjusted_vector)).normalize();
                                        } else {
                                            var normalized_velocity = await this.fleets[i].velocity.isNull() ? this.fleets[i].velocity : await this.fleets[i].velocity.normalize();
                                            calculated_vector = await (new Vector(normalized_velocity, await vector.normalize())).normalize();
                                        }
                                    }
                                } else {
                                
                                var acceleration_input = speed/(this.fleets[i].acceleration * this.time_passed);
                                var adjusted_vector = acceleration_input != 0 ? await vector.divide(acceleration_input) : vector;
                                var time_to_slowdown = distance/speed;
                                var speed = await this.fleets[i].velocity.length() * this.time_passed;
                                if ((await adjusted_vector.length() > speed) || (time_to_slowdown < acceleration_input)) {
                                    calculated_vector = await (new Vector(this.fleets[i].velocity, adjusted_vector)).normalize();
                                } else {
                                    var normalized_velocity = await this.fleets[i].velocity.isNull() ? this.fleets[i].velocity : await this.fleets[i].velocity.normalize();
                                    calculated_vector = await (new Vector(normalized_velocity, await vector.normalize())).normalize();
                                }
                                }
                                this.fleets[i].velocity = await this.fleets[i].velocity.add(await calculated_vector.multiply(this.fleets[i].acceleration * this.time_passed));
                            }
                            */
                        }
                        this.fleets[i].x += this.fleets[i].velocity.x * this.time_passed;
                        this.fleets[i].y += this.fleets[i].velocity.y * this.time_passed;
                    } else if (this.fleets[i].fighting_cooldown !== undefined) {
                        this.fleets[i].fighting_cooldown -= this.time_passed;
                        if (this.fleets[i].fighting_cooldown <= 0) {
                            await this.execute_fight(this.fleets[i], timestamp);
                        }
                    }
                }

                //very inefficient and resource intensive solution
                for (var i = 0; i < this.players.length; i++) {
                    var fleets = [];
                    for (var j = 0; j < this.fleets.length; j++) {
                        if (this.fleets[j].owner == this.players[i].username) {
                            fleets.push(this.fleets[j]);
                        } else {
                            //don't like giving clients the actual fleets id, since if the fleet can get out of sight and then the player finds it again, they can check the id to see if it's the same fleet
                            fleets.push({fleet_id: this.fleets[j].fleet_id, x: this.fleets[j].x, y: this.fleets[j].y, units: this.fleets[j].units, abandoned: this.fleets[j].abandoned, resources: this.fleets[j].resources});
                            if (fleets[fleets.length - 1].abandoned) {
                                fleets[fleets.length - 1].resources = this.fleets[j].resources;
                            }
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
                this.stop();
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
            this.fleet_id = parsed_data.fleet_id;
            this.systems = parsed_data.systems;
        });
    }

    async assemble_fleet(username, p_units, expedition_timer, expedition_length_id) {
        var player = this.players.find(player => player.username == username);
        var player_fleet = this.fleets.find( fleet => fleet.owner == username);
        if (player_fleet === undefined) {
            var player_planet;
            for (var i = 0; i < this.space_objects.length; i++) {
                if (player.space_object_id == this.space_objects[i].space_object_id) {
                    player_planet = this.space_objects[i];
                    break;
                }
            }
            if (player_planet !== undefined || expedition_timer !== undefined) {
                var units = await this.dbManager.get_player_units(username, 'all');
                for (var i = p_units.length - 1; i >= 0; i--) {
                    var unit_index = units.findIndex(unit => unit.unit_id == p_units[i].unit_id);
                    if (unit_index != -1) {
                        if (p_units[i].count < 1) {
                            units.splice(unit_index, 1);
                        } else if (units[unit_index].count > p_units[i].count) {
                            units[unit_index].count = p_units[i].count;
                        }
                    }
                }
                if (units.length != 0) {
                    var capacity = 0;
                    var unit_details = await this.dbManager.get_unit_details(units);
                    for (var i = 0; i < unit_details.length; i++) {
                        if (units[i].count > 0) {
                            capacity += unit_details[i].capacity * units[i].count;
                        }
                        units[i].name = unit_details[i].name;
                        delete units[i].player_id;
                    }
                    var fleet;
                    if (expedition_timer !== undefined) {
                        fleet = {fleet_id: this.fleet_id++, owner: username, x: 0, y: 0, acceleration: 0.00025, velocity: new Vector(player_planet.velocity), units: units, capacity: capacity, resources: 0, expedition_timer: expedition_timer, expedition_length_id: expedition_length_id};
                    } else {
                        fleet = {fleet_id: this.fleet_id++, owner: username, x: player_planet.x - player_planet.width, y: player_planet.y - player_planet.height, acceleration: 0.00025, velocity: new Vector(player_planet.velocity), units: units, capacity: capacity, resources: 0};
                    }
                    this.fleets.push(fleet);
                }
            }
        }
    }

    async abandon_fleet(username) {
        var player_fleet = this.fleets.find( fleet => fleet.owner == username);
        if (player_fleet !== undefined) {
            if (player_fleet.abandon_timer === undefined && player_fleet.engaged_fleet_id === undefined) {
                player_fleet.assigned_object_type = undefined;
                player_fleet.assigned_object_id = undefined;
                player_fleet.move_point = undefined;
                player_fleet.abandon_timer = this.fleet_abandon_time_constant;
            }
        }
    }

    async cancel_fleet_abandoning(username) {
        var fleet = this.fleets.find(fleet => fleet.owner == username);
        if (fleet !== undefined) {
            if (fleet.abandon_timer !== undefined) {
                fleet.abandon_timer = undefined;
            }
        }
    }

    async set_movepoint(username, x, y) {
        var player_fleet = this.fleets.find( fleet => fleet.owner == username );
        if (player_fleet !== undefined && player_fleet.abandon_timer === undefined && player_fleet.engaged_fleet_id === undefined && player_fleet.expedition_timer === undefined) {
            player_fleet.move_point = {x:x, y:y};
            player_fleet.assigned_object_id = undefined;
            player_fleet.assigned_object_type = undefined;
        }
    }

    async get_map_datapack(layout, username) {
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
                        if (this.players[i].username == username) {
                            /*
                            var player_planet = this.space_objects.find(space_object => space_object.space_object_id == this.players[i].space_object_id);
                            var space_objects = [];
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
                            */
                            var units = await this.dbManager.get_player_units(this.players[i].username, 'all');
                            var fleets = [];
                            for (var j = 0; j < this.fleets.length; j++) {
                                if (this.fleets[j].owner == this.players[i].username) {
                                    fleets.push(this.fleets[j]);
                                } else {
                                    //don't like giving clients the actual fleets id, since if the fleet can get out of sight and then the player finds it again, they can check the id to see if it's the same fleet
                                    fleets.push({fleet_id: this.fleets[j].fleet_id, x: this.fleets[j].x, y: this.fleets[j].y, units: this.fleets[j].units, abandoned: this.fleets[j].abandoned});
                                    if (fleets[fleets.length - 1].abandoned) {
                                        fleets[fleets.length - 1].resources = this.fleets[j].resources;
                                    }
                                }
                            }
                            var new_reports_count =  await this.dbManager.get_new_reports_count(this.players[i].username);
                            resolve({home_planet_id: this.players[i].space_object_id, space_objects: this.space_objects, fleets: fleets, last_update: this.last_tick, time_passed: this.time_passed, boundaries: this.boundaries, available_units: units, new_reports_count: new_reports_count});
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

    async removePlayer(username) {
        for (var i = 0; i < this.players.length; i++) {
            if (this.players[i].username == username) {
                this.players.splice(i, 1);
                return;
            }
        }
        throw new Error('Did not find player to get them removed from the players array');
    }

    async generate_asteroid() {
        var x = Math.floor(Math.sign(Math.random() - 0.49) * Math.random() * this.boundaries);
        var y = Math.floor(Math.sign(Math.random() - 0.49) * Math.random() * this.boundaries);
        var size = 6 + Math.floor(Math.random() * 26);
        var tmp = Math.random() - 0.35;
        var resource_ratio = tmp > 0 ? tmp : 0;
        var resources = Math.floor(resource_ratio * size);
        this.space_objects.push({space_object_id:  this.space_object_id++, original_x: x, original_y: y, x: x, y: y, width: size, height: size, image: "asteroid", velocity: new Vector(0, 0), rot: 0, resources: resources});
    }

    async generate_system(iter_count = 0) {
        //TODO: make the system generation happen in layers of circles which have a spiral-like connections between?
        //var system_target_box = {x1: 0, x2: 0, y1: 0, y2: 0};
        if (iter_count > 25) {
            return;
        }
        var center_size = 5000 + Math.random() * 5000;
        var center_object_id = this.space_object_id++;
        var no_planets = 3 + Math.floor(Math.random() * 5);
        var max_width = 55000;
        var max_height = 55000;
        var center_x = Math.floor(Math.floor(Math.random() * (this.boundaries - max_width - 25000)/10000) * 10000 * Math.sign(Math.random() - 0.49));
        var center_y = Math.floor(Math.floor(Math.random() * (this.boundaries - max_height - 25000)/10000) * 10000 * Math.sign(Math.random() - 0.49));
        for (var i = 0; i < this.systems.length; i++) {
            if (utils.isInsideObjects({x: center_x, y: center_y}, [{x1: this.systems[i].x - (max_width*2 + 5000), x2: this.systems[i].x + (max_width*2 + 5000), y1: this.systems[i].y - (max_height*2 + 5000), y2: this.systems[i].y + (max_height*2 + 5000)}], 0)) {
                return this.generate_system(iter_count + 1);
            }
        }
        this.systems.push({x: center_x, y: center_y});
        const available_space = center_size * 5;
        var space_left = available_space;
        for (var i = 0; i < no_planets; i++) {
            var planet_space = Math.floor(space_left/(no_planets - i));
            var size = Math.floor(400 + Math.random() * 2200);
            //1/2 size is to prevent planets from both being so close to the edge that parts of them are inside each other
            //1/4 size is a padding, to prevent the planets to be so close they are nearly "touching"
            var x_adjustment = Math.random() * (planet_space - size*3/2);
            var original_x = center_x + (available_space - space_left) + Math.floor(center_size/2 + size*3/4 + x_adjustment);
            var original_y = center_y;
            space_left -= Math.floor(x_adjustment + size + size/2);
            var rot = Math.floor(Math.random() * 360);
            var rads = await utils.angleToRad(rot);
            var x = center_x + (original_x - center_x) * Math.cos(rads) - (original_y - center_y) * Math.sin(rads);
            var y = center_y + (original_x - center_x) * Math.sin(rads) + (original_y - center_y) * Math.cos(rads);
            this.space_objects.push({space_object_id: this.space_object_id++, original_x: original_x, original_y: original_y, x: x, y: y, width: size, height: size, image: "planet2", velocity: new Vector(0, 0), rot: rot, centerrot_id: center_object_id});
            this.available_space_objects.push(this.space_object_id - 1);
            this.all_habitable_space_objects.push(this.space_object_id - 1);
        }

        this.space_objects.push({space_object_id: center_object_id, original_x: center_x, original_y: center_y, x: center_x, y: center_y, width: center_size, height: center_size, image: "star", velocity: new Vector(0, 0), rot: 0, centerrot_id: center_object_id});
        this.server.emit('system_generated', center_x, center_y);
    }

    async process_request(username, request_id, passed_args) {
        if (typeof request_id === 'string') {
            if (!this.updating) {
                switch(request_id) {
                    case 'assemble_fleet':
                        this.assemble_fleet(username, passed_args[0]);
                        break;
                    case 'abandon_fleet':
                        this.abandon_fleet(username);
                        break;
                    case '=':
                        if (username == 'Newstory') {
                            this.tick_offset = 0;
                        }
                        break;
                    case '+':
                        break;
                    case '-':
                        if (username == 'Newstory') {
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
                        }
                        break;
                    case 'cancel':
                        if (username == 'Newstory') {
                            for (var i = 0; i < this.fleets.length; i++) {
                                if (this.fleets[i].owner == username) {
                                    this.fleets[i].move_point = undefined;
                                    break;
                                }
                            }
                        }
                        break;
                    case 'generate_system':
                        if (username == 'Newstory') {
                            this.generate_system();
                        }
                        break;
                    case 'generate_asteroid':
                        if (username == 'Newstory') {
                            this.generate_asteroid();
                        }
                        break;
                    case 'cancel_fleet_abandoning':
                        this.cancel_fleet_abandoning(username);
                        break;
                }
            } else {
                setTimeout(this.process_request, 0, username, request_id);
            }
        } else {
            console.log('Type of request_id is not string!');
        }
    }

    async assign_fleet(username, p_object_type, object_id) {
        var player_fleet = this.fleets.find( fleet => fleet.owner == username );
        if (player_fleet !== undefined && player_fleet.abandon_timer === undefined && player_fleet.engaged_fleet_id === undefined && player_fleet.expedition_timer === undefined) {
            var valid_object_types = ['space_object', 'fleet'];
            if (p_object_type !== undefined && typeof p_object_type == 'string' && valid_object_types.includes(p_object_type)) {
                if (object_id !== undefined && typeof object_id == 'number' && object_id >= 0) {
                    var object_type = p_object_type + 's';
                    var object = this[object_type].find(object => object[p_object_type + '_id'] == object_id);
                    if (object !== undefined) {
                        player_fleet.assigned_object_type = p_object_type;
                        player_fleet.assigned_object_id = object_id;
                    }
                }
            }
        }
    }

    async execute_fight(p_fleet, timestamp) {
        const root = path.resolve(__dirname, '../fight_records') + '/';
        const name = 'fight_';
        var id = 0;
        var file_found = true;
        var file_path;
        if (!fs.existsSync(root)){
            fs.mkdirSync(root);
        }
        while(file_found) {
            try {
                file_path = root + name + id + '.txt';
                await fsPromises.readFile(file_path);
                id++;
            } catch (err) {
                if (err.code == 'ENOENT') {
                    file_found = false;
                } else {
                    throw err;
                }
            }
        }
        var file_handle;
        var file;
        var readable;
        var writable;
        try {
            file_handle = await fsPromises.open(file_path, 'a+');
            readable = file_handle.createReadStream();
            writable = file_handle.createWriteStream();
            file = readable.pipe(writable);
            await new Promise((resolve, reject) => {
                file.write('test', () => {
                    resolve();
                });
            });

            readable.on('error', (err) => {
                console.log('Error in read stream...');
                console.log(err);
            });

            writable.on('error', (err) => {
                console.log('Error in write stream...');
                console.log(err);
            });
            
            var unix_timestamp = Math.floor(timestamp/1000);
            var opposing_fleet_index = this.fleets.findIndex(opposing_fleet => opposing_fleet.fleet_id == p_fleet.engaged_fleet_id);
            var opposing_fleet = this.fleets[opposing_fleet_index];
            const fleet_spacing = 7000;
            var unit_detail = {};
            var unit_detail_2 = {};
            var units = [[],[]];

            for (var i = 0; i < units.length; i++) {
                var fleet_unit_count = 0;
                var fleet = i == 0 ? p_fleet : opposing_fleet;
                for (var j = 0; j < fleet.units.length; j++) {
                    fleet_unit_count += fleet.units[j].count;
                }
                var curr_col = 1;
                var curr_row = 1;
                var columns = Math.ceil(Math.sqrt(fleet_unit_count)) * 4;
                for (var j = 0; j < fleet.units.length; j++) {
                    var unit = fleet.units[j];
                    if (unit_detail.unit_id !== undefined || unit_detail.unit_id != unit.unit_id) {
                        unit_detail = (await this.dbManager.get_unit_details([unit]))[0];
                    }
                    units[i].push(...Array(unit.count).fill({unit_id: unit.unit_id, hull: unit_detail.hull, shield: unit_detail.shield, mobility: unit_detail.mobility, weapons: JSON.parse(JSON.stringify(unit_detail.weapons)), taken_shots: 0}));
                }
                var weapon_details;
                var prev_unit_id = -1;
                for (var j = 0; j < units[i].length; j++) {
                    var unit = units[i][j];
                    unit.x = 0 + curr_col++ * 40;
                    unit.y = 0 - curr_row * 60 - (z == 1 ? fleet_spacing : 0);
                    unit.move_by = {x: 0, y: -Math.floor(unit.mobility/10)};
                    if (curr_col > columns) {
                        curr_col = 1;
                        curr_row++;
                    }
                    if (weapon_details === undefined || unit.unit_id != prev_unit_id) {
                        weapon_details = await this.dbManager.get_unit_weapon_details(unit.weapons);
                        prev_unit_id = unit.unit_id;
                    }
                    for (var k = 0; k < weapon_details.length; k++) {
                        unit.weapons[k].curr_cds = Array(unit.weapons[k].count).fill(weapon_details[k].cooldown);
                    }
                    unit.disabled = false;
                }
            }
            var wreck_field = {metal: 0};
            var disabled_units = [];
            //TODO: make a dmg e.g. 70% -> 130% representing that the damage dealt depends on the part of the hit ship. Increase chance to deal the lower amount when higher mobility?
            while (units[0].length > 1 && units[1].length > 1) {
                for (var z = 0; z < units.length; z++) {
                    var fleet_units = units[z];
                    var opposing_fleet_units = units[(z + 1 == units.length ? 0 : z + 1)];
                    for (var i = 0; i < fleet_units.length; i++) {
                        var unit = fleet_units[i];
                        unit.x += unit.move_by.x;
                        unit.y += unit.move_by.y;
                        var weapon_details = await this.dbManager.get_unit_weapon_details(unit.weapons);
                        var enemy_in_range = false;
                        for (var j = 0; j < opposing_fleet_units.length; j++) {
                            var target_unit = opposing_fleet_units[j];
                            if (target_unit.hull > 0 && !target_unit.disabled) {
                                for (var k = 0; k < weapon_details.length; k++) {
                                    var firing = true;
                                    var charged_weapon_index = unit.weapons[k].curr_cds.findIndex(curr_cd => curr_cd <= 0);
                                    while (charged_weapon_index != -1 && firing) {
                                        if ((weapon_details[k].weapon_id != 4 || target_unit.shield > 0) && (weapon_details[k].weapon_id != 5 || target_unit.shield < 1)) {
                                            var units_distance = await (new Vector(unit, target_unit)).length();
                                            if (units_distance <= weapon_details[k].range) {
                                                var evade_chance = ((target_unit.mobility)/weapon_details[k].velocity)*2 + (units_distance/weapon_details[k].velocity)/5 - target_unit.taken_shots * 0.08;
                                                target_unit.taken_shots++;
                                                var isHit = Math.random() > evade_chance;
                                                if (isHit) {
                                                    if (weapon_details[k].damage !== undefined) {
                                                        var damage_leftover = weapon_details[k].damage - target_unit.shield;
                                                        target_unit.shield -= weapon_details[k].damage;
                                                        if (damage_leftover > 0) {
                                                            var hull_damage_ratio = damage_leftover/target_unit.hull;
                                                            if (damage_leftover < target_unit.hull && hull_damage_ratio >= 0.6) {
                                                                if (unit_detail_2.unit_id !== undefined || unit_detail_2.unit_id != target_unit.unit_id) {
                                                                    unit_detail_2 = (await this.dbManager.get_unit_details([target_unit]))[0];
                                                                }
                                                                var damaged_hull_ratio = 1 - (target_unit.hull - damage_leftover)/unit_detail_2.hull;
                                                                if (Math.random() <= (0.08 + damaged_hull_ratio)) {
                                                                    //if the unit receives over 60% dmg of it's current hull, 50% + % dmg of it's current hull over 60% that the unit explodes and 50% - % dmg of it's current hull over 60% that it just gets disabled
                                                                    if (Math.random() <= (0.5 + hull_damage_ratio - 0.6)) {
                                                                        unit.hull = 0;
                                                                    } else {
                                                                        target_unit.disabled = true;
                                                                    }
                                                                }
                                                            }
                                                            target_unit.hull -= damage_leftover;
                                                        }
                                                    } else if (weapon_details[k].shield_damage !== undefined) {
                                                        target_unit.shield -= weapon_details[k].shield_damage; 
                                                    }
                                                }
                                                enemy_in_range = true;
                                                unit.weapons[k].curr_cds[charged_weapon_index] = weapon_details[k].cooldown + 1;
                                            } else {
                                                firing = false;
                                            }
                                        } else {
                                            firing = false;
                                        }
                                        charged_weapon_index = unit.weapons[k].curr_cds.findIndex(curr_cd => curr_cd == 0);
                                    }
                                }
                            }
                        }
                        if (unit.hull > 0) {
                            if (!unit.disabled) {
                                for (var k = 0; k < weapon_details.length; k++) {
                                    for (var l = 0; l < unit.weapons[k].curr_cds.length; l++) {
                                        if (unit.weapons[k].curr_cds[l] > 0) {
                                            unit.weapons[k].curr_cds[l]--;
                                        }
                                    }
                                }
                                unit.taken_shots = 0;
                                //if the unit's shield has been completely broken, take extra turn for it to be able to start recharging
                                if (unit.shield < 0) {
                                    unit.shield = 0;
                                } else {
                                    if (unit_detail.unit_id !== undefined || unit_detail.unit_id != unit.unit_id) {
                                        unit_detail = (await this.dbManager.get_unit_details([unit]))[0];
                                    }
                                    if (unit.shield < unit_detail.shield) {
                                        var new_shield_value = unit.shield + Math.floor(unit_detail.shield/10);
                                        unit.shield = (unit_detail.shield >= new_shield_value ? new_shield_value : unit_detail.shield);
                                    }
                                }
                            } else {
                                disabled_units.push(unit);
                                fleet_units.splice(i--,1);
                            }
                        } else {
                            wreck_field.metal += (wreck_field.metal !== undefined ? 0 : wreck_field.metal) + unit_detail.cost.metal;
                            fleet_units.splice(i--,1);
                        }
                        if (!enemy_in_range) {
                            var target_unit = opposing_fleet_units[Math.floor(Math.random() * opposing_fleet_units.length)];
                            var target_vector = new Vector(unit, target_unit);
                            var target_vector_length = await target_vector.length();
                            if (target_vector_length > 0) {
                                target_vector = await target_vector.normalize();
                                unit.move_by = await target_vector.multiply(Math.floor(unit.mobility/10));
                            } else {
                                unit.move_by = {x:0,y:0};
                            }
                        } else {
                            unit.move_by = {x:0,y:0};
                        }
                    }
                }
            }
            for (var i = disabled_units.length - 1; i >= 0; i--) {
                if (unit_detail.unit_id !== undefined || unit_detail.unit_id != disabled_units[i].unit_id) {
                    unit_detail = (await this.dbManager.get_unit_details([disabled_units[i]]))[0];
                }
                wreck_field.metal += (wreck_field.metal !== undefined ? 0 : wreck_field.metal) + unit_detail.cost.metal;
                disabled_units.splice(i,1);
            }
            var rounds_text = `Fleet ${units[0].length > 1 ? 1 : 2} Won!`;
            this.generate_report(p_fleet.owner, 'Attack result', rounds_text, unix_timestamp);
            this.generate_report(opposing_fleet.owner, 'Fleet attacked', rounds_text, unix_timestamp);

            p_fleet.engaged_fleet_id = undefined;
            p_fleet.fighting_cooldown = undefined;
            p_fleet.assigned_object_id = undefined;
            p_fleet.assigned_object_type = undefined;
            p_fleet.move_point = undefined;
            opposing_fleet.engaged_fleet_id = undefined;
            opposing_fleet.fighting_cooldown = undefined;
            opposing_fleet.assigned_object_id = undefined;
            opposing_fleet.assigned_object_type = undefined;
            opposing_fleet.move_point = undefined;
            delete p_fleet.units;
            delete opposing_fleet.units;

            var defeated_fleet_index;
            var defeated_fleet;
            var winning_fleet;
            var fleet_units;
            if (units[0].length > 1) {
                winning_fleet = p_fleet;
                defeated_fleet = opposing_fleet;
                defeated_fleet_index = opposing_fleet_index;
                fleet_units = units[0];
            } else {
                winning_fleet = opposing_fleet;
                defeated_fleet = p_fleet;
                defeated_fleet_index = this.fleets.findIndex(f_fleet => f_fleet.fleet_id == fleet.fleet_id);
                fleet_units = units[1];
            }
            
            var units = [];
            var capacity = 0;
            for (i = 0; i < fleet_units.length; i++) {
                var u_index = units.findIndex(unit => unit.unit_id == fleet_units[i].unit_id);
                if (u_index != -1) {
                    units[u_index].count++;
                } else {
                    units.push({unit_id: fleet_units[i].unit_id, count: 1});
                }
            }
            var unit_details = await this.dbManager.get_unit_details(units);
            for (var i = 0; i < unit_details.length; i++) {
                if (units[i].count > 0) {
                    capacity += unit_details[i].capacity * units[i].count;
                }
                units[i].name = unit_details[i].name;
            }
            winning_fleet.capacity = capacity;
            winning_fleet.units = units;
            if (wreck_field.metal <= 0) {
                this.deleted_fleets.push(defeated_fleet_index);
                this.fleets.splice(defeated_fleet_index, 1);
            } else {
                //TODO: only resources that the destroyed fleet was carrying will get added to the wreck_field, but the resources from the other fleet should be added as well (for now probably just the resources that couldn't fit due to possibly transporters getting destroyed, reducing the capacity of the fleet)
                defeated_fleet.resources += wreck_field.metal * 0.4;
                defeated_fleet.owner = undefined;
                defeated_fleet.abandoned = true;
                defeated_fleet.velocity = new Vector(Math.floor((0.0003 + Math.random() * 0.002) * Math.sign(Math.random() - 0.49) * 1e4) / 1e4, Math.floor((0.0003 + Math.random() * 0.002) * Math.sign(Math.random() - 0.49) * 1e4) / 1e4);
            }
            await new Promise((resolve, reject) => {
                file.write('test', () => {
                    resolve();
                });
            });
        } finally {
            writable?.end();
            file?.end();
        }
    }

    async send_expedition(username, units, expedition_length_id) {
        if (expedition_length_id !== undefined) {
            var player_fleet = this.fleets.find( fleet => fleet.owner == username );
            if (player_fleet === undefined) {
                var expedition_timer;
                switch (expedition_length_id) {
                    case 1:
                        expedition_timer = 3000;
                        break;
                    case 2:
                        expedition_timer = 17100000;
                        break;
                    case 3:
                        expedition_timer = 36000000;
                        break;
                    case 4:
                        expedition_timer = 50400000;
                        break;
                }
                this.assemble_fleet(username, units, expedition_timer, expedition_length_id);
            }
        }
    }

    async resolve_expedition(fleet) {
        fleet.expedition_timer = undefined;
        var result_type = Math.random();
        switch (fleet.expedition_length_id) {
            case 1: 
            result_type = Math.floor(result_type * 8);
                break;
            case 2:
                result_type = Math.floor(result_type * 10);
                break;
            case 3:
                result_type = Math.floor(result_type * 12);
                break;
            case 4: 
            result_type = Math.floor(result_type * 14);
                break;
        }

        //make expeditions multiple-layered? Multiple possible events in one expedition? Make the timed -> like a fleet found an abandoned fleet, took over the ships -> the player receives a report, but halfway on the return the crew inside the ships is suddenly attacked by some biological creatures, overruning most of the fleet. (aliens). Or anything else can happen after an event on the way back...
        switch (result_type) {
            case 0:
                //found abandoned ships
                var fighters = fleet.units.find(unit => unit.unit_id == 1);
                fighters.count += 10 + Math.random() * 91;
                break;
            case 1:
                //infected with virus (lost fleet, lost contact -> unknown time of return, fleet gets lost -> unknown time of return, ambushed shortly after -> taken over by pirates/aliens, destroyed, ...)
                break;
            case 2:
                //a booby trapped abandoned fleet - explosion
                break;
            case 3:
                //a booby trapped abandoned fleet - explosion + pirates ambush
                break;
            case 4:
                //a distress beacon - found ships, all crew on the ships is found dead (give a choice - accepting the ships has a chance of the entire crew of the current fleet dying, losing everything?)
                break;
            case 5:
                //distress beacon - ambushed by pirates (or give choice to ignore or follow - if ignored, the ignore option will be auto-selected after some time)
                break;
            case 6:
                //scrapped event idea
                break;
            case 7:
                //particle storm - fleet moved too close to a star and got hit -> damaged/lose fuel/delayed return/lost contact - unknown time of return (if at all)?
                break;
            case 8:
                //attacked/ambushed by pirates (e.g. a ship appears inside the fleet formation and explodes, attempt to transmit a virus, ...)
                break;
            case 9:
                //Found some strange anomalies/abandon civilizations/abandoned repair station/ ... -> nothing happens
                break;
            case 10:
                //Find resources (asteroid/planet/remains of a fleet/deactivated defense systems around a planet's orbit/...)
                break;
            case 11:
                //scrapped event idea
                break;
            case 12:
                //scrapped event idea
                break;
            case 13:
                //The fleet has been lost to a nearby star that has suddenly started rapidly expanding, engulfing the fleet before it could move out of it's reach
                //The crew from the fleet starts going suddenly mad or losing consciousness. Contact with the fleet is quickly lost
                break;
            
            //fleet attempts to enter a wormhole
            //powerful gravitaional field from a nearby planetoid -> part of the fleet that couldn't move out has been captured by pirates/entire fleet - rest of the fleet has been ambushed by pirates
            //attacked by undetected defense systems on a nearby planet
            //find some very special types of resources only available through expeditions?
            //ambushed pirates -> detected them before getting detected/they are badly damaged/...
            //sudden powerful radiation is being emitted, making most of the crew sick, losing conciousness and quickly leading to death

            //bind the expedition results to tech tree? certain techs make certain outcomes more or less likely (or impossible)?//a booby trapped abandoned fleet - explosion
        }
        var result_text = expedition_results[result_type][Math.floor(Math.random() * expedition_results[result_type].length)];
        this.generate_report(fleet.owner, 'Expedition Result', result_text, await utils.get_timestamp());
        fleet.expedition_length_id = undefined;
    }

    async generate_report(username, title, content, timestamp) {
        var player_socket;
        //going through socket connections instead of players because a user can be on other pages than map, which means they won't be in the players array, but they still will be connected through a socket and should be informed of new reports
        this.server.sockets.sockets.forEach(socket => { if (socket.username == username) {player_socket = socket}});
        await this.dbManager.save_report(username, title, content, timestamp);
        if (player_socket !== undefined) {
            player_socket.emit('new_report');
        }
    }

    async get_player_so() {
        if (this.available_space_objects.length == 0) {
            if (this.no_space_systems < 6) {
                await this.generate_system();
                if (this.available_space_objects.length == 0) {
                    for (var i = 0; i < this.all_habitable_space_objects.length; i++) {
                        this.available_space_objects.push(this.all_habitable_space_objects[i]);
                    }
                }
            } else {
                for (var i = 0; i < this.all_habitable_space_objects.length; i++) {
                    this.available_space_objects.push(this.all_habitable_space_objects[i]);
                }
            }
        }
        return this.available_space_objects.shift();
    }


    async stop() {
		clearTimeout(this.logic_loop);
    }
}