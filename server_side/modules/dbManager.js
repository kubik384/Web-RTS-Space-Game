"use strict"

var mysql = require('mysql');
var all_resource_types = 'pop, food, timber, metals, coal, oil, kerosene, hydrogen, uranium';
var resourceTable = all_resource_types.split(', ');
var buildings = require('./../game_properties/buildings.json');
var space_objects = require('./../game_properties/space_objects.json');

class DbManager {
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

    /**
     * 
     * @param {String} username 
     * @param {String|Array} p_resources Accepts in following formats: 'resource, resource, ..' OR [resource, resource, ..]
     * @param {Number} amount
     */
    update_resource(username, p_resources, amount = 0) {
        return new Promise((resolve,reject) => {
            var resource_generator = buildings.find(b => b.name == 'resource_generator');
            this.update_building_level(username, resource_generator.building_id).then(() => {
                var query = `SELECT p.player_id, UNIX_TIMESTAMP(p.res_last_update) AS last_update, pb.level
                FROM player_buildings pb
                INNER JOIN players p ON p.player_id = pb.player_id
                WHERE p.username = ? AND pb.building_id = ?`;
                this.con.query(query, [username, resource_generator.building_id], function (err, results) {
                    if (err) reject(err);

                    var res_production = resource_generator.level_details.find(ld => ld.level == results[0].level).production;
                    var resources = p_resources == 'all' ? resourceTable : p_resources;
                    var set_to = '';
                    
                    if (!Array.isArray(resources)) {
                        resources = resources.split(', ');
                    }
                    
                    for (var i = 0; i < resources.length; i++) {
                        set_to += resources[i] + ' = ' + resources[i] + ' + ' + ((res_production[resources[i]] === undefined ? 0 : res_production[resources[i]]) * (Math.floor(Date.now()/1000) - results[0].last_update) + amount) + ' , ';
                    }
                    set_to += 'res_last_update = NOW()';

                    var query = "UPDATE players SET " + set_to + " WHERE player_id = ?";
                    this.con.query(query, [results[0].player_id], function (err) {
                        if (err) reject(err);
                        resolve();
                    });
                }.bind(this));
            });
        });
    }

    /**
     * @param {String} username Player's username
     * @param {String} p_resource Can be exact resource or use 'all' to get all resource values
     * @param {Boolean} update Default value is false. If true, will update the resource values with produced resources and then return the resource values
     */
    get_resource(username, p_resource, update = false) {
        return new Promise((resolve,reject) => {
            var resources = p_resource == 'all' ? all_resource_types : p_resource;
            if (update) {
                this.update_resource(username, p_resource);
            }

            var query = 'SELECT ' + resources + ' FROM players WHERE username = ?';

            this.con.query(query, [username], function (err, results) {
                if (err) reject(err);
                resolve(results);
            });
        });
    }

    upgrade_building(username, p_building) {
        return new Promise((resolve,reject) => {
            this.update_resource(username, 'all').then(function() {
                this.update_building_level(username, p_building).then(function() {
                    var b_index = buildings.findIndex(building => building.name == p_building);
                    var query = `SELECT p.*, pb.update_start, pb.level
                    FROM player_buildings pb
                    INNER JOIN players p ON p.player_id = pb.player_id
                    WHERE p.username = ? AND pb.building_id = ?`;
                    this.con.query(query, [username, buildings[b_index].building_id], function (err, results) {
                        if (err) reject(err);
                        if (results.length > 0) {
                            var l_index;
                            if (buildings[b_index].level_details[results[0].level] == results[0].level) {
                                l_index = results[0].level;
                            } else {
                                l_index = buildings[b_index].level_details.findIndex(level_detail => level_detail.level == results[0].level)
                            }
                            query = `UPDATE player_buildings pb 
                                INNER JOIN players p ON p.player_id = pb.player_id
                                SET `;
                            var sufficient_resources = true;
                            for (const resource in buildings[b_index].level_details[l_index].upgrade_cost) {
                                if (results[0][resource] < buildings[b_index].level_details[l_index].upgrade_cost[resource]) {
                                    sufficient_resources = false;
                                    break;
                                } else {
                                    query += `p.${resource} = p.${resource} - ${buildings[b_index].level_details[l_index].upgrade_cost[resource]}, `
                                }
                                query += `pb.update_start = NOW()
                                WHERE p.player_id = ? AND pb.building_id = ? AND pb.update_start IS NULL`;
                            }
                            if (sufficient_resources && results[0].update_start === null) {
                                this.con.query(query, [results[0].player_id, buildings[b_index].building_id], function (err) {
                                    if (err) reject(err);
                                    resolve();
                                });
                            }
                        }
                    }.bind(this));
                }.bind(this));
            }.bind(this));
        });
    }

