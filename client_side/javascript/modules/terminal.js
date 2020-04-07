"use strict"

class Terminal {
    constructor(p_command_line, p_logs) {
        this.command_line = p_command_line;
        this.logs = p_logs;
        this.text = '';
        this.blink_cursor = "<span id='insertion_point'></span>";
        this.typingSounds = [];
        for (var i = 1; i < 21; i++) {
            this.typingSounds.push(new Audio('client_side/sounds/typing_p' + i + '.mp3'));
        }
        this.lastPlayed = -1;
    }
    
    enter_input(input, pasting = false) {
        //Prevent text such as esc, f1, insert, etc. to be written into the command-line
        if (input.length < 2) {
            if (this.text[this.text.length-1] !== ' ' || input !== ' ') {
                this.text += input;
                this.command_line.innerHTML = this.text + this.blink_cursor;
                this.typingSounds[++this.lastPlayed].play();
                if (this.lastPlayed === this.typingSounds.length - 1) {
                    this.lastPlayed = 0;
                }
            }
        //Delete text when backspace is used
        } else if (input === 'Backspace' && input.length > 1) {
            this.text = this.text.substring(0, this.text.length - 1);
            this.command_line.innerHTML = this.text + this.blink_cursor;
        //If pasting, allow multi-character input
        } else if (pasting) {
            this.text += input;
            this.command_line.innerHTML = this.text + this.blink_cursor;
            this.typingSounds[++this.lastPlayed].play();
            if (this.lastPlayed === this.typingSounds.length - 1) {
                this.lastPlayed = 0;
            }
        }
    }

    process_command_line() {
        var command = this.text;
        this.text = '';
        this.command_line.innerHTML = this.text + this.blink_cursor;
        this.log_message(command, true, false);
        return command;
    }

    log_message(message, single_line = true, server_message = true) {
        var log = document.createElement("p");
        if (!single_line) {
            log.className += ' inline_log';
        }
        if (server_message) {
            log.className += ' server_message';
        }
        var message_content = document.createTextNode(message);
        log.appendChild(message_content);
        this.logs.appendChild(log);
    }
}

export { Terminal };