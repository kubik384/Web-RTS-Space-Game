"use strict"

class Game {
    constructor(socket) {
        this.socket = socket;
        this.preventInput = false;
        this.token = document.cookie.split('token=')[1];
        this.credits;
    }

    async process_incoming_message(message) {
        console.log(message);
    }

    async request_data() {
        this.socket.emit('login_player', this.token);
    }

    async display_data(data) {
        document.getElementById('coins').innerHTML = data;
        this.credits = data;
    }

    async add_credits(amount) {
        document.getElementById('coins').innerHTML = this.credits + amount;
        this.credits += amount;
    }

    async add_resources(event) {
        this.socket.emit('add_credits', 10, this.token);
    }
}

export { Game };