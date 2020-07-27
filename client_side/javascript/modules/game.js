"use strict"

class Game {
    constructor(socket) {
        this.socket = socket;
        this.lastUpdateTime;
        this.updateLoop;
        this.resource_prods;
        this.resources;
        this.buildings;
        this.building_times;
    }

    async process_incoming_message(message) {
        console.log(message);
    }

    async request_data() {
        this.socket.emit('login_player', document.cookie.split('token=')[1]);
    }

    async update_resource(resource, amount) {
        this.socket.emit('update_resource', JSON.stringify({resource: resource, amount: amount}));
        this.resources[resource] += amount;
        this.update_resource_ui(resource, Math.floor(this.resources[resource]));
        
    }

    async upgrade_building(building) {
        this.socket.emit('upgrade_building', building);
        this.buildings[building].timeLeft = this.building_times;
        this.update_buildings_ui(building, this.buildings[building].level, this.buildings[building].timeLeft);
    }

    async display_starter_datapack(p_starter_datapack) {
        var starter_datapack = JSON.parse(p_starter_datapack);
        this.resources = starter_datapack.resources[0];
        this.buildings = starter_datapack.buildings;
        for (var resource in this.resources) {
            this.update_resource_ui(resource, Math.floor(this.resources[resource]));
        }
        
        for (var i = 0; i < this.buildings.length; i++) {
            this.update_building_ui(this.buildings[i].name, this.buildings[i].level, this.buildings[i].timeLeft);
        }

        this.resource_prods = starter_datapack.resource_prods[0];
        this.lastUpdateTime = Math.floor(Date.now()/1000);
        this.building_times = starter_datapack.building_times;
        this.updateLoop = setInterval(this.update_game.bind(this), 1000);
    }

    update_game() {
        var currTime = Math.floor(Date.now()/1000);
        var timePassed = currTime - this.lastUpdateTime;
        for (var resource_prod in this.resource_prods) {
            this.update_resource_ui(resource_prod, Math.floor(this.resources[resource_prod] + this.resource_prods[resource_prod] * timePassed));
        }
        for (var building in this.buildings) {
            if (this.buildings[building].timeLeft != 0) {
                if (this.buildings[building].timeLeft - timePassed <= 0) {
                    this.buildings[building].level++;
                    this.buildings[building].timeLeft = 0;
                } else {
                    this.buildings[building].timeLeft -= timePassed;
                }
            }
            this.update_building_ui(this.buildings[building].name, this.buildings[building].level, this.buildings[building].timeLeft);
        }
        //calc resources + buildings seconds
        this.lastUpdateTime = currTime;
    }

    async update_resource_ui(resource, amount) {
        document.getElementById(resource).innerHTML = amount;
    }

    async update_building_ui(name, level, building_time) {
        var innerHTML = level + (building_time != 0 ? ', Upgrading: ' + building_time + 's' : '');
        document.getElementById(name).innerHTML = innerHTML;
    }
}

export { Game };