"use strict"

const all_resource_types = 'wood, dirt, iron, pop';
const all_building_types = 'walls, towncenter, resgen';
const buildingTable = all_building_types.split(', ');

class DbManager {
    async update_resource(username, resource, amount) {
        //calculate how much resource has been added/remove since last calc
        var resource = resource == 'all' ? all_resource_types : resource;
        var amount = amount + this.calculate_resource(username, resource);
        var sql = 'UPDATE ? SET ? * lastTimestamp + ? FROM players WHERE username = ?';
		con.query(sql, [resource, resource + '_prod', amount, username], function (err, result) {
			if (err) {
				throw err;
            }
        });
    }

    async get_resource(username, resource, update = false) {
        if (update) {
            this.update_resource(username, resource, 0);
        }

        var resource = resource == 'all' ? all_resource_types : resource;
        var sql = 'SELECT ? FROM players WHERE username = ?';

		//Update to return resources in [{resource, amount}, {resource, amount}, ...] format
		con.query(sql, [resource, username], function (err, result) {
			if (err) {
				throw err;
			} else {
                return result;
			}
		});
    }

    /**
     * @param {string} username
     * @param {string} building TODO: Need to figure out how to limit accepted values - load them from database? File? Probably want this to be synced with server without having to update both
     */
    async upgrade_building(username, building) {
        //get cost, update on the client side
        this.update_resource(username, resource, cost);
        sql = 'UPDATE ? SET ? + 1 FROM players WHERE username = ?';
		con.query(sql, [building, building, username], function (err, result) {
			if (err) {
				throw err;
			}
		});
    }

    async get_building(username, building) {
        var building = building == 'all' ? undefined : building;
        var sql = 'SELECT level FROM player_buildings INNER JOIN players ON players.player_id WHERE players.username = ?';
        var argumentArr = [username];
        if (building == 'all') {
            sql += ' AND building_id = ?';
            argumentArr.push(buildingTable.findIndex(building));
        }
        
		con.query(sql, argumentArr, function (err, result) {
			if (err) {
				throw err;
			} else {
                return result;
			}
		});
    }
}

module.exports = DbManager;