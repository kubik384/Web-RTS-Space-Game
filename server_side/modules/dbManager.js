"use strict"

var mysql = require('mysql');
const { ER_INVALID_JSON_PATH_ARRAY_CELL } = require('mysql/lib/protocol/constants/errors');

const all_resource_types = 'wood, dirt, iron, pop';
const resourceTable = all_resource_types.split(', ');

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
     * @param {string} username 
     * @param {String|Array} p_resources 
     * @param {Number} amount
     */
    update_resource(username, p_resources, amount = 0) {
        return new Promise((resolve,reject) => {
            var resources = p_resources == 'all' ? resourceTable : p_resources;
            var set_to = '';
            
            if (!Array.isArray(resources)) {
                resources = resources.split(', ');
            }

            for (var i = 0; i < resources.length; i++) {
                set_to += resources[i] + ' = ' + resources[i] + ' + ' + resources[i] + '_prod * (UNIX_TIMESTAMP(NOW()) - UNIX_TIMESTAMP(res_last_update)) + ' + amount + ' , ';
            }
            set_to += 'res_last_update = NOW()';

            var query = "UPDATE players SET " + set_to + " WHERE username = ?";
            this.con.query(query, [username], function (err) {
                if (err) reject(err);
                resolve();
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

    /**
     * @param {String} username Player's username
     * @param {String} p_resource Can be exact resource or use 'all' to get all resource production values
     */
    get_resource_prod(username, p_resource) {
        //probably can be replaced with some sort of mysql partial column name match
        return new Promise((resolve,reject) => {
            var resources = p_resource == 'all' ? resourceTable : p_resource;

            if (!Array.isArray(resources)) {
                resources = resources.split(', ');
            }

            var resource_prods = '';
            for (var i = 0; i < resources.length; i++) {
                resource_prods += resources[i] + '_prod AS ' + resourceTable[i] + ', ';
            }
            resource_prods = resource_prods.slice(0, resource_prods.length - 2);
    
            var query = 'SELECT ' + resource_prods + ' FROM players WHERE username = ?';

            this.con.query(query, [username], function (err, results) {
                if (err) reject(err);
                resolve(results);
            });
        });
    }

    upgrade_building(username, p_building) {
        return new Promise((resolve,reject) => {
            this.update_resource(username, 'all').then(function() {
                var query = `SELECT p.player_id, b.building_id, p.wood, p.dirt, p.iron, p.pop, b.wood_cost, b.dirt_cost, b.iron_cost, b.pop_cost, pb.upgrade_start
                FROM buildings b
                INNER JOIN player_buildings pb ON b.level = pb.level + 1 AND b.building_id = pb.building_id
                INNER JOIN players p ON p.player_id = pb.player_id
                WHERE p.username = ? AND b.name = ?`;
                this.con.query(query, [username, p_building], function (err, results) {
                    if (err) reject(err);
                    if (results.length > 0) {
                        if (results[0].upgrade_start === null && results[0].wood > results[0].wood_cost && results[0].dirt > results[0].dirt_cost && results[0].iron > results[0].iron_cost && results[0].pop > results[0].pop_cost) {
                            query = `UPDATE player_buildings pb 
                            INNER JOIN players p ON p.player_id = pb.player_id 
                            INNER JOIN buildings b ON b.building_id = pb.building_id AND b.level = pb.level + 1
                            SET 
                                pb.upgrade_start = NOW(), 
                                p.wood = p.wood - b.wood_cost,
                                p.dirt = p.dirt - b.dirt_cost,
                                p.iron = p.iron - b.iron_cost,
                                p.pop = p.pop - b.pop_cost
                            WHERE p.player_id = ? AND b.building_id = ?`;
                            this.con.query(query, [results[0].player_id, results[0].building_id], function (err) {
                                if (err) reject(err);
                                resolve();
                            });
                        }
                    }
                }.bind(this));
            }.bind(this));
        });
    }

    /**
     * Returns result(s) in following format [{player_id, building_id, level, upgrade_start(in UNIX timestamp), upgrade_time}, ..]
     * @param {String} username Username of the player
     * @param {String} p_building Building name 'all' can be used to get all buildings from the player
     */
    get_user_building_details(username, p_building, hidePlayerId = false) {
        return new Promise((resolve,reject) => {
            this.update_building_level(username, p_building).then(function () {
                var query = hidePlayerId ? 'SELECT ' : 'SELECT pb.player_id, '
                query += `pb.building_id, pb.level, 
                UNIX_TIMESTAMP(pb.upgrade_start) AS upgrade_start
                FROM player_buildings pb
                INNER JOIN players p ON p.player_id = pb.player_id
                INNER JOIN buildings b ON b.building_id = pb.building_id AND b.level = pb.level
                WHERE p.username = ?`;
                if (p_building != 'all') {
                    query += ' AND b.name = ?';
                }

                this.con.query(query, [username, p_building], function (err, results) {
                    if (err) reject(err);
                    resolve(results);
                }.bind(this));
            }.bind(this));
        });
    }

    update_building_level(username, p_building) {
        return new Promise((resolve,reject) => {
            var query = `UPDATE player_buildings pb
            INNER JOIN players p ON p.player_id = pb.player_id
            INNER JOIN buildings b ON pb.building_id = b.building_id
                SET pb.level = IF (pb.upgrade_start IS NOT NULL AND (NOW() - cast(pb.upgrade_start as signed) - cast(b.upgrade_time as signed)) > 0, pb.level + 1, pb.level),
                pb.upgrade_start = IF (pb.upgrade_start IS NOT NULL AND (NOW() - cast(pb.upgrade_start as signed) - cast(b.upgrade_time as signed)) > 0, NULL, pb.upgrade_start)
            WHERE p.username = ? AND b.level = pb.level`;
            if (p_building != 'all') {
                query += ' AND b.name = ?';
            }
            this.con.query(query, [username, p_building], function (err) {
                if (err) reject(err);
                resolve();
            });
        });
    }

    /**
     * Returns results in following format [{name, level, upgrade_time, wood_cost, dirt_cost, iron_cost, pop_cost}, ..]
     * @param {Array} buildings in format [{building_id, level}]
     * @param {Boolean} upByLevel Default value is false. If true, next level of 
     */
    get_building_details(buildings) {
        return new Promise((resolve,reject) => {
            var query_fragment = '';
            for (var i = 0; i < buildings.length; i++) {
                query_fragment += `( building_id = ${buildings[i].building_id} AND level = ${buildings[i].level} ) OR `;
            }
            query_fragment = query_fragment.slice(0, query_fragment.length - 4);
            var query = `SELECT building_id, name, level, upgrade_time, wood_cost, dirt_cost, iron_cost, pop_cost FROM buildings WHERE ${query_fragment}`;
            this.con.query(query, function (err, results) {
                if (err) reject(err);
                resolve(results);
            });
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
        //remake this into a single query - then update the ui part
        return new Promise((resolve,reject) => {
            this.update_resource(username, 'all').then(function() {
                this.update_building_level(username, 'all').then(function() {
                    Promise.all([this.get_resource_prod(username, 'all'), this.get_resource(username, 'all', true), this.get_user_building_details(username, 'all', true)]).then(values => {
                        this.get_building_details(values[2]).then(results => callback({resource_prods: values[0], resources: values[1], buildings: values[2], building_details: results}));
                    }).catch(err => { console.log(err) });
                }.bind(this));
            }.bind(this));
        });
        
    }
}

module.exports = DbManager;