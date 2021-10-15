"use strict"

var mysql = require('mysql');
var Utils = require('./../misc_modules/utils.js');
var utils = new Utils();
var all_resource_types = 'reserved_pop, metal, kerosene, hydrogen, uranium';
var resourceTable = all_resource_types.split(', ');
var buildings = require('./../game_properties/buildings.json');
var units = require('./../game_properties/units.json');
var technologies = require('./../game_properties/technologies.json');
var mysql_details = process.env.PORT !== undefined ? 
mysql_details = {
    host: "j5zntocs2dn6c3fj.chr7pe7iynqr.eu-west-1.rds.amazonaws.com",
    user: "hv1qumv215dhm0nr",
    password: "e24s6uzfv22r5xhm",
    port: 3306,
    database: "zhfo8br4txzxfhgn"
} : {
    host: "127.0.0.1",
    user: "root",
    password: "",
    port: 3306,
    database: "improvisationaldb"
};

module.exports = class DbManager {
    constructor() {
        //Credentials for connecting to the db 
        this.con = mysql.createConnection(mysql_details);
        this.con.connect( err => { if (err) throw err; });
    }

    async get_basic_player_map_info(username) {
        var query = 'SELECT space_object_id FROM players WHERE username = ?';
        return this.execute_query(query, [username]);
    }

    /**
     * 
     * @param {String} username
     * @param {Number} p_time_left The number of seconds that have passed since the mines upgrade has been finished. If defined, update building level doesn't get called, since it's assumed update building level function called
     * @param {Number} bld_level Level of the building (for now, is always assumed to be mines, since that's the only resource generating blding for now)
     * @param {Number} downgrade
     */
    async update_resource(username, p_time_left, bld_level, downgrade) {
        var timestamp = await utils.get_timestamp();
        var player_mines;
        var mines = buildings.find(b => b.building_id == 2);
        if (p_time_left === undefined) {
            player_mines = await this.get_player_building_details(username, 2, false);
            await this.update_building_level(username, 2, false);
        } else {
            player_mines = {update_start: 0, level: bld_level, downgrade: downgrade};
        }

        var query = `SELECT player_id, res_last_update AS last_update
        FROM players
        WHERE username = ?`;
        var player_details = (await this.execute_query(query, [username]))[0];

        var set_to = '';
        var mines_level_detail = mines.level_details.find(ld => ld.level == player_mines.level);
        var res_production = mines_level_detail.production;
        var resources = resourceTable;
        var generated_resources = [];
        if (player_mines.update_start !== null) {
            var upgrade_time = mines.level_details.find(ld => ld.level == (player_mines.level - player_mines.downgrade)).upgrade_time;
            var time_left = (p_time_left !== undefined ? p_time_left : (player_mines.update_start + upgrade_time - timestamp));
            if (time_left <= 0) {
                var time_passed = timestamp - player_details.last_update + time_left;
                for (var i = 0; i < resources.length; i++) {
                    generated_resources.push((res_production[resources[i]] === undefined ? 0 : res_production[resources[i]]) * (time_passed));
                }
                res_production = mines.level_details.find(ld => ld.level == (player_mines.downgrade == 0 ? player_mines.level + 1 : player_mines.level - 1)).production;
                player_details.last_update += time_passed;
            }
        }
        for (var i = 0; i < resources.length; i++) {
            if (res_production[resources[i]] !== undefined) {
            }
            set_to += resources[i] + ' = ' + resources[i] + ' + ' + ((generated_resources.length > 1 ? generated_resources[i] : 0) + (res_production[resources[i]] === undefined ? 0 : res_production[resources[i]]) * (timestamp - player_details.last_update)) + ' , ';
        }
        
        if (!Array.isArray(resources)) {
            resources = resources.split(', ');
        }
        
        set_to += 'res_last_update = ?';

        query = "UPDATE players SET " + set_to + " WHERE player_id = ?";
        await this.execute_query(query, [timestamp, player_details.player_id]);
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
            await this.update_resource(username);
        }

        var query = 'SELECT ' + resources + ' FROM players WHERE username = ?';
        return (await this.execute_query(query, [username]))[0];
    }

    async upgrade_building(username, p_building) {
        await this.update_resource(username);
        var b_index = buildings.findIndex(building => building.name == p_building);
        var building_id = buildings[b_index].building_id;
        await this.update_building_level(username, 'all');
        var query = `SELECT *
        FROM players
        WHERE username = ?`;
        var player_details = (await this.execute_query(query, [username]))[0];
        query = `SELECT pb.building_id, pb.update_start, pb.level
        FROM player_buildings pb
        INNER JOIN players p ON p.player_id = pb.player_id
        WHERE p.player_id = ?`;
        var p_buildings = await this.execute_query(query, [player_details.player_id]);
        var building_details = p_buildings.find(building => building.building_id == building_id);
        if (building_details === undefined) {
            building_details = {level: 0, update_start: null};
        }
        var l_index;
        if (buildings[b_index].level_details[building_details.level] == building_details.level) {
            l_index = building_details.level;
        } else {
            l_index = buildings[b_index].level_details.findIndex(level_detail => level_detail.level == building_details.level)
        }
        var bld_lvl_details = buildings[b_index].level_details[l_index];
        for (const req_bld_details in bld_lvl_details.req_buildings) {
            var building = buildings.find(building => building.building_id == bld_lvl_details.req_buildings[req_bld_details].building_id);
            if (building === undefined || building.level < bld_lvl_details.req_buildings[req_bld_details].level) {
                throw new Error('A required building is not high enough level');
            }
        }
        query = `UPDATE player_buildings pb 
            INNER JOIN players p ON p.player_id = pb.player_id
            SET `;
        for (const resource in bld_lvl_details.upgrade_cost) {
            if (resource == 'pop') {
                var pop_bld = buildings.find(building => building.building_id == 5);
                var p_pop_bld = p_buildings.find(p_building => p_building.building_id == pop_bld.building_id);
                var available_pop = pop_bld.level_details.find(lvl_detail => lvl_detail.level == (p_pop_bld.level - p_pop_bld.downgrade)).production.pop;
                if (player_details['reserved_' + resource] + bld_lvl_details.upgrade_cost[resource] > available_pop) {
                    throw new Error('Not enough resources to upgrade building');
                }
                query += `p.reserved_${resource} = p.reserved_${resource} + ${bld_lvl_details.upgrade_cost[resource]},`;
            } else {
                if (player_details[resource] < buildings[b_index].level_details[l_index].upgrade_cost[resource]) {
                    throw new Error('Not enough resources to upgrade building');
                }
                query += `p.${resource} = p.${resource} - ${bld_lvl_details.upgrade_cost[resource]}, `;
            }
        }
        query = query.substr(0, query.length - 1);
        query += `pb.update_start = UNIX_TIMESTAMP()
        WHERE p.player_id = ? AND pb.building_id = ? AND pb.update_start IS NULL`
        if (buildings[b_index].level_details[l_index + 1] === undefined) {
            throw new Error('Trying to update building past the max level');
        }
        if (building_details.update_start === null) {
            if (building_details.level == 0) {
                await this.execute_query('INSERT INTO player_buildings VALUES(?,?,0,NULL,0)', [player_details.player_id, building_id])
            }
            await this.execute_query(query, [player_details.player_id, building_id]);
        }
    }

    async cancel_building_update(username, p_building) {
        var b_index = buildings.findIndex(building => building.name == p_building);
        var building_id = buildings[b_index].building_id;
        await this.update_building_level(username, building_id);
        var query = `SELECT p.player_id, pb.level, pb.update_start, pb.downgrade
        FROM player_buildings pb
        INNER JOIN players p ON p.player_id = pb.player_id
        WHERE p.username = ? AND pb.building_id = ?`;
        var results = await this.execute_query(query, [username, building_id]);
        if (results.length < 1 || results[0].update_start === null) {
            return;
        }
        if (results[0].downgrade == 1) {
            query = `UPDATE player_buildings pb 
            INNER JOIN players p ON p.player_id = pb.player_id
            SET 
                pb.update_start = NULL,
                pb.downgrade = 0
                WHERE p.player_id = ? AND pb.building_id = ? AND pb.level > 0 AND pb.update_start IS NOT NULL AND pb.downgrade = 1`;
            await this.execute_query(query, [results[0].player_id, building_id, results[0].level]);
        } else {
            if (results[0].level == 0) {
                return this.execute_query('DELETE FROM player_buildings WHERE player_id = ? AND building_id = ?', [results[0].player_id, building_id]);
            }
            var l_index;
            if (buildings[b_index].level_details[results[0].level] == results[0].level) {
                l_index = results[0].level;
            } else {
                l_index = buildings[b_index].level_details.findIndex(level_detail => level_detail.level == results[0].level)
            }
            var bld_lvl_details = buildings[b_index].level_details[l_index];
            query = `UPDATE player_buildings pb 
            INNER JOIN players p ON p.player_id = pb.player_id
            SET `;

            for (const resource in bld_lvl_details.upgrade_cost) {
                if (resource == 'pop') {
                    var pop_bld = buildings.find(building => building.building_id == 5);
                    var p_pop_bld = p_buildings.find(p_building => p_building.building_id == pop_bld.building_id);
                    var available_pop = pop_bld.level_details.find(lvl_detail => lvl_detail.level == p_pop_bld.level).production.pop;
                    if (player_details['reserved_' + resource] + bld_lvl_details.upgrade_cost[resource] > available_pop) {
                        throw new Error('Not enough resources to upgrade building');
                    }
                    query += `p.reserved_${resource} = p.reserved_${resource} - ${bld_lvl_details.upgrade_cost[resource]},`;
                } else {
                    query += `p.${resource} = p.${resource} + ${bld_lvl_details.upgrade_cost[resource]}, `;
                }
            }
            query += `pb.update_start = NULL
            WHERE p.player_id = ? AND pb.building_id = ? AND pb.level = ? AND pb.update_start IS NOT NULL`;
            await this.execute_query(query, [results[0].player_id, building_id, results[0].level]);
        }
    }

    async downgrade_building(username, p_building) {
        var b_index = buildings.findIndex(building => building.name == p_building);
        var building_id = buildings[b_index].building_id;
        await this.update_building_level(username, building_id);
        var execute_query = true;
        if (building_id == 5) {
            var query = `SELECT *
            FROM players
            WHERE username = ?`;
            var player_details = (await this.execute_query(query, [username]))[0];
            query = `SELECT pb.level
            FROM player_buildings pb
            INNER JOIN players p ON p.player_id = pb.player_id
            WHERE p.player_id = ? AND pb.building_id = ?`;
            var p_building_details = (await this.execute_query(query, [player_details.player_id, building_id]))[0];
            var building_details = buildings.find(building => building.building_id == building_id);
            var ld_index = building_details.level_details.findIndex(lvl_details => lvl_details.level == p_building_details.level - 1);
            if (building_details.level_details[ld_index].production['pop'] < player_details['reserved_pop']) {
                execute_query = false;
            }
        }
        if (execute_query) {
            var query = `UPDATE player_buildings pb 
            INNER JOIN players p ON p.player_id = pb.player_id
            SET 
                pb.update_start = UNIX_TIMESTAMP(),
                pb.downgrade = 1
            WHERE p.username = ? AND pb.building_id = ? AND pb.update_start IS NULL`;
            await this.execute_query(query, [username, building_id]);
        }
    }

    /**
     * Returns result(s) in following format [{player_id, building_id, level, update_start(in UNIX timestamp), upgrade_time}, ..]
     * @param {String} username Username of the player
     * @param {String|Number} p_building Building name 'all' can be used to get all buildings from the player. Otherwise only 1 building id can be passed
     * @param {Boolean} update When set to false, the building does not get checked if it's getting upgraded and won't get it's level updated in db if it's done upgrading
     */
    async get_player_building_details(username, p_building, update = true) {
        if (update) {
            await this.update_building_level(username, p_building);
        }
        var building_id;
        var query = `SELECT pb.building_id, pb.level, pb.downgrade,
        pb.update_start AS update_start
        FROM player_buildings pb
        INNER JOIN players p ON p.player_id = pb.player_id
        WHERE p.username = ?`;
        if (p_building != 'all') {
            building_id = p_building;
            query += ' AND pb.building_id = ?';
        } else {
            query += ' ORDER BY pb.building_id ASC';
        }

        var results = await this.execute_query(query, [username, building_id]);
        if (p_building != 'all') {
            var player_building_details = results[0];
            if (results.length < 1) {
                player_building_details = {building_id: p_building, level: 0, downgrade: 0, update_start: null};
            }
            return player_building_details;
        }
        for (var i = 0; i < buildings.length; i++) {
            var building = results.find(result => result.building_id == buildings[i].building_id);
            if (building === undefined) {
                results.push({building_id: buildings[i].building_id, level: 0, downgrade: 0, update_start: null});
            }
        }
        return results;
    }

    /**
     * @param {String} username
     * @param {String|Number} p_building
     * @param {Boolean} update_resources If a building upgrade timer is up and the building affects resource production, update_resource function gets called
     */
    async update_building_level(username, p_building, update_resources = true) {
        var query = `SELECT p.player_id, pb.update_start AS update_start, pb.level, pb.building_id, pb.downgrade
            FROM player_buildings pb
            INNER JOIN players p ON p.player_id = pb.player_id
            WHERE p.username = ? AND pb.update_start IS NOT NULL`;
        if (p_building != 'all') {
            query += ' AND pb.building_id = ' + p_building;
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

            if (buildings[b_index].level_details[results[i].level - results[i].downgrade] == (results[i].level - results[i].downgrade)) {
                l_index = results[i].level;
            } else {
                l_index = buildings[b_index].level_details.findIndex(level_detail => level_detail.level == (results[i].level - results[i].downgrade));
            }

            var time_left = results[i].update_start + buildings[b_index].level_details[l_index].upgrade_time - await utils.get_timestamp();
            if (time_left <= 0) {
                if (buildings[b_index].building_id === 2 && update_resources) {
                    await this.update_resource(username, time_left, results[i].level, results[i].downgrade);
                }
                if (results[i].downgrade == 1) {
                    if (buildings[b_index].level_details[results[i].level] == (results[i].level)) {
                        l_index = results[i].level;
                    } else {
                        l_index = buildings[b_index].level_details.findIndex(level_detail => level_detail.level == (results[i].level));
                    }
    
                    if (buildings[b_index].level_details[l_index].upgrade_cost['pop'] !== undefined) {
                        var pop_query = `UPDATE players SET reserved_pop = reserved_pop - ${bld_lvl_details.upgrade_cost['pop']} WHERE player_id = ?`;
                        await this.execute_query(pop_query, [results[0].player_id]);
                    }
                }
                if (results[i].downgrade == 1 && results[i].level == 1) {
                    await this.execute_query('DELETE FROM player_buildings WHERE player_id = ? AND building_id = ?', [results[0].player_id, buildings[b_index].building_id]);
                } else {
                    query += results[i].building_id + ',';
                    execute_query = true;
                }
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

    async get_planet_datapack(username) {
        await this.update_resource(username);
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
        var new_reports_count =  await this.get_new_reports_count(username);
        return {resources: resources, buildings: building_details, units: unit_results, unit_ques: player_ques, building_details: building_results, new_reports_count: new_reports_count};
    }

    async build_units(username, p_units) {
        await this.update_building_level(username, 4, true);
        var player_resources = await this.get_resource(username, 'all', true);
        var p_units_building = await this.get_player_building_details(username, 4);
        var units_building_level_details = buildings.find(building => building.building_id == p_units_building.building_id).level_details
        var allowed_units = units_building_level_details.find(level_detail => level_detail.level == p_units_building.level).units;
        var updated_player_resources = Object.assign({}, player_resources);
        var query = 'UPDATE players SET ';
        for (var i = 0; i < p_units.length; i++) {
            var u_index = units.findIndex(unit => unit.unit_id == p_units[i].unit_id);
            for (var resource in units[u_index].cost) {
                if (updated_player_resources[resource] >= units[u_index].cost[resource] * p_units[i].count) {
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

    //certain information is being saved (e.g. fleets, space objects, etc.) in a file. This is however being saved only every x minutes. In case the server shut downs or something happens to the data, everything that happens before the last save will be rolled back. However, since reports are being saved on the db (since keeping them in RAM makes no sense), they are permanently saved immediately. Which can result in players keeping reports of actions that have been reverted and therefore haven't happened.
    async save_report(username, title, content, timestamp) {
        var query = `SELECT player_id 
        FROM players
        WHERE username = ?`;
        var player_id = (await this.execute_query(query, [username]))[0].player_id;

        var query = `INSERT INTO player_reports
        VALUES (?,UUID(),?,?,0,0,?)`;
        return this.execute_query(query, [player_id, title, content, timestamp]);
    }

    async get_new_reports_count(username) {
        var query = `SELECT COUNT(pr.player_id) AS not_displayed_report_count
        FROM player_reports pr
        INNER JOIN players p ON p.player_id = pr.player_id
        WHERE p.username = ? && pr.gotDisplayed = 0`;
        return ((await this.execute_query(query, [username]))[0].not_displayed_report_count);
    }

    async get_report_datapack(username) {
        var query = `SELECT report_id, title, isRead, gotDisplayed, timestamp
        FROM player_reports pr
        INNER JOIN players p ON p.player_id = pr.player_id
        WHERE p.username = ?
        ORDER BY pr.timestamp DESC
        LIMIT 25`;
        var newest_reports = await this.execute_query(query, [username][0]);
        var new_reports_count =  await this.get_new_reports_count(username);
        return {reports: newest_reports, new_reports_count: new_reports_count};
    }

    async get_report_details(report_id) {
        var query = `SELECT report_id, title, text, timestamp
        FROM player_reports
        WHERE report_id = ?`;
        return ((await this.execute_query(query, [report_id]))[0]);
    }

    async mark_reports_displayed(username, timestamp) {
        var query = `UPDATE player_reports pr
        INNER JOIN players p ON p.player_id = pr.player_id
        SET gotDisplayed = 1
        WHERE p.username = ? AND pr.gotDisplayed = 0 AND pr.timestamp <= ?`;
        return this.execute_query(query, [username, timestamp]);
    }

    async mark_report_displayed(report_id) {
        var query = `UPDATE player_reports
        SET isRead = 1
        WHERE report_id = ?`;
        return this.execute_query(query, [report_id]);
    }

    async get_research_datapack(username) {
        var new_reports_count =  await this.get_new_reports_count(username);
        var research_details = await this.get_research_details(username, true);
        return {new_reports_count: new_reports_count, technologies: technologies, research_details: research_details};
    }

    async get_research_details(username, update = false) {
        if (update) {
            await this.update_research(username);
        }
        var query = `SELECT research
        FROM players
        WHERE username = ?`;
        return JSON.parse((await this.execute_query(query, [username]))[0].research);
    }

    async get_researched_techs(username, update = false) {
        return (await this.get_research_details(username, update)).researched_techs;
    }

    async research_technology(username, tech_id) {
        var start_timestamp = await utils.get_timestamp();
        //invalid tech id check
        var tech_index;
        for (var i = 0; i < technologies.length; i++) {
            if (technologies[i].technology_id == tech_id) {
                tech_index = i;
                break;
            }
        }
        if (tech_index === undefined) {
            return false;
        }
        //already researched check
        var query = `SELECT researched_techs
        FROM players
        WHERE username = ?`;
        var research_details = await this.get_research_details(username, true);
        var researched_techs = research_details.researched_techs;
        var valid_tech_id = true;
        for (var i = 0; i < researched_techs.length; i++) {
            if (researched_techs[i] == tech_id || research_details.inResearch !== undefined) {
                valid_tech_id = false;
            }
        }
        if (!valid_tech_id) {
            return false;
        }

        //resource check/update
        var query = 'UPDATE players SET ';
        var player_resources = await this.get_resource(username, 'all', true);
        for (var resource in technologies[tech_index].cost) {
            if (player_resources[resource] < technologies[tech_index].cost[resource]) {
                return false;
            } else {
                query += `${resource} = ${resource} - ${technologies[tech_index].cost[resource]}, `;
            }
        }
        query = query.slice(0, query.length - 2) + ' WHERE username = ?';
        await this.execute_query(query, [username]);
        
        research_details.inResearch = tech_id;
        research_details.start_timestamp = start_timestamp;
        query = `UPDATE players
        SET research = ?
        WHERE username = ?`;
        await this.execute_query(query, [JSON.stringify(research_details), username]);
        return true;
    }

    async update_research(username) {
        var research_details = await this.get_research_details(username);
        if (research_details.inResearch !== undefined) {
            var research_time = technologies.find(tech => tech.technology_id == research_details.inResearch).research_time;
            if (await utils.get_timestamp() >= research_details.start_timestamp + research_time) {
                research_details.researched_techs.push(research_details.inResearch);
                delete research_details.inResearch;
                delete research_details.start_timestamp;
                var query = `UPDATE players
                SET research = ?
                WHERE username = ?`;
                return this.execute_query(query, [JSON.stringify(research_details), username]);
            }
        }
    }

    async get_player_count() {
        var query = `SELECT COUNT(player_id) AS player_count
        FROM players`;
        return ((await this.execute_query(query))[0].player_count);
    }

    async add_resource(username, resource, amount) {
        var query = `UPDATE players SET ${resourace} = ${resource} + ${amount} WHERE username = ${username}`;
        return this.execute_query(query);
    }
}