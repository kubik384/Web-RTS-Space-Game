"use strict"

var mysql = require('mysql');

const all_resource_types = 'wood, dirt, iron, pop';
//const resourceTable = all_resource_types.split(', ');
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
                set_to += resources[i] + ' = ' + resources[i] + ' + ' + resources[i] + '_prod * ( NOW() - res_gen_ts ) + ' + amount + ' , ';
            }
            set_to = set_to.slice(0, set_to.length - 2);

            var query = "UPDATE players SET " + set_to + " WHERE username = ?";
            this.con.query(query, [username], function (err, results) {
                if (err) {
                    reject(err);
                }
                resolve(results);
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

            //Update to return resources in [{resource, amount}, {resource, amount}, ...] format
            this.con.query(query, [username], function (err, results) {
                if (err) {
                    reject(err);
                }
                resolve(results);
            });
        });
    }

    /**
     * @param {string} username
     * @param {string} building TODO: Need to figure out how to limit accepted values - load them from database? File? Probably want this to be synced with server without having to update both
     */
    upgrade_building(username, building) {
        return new Promise((resolve,reject) => {
            //get cost, update on the client side
            this.update_resource(username, resource, cost);
            query = 'UPDATE ? SET ? + 1 FROM players WHERE username = ?';
            this.con.query(query, [building, building, username], function (err, results) {
                if (err) {
                    reject(err);
                }
                resolve(results);
            });
        });
    }

    get_building(username, p_building) {
        return new Promise((resolve,reject) => {
            var building = p_building == 'all' ? buildingTable : p_building;
            var query = 'SELECT building_id, level FROM player_buildings INNER JOIN players ON players.player_id WHERE players.username = ?';
            var building_ids = '(';
            if (Array.isArray(building)) {
                for (var i = 0; i < building.length; i++) {
                    building_ids += i + ',';
                }
                building_ids = building_ids.slice(0, building_ids.length - 1) + ')';
                query += ' AND building_id IN ' + building_ids;
            }
            
            this.con.query(query, [username], function (err, results) {
                if (err) {
                    reject(err);
                }
                for (var i = 0; i < results.length; i++) {
                    results[i].name = buildingTable[results[i].building_id];
                    delete results[i].building_id;
                }
                resolve(results);
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
}

module.exports = DbManager;