"use strict"

class Terminal {
    constructor(p_command_line) {
        this.command_line = p_command_line;
        this.text = '';
        this.blink_cursor = "<span id='insertion_point'></span>";
        this.typingSounds = [new Audio('client_side/sounds/typing_p1.mp3'),new Audio('client_side/sounds/typing_p2.mp3'),new Audio('client_side/sounds/typing_p3.mp3'),new Audio('client_side/sounds/typing_p4.mp3'),new Audio('client_side/sounds/typing_p5.mp3'),new Audio('client_side/sounds/typing_p6.mp3')];
        for (var i = 0; i < this.typingSounds.length; i++) {
            this.typingSounds[i].volume = 0.2;
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

    send_command() {
        this.text = '';
        this.command_line.innerHTML = this.text + this.blink_cursor;
        this.typingSounds[++this.lastPlayed].play();
        if (this.lastPlayed === this.typingSounds.length - 1) {
            this.lastPlayed = 0;
        }
    }
}

export { Terminal };