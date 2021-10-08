"use strict"

module.exports = class Utils {
    async seconds_to_time(p_seconds) {
        var days = parseInt( (p_seconds / 86400) );
        var hours = parseInt( (p_seconds - (days * 86400)) / 3600 );
        var minutes = parseInt( (p_seconds - ((hours * 3600) + (days * 86400))) / 60 );
        var seconds = Math.floor((p_seconds - ((hours * 3600) + (minutes * 60) + (days * 86400))));
        return (days != 0 ? days + ":" : '') + (hours < 10 ? "0" + hours : hours) + ":" + (minutes < 10 ? "0" + minutes : minutes) + (days == 0 ? ":" + (seconds < 10 ? "0" + seconds : seconds) : '');
    }

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