    cancel_building_update(username, p_building) {
        return new Promise((resolve,reject) => {
            this.update_building_level(username, p_building).then(function() {
                var b_index = buildings.findIndex(building => building.name == p_building);
                var query = `SELECT p.player_id, pb.level, pb.update_start, pb.downgrade
                FROM player_buildings pb
                INNER JOIN players p ON p.player_id = pb.player_id
                WHERE p.username = ? AND pb.building_id = ?`;
                this.con.query(query, [username, buildings[b_index].building_id], function (err, results) {
                    if (err) reject(err);
                    if (results.length > 0) {
                        if (results[0].update_start !== null) {
                            if (results[0].downgrade) {
                                query = `UPDATE player_buildings pb 
                                INNER JOIN players p ON p.player_id = pb.player_id
                                SET 
                                    pb.update_start = NULL,
                                    pb.downgrade = 0
                                    WHERE p.player_id = ? AND pb.building_id = ? AND pb.level > 0 AND pb.update_start IS NOT NULL AND pb.downgrade = 1`;
                                this.con.query(query, [results[0].player_id, buildings[b_index].building_id, results[0].level], function (err) {
                                    if (err) reject(err);
                                    resolve();
                                });
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
                                this.con.query(query, [results[0].player_id, buildings[b_index].building_id, results[0].level], function (err) {
                                    if (err) reject(err);
                                    resolve();
                                });
                            }
                        }
                    }
                }.bind(this));
            }.bind(this));
        });
    }

    downgrade_building(username, p_building) {
        return new Promise((resolve,reject) => {
            this.update_building_level(username, p_building).then(function() {
                var b_index = buildings.findIndex(building => building.name == p_building);
                var query = `UPDATE player_buildings pb 
                INNER JOIN players p ON p.player_id = pb.player_id
                SET 
                    pb.update_start = NOW(),
                    pb.downgrade = 1
                WHERE p.username = ? AND pb.building_id = ? AND pb.level > 0 AND pb.update_start IS NULL`;
                this.con.query(query, [username, buildings[b_index].building_id], function (err) {
                    if (err) reject(err);
                    resolve();
                });
            }.bind(this));
        });
    }

    /**
     * Returns result(s) in following format [{player_id, building_id, level, update_start(in UNIX timestamp), upgrade_time}, ..]
     * @param {String} username Username of the player
     * @param {String} p_building Building name 'all' can be used to get all buildings from the player
     */
    get_player_building_details(username, p_building, hide_player_id = false) {
        return new Promise((resolve,reject) => {
            this.update_building_level(username, p_building).then(function () {
                var building_id;
                var query = hide_player_id ? 'SELECT ' : 'SELECT pb.player_id, '
                query += `pb.building_id, pb.level, pb.downgrade,
                UNIX_TIMESTAMP(pb.update_start) AS update_start
                FROM player_buildings pb
                INNER JOIN players p ON p.player_id = pb.player_id
                WHERE p.username = ?`;
                if (p_building != 'all') {
                    building_id = buildings.find(building => building.name == p_building).building_id;
                    query += ' AND pb.building_id = ?';
                }
                this.con.query(query, [username, building_id], function (err, results) {
                    if (err) reject(err);
                    resolve(results);
                });
            }.bind(this));
        });
    }

