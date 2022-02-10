"use strict"

module.exports = class Utils {
    async get_timestamp() {
        return Math.floor(Date.now()/1000);
    }

    async angleToRad(angle) {
        return angle/180 * Math.PI;
    }

    isInsideObjects(point, boxes, padding) {
        for (var i = 0; i < boxes.length; i++) {
            if (point.x > (boxes[i].x1 - padding) && point.x < (boxes[i].x2 + padding) && point.y > (boxes[i].y1 - padding) && point.y < (boxes[i].y2 + padding)) {
                return true;
            }
        }
    }
}