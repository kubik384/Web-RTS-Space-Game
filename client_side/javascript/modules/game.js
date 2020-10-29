"use strict"

class Game {
    constructor(socket) {
        this.socket = socket;
        this.lastUpdateTime;
        this.updateLoop;
        this.resource_prods;
        this.resources;
        this.buildings;
        this.fetched_buildings = {};
    }

    async display_starter_datapack(p_starter_datapack) {
        var starter_datapack = JSON.parse(p_starter_datapack);
        console.log(starter_datapack);
        this.resources = starter_datapack.resources[0];
        this.buildings = starter_datapack.building_details;
        this.resource_prods = starter_datapack.resource_prods[0];

        for (var i = 0; i < starter_datapack.buildings.length; i++) {
            this.buildings[i].update_start = starter_datapack.buildings.find(b => b.building_id == this.buildings[i].building_id).update_start;
            this.buildings[i].downgrade = starter_datapack.buildings.find(b => b.building_id == this.buildings[i].building_id).downgrade
        }
        this.update_resource_ui();
        for (var i = 0; i < this.buildings.length; i++) {
            this.update_building_ui(this.buildings[i].name, this.buildings[i].level, this.buildings[i].upgrade_time, this.buildings[i].update_start, this.buildings[i].upgrade_cost, this.buildings[i].downgrade);
        }

        this.lastUpdateTime = Math.floor(Date.now()/1000);
        this.updateLoop = setInterval(this.update_game.bind(this), 1000);
    }

    update_game() {
        var currTime = Math.floor(Date.now()/1000);
        var timePassed = currTime - this.lastUpdateTime;
        for (var resource_type in this.resource_prods) {
            this.resources[resource_type] += this.resource_prods[resource_type] * timePassed;
            this.update_resource_ui();
        }
        
        for (var i = 0; i < this.buildings.length; i++) {
            if (this.buildings[i].update_start !== null) {
                this.update_building_ui(this.buildings[i].name, this.buildings[i].level, this.buildings[i].upgrade_time, this.buildings[i].update_start, this.buildings[i].upgrade_cost, this.buildings[i].downgrade);
                var timeLeft = this.buildings[i].update_start + this.buildings[i].upgrade_time - Math.floor(Date.now() / 1000);
                if (timeLeft <= 0) {
                    this.update_building(this.buildings[i].building_id);
                } else if (timeLeft <= 10) {
                    this.fetch_building_details(this.buildings[i].building_id, this.buildings[i].level + (this.buildings[i].downgrade ? -1 : 1));
                }
            }
        }
        this.lastUpdateTime = currTime;
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
        this.update_resource_ui();
        
    }

    async upgrade_building(p_building) {
        var building_index = this.buildings.findIndex(building => { if (building.name == p_building) { return true; } });
        if (this.buildings[building_index].update_start === null && this.buildings[building_index].upgrade_time != 0) {
            var changed_resources = {};
            var sufficient_resources = true;
            for (var resource_type in this.buildings[building_index].upgrade_cost) {
                if (this.resources[resource_type] - this.buildings[building_index].upgrade_cost[resource_type] >= 0) {
                    changed_resources[resource_type] = this.resources[resource_type] - this.buildings[building_index].upgrade_cost[resource_type];
                } else {
                    sufficient_resources = false;
                    break;
                }
            }
            if (sufficient_resources && this.buildings[building_index].upgrade_time > 0) {
                this.socket.emit('upgrade_building', p_building);
                this.resources = changed_resources;
                this.update_resource_ui();
                this.buildings[building_index].update_start = Math.floor(Date.now() / 1000);
                this.update_building_ui(p_building, this.buildings[building_index].level, this.buildings[building_index].upgrade_time, this.buildings[building_index].update_start, this.buildings[building_index].upgrade_cost, this.buildings[building_index].downgrade);
            }
        }
    }

    async update_resource_ui() {
        for (var resource_type in this.resources) {
            document.getElementById(resource_type).innerHTML = Math.floor(this.resources[resource_type]) + ' (' + this.resource_prods[resource_type]*3600 + '/h)';
        }
    }

