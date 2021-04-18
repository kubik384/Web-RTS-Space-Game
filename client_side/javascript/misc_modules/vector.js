"use strict"

class Vector {
    /**
     * If only a is defined, a normalized vector is created from a (a = angle). If a and b are defined and are numbers, vector is created where a = x and b = y. If they are objects, same happens. If all 4 parameters are defined, the vector x and y coordinates are calculated going from object1(x = a, y = b) to object2(x = c, y = d).
    */
    constructor(a, b, c, d) {
        if(typeof a==="number" && !isNaN(a)) {
            if(b===undefined) {
                var angle = Math.toRad(a);
                this.x = Math.cos(angle).fixedTo(15);
                this.y = Math.sin(angle).fixedTo(15);
            }
            else if(c===undefined || d===undefined) {
                this.x = a;
                this.y = b;
            }
            else {
                this.x = c-a;
                this.y = d-b;
            }
        } else if (typeof a === 'object' && typeof b === 'object') {
            this.x = b.x-a.x;
            this.y = b.y-a.y;
        } else throw new Error("Cannot create Vector - Invalid value!");
    }

    async normalize(length) {
        if(typeof length !== "number") {
            length = await this.length();
        }
	    return new Vector(this.x/length, this.y/length);
    }

    async length() {
        return Math.sqrt(this.x*this.x + this.y*this.y);
    }

    async multiply(a, b) {
        if(typeof a==="number") {
            if(typeof b==="number") return new Vector(this.x*a, this.y*b);
            else return new Vector(this.x*a, this.y*a);
        }
        else if(typeof a==="object") return new Vector(this.x*a.x, this.y*a.y);
        else throw new Error("Invalid multiplication parameters!");
    };    
}

export { Vector };