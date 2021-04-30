module.exports = class Precision_SetTimeout {
    constructor(func, interval) {
        this.func = func;
        this.execute_time = Date.now() + interval;
        this.interval = interval;
        this.immediate = setImmediate(this.check.bind(this));
    }

    check() {
        if (Date.now() >= this.execute_time) {
            this.func();
        } else {
            this.immediate = setImmediate(this.check.bind(this));
        }
    }
}