    update_building_level(username, p_building) {
        return new Promise((resolve,reject) => {
            var query = `SELECT p.player_id, UNIX_TIMESTAMP(pb.update_start) AS update_start, pb.level, pb.building_id, pb.downgrade
                FROM player_buildings pb
                INNER JOIN players p ON p.player_id = pb.player_id
                WHERE p.username = ? AND pb.update_start IS NOT NULL`;
            if (p_building != 'all') {
                var b_index = buildings.findIndex(building => building.name == p_building);
                query += ' AND pb.building_id = ' + (b_index + 1);
            }
            this.con.query(query, [username], function (err, results) {
                if (err) reject(err);
                if (results.length > 0) {
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
                        if ((Math.floor(Date.now() / 1000) - results[i].update_start - buildings[b_index].level_details[l_index].upgrade_time) > 0) {
                            query += results[i].building_id + ',';
                            execute_query = true;
                        }
                    }
                    if (execute_query) {
                        query = query.slice(0, query.length - 1);
                        query += ')';
                        this.con.query(query, [results[0].player_id], function (err) {
                            if (err) reject(err);
                            resolve();
                        });
                    }
                }
                resolve();
            }.bind(this));
        });
    }

    /**
     * Returns results in following format [{building_id, name, level_details: [{level, upgrade_time, wood_cost, dirt_cost, iron_cost, pop_cost}]}, ..]
     * @param {Array} p_buildings in format [{building_id, level}]. Level can be an array of levels.
     */
    get_building_details(p_buildings) {
        return new Promise((resolve) => {
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
            resolve(building_details);
        });
    }

    //pso - player space objects
    get_pso_details(username, p_space_object_id, hide_player_id = false) {
        return new Promise((resolve,reject) => {
            var space_object_id;
            var query = hide_player_id ? 'SELECT ' : 'SELECT pso.player_id, '
            query += `pso.space_object_id, pso.x, pso.y, pso.rot, pso.width, pso.height
            FROM player_space_objects pso
            INNER JOIN players p ON p.player_id = pso.player_id
            WHERE p.username = ?`;
            if (p_space_object_id != 'all') {
                query += ' AND pso.space_object_id = ?';
            }
            this.con.query(query, [username, space_object_id], function (err, results) {
                if (err) reject(err);
                resolve(results);
            });
        });
    }

    //so - space objects
    /**
     * Returns results in following format [{space_object_id, image, ..}, ..]
     * @param {Array} p_space_objects in format [{space_object_id, ..}]
     */
    get_so_details(p_space_objects) {
        return new Promise((resolve,reject) => {
            var b_index = -1;
            for (var i = 0; i < p_space_objects.length; i++) {
                if (space_objects[p_space_objects[i].space_object_id - 1].space_object_id == p_space_objects[i].space_object_id) {
                    b_index = p_space_objects[i].space_object_id - 1;
                } else {
                    b_index = space_objects.findIndex(space_object => space_object.space_object_id == p_space_objects[i].space_object_id);
                }
                p_space_objects[i].image = space_objects[b_index].image;
            }
            resolve(p_space_objects);
        });
    }

    execute_query(query, argumentArr) {
        return new Promise((resolve,reject) => {
            this.con.query(query, argumentArr, function (err, results) {
                if (err) reject(err);
                resolve(results);
            });
        });
    }

    get_starter_datapack(username, callback) {
        this.update_resource(username, 'all').then(function() {
            this.update_building_level(username, 'all').then(function() {
                Promise.all([this.get_resource(username, 'all', true), this.get_player_building_details(username, 'all', true)]).then(values => {
                    for (var i = 0; i < values[1].length; i++) {
                        values[1][i].curr_level = values[1][i].level;
                        values[1][i].level = [values[1][i].level - 1, values[1][i].level, values[1][i].level + 1];
                    }
                    this.get_building_details(values[1]).then(results => callback({resources: values[0], buildings: values[1], building_details: results}));
                }).catch(err => { console.log(err) });
            }.bind(this));
        }.bind(this));
    }

    get_map_datapack(username, layout, callback) {
        this.get_pso_details(username, 'all', true).then(pso_details => {
            this.get_so_details(pso_details).then(pso_so_details => { callback({space_objects: pso_so_details}) });
        }).catch(err => { console.log(err) });
    }
}

module.exports = DbManager;