"use strict"

class DbManager {
    async update_resource(username, resource, amount, callback) {
        //calculate how much resource has been added/remove since last calc
        var sql = `UPDATE players SET credit = credit + ? WHERE username = ?`;
		con.query(sql, [amount, username], function (err, result) {
			if (err) {
				throw err;
            } else {
                callback('updated_resource', resource, amount);
            }
		});
    }
}

export { dbManager };