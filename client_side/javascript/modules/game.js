"use strict"

class Game {
    constructor(socket) {
        this.socket = socket;
        this.preventInput = false;
    }

    process_incoming_message(message) {
        console.log(message);
    }

    request_data() {
        this.socket.emit('login_player');
    }
}

export { Game };