"use strict"

import { Terminal } from './terminal.js';

class Game {
    constructor(socket) {
        this.socket = socket;
        this.terminal = new Terminal(document.getElementById("command_line"), document.getElementById("logs"));
        this.preventInput = false;
    }

    process_incoming_message(message) {
        this.terminal.log_message(message, false);
    }

    process_keyDown_input(e) {
        if (!this.preventInput) {
			if (e.key === 'Enter') {
				this.socket.emit('command', this.terminal.process_command_line());
			} else {
				if (e.key !== 'Control' && e.key !== 'Alt') {
					this.terminal.enter_input(e.key);
				} else {
					this.preventInput = true;
				}
			}
		}
    }

    process_keyUp_input(e) {
        if (e.key === 'Control' || e.key === 'Alt') {
			this.preventInput = false;
		}
    }

    process_paste_input(e) {
        e.preventDefault();
		this.terminal.enter_input(e.clipboardData.getData('text'), true);
    }
}

export { Game };