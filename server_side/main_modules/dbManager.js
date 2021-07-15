"use strict"

var mysql = require('mysql');
var Utils = require('./../misc_modules/utils.js');
var utils = new Utils();
var all_resource_types = 'pop, food, timber, metals, coal, oil, kerosene, hydrogen, uranium';
var resourceTable = all_resource_types.split(', ');
var buildings = require('./../game_properties/buildings.json');
var units = require('./../game_properties/units.json');

module.exports = class DbManager {
    constructor() {
        //Credentials for connecting to the db 
        this.con = mysql.createConnection({
            host: "localhost",
            user: "root",
            password: null,
            port: 3308,
            database: "improvisationalDB"
        });
        this.con.connect( err => { if (err) throw err; });
    }

    async get_basic_player_map_info(username) {
        var query = 'SELECT space_object_id FROM players WHERE username = ?';
        return this.execute_query(query, [username]);
    }

    /**
     * 
     * @param {String} username 
     * @param {String|Array} p_resources Accepts in following formats: 'resource, resource, ..' OR [resource, resource, ..]
     * @param {Number} amount
     */
    async update_resource(username, p_resources, amount = 0) {
        var resource_generator = buildings.find(b => b.building_id == 2);
        await this.update_building_level(username, resource_generator.building_id);
        var query = `SELECT p.player_id, p.res_last_update AS last_update, pb.level
        FROM player_buildings pb
        INNER JOIN players p ON p.player_id = pb.player_id
        WHERE p.username = ? AND pb.building_id = ?`;
        var results = await this.execute_query(query, [username, resource_generator.building_id]);
        var res_production = resource_generator.level_details.find(ld => ld.level == results[0].level).production;
        var resources = p_resources == 'all' ? resourceTable : p_resources;
        var set_to = '';
        
        if (!Array.isArray(resources)) {
            resources = resources.split(', ');
        }
        
        for (var i = 0; i < resources.length; i++) {
            set_to += resources[i] + ' = ' + resources[i] + ' + ' + ((res_production[resources[i]] === undefined ? 0 : res_production[resources[i]]) * (await utils.get_timestamp() - results[0].last_update) + amount) + ' , ';
        }
        set_to += 'res_last_update = UNIX_TIMESTAMP()';

        var query = "UPDATE players SET " + set_to + " WHERE player_id = ?";
        return this.execute_query(query, [results[0].player_id]);
    }

    /**
     * @param {String} username Player's username
     * @param {String} p_resource Can be exact resource or use 'all' to get all resource values
     * @param {Boolean} update Default value is false. If true, will update the resource values with produced resources and then return the resource values
     * returns in {resource: amount, ..} format
     */
    async get_resource(username, p_resource, update = false) {
        var resources = p_resource == 'all' ? all_resource_types : p_resource;
        if (update) {
            await this.update_resource(username, p_resource);
        }

        var query = 'SELECT ' + resources + ' FROM players WHERE username = ?';
        return (await this.execute_query(query, [username]))[0];
    }

    async upgrade_building(username, p_building) {
        await this.update_resource(username, 'all');
        await this.update_building_level(username, p_building);
        var b_index = buildings.findIndex(building => building.name == p_building);
        var query = `SELECT p.*, pb.update_start, pb.level
        FROM player_buildings pb
        INNER JOIN players p ON p.player_id = pb.player_id
        WHERE p.username = ? AND pb.building_id = ?`;
        var results = await this.execute_query(query, [username, buildings[b_index].building_id]);
        if (results.length < 1) {
            return;
        }
        var l_index;
        if (buildings[b_index].level_details[results[0].level] == results[0].level) {
            l_index = results[0].level;
        } else {
            l_index = buildings[b_index].level_details.findIndex(level_detail => level_detail.level == results[0].level)
        }

        query = `UPDATE player_buildings pb 
            INNER JOIN players p ON p.player_id = pb.player_id
            SET `;
        for (const resource in buildings[b_index].level_details[l_index].upgrade_cost) {
            if (results[0][resource] < buildings[b_index].level_details[l_index].upgrade_cost[resource]) {
                throw new Error('Not enough resources to upgrade building');
            }
            if (buildings[b_index].level_details[l_index + 1] === undefined) {
                throw new Error('Trying to update building past the max level');
            }
            query += `p.${resource} = p.${resource} - ${buildings[b_index].level_details[l_index].upgrade_cost[resource]}, 
            pb.update_start = UNIX_TIMESTAMP()
            WHERE p.player_id = ? AND pb.building_id = ? AND pb.update_start IS NULL`;
        }
        if (results[0].update_start === null) {
            await this.execute_query(query, [results[0].player_id, buildings[b_index].building_id]);
        }
    }

    async cancel_building_update(username, p_building) {
        await this.update_building_level(username, p_building);
        var b_index = buildings.findIndex(building => building.name == p_building);
        var query = `SELECT p.player_id, pb.level, pb.update_start, pb.downgrade
        FROM player_buildings pb
        INNER JOIN players p ON p.player_id = pb.player_id
        WHERE p.username = ? AND pb.building_id = ?`;
        var results = await this.execute_query(query, [username, buildings[b_index].building_id]);
        if (results.length < 1 || results[0].update_start === null) {
            return;
        }
        if (results[0].downgrade) {
            query = `UPDATE player_buildings pb 
            INNER JOIN players p ON p.player_id = pb.player_id
            SET 
                pb.update_start = NULL,
                pb.downgrade = 0
                WHERE p.player_id = ? AND pb.building_id = ? AND pb.level > 0 AND pb.update_start IS NOT NULL AND pb.downgrade = 1`;
            await this.execute_query(query, [results[0].player_id, buildings[b_index].building_id, results[0].level]);
        } else {
            var l_index;
            if (buildings[b_index].level_details[results[0].level] == results[0].level) {
                l_index = results[0].level;
            } else {
                l_index = buildings[b_index].level_details.findIndex(level_detail => level_detail.level == results[0].level)
            }
            query = `UPDATE player_buildings pb 
            INNER JOIN players p ON p.player_id = pb.player_id
            SET `;

            for (const resource in buildings[b_index].level_details[l_index].upgrade_cost) {
                query += `p.${resource} = p.${resource} + ${buildings[b_index].level_details[l_index].upgrade_cost[resource]}, `;
            }
            query += `pb.update_start = NULL
            WHERE p.player_id = ? AND pb.building_id = ? AND pb.level = ? AND pb.update_start IS NOT NULL`;
            await this.execute_query(query, [results[0].player_id, buildings[b_index].building_id, results[0].level]);
        }
    }

    async downgrade_building(username, p_building) {
        await this.update_building_level(username, p_building);
        var b_index = buildings.findIndex(building => building.name == p_building);
        var query = `UPDATE player_buildings pb 
        INNER JOIN players p ON p.player_id = pb.player_id
        SET 
            pb.update_start = UNIX_TIMESTAMP(),
            pb.downgrade = 1
        WHERE p.username = ? AND pb.building_id = ? AND pb.level > 0 AND pb.update_start IS NULL`;
        await this.execute_query(query, [username, buildings[b_index].building_id]);
    }

    /**
     * Returns result(s) in following format [{player_id, building_id, level, update_start(in UNIX timestamp), upgrade_time}, ..]
     * @param {String} username Username of the player
     * @param {String} p_building Building name 'all' can be used to get all buildings from the player. Otherwise only 1 building can be passed
     */
    async get_player_building_details(username, p_building, passingId = false) {
        await this.update_building_level(username, p_building);
        var building_id;
        var query = `SELECT pb.player_id, pb.building_id, pb.level, pb.downgrade,
        pb.update_start AS update_start
        FROM player_buildings pb
        INNER JOIN players p ON p.player_id = pb.player_id
        WHERE p.username = ?`;
        if (p_building != 'all') {
            if (passingId) {
                building_id = p_building;
            } else {
                building_id = buildings.find(building => building.name == p_building).building_id;
            }
            query += ' AND pb.building_id = ?';
        }

        var results = await this.execute_query(query, [username, building_id]);
        if (p_building != 'all') {
            return results[0];
        }
        return results;
    }

    async update_building_level(username, p_building, passingId = false) {
        var query = `SELECT p.player_id, pb.update_start AS update_start, pb.level, pb.building_id, pb.downgrade
            FROM player_buildings pb
            INNER JOIN players p ON p.player_id = pb.player_id
            WHERE p.username = ? AND pb.update_start IS NOT NULL`;
        if (p_building != 'all') {
            if (passingId) {
                query += ' AND pb.building_id = ' + p_building;
            } else {
                var b_index = buildings.findIndex(building => building.name == p_building);
                query += ' AND pb.building_id = ' + (b_index + 1);
            }
        }
        var results = await this.execute_query(query, [username]);
        if (results.length < 1) {
            return;
        }
        var execute_query = false;
        var query = `UPDATE player_buildings pb
        INNER JOIN players p ON p.player_id = pb.player_id
            SET 
            pb.level = IF (pb.downgrade = 0, pb.level + 1, pb.level - 1),
            pb.update_start = NULL,
            pb.downgrade = 0
        WHERE p.player_id = ? AND pb.building_id IN (`;
        for (var i = 0; i < results.length; i++) {
            var b_index;
            var l_index;
            if (buildings[results[i].building_id - 1].building_id == results[i].building_id) {
                b_index = results[i].building_id - 1;
            } else {
                b_index = buildings.findIndex(building => building.building_id == results[i].building_id);
            }

            if (buildings[b_index].level_details[results[i].level] == (results[i].level - results[i].downgrade)) {
                l_index = results[i].level;
            } else {
                l_index = buildings[b_index].level_details.findIndex(level_detail => level_detail.level == (results[i].level - results[i].downgrade));
            }
            if ((await utils.get_timestamp() - results[i].update_start - buildings[b_index].level_details[l_index].upgrade_time) >= 0) {
                query += results[i].building_id + ',';
                execute_query = true;
            }
        }
        
        if (execute_query) {
            query = query.slice(0, query.length - 1);
            query += ')';
            await this.execute_query(query, [results[0].player_id]);
        }
    }

    /**
     * Returns results in following format [{building_id, name, level_details: [{level, upgrade_time, wood_cost, dirt_cost, iron_cost, pop_cost}, upgrade time, ..]}, ..]
     * @param {Array} p_buildings in format [{building_id, level}]. Level can be an array of levels.
     */
    async get_building_details(p_buildings) {
        var building_details = [];
        var b_index = -1;
        for (var i = 0; i < p_buildings.length; i++) {
            if (!Array.isArray(p_buildings[i].level)) {
                p_buildings[i].level = [p_buildings[i].level];
            }

            //Buildings are stored in an array. If they are stored storted by building_id, then building with id 1 should be stored at the index 0, id 2 at the index 1, ..
            if (buildings[p_buildings[i].building_id - 1].building_id == p_buildings[i].building_id) {
                b_index = p_buildings[i].building_id - 1;
            } else {
                b_index = buildings.findIndex(building => building.building_id == p_buildings[i].building_id);
            }
            building_details.push({building_id: buildings[b_index].building_id, name: buildings[b_index].name, level_details: []});
            for (var j = 0; j < p_buildings[i].level.length; j++) {
                var l_index = buildings[b_index].level_details.findIndex(level_detail => level_detail.level == p_buildings[i].level[j]);
                if (l_index != -1) {
                    building_details[i].level_details.push(buildings[b_index].level_details[l_index]);
                }
            }
        }
        return(building_details);
    }

    /**
     * Returns results in following format [{unit_id, name, cost, build_time}, ..]
     * @param {Array} p_units in format [{unit_id}]
     */
    async get_unit_details(p_units) {
        if (p_units == 'all') {
            return units;
        }
        var unit_details = [];
        var u_index = -1;
        for (var i = 0; i < p_units.length; i++) {
            //Units are stored in an array. If they are stored storted by unit_id, then unit with id 1 should be stored at the index 0, id 2 at the index 1, ..
            if (units[p_units[i].unit_id - 1].unit_id == p_units[i].unit_id) {
                u_index = p_units[i].unit_id - 1;
            } else {
                u_index = units.findIndex(unit => unit.unit_id == p_units[i].unit_id);
            }
            unit_details.push(units[u_index]);
        }
        return(unit_details);
    }

    /**
     * Returns results in following format [{player_id, unit_id, count]}, ..]
     * @param {string} username username of the user the data is supposed to be loaded for
     * @param {string} p_unit Either a singular unit to get the data for or all of the unit data for the selected user
     */
    async get_player_units(username, p_unit) {
        var query = `SELECT pu.* 
        FROM player_units pu
        INNER JOIN players p ON p.player_id = pu.player_id
        WHERE p.username = ?`;
        if (p_unit != 'all') {
            var u_index = units.findIndex(unit => unit.name == p_unit);
            query += ' AND pu.unit_id = ' + (u_index + 1);
        }
        return this.execute_query(query, [username]);
    }

    async update_player_unit_que(username) {
        var player_unit_ques = await this.get_player_unit_ques(username, 'all');
        for (var i = 0; i < player_unit_ques.length; i++) {
            if (player_unit_ques[i].count == 0) {
                continue;
            }
            var timestamp = await utils.get_timestamp();
            var unit_build_time = units.find(unit => unit.unit_id == player_unit_ques[i].unit_id).build_time;
            var created_units = Math.min(Math.floor((timestamp - player_unit_ques[i].calculated_timestamp) / unit_build_time), player_unit_ques[i].count);
            if (created_units < 1) {
                continue;
            }
            var updated_count = player_unit_ques[i].count - created_units;
            var time_remainder = updated_count < 1 ? 0 : (timestamp - player_unit_ques[i].calculated_timestamp) % unit_build_time;
            
            var query = `UPDATE player_unit_ques puq
            INNER JOIN players p ON p.player_id = puq.player_id
            SET 
                puq.count = ?,
                puq.calculated_timestamp = ?
            WHERE p.username = ? AND puq.unit_id = ?`;

            await this.execute_query(query, [updated_count, timestamp - time_remainder, username, player_unit_ques[i].unit_id]);
            query = `UPDATE player_units pu
            INNER JOIN players p ON p.player_id = pu.player_id
            SET pu.count = pu.count + ?
            WHERE p.username = ? AND pu.unit_id = ?`;
            return this.execute_query(query, [created_units, username, player_unit_ques[i].unit_id]);
        }
    }

    async get_player_unit_ques(username, p_unit) {
        var query = `SELECT puq.unit_id, puq.count, puq.calculated_timestamp AS calculated_timestamp
        FROM player_unit_ques puq
        INNER JOIN players p ON p.player_id = puq.player_id
        WHERE p.username = ?`;
        if (p_unit != 'all') {
            var u_index = units.findIndex(unit => unit.name == p_unit);
            query += ' AND puq.unit_id = ' + (u_index + 1);
        }
        return this.execute_query(query, [username]);
    }

    async assemble_fleet(username) {
        var player_planet = this.space_objects[1];
        var system_center_object = this.space_objects[0];
        var rads = await utils.angleToRad(player_planet.rot);
        var [origin_x, origin_y] = [player_planet.x, player_planet.y];
        var [center_x, center_y] = [system_center_object.x, system_center_object.y];
        var object_x = center_x + (origin_x - center_x) * Math.cos(rads) - (origin_y - center_y) * Math.sin(rads);
        var object_y = center_y + (origin_x - center_x) * Math.sin(rads) + (origin_y - center_y) * Math.cos(rads);

        var query = `UPDATE player_fleets pf
            INNER JOIN players p ON p.player_id = pf.player_id
            SET pf.x = ?, pf.y = ?, pf.acceleration = 0.03, pf.velocity_x = 0, pf.velocity_y = 0, move_x = NULL, move_y = NULL, pf.destroyed = 0
            WHERE p.username = ? AND pf.fleet_id = 1`;
        await this.execute_query(query, [object_x, object_y, username]);
        return {x: object_x, y: object_y, acceleration: 0.03, velocity_x: 0, velocity_y: 0};
    }

    async set_movepoint(username, x, y) {
        var query = `SELECT pf.destroyed
            FROM player_fleets pf
            INNER JOIN players p ON p.player_id = pf.player_id
            WHERE p.username = ? AND pf.fleet_id = 1`;
        var results = await this.execute_query(query, [username]);
        if (!results[0].destroyed) {
            //this is to prevent the move_point x and y being 0, which would result in an error when normalizing the point's vector (client or server side)
            if (x == 0) {
                x++;
            }
            var query = `UPDATE player_fleets pf
                INNER JOIN players p ON p.player_id = pf.player_id
                SET move_x = ?, move_y = ?
                WHERE p.username = ? AND pf.fleet_id = 1`;
            await this.execute_query(query, [x, y, username]);
            return {x:x, y:y};
        }
    }

    async execute_query(query, argumentArr) {
        return new Promise( async function ( resolve, reject ) {
            this.con.query(query, argumentArr, async function(err, results) {
                if (err) { 
                    reject(err);
                };
                resolve(results);
            });
        }.bind(this));
    }

    async get_starter_datapack(username) {
        await this.update_resource(username, 'all');
        await this.update_building_level(username, 'all');
        await this.update_player_unit_que(username, 'all');
        var resources = await this.get_resource(username, 'all');
        var building_details = await this.get_player_building_details(username, 'all');
        for (var i = 0; i < building_details.length; i++) {
            building_details[i].curr_level = building_details[i].level;
            building_details[i].level = [building_details[i].level - 1, building_details[i].level, building_details[i].level + 1];
        }
        var player_units = await this.get_player_units(username, 'all');
        var player_ques = await this.get_player_unit_ques(username, 'all');
        var building_results = await this.get_building_details(building_details);
        var unit_results = JSON.parse(JSON.stringify(await this.get_unit_details(player_units)));
        for (var i = 0; i < unit_results.length; i++) {
            unit_results[i].count = player_units[i].count;
        }
        return {resources: resources, buildings: building_details, units: unit_results, unit_ques: player_ques, building_details: building_results};
    }

    async build_units(username, p_units) {
        await this.update_building_level(username, 4, true);
        var player_resources = await this.get_resource(username, 'all', true);
        var p_units_building = await this.get_player_building_details(username, 4, true);
        var units_building_level_details = buildings.find(building => building.building_id == p_units_building.building_id).level_details
        var allowed_units = units_building_level_details.find(level_detail => level_detail.level == p_units_building.level).units;
        var updated_player_resources = Object.assign({}, player_resources);
        var query = 'UPDATE players SET ';
        for (var i = 0; i < p_units.length; i++) {
            var u_index = units.findIndex(unit => unit.unit_id == p_units[i].unit_id);
            for (var resource in units[u_index].cost) {
                if (updated_player_resources[resource] > units[u_index].cost[resource] * p_units[i].count) {
                    if (p_units[i].count > 0 && allowed_units.includes(parseInt(p_units[i].unit_id))) {
                        updated_player_resources[resource] -= units[u_index].cost[resource] * p_units[i].count;
                    } else {
                        p_units.splice(i, 1);
                    }
                } else {
                    reject('Not enough resources to build all units');
                    return;
                }
            }
        }
        if (p_units.length < 1) {
            reject('Invalid units input received');
            return;
        }
        //Currently expecting units to cost at least 1 of every mentioned resource
        //If you want to implement free unit or just add cost of 0 for certain resource, will need to change this part of the code
        //to not execute the query when the units_cost never exceeded 0
        for (var resource in player_resources) {
            var units_cost = player_resources[resource] - updated_player_resources[resource];
            if (units_cost > 0) {
                query += `${resource} = ${resource} - ${units_cost}, `;
            }
        }

        await this.update_player_unit_que(username);
        //remove the ", " part
        query = query.slice(0, query.length - 2) + ' WHERE username = ?';
        await this.execute_query(query, [username]);
        var promises = [];
        for (var i = 0; i < p_units.length; i++) {
            query = `UPDATE player_unit_ques puq
            INNER JOIN players p ON p.player_id = puq.player_id
            SET puq.count = puq.count + ?, puq.calculated_timestamp = IF (puq.count = 0, UNIX_TIMESTAMP(), puq.calculated_timestamp)
            WHERE p.username = ? AND puq.unit_id = ?`;
            promises.push(this.execute_query(query, [p_units[i].count, username, p_units[i].unit_id]));
        }
        await Promise.all(promises);
    }
}