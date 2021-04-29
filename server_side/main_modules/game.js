var Vector =  require('../misc_modules/vector.js');
var fs = require('fs');

module.exports = class Game {
    constructor(dbManager) {
        this.dbManager = dbManager;
        this.last_tick = Date.now();
        this.tick_time = 90;
        this.last_save = Date.now();
        this.save_time = 120000;
        this.last_secondary_save = Date.now();
        this.secondary_save_time = 300000;
        this.saving = false;
        this.updating = false;
    }

    async setup_game() {
        if (process.argv[2].toLowerCase() == 'true') {
            this.finished_loading = false;
            await this.attempt_game_load(process.argv[3]);
        } else {
            this.space_objects = await this.dbManager.get_space_objects();
        }
        this.logic_loop = setTimeout(this.update.bind(this), this.tick_time);
    }

    async update() {
        var timestamp = Date.now();
        this.logic_loop = setTimeout(this.update.bind(this), this.tick_time);
        if (!this.saving && !this.updating) {
            this.updating = true;
            var time_passed = timestamp - this.last_tick;

            for (var i = 0; i < this.space_objects.length; i++) {
                //TODO: Assign rotation speed to space objects? Make it possible to go into negative values -> rotate other way (does that happen in space? do all planets rotate the same direction?)
                //Calculates the distance from the center - the further away, the slower rotation. Rotation is sped up by 128 times for debugging purposes
                if (this.space_objects[i].x != 0 || this.space_objects[i].y != 0) {
                    var distance = Math.sqrt((Math.pow(this.space_objects[i].x, 2) + Math.pow(this.space_objects[i].y, 2)));
                    this.space_objects[i].rot += time_passed  * 128/(distance * 35);
                
                    while (this.space_objects[i].rot > 360) {
                        this.space_objects[i].rot -= 360;
                    }
                }
            }

            this.attempt_game_save(timestamp);
            if (time_passed > this.tick_time + Math.floor(this.tick_time/6)) {
                console.log('Time delay detected - tick took: ' + time_passed + 's instead of ' + this.tick_time + 's');
            }
            this.last_tick = timestamp;
            this.updating = false;
        } else {
            console.log('Skipped 1 tick');
            this.last_tick = timestamp;
        }
    }

    async attempt_game_save(timestamp, retry = false) {
        if ((timestamp - this.last_save >= this.save_time && !this.saving) || retry) {
            this.saving = true;
            fs.writeFile("server_side/save_files/save.txt", JSON.stringify(await this.extract_game_data()), function(err) {
                if (err) {
                    console.log(err);
                    return his.attempt_game_save(timestamp, true);
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
                    return his.attempt_game_save(timestamp, true);
                }
                this.last_secondary_save = timestamp;
                this.saving = false;
            }.bind(this));
        }
    }

    async extract_game_data() {
        return {space_objects: this.space_objects};
    }
    
    async attempt_game_load(file = 'server_side/save_files/save.txt') {
        fs.readFile(file, 'utf8' , (err, data) => {
            if (err) {
                throw new Error(err);
            }
            var parsed_data = JSON.parse(data);
            this.space_objects = parsed_data.space_objects;
        });
    }
}