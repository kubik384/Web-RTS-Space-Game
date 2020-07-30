"use strict"

var mysql = require('mysql');

const all_resource_types = 'wood, dirt, iron, pop';
const resourceTable = all_resource_types.split(', ');
const all_building_types = 'walls, towncenter, resgen';
const buildingTable = all_building_types.split(', ');

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

    update_resource(username, p_resource, amount) {
        return new Promise((resolve,reject) => {
            var resource = p_resource == 'all' ? all_resource_types : p_resource;
            var resources = resource.split(', ');
            var set_to = '';
            for (var i = 0; i < resources.length; i++) {
                set_to += resources[i] + ' = ' + resources[i] + ' + ' + resources[i] + '_prod * (UNIX_TIMESTAMP(NOW()) - UNIX_TIMESTAMP(res_gen_ts)) + ' + amount + ' , ';
            }
            set_to = set_to.slice(0, set_to.length - 2);

            var query = "UPDATE players SET " + set_to + " WHERE username = ?";
            this.con.query(query, [username], function (err) {
                if (err) {
                    reject(err);
                }
                resolve();
            });
        });
    }

    get_resource(username, p_resource, update = false) {
        return new Promise((resolve,reject) => {
            var resource = p_resource == 'all' ? all_resource_types : p_resource;
            if (update) {
                this.update_resource(username, resource, 0);
            }

            var query = 'SELECT ' + resource + ' FROM players WHERE username = ?';

            this.con.query(query, [username], function (err, results) {
                if (err) {
                    reject(err);
                }
                resolve(results);
            });
        });
    }

    upgrade_building(username, building) {
        return new Promise((resolve,reject) => {
            var query = `UPDATE player_buildings pb 
            INNER JOIN players p ON p.player_id = pb.player_id 
            INNER JOIN b ON b.building_id = pb.building_id AND b.level = pb.level
            SET pb.level = IF(NOW() - (pb.upgradeStart + b.upgrade_time) > 0, pb.level + 1, pb.level),
            IF(pb.upgradeStart != NULL AND p.wood - b.wood_cost > 0 AND p.dirt - b.dirt_cost > 0 AND p.iron - b.iron_cost > 0 AND p.pop - b.pop_cost > 0, 
                pb.upgradeStart = NOW(),
                p.wood = p.wood - b.wood_cost,
                p.dirt = p.dirt - b.dirt_cost,
                p.iron = p.iron - b.iron_cost,
                p.pop = p.pop - b.pop_cost
            )
            WHERE p.username = ? AND b.name = ?`;
            this.con.query(query, [username, building], function (err) {
                if (err) {
                    reject(err);
                }
            });

            var query = `SELECT player_buildings pb INNER JOIN players p ON p.player_id = pb.player_id INNER JOIN b ON b.building_id = pb.building_id
                        SET pb.level = IF(NOW() - (pb.upgradeStart + ${building_time}) > 0, pb.level + 1, pb.level), pb.upgradeStart = NOW()
                        WHERE p.username = ? AND pb.building_id = ?`;
            this.con.query(query, [username, buildingTable.findIndex(building => building == p_building) + 1], function (err) {
                if (err) {
                    reject(err);
                }
                resolve();
            });
        });
    }

    get_building(username, p_building) {
        return new Promise((resolve,reject) => {
            var query = "SELECT player_buildings.building_id, player_buildings.level, UNIX_TIMESTAMP(player_buildings.upgradeStart) AS upgradeStart FROM player_buildings INNER JOIN players ON players.player_id = player_buildings.player_id WHERE players.username = ? AND player_buildings.building_id ";

            if (p_building == 'all') {
                var building_ids = '(';

                for (var i = 0; i < buildingTable.length; i++) {
                    building_ids += (i + 1) + ',';
                }
                building_ids = building_ids.slice(0, building_ids.length - 1) + ')';
                query += 'IN ' + building_ids;
            } else {
                query += '= ' + (buildingTable.findIndex(building => building == p_building) + 1);
            }
            
            this.con.query(query, [username], function (err, results) {
                if (err) {
                    reject(err);
                }
                for (var i = 0; i < results.length; i++) {
                    if (results[i].upgradeStart !== null) {
                        if (results[i].upgradeStart + building_time < Math.floor(Date.now()/1000)) {
                            results[i].upgradeStart = null;
                            results[i].level += 1;
                            this.update_building_level(username, results[i].building_id).catch(err => {console.log(err)});
                        }
                    }

                    results[i].name = buildingTable[results[i].building_id - 1];
                    results[i].timeLeft = results[i].upgradeStart === null ? 0 : (results[i].upgradeStart + building_time) - Math.floor(Date.now()/1000);
                    delete results[i].building_id;
                    delete results[i].upgradeStart;
                }
                resolve(results);
            }.bind(this));
        });
    }

    update_building_level(username, building_id) {
        return new Promise((resolve,reject) => {
            var query = `UPDATE player_buildings pb INNER JOIN players p ON p.player_id = pb.player_id
                    SET pb.level = pb.level + 1, pb.upgradeStart = NULL
                    WHERE p.username = ? AND pb.building_id = ?`;
            this.con.query(query, [username, building_id], function (err) {
                if (err) {
                    reject(err);
                }
                resolve();
            });
        });
    }

    execute_query(query, argumentArr) {
        return new Promise((resolve,reject) => {
            this.con.query(query, argumentArr, function (err, results) {
                if (err) {
                    reject(err);
                }
                resolve(results);
            });
        });
    }

    get_starter_datapack(username, callback) {
        var resource_prods = '';
        for (var i = 0; i < resourceTable.length; i++) {
            resource_prods += resourceTable[i] + '_prod AS ' + resourceTable[i] + ', ';
        }
        resource_prods = resource_prods.slice(0, resource_prods.length - 2);

        var query = 'SELECT ' + resource_prods + ' FROM players WHERE username = ?';

        Promise.all([this.execute_query(query, [username]), this.get_resource(username, 'all', true), this.get_building(username, 'all', true)]).then(values => {
            callback({resource_prods: values[0], resources: values[1], buildings: values[2], building_times: building_time});
        }).catch(err => { console.log(err) });
    }
}

module.exports = DbManager;