"use strict"

import { Utils } from '../misc_modules/utils.js';
var utils = new Utils();

class Game {
    constructor(socket) {
        this.socket = socket;
        this.displayed_reports = [];
        this.received_reports = false;
    }

    async setup_game() {
        if (this.received_reports) {
            var reports = JSON.parse(this.reports);
            var report_table = document.getElementById('report_table');
            for (var i = 0; i < reports.length; i++) {
                var row = report_table.insertRow();
                var report_title_cell = row.insertCell();
                var report_link = document.createElement('a');
                report_link.setAttribute('data-report_id', reports[i].report_id);
                report_link.append(reports[i].title);
                report_link.addEventListener('click', function(e) {
                    e.preventDefault();
                    this.load_report(e.currentTarget.dataset.report_id);
                }.bind(this));
                if (!reports[i].isRead) {
                    report_link.setAttribute('style', 'font-weight: bold');
                }
                report_title_cell.append(report_link);
                if (!reports[i].gotDisplayed) {
                    this.displayed_reports.push(i);
                }
                var report_date_cell = row.insertCell();
                report_date_cell.append(await utils.seconds_to_time(Math.floor(reports[i].timestamp/1000)));
            }
            //send list of the displayed reports to the server
            this.reports = undefined;
            this.displayed_reports = undefined;
        } else {
            setTimeout(this.setup_game.bind(this), 200);
        }
    }

    save_reports (reports) {
        this.received_reports = true;
        this.reports = reports;
    }

    async request_data() {
        this.socket.emit('report_datapack_request', document.cookie.split('token=')[1]);
    }

    load_report(report_id) {
        console.log(report_id);
    }
}

export { Game };