"use strict"

class Game {
    constructor(socket) {
        this.socket = socket;
        this.preventInput = false;
        this.token = document.cookie.split('token=')[1];
    }

    async process_incoming_message(message) {
        console.log(message);
    }

    async request_data() {
        this.socket.emit('login_player', this.token);
    }

    async update_resource(event) {
        var resource = event.target.id.split('_')[1];
        var amount = 10;
        this.socket.emit('update_resource', JSON.stringify({resource: resource, amount: amount}));
        document.getElementById(resource).innerHTML = parseInt(document.getElementById(resource).innerHTML) + amount;
    }

    async upgrade_building(event) {
        var building = event.target.id.split('_')[1];
        this.socket.emit('upgrade_building', building);
    }

    async display_starter_datapack(p_starter_datapack) {
        var starter_datapack = JSON.parse(p_starter_datapack);
        var resources = starter_datapack.resources[0];
        var buildings = starter_datapack.buildings;
        for (var resource in resources) {
            document.getElementById(resource).innerHTML = resources[resource];
        }
        
        for (var i = 0; i < buildings.length; i++) {
            document.getElementById(buildings[i].name).innerHTML = buildings[i].level + (buildings[i].timeLeft != 0 ? ', Upgrading: ' + buildings[i].timeLeft + 's' : '');
        }
    }
}

export { Game };