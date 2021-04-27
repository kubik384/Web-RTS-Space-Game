var Vector =  require('../misc_modules/vector.js');

module.exports = class Game {
    constructor() {
        this.time_time = 50;
        this.logic_loop = setTimeout(this.update.bind(this), this.tick_time, Date.now());
    }

    async update() {
        this.logic_loop = setTimeout(this.update.bind(this), this.tick_time, Date.now());
    }
}