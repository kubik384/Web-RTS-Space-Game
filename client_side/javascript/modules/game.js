"use strict"

class Game {
    constructor(socket) {
        this.socket = socket;
        this.preventInput = false;
        this.token = document.cookie.split('token=')[1];
        this.resources = [];
    }

    async process_incoming_message(message) {
        console.log(message);
    }

    async request_data() {
        this.socket.emit('login_player', this.token);
    }

    async display_data(data) {
        JSON.parse(data);
        for (var i = 0; i < data.length; i++) {
            var resource = data[i].resource;
            var amount = data[i].amount;
            document.getElementById(resource).innerHTML = resource + ': ' + amount;
            this.resources[resource] = amount;
        }
    }

    async update_resource(resource, amount) {
        document.getElementById(resource).innerHTML = resource + ': ' + (this.resources[resource] + amount);
        this.resources[resource] += amount;
    }

    async send_res_update(event) {
        //TEST - figure out how to get id of the element that's been clicked through event
        this.socket.emit('update_resource', event.element.id.split('_')[1], 10);
    }
}

export { Game };