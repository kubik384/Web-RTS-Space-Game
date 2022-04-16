"use strict"

module.exports = class Vector {
    /**
     * If only a is defined, a normalized vector is created from a (a = angle). If a and b are defined and are numbers, vector is created where a = x and b = y. If they are objects, same happens. If all 4 parameters are defined, the vector x and y coordinates are calculated going from object1(x = a, y = b) to object2(x = c, y = d).
    */
    constructor(a, b, c, d) {
        if (typeof a === "number" && !isNaN(a)) {
            if (b === undefined) {
                var angle = Math.toRad(a);
                this.x = Math.cos(angle);
                this.y = Math.sin(angle);
            }
            else if (c === undefined || d === undefined) {
                this.x = a;
                this.y = b;
            }
            else {
                this.x = c-a;
                this.y = d-b;
            }
        } else if (typeof a === 'object') {
            if (typeof b === 'object') {
                this.x = b.x-a.x;
                this.y = b.y-a.y;
            } else {
                this.x = a.x;
                this.y = a.y;
            }
        } else throw new Error("Cannot create Vector - Invalid value!");
    }

    async normalize(length) {
        if (typeof length !== "number") {
            length = await this.length();
        }
        if (length == 0) {
            throw new Error('Attempting to normalize a null vector');
        }
	    return new Vector(this.x/length, this.y/length);
    }

    async square_length() {
        return (this.x*this.x + this.y*this.y);
    }

    async length() {
        return Math.sqrt(await this.square_length());
    }

    async multiply(a, b) {
        if (typeof a === "number") {
            if (typeof b === "number") return new Vector(this.x*a, this.y*b);
            else return new Vector(this.x*a, this.y*a);
        }
        else if (typeof a === "object") return new Vector(this.x*a.x, this.y*a.y);
        else throw new Error("Invalid multiplication parameters!");
    };

    async add() {
        var x = this.x;
        var y = this.y;
        for (var i = 0; i < arguments.length; i++) {
            var v = arguments[i];
            if (typeof v !== "object" || typeof v.x !== "number" || typeof v.y !== "number")
                throw new Error(`Invalid vector (parameter " + ${i+1} + ")`);
            else {
                x+=v.x;
                y+=v.y;
            }
        }
        return new Vector(x, y);
    };

    async subtract() {
        var x = this.x;
        var y = this.y;
        for (var i = 0; i < arguments.length; i++) {
            var v = arguments[i];
            if(typeof v !== "object" || typeof v.x !== "number" || typeof v.y !== "number") throw new Error("Invalid vector (parameter "+(i+1)+")");
            else {
                x-=v.x;
                y-=v.y;
            }
        }
        return new Vector(x, y);
    };

    async divide(a) {
        if (typeof a === "object") return new Vector(this.x/a.x, this.y/a.y);
        else if (typeof a === "number") return new Vector(this.x/a, this.y/a);
        else throw new Error("Invalid divide parameters!");
    };

    async reverse() {
        return new Vector(-this.x, -this.y);
    };

    async isNull() {
        return (this.x == 0 && this.y == 0);
    }
}