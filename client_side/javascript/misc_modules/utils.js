"use strict"

class Utils {
    async seconds_to_time(p_seconds, only_to_minutes = false, use_units = false) {
        if (only_to_minutes) {
            let minutes = Math.floor((p_seconds / 60 ));
            let seconds = Math.floor(p_seconds - ((minutes * 60)));
            return (minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds < 10 ? "0" + seconds : seconds);
        }
        let days = Math.floor((p_seconds / 86400) );
        let hours = Math.floor((p_seconds - (days * 86400)) / 3600 );
        let minutes = Math.floor((p_seconds - ((hours * 3600) + (days * 86400))) / 60 );
        let seconds = Math.floor((p_seconds - ((hours * 3600) + (minutes * 60) + (days * 86400))));
        if (use_units) {
            return (days != 0 ? days : '') + (days < 100 ? (days != 0 ? "d " : '') + (hours != 0 ? hours : '') : '') + (days < 10 ? (hours != 0 ? "h " : '') + (minutes != 0 ? minutes : '') : '') + (days == 0 ? (minutes != 0 ? "m " : '') + (seconds != 0 ? seconds : '') : '') + (seconds != 0 ? 's' : '');
        } else {
            return (days != 0 ? days : '') + (days < 100 ? (days != 0 ? ":" : '') + (hours < 10 ? "0" + hours : hours) : '') + (days < 10 ? ":" + (minutes < 10 ? "0" + minutes : minutes) : '') + (days == 0 ? ":" + (seconds < 10 ? "0" + seconds : seconds) : '');
        }
    }

    async miliseconds_to_date(p_seconds) {
        let date = new Date(p_seconds);
        return (date.toString().split(' G')[0]);
    }

    async get_timestamp() {
        return Math.floor(Date.now()/1000);
    }

    async timestamp_to_seconds(timestamp) {
        return Math.floor(timestamp/1000);
    }

    async angleToRad(angle) {
        return angle/180 * Math.PI;
    }

    syncAngleToRad(angle) {
        return angle/180 * Math.PI;
    }

    async radToAngle(rad) {
        return rad/Math.Pi * 180;
    }

    display_custom_confirm_dialog(question, confirm_callback, reject_callback, confirm_text = 'Confirm', reject_text = 'Cancel') {
        let dialog_id = 'dialog_div';
        let dialog_overlay_id = 'dialog_overlay';
        let old_dialog = document.getElementById(dialog_id);
        if (old_dialog !== null) {
            let old_overlay = document.getElementById(dialog_overlay_id);
            old_dialog.remove();
            old_overlay.remove();
        }
        let dialog = document.createElement('div');
        dialog.setAttribute("id", dialog_id);
        let dialog_overlay = document.createElement('div');
        dialog_overlay.setAttribute("id", dialog_overlay_id);
        dialog_overlay.addEventListener('contextmenu', function(event) {
            event.preventDefault();
            dialog_overlay.style.display = 'none';
            let new_event = new event.constructor(event.type, event);
            document.elementFromPoint(event.clientX, event.clientY).dispatchEvent(new_event);
            dialog_overlay.style.display = 'block';
        });
        dialog_overlay.addEventListener('click', function() {
            dialog.remove();
            dialog_overlay.remove();
        });
        let dialog_question = document.createElement('h3');
        dialog_question.append(question);
        let dialog_confirm_button = document.createElement('button');
        dialog_confirm_button.append(confirm_text);
        dialog_confirm_button.addEventListener('click', function() {
            dialog.remove();
            dialog_overlay.remove();
            confirm_callback();
        });
        dialog.append(dialog_question, dialog_confirm_button);
        if (reject_text !== '') {
            let dialog_cancel_button =  document.createElement('button');
            dialog_cancel_button.append(reject_text);
            dialog_cancel_button.addEventListener('click', function() {
                dialog.remove();
                dialog_overlay.remove();
                reject_callback();
            });
            dialog.append(dialog_cancel_button);
        } else {
            dialog_confirm_button.style.marginRight = '0px';
        }
        document.body.append(dialog, dialog_overlay);
    }

    isInsideObjects(point, boxes, padding) {
        for (let i = 0; i < boxes.length; i++) {
            if (point.x > (boxes[i].x1 - padding) && point.x < (boxes[i].x2 + padding) && point.y > (boxes[i].y1 - padding) && point.y < (boxes[i].y2 + padding)) {
                return true;
            }
        }
    }
}

export { Utils };