    async update_building_ui(name, level, upgrade_time, update_start, upgrade_cost, downgrade) {
        var innerHTML = level;
        if (update_start !== null) {
            var building_time = update_start + upgrade_time - Math.floor(Date.now() / 1000);
            innerHTML += downgrade ? ', Downgrading: ' : ', Ugrading: ';
            innerHTML += building_time + 's' + '<img src="client_side/images/ui/red_cross.png" class="cancel" data-building="' + name + '"></img>';
        }
        document.getElementById(name).innerHTML = innerHTML;
        if (upgrade_time != 0) {
            document.getElementById('upgrade-' + name).innerHTML = document.getElementById('upgrade-' + name).innerHTML.split('(')[0] + '(' 
            + upgrade_cost.wood + '<img src="client_side/images/resources/wood.png" height="16px" class=\'button_image\'></img>'
            + upgrade_cost.dirt + '<img src="client_side/images/resources/dirt.svg" height="16px" class=\'button_image\'></img>' 
            + upgrade_cost.iron + '<img src="client_side/images/resources/iron.svg" height="16px" class=\'button_image\'></img>' 
            + upgrade_cost.pop + '<img src="client_side/images/resources/pop.png" height="16px" class=\'button_image\'></img>'
            + upgrade_time + 's)';
        } else {
            document.getElementById('upgrade-' + name).innerHTML = document.getElementById('upgrade-' + name).innerHTML.split('(')[0] + '(MAXED OUT)';
        }
    }

    async fetch_building_details(building_id, level) {
        if (this.fetched_buildings[building_id] === undefined) {
            this.fetched_buildings[building_id] = {};
            this.socket.emit('fetch_building_details', {building_id: building_id, level: level});
        }
    }

    async update_building(building_id) {
        var b_index;
        if (this.buildings[building_id - 1].building_id == building_id) {
            b_index = building_id - 1;
        } else {
            b_index = this.buildings.findIndex(building => {return building.building_id == building_id});
        }
        if (this.fetched_buildings[building_id] !== undefined && this.fetched_buildings[building_id].name !== undefined) {
            this.buildings[b_index] = this.fetched_buildings[building_id];
            this.buildings[b_index].update_start = null;
            this.buildings[b_index].downgrade = 0;
            this.update_building_ui(this.buildings[b_index].name, this.buildings[b_index].level, this.buildings[b_index].upgrade_time, this.buildings[b_index].update_start, this.buildings[b_index].upgrade_cost, this.buildings[b_index].downgrade);
            delete this.fetched_buildings[building_id];
        } else if (this.fetched_buildings[building_id] === undefined) {
            this.fetch_building_details(building_id, this.buildings[b_index].level + (this.buildings[b_index].downgrade ? -1 : 1));
        }
    }

    async save_fetched_building(building) {
        this.fetched_buildings[building.building_id] = building;
    }

    async cancel_building_update(p_building) {
        var building_index = this.buildings.findIndex(building => { if (building.name == p_building) { return true; } });
        if (this.buildings[building_index].update_start !== null) {
            this.buildings[building_index].update_start = null;
            if (this.buildings[building_index].downgrade) {
                this.buildings[building_index].downgrade = 0;
            } else {
                var changed_resources = {};
                for (var resource_type in this.buildings[building_index].upgrade_cost) {
                        changed_resources[resource_type] = this.resources[resource_type] + this.buildings[building_index].upgrade_cost[resource_type];
                }
                this.resources = changed_resources;
            }
            this.socket.emit('cancel_building_update', p_building);
            this.update_resource_ui();
            this.update_building_ui(p_building, this.buildings[building_index].level, this.buildings[building_index].upgrade_time, this.buildings[building_index].update_start, this.buildings[building_index].upgrade_cost, this.buildings[building_index].downgrade);
            delete this.fetched_buildings[this.buildings[building_index].building_id];
        }
    }

    async downgrade_building(p_building) {
        var building_index = this.buildings.findIndex(building => { if (building.name == p_building) { return true; } });
        if (this.buildings[building_index].update_start === null && this.buildings[building_index].level != 0) {
                this.socket.emit('downgrade_building', p_building);
                this.buildings[building_index].update_start = Math.floor(Date.now() / 1000);
                this.buildings[building_index].downgrade = 1;
                this.update_building_ui(p_building, this.buildings[building_index].level, this.buildings[building_index].upgrade_time, this.buildings[building_index].update_start, this.buildings[building_index].upgrade_cost, this.buildings[building_index].downgrade);
        }
    }
}

export { Game };