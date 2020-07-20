"use strict"

const all_resource_types = 'wood, dirt, iron, pop';

class DbManager {
    async update_resource(username, resource, amount) {
        //calculate how much resource has been added/remove since last calc
        var resource = resource == 'all' ? all_resource_types : resource;
        var amount = amount + this.calculate_resource(username, resource);
        var sql = 'UPDATE ' + resource + ' SET ' + resource + '_prod * lastTimestamp + ' + resource + ' FROM players WHERE username = ?';
		con.query(sql, [amount, username], function (err, result) {
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
        var sql = 'SELECT ' + resource + ' FROM players WHERE username = ?';

		//Update to return resources in [{resource, amount}, {resource, amount}, ...] format
		con.query(sql, [username], function (err, result) {
			if (err) {
				throw err;
			} else {
                return result;
			}
		});
    }

    async upgrade_building(username, building) {
        //get cost, update on the client side
        this.update_resource(username, resource, cost);
        sql = 'UPDATE ' + building + ' SET ' + building + ' + 1 FROM players WHERE username = ?';
		con.query(sql, [username], function (err, result) {
			if (err) {
				throw err;
			}
		});
    }
}

module.exports = DbManager;