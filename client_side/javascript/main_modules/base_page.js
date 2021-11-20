"use strict"

class Base_Page {
    constructor() {
        this._units_details = sessionStorage.getItem('units_details');
        if (this._units_details === null) {
            this.units_details_promise = new Promise(async function(resolve, reject) {
                var response = await fetch('/client_side/units.json');
                var response_text = await response.text();
                resolve(sessionStorage.setItem('units_details', response_text));
            });
        } else {
            this._units_details = JSON.parse(this._units_details);
        }
        this._buildings_details = sessionStorage.getItem('buildings_details');
        if (this._buildings_details === null) {
            this.buildings_details_promise = new Promise(async function(resolve, reject) {
                var response = await fetch('/client_side/buildings.json');
                var response_text = await response.text();
                resolve(sessionStorage.setItem('buildings_details', response_text));
            });
        } else {
            this._buildings_details = JSON.parse(this._buildings_details);
        }
        this._unit_weapons = sessionStorage.getItem('unit_weapons');
        if (this._unit_weapons === null) {
            this.unit_weapons_promise = new Promise(async function(resolve, reject) {
                var response = await fetch('/client_side/unit_weapons.json');
                var response_text = await response.text();
                resolve(sessionStorage.setItem('unit_weapons', response_text));
            });
        } else {
            this._unit_weapons = JSON.parse(this._unit_weapons);
        }

        /*
        sessionStorage.getItem('units_details').then(units_details => {
            if (units_details === null) {
                this.units_details_promise = fetch('/client_side/units.json')
                .then(response => { sessionStorage.setItem('units_details', response.text()) });
            } else {
                this._units_details = JSON.parse(units_details);
            }
        }).bind(this);
        JSON.parse(sessionStorage.getItem('units_details')).then(buildings_details => {
            if (buildings_details === null) {
                this.buildings_details_promise = fetch('/client_side/buildings.json')
                .then(response => { sessionStorage.setItem('buildings_details', response.text()) });
            } else {
                this._buildings_details = JSON.parse(buildings_details);
            }
        }).bind(this);
        */
    }

    async setup_page(parsed_datapack) {
        if (parsed_datapack.new_reports_count != 0) {
            var new_reports_count_div = document.getElementById('new_report_count');
            new_reports_count_div.textContent = parsed_datapack.new_reports_count;
            new_reports_count_div.setAttribute('style', 'display: block');
            document.title += ' (' + parsed_datapack.new_reports_count + ')';
        }
    }

    async add_new_report_counter() {
        var new_reports_count_div = document.getElementById('new_report_count');
        var new_reports_count = +new_reports_count_div.textContent;
        new_reports_count_div.textContent = ++new_reports_count;
        if (new_reports_count == 1) {
            var new_reports_count_div = document.getElementById('new_report_count');
            new_reports_count_div.setAttribute('style', 'display: block');
            document.title += ' (' + new_reports_count + ')';
        } else {
            var title = document.title;
            document.title = title.substr(0, title.length - 2) + new_reports_count + ')';
        }
    }

    draw_grid(ctx, x, y, xOffset, yOffset, cell_width, cell_height, width, height, zoom, angle = 0, translate = true) {
        if (translate || angle != 0) {
            ctx.save();
        }
        if (angle != 0) {
            ctx.rotate(angle);
        }
        if (translate) {
            ctx.translate(xOffset, yOffset);
        }
        var rows = Math.floor(width/cell_width);
        var columns = Math.floor(height/cell_height);
        ctx.strokeStyle = "red";
        ctx.lineWidth = 1;
        cell_width *= zoom;
        cell_height *= zoom;
        width *= zoom;
        height *= zoom;
        for (var i = 0; i <= columns; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x + cell_width * i, y);
            this.ctx.lineTo(x + cell_width * i, y + height);
            this.ctx.stroke();
        }
        for (var i = 0; i <= rows; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, y + cell_height * i);
            this.ctx.lineTo(x + width, y + cell_height * i);
            this.ctx.stroke();
        }
        if (translate || angle != 0) {
            ctx.restore();
        }
    }

    async get_bld_details(building_id) {
        return (await this.get_buildings_details()).find(bd => bd.building_id == building_id);
    }

    /**
     * 
     * @param {Number|Object} building Either an index of the building in this.buildings_details or a building object with level details
     * @param {Number} lvl Current level of the building
     * @returns Level Details object
     */
    async get_bld_lvl_dts(building, lvl) {
        if (typeof building == 'number') {
            return (await this.get_buildings_details())[bld_index].level_details.find(ld => ld.level == lvl);
        } else {
            return building.level_details.find(ld => ld.level == lvl);
        }
    }

    async get_unit_dts(unit_id) {
        return (await this.get_units_details()).find(ud => ud.unit_id == unit_id);
    }

    async get_units_details() {
        if (this._units_details === null) {
            await this.units_details_promise;
            this._units_details = JSON.parse(sessionStorage.getItem('units_details'));
        }
        return this._units_details;
    }

    async get_buildings_details() {
        if (this._buildings_details === null) {
            await this.buildings_details_promise;
            this._buildings_details = JSON.parse(sessionStorage.getItem('buildings_details'));
        }
        return this._buildings_details;
    }

    async get_unit_weapon_dts(weapon_id) {
        return (await this.get_unit_weapons_dts()).find(uw => uw.weapon_id == weapon_id);
    }

    async get_unit_weapons_dts() {
        if (this._unit_weapons === null) {
            await this.unit_weapons_promise;
            this._unit_weapons = JSON.parse(sessionStorage.getItem('unit_weapons'));
        }
        return this._unit_weapons;
    }
}

export { Base_Page };