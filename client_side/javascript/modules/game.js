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
        var resource_building_ui_html = '<table>';
        for(var resource in starter_datapack.resources[0]) {
            resource_building_ui_html += `
            <tr>
            <td><img src="client_side/images/resources/${resource}.png" height="16px"></img></td>
            <td id='${resource}'></td>
            </tr>`;
        }
        
        var button_menu_html = '';
        this.buildings = starter_datapack.building_details;
        for (var i = 0; i < starter_datapack.buildings.length; i++) {
            var building = starter_datapack.buildings.find(b => b.building_id == this.buildings[i].building_id);
            this.buildings[i].update_start = building.update_start;
            this.buildings[i].downgrade = building.downgrade;
            this.buildings[i].level = building.curr_level;

            resource_building_ui_html += `
            <tr>
            <td><img src="client_side/images/buildings/${this.buildings[i].name}.png" height="20px"></img></td>
            <td id='${this.buildings[i].name}' class='building_cell'>${this.buildings[i].level}</td>
            </tr>`;
            
            button_menu_html += `
            <div class = 'building_update_button_wrapper'>
            <button id='upgrade-${this.buildings[i].name}' class='building_btn'>Upgrade ${this.buildings[i].name} <br />()</button>
            <button id='downgrade-${this.buildings[i].name}' class='downgrade_btn'><img src="client_side/images/ui/downgrade_building.png" height="20px"></button>
            </div>`;
        }
        resource_building_ui_html += '</table>';
        document.getElementById('resource_building_ui').innerHTML = resource_building_ui_html;
        document.getElementById('button_menu').innerHTML = button_menu_html;


        var resource_generator = this.buildings.find(building => building.name == 'resource_generator');
        this.resource_prods = resource_generator.level_details.find(ld => ld.level == resource_generator.level).production;

        this.update_resource_ui();
        for (var i = 0; i < this.buildings.length; i++) {
            this.update_building_ui(i);
        }

        this.lastUpdateTime = Math.floor(Date.now()/1000);
        this.updateLoop = setInterval(this.update_game.bind(this), 1000);
    }

    
    update_game() {
        /*
        var currTime = Math.floor(Date.now()/1000);
        var timePassed = currTime - this.lastUpdateTime;
        for (var resource_type in this.resource_prods) {
            this.resources[resource_type] += this.resource_prods[resource_type] * timePassed;
            this.update_resource_ui();
        }
        
        for (var i = 0; i < this.buildings.length; i++) {
            if (this.buildings[i].update_start !== null) {
                this.update_building_ui(i);
                var l_index = this.buildings[i].level_details.findIndex(ld => ld.level == (this.buildings[i].level - this.buildings[i].downgrade));
                var timeLeft = this.buildings[i].update_start + this.buildings[i].level_details[l_index].upgrade_time - Math.floor(Date.now() / 1000);
                if (timeLeft <= 0) {
                    this.update_building(this.buildings[i].building_id);
                } else if (timeLeft <= 10) {
                    var l_index_2 = this.buildings[i].level_details.findIndex(ld => ld.level == (this.buildings[i].level + (this.buildings[i].downgrade ? -1 : 1)));
                    if (l_index_2 !== -1 && this.buildings[i].level_details[l_index_2].upgrade_time != 0 && this.buildings[i].level_details[l_index_2].level != 0) {
                        this.fetch_building_details(this.buildings[i].building_id, this.buildings[i].level + (this.buildings[i].downgrade ? -2 : 2));
                    }
                }
            }
        }
        this.lastUpdateTime = currTime;
        */
    }

    async upgrade_building(p_building) {
        var b_index = this.buildings.findIndex(building => building.name == p_building);
        var l_index = this.buildings[b_index].level_details.findIndex(ld => ld.level == this.buildings[b_index].level);
        if (this.buildings[b_index].update_start === null && this.buildings[b_index].level_details[l_index].upgrade_time != 0) {
            var changed_resources = {};
            var sufficient_resources = true;
            for (var resource_type in this.buildings[b_index].level_details[l_index].upgrade_cost) {
                if (this.resources[resource_type] - this.buildings[b_index].level_details[l_index].upgrade_cost[resource_type] >= 0) {
                    changed_resources[resource_type] = this.resources[resource_type] - this.buildings[b_index].level_details[l_index].upgrade_cost[resource_type];
                } else {
                    sufficient_resources = false;
                    break;
                }
            }
            if (sufficient_resources && this.buildings[b_index].level_details[l_index].upgrade_time > 0) {
                this.socket.emit('upgrade_building', p_building);
                this.resources = changed_resources;
                this.update_resource_ui();
                this.buildings[b_index].update_start = Math.floor(Date.now() / 1000);
                this.update_building_ui(b_index);
            }
        }
    }

    async update_building(building_id) {
        var b_index;
        if (this.buildings[building_id - 1].building_id == building_id) {
            b_index = building_id - 1;
        } else {
            b_index = this.buildings.findIndex(building => building.building_id == building_id);
        }
        if (this.fetched_buildings[building_id] !== undefined && this.fetched_buildings[building_id].name !== undefined) {
            if (this.buildings[b_index].downgrade) {
                var l_index = this.buildings[b_index].level_details.findIndex(ld => ld.level == this.buildings[b_index].level + 1);
                if (l_index != -1) {
                    this.buildings[b_index].level_details.pop();
                }
                if (this.fetched_buildings[building_id].level_details[0] !== undefined) {
                    this.buildings[b_index].level_details.unshift(this.fetched_buildings[building_id].level_details[0]);
                }
                this.buildings[b_index].downgrade = 0;
                this.buildings[b_index].level--;
            } else {
                var l_index = this.buildings[b_index].level_details.findIndex(ld => ld.level == this.buildings[b_index].level - 1);
                if (l_index != -1) {
                    this.buildings[b_index].level_details.shift();
                }
                if (this.fetched_buildings[building_id].level_details[0] !== undefined) {
                    this.buildings[b_index].level_details.push(this.fetched_buildings[building_id].level_details[0]);
                }
                this.buildings[b_index].level++;
            }
            if (this.buildings[b_index].name == 'resource_generator') {
                this.resource_prods = this.buildings[b_index].level_details.find(ld => ld.level == this.buildings[b_index].level).production;
                this.update_resource_ui();
            }
            this.buildings[b_index].update_start = null;
            this.update_building_ui(b_index);
            delete this.fetched_buildings[building_id];
        } else if (this.fetched_buildings[building_id] === undefined) {
            var l_index = this.buildings[b_index].level_details.findIndex(ld => ld.level == this.buildings[b_index].level);
            this.fetch_building_details(building_id, this.buildings[b_index].level_details[l_index].level + (this.buildings[b_index].downgrade ? -2 : 2));
        }
    }

    async save_fetched_building(building) {
        this.fetched_buildings[building.building_id] = building;
    }

    async cancel_building_update(p_building) {
        var b_index = this.buildings.findIndex(building => building.name == p_building);
        if (this.buildings[b_index].update_start !== null) {
            this.buildings[b_index].update_start = null;
            if (this.buildings[b_index].downgrade) {
                this.buildings[b_index].downgrade = 0;
            } else {
                var l_index = this.buildings[b_index].level_details.findIndex(ld => ld.level == this.buildings[b_index].level);
                var changed_resources = {};
                for (var resource_type in this.buildings[b_index].level_details[l_index].upgrade_cost) {
                        changed_resources[resource_type] = this.resources[resource_type] + this.buildings[b_index].level_details[l_index].upgrade_cost[resource_type];
                }
                this.resources = changed_resources;
            }
            this.socket.emit('cancel_building_update', p_building);
            this.update_resource_ui();
            this.update_building_ui(b_index);
            delete this.fetched_buildings[this.buildings[b_index].building_id];
        }
    }

    async downgrade_building(p_building) {
        var b_index = this.buildings.findIndex(building => building.name == p_building);
        var l_index = this.buildings[b_index].level_details.findIndex(ld => ld.level == this.buildings[b_index].level);
        if (this.buildings[b_index].update_start === null && this.buildings[b_index].level_details[l_index].level != 0) {
                this.socket.emit('downgrade_building', p_building);
                this.buildings[b_index].update_start = Math.floor(Date.now() / 1000);
                this.buildings[b_index].downgrade = 1;
                this.update_building_ui(b_index);
        }
    }

    async fetch_building_details(building_id, level) {
        if (this.fetched_buildings[building_id] === undefined) {
            this.fetched_buildings[building_id] = {};
            this.socket.emit('fetch_building_details', [{building_id: building_id, level: level}]);
        }
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

    async update_resource_ui() {
        for (var resource_type in this.resources) {
            document.getElementById(resource_type).innerHTML = Math.floor(this.resources[resource_type]) + ' (' + Math.round(this.resource_prods[resource_type]*3600 * 100)/100 + '/h)';
        }
    }

    async update_building_ui(b_index) {
        var name = this.buildings[b_index].name;
        var level = this.buildings[b_index].level;
        var update_start = this.buildings[b_index].update_start;
        var downgrade = this.buildings[b_index].downgrade;

        var l_index = this.buildings[b_index].level_details.findIndex(ld => ld.level == (this.buildings[b_index].level - downgrade));
        var upgrade_time = this.buildings[b_index].level_details[l_index].upgrade_time;
        if (update_start !== null && !downgrade) {
            l_index = this.buildings[b_index].level_details.findIndex(ld => ld.level == (this.buildings[b_index].level + 1));
        }
        var upgrade_cost = this.buildings[b_index].level_details[l_index].upgrade_cost;
        
        //ui part
        var innerHTML = level;
        if (update_start !== null) {
            var building_time = update_start + upgrade_time - Math.floor(Date.now() / 1000);
            innerHTML += downgrade ? ', Downgrading: ' : ', Ugrading: ';
            innerHTML += building_time + 's' + '<img src="client_side/images/ui/red_cross.png" class="cancel" data-building="' + name + '"></img>';
        }
        document.getElementById(name).innerHTML = innerHTML;
        
        if (update_start !== null) {
            upgrade_time = this.buildings[b_index].level_details[l_index].upgrade_time;
        }
        //button part
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
}

export { Game };