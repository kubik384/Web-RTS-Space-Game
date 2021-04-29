var Vector =  require('../misc_modules/vector.js');
const DbManager = require('./dbManager.js');
var dbManager = new DbManager();
var fs = require('fs');

module.exports = class Game {
    constructor() {
        this.last_tick = Date.now();
        this.tick_time = 100;
        this.last_save = Date.now();
        this.save_time = 120000;
        this.last_secondary_save = Date.now();
        this.secondary_save_time = 300000;
        this.saving = false;
        this.updating = false;
    }

    async setup_game() {
        if (process.argv[0] == 'true') {
            this.finished_loading = false;
            await this.attempt_game_load();
        } else {
            //load everything from the database
        }
        this.logic_loop = setTimeout(this.update.bind(this), this.tick_time);
    }

    async update() {
        this.logic_loop = setTimeout(this.update.bind(this), this.tick_time);
        if (!this.saving && !this.updating) {
            this.updating = true;
            var timestamp = Date.now();
            var time_passed = timestamp - this.last_tick;



            this.attempt_game_save(timestamp);
            if (time_passed > this.tick_time + Math.floor(this.tick_time/10)) {
                console.log('Massive time delay detected - tick took: ' + time_passed + 's instead of ' + this.tick_time + 's');
            }
            this.last_tick = timestamp;
            this.updating = false;
        } else {
            console.log('Skipped 1 tick');
            this.last_tick = Date.now();
        }
    }

    async attempt_game_save(timestamp) {
        if (timestamp - this.last_save >= this.save_time && !this.saving) {
            this.saving = true;
            fs.writeFile("save.txt", JSON.stringify(await this.extract_game_data()), function(err) {
                if (err) {
                    throw new Error(err);
                }
                this.last_save = timestamp;
                this.saving = false;
            }.bind(this));
        } else if (timestamp - this.last_secondary_save >= this.secondary_save_time && !this.saving) {
            this.saving = true;
            fs.writeFile("secondary_save.txt", JSON.stringify(await this.extract_game_data()), function(err) {
                this.saving = true;
                if (err) {
                    throw new Error(err);
                }
                this.last_secondary_save = timestamp;
                this.saving = false;
            }.bind(this));
        }
    }

    async extract_game_data() {
        return {save_time: Date.now()};
    }
    
    async attempt_game_load() {
        return;
    }
}