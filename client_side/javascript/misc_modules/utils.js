"use strict"

class Utils {
    async seconds_to_time(p_seconds, only_to_minutes = false) {
        var days = parseInt( (p_seconds / 86400) );
        var hours = parseInt( (p_seconds - (days * 86400)) / 3600 );
        var minutes = parseInt( (p_seconds - ((hours * 3600) + (days * 86400))) / 60 );
        var seconds = Math.floor((p_seconds - ((hours * 3600) + (minutes * 60) + (days * 86400))));
        if (only_to_minutes) {
            return (minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds < 10 ? "0" + seconds : seconds);
        }
        return (days != 0 ? days + ":" : '') + (hours < 10 ? "0" + hours : hours) + ":" + (minutes < 10 ? "0" + minutes : minutes) + (days == 0 ? ":" + (seconds < 10 ? "0" + seconds : seconds) : '');
    }

    async get_timestamp() {
        return Math.floor(Date.now()/1000);
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

    display_custom_confirm_dialog(question, callback, confirm_text = 'Confirm', reject_text = 'Cancel') {
        if (document.getElementById('dialog_div') === null) {
            var dialog = document.createElement('div');
            dialog.setAttribute("id", "dialog_div");
            var dialog_overlay = document.createElement('div');
            dialog_overlay.setAttribute("id", "dialog_overlay");
            var button_function = function() {
                dialog.remove();
                dialog_overlay.remove();
                callback(this.textContent == confirm_text);
            }
            var click_function = function() {
                this.removeEventListener('click', click_function);
                dialog.remove();
                dialog_overlay.remove();
            }
            dialog_overlay.addEventListener('click', click_function);
            var dialog_question = document.createElement('h3');
            dialog_question.append(question);
            var dialog_confirm_button = document.createElement('button');
            dialog_confirm_button.append(confirm_text);
            dialog_confirm_button.onclick = button_function;
            var dialog_cancel_button =  document.createElement('button');
            dialog_cancel_button.append(reject_text);
            dialog_cancel_button.onclick = button_function;
            dialog.append(dialog_question, dialog_confirm_button, dialog_cancel_button);
            document.body.append(dialog, dialog_overlay);
        } else {
            console.warn('Attempting to display a custom dialog when one is already displayed!');
        }
    }
}

export { Utils };