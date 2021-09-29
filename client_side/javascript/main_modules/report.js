"use strict"

import { Utils } from '../misc_modules/utils.js';
import { Base_Page } from './base_page.js';
var utils = new Utils();

class Game extends Base_Page {
    constructor(socket) {
        super();
        this.socket = socket;
        this.displayed_reports = [];
        this.received_reports = false;
    }

    async display_reports() {
        if (this.received_reports) {
            console.log(this.report_datapack)
            var reports = this.report_datapack.reports;
            var report_table = document.getElementById('report_table');
            for (var i = 0; i < reports.length; i++) {
                var row = report_table.insertRow();
                var report_title_cell = row.insertCell();
                var report_link = document.createElement('a');
                report_link.setAttribute('id', reports[i].report_id);
                report_link.append(reports[i].title);
                if (!reports[i].gotDisplayed) {
                    var new_report_span = document.createElement('span');
                    new_report_span.append(' (New)');
                    new_report_span.setAttribute('style', 'font-weight: normal');
                    report_link.append(new_report_span);
                }
                report_link.addEventListener('click', function(e) {
                    e.preventDefault();
                    this.request_report_details(e.currentTarget.id);
                }.bind(this));
                if (!reports[i].isRead) {
                    report_link.setAttribute('style', 'font-weight: bold');
                }
                report_title_cell.append(report_link);
                if (!reports[i].gotDisplayed) {
                    this.displayed_reports.push(i);
                }
                var report_date_cell = row.insertCell();
                report_date_cell.append(await utils.miliseconds_to_date(reports[i].timestamp * 1000));
            }
            //send list of the displayed reports to the server
            this.reports = undefined;
            this.displayed_reports = undefined;
            setTimeout(async function() { this.socket.emit('reports_displayed', reports[0].timestamp) }.bind(this), 500);
        } else {
            setTimeout(this.display_reports.bind(this), 200);
        }
    }

    save_reports (report_datapack) {
        this.received_reports = true;
        this.report_datapack = JSON.parse(report_datapack);
    }

    async request_datapack() {
        this.socket.emit('report_datapack_request');
    }

    request_report_details(report_id) {
        this.socket.emit('load_report', report_id);
    }

    async load_report(p_report_details) {
        var report_details = JSON.parse(p_report_details);
        var dialog_id = 'report_container';
        var dialog_overlay_id = 'report_overlay';
        var old_report = document.getElementById(dialog_id);
        if (old_report !== null) {
            var old_overlay = document.getElementById(dialog_overlay_id);
            old_report.remove();
            old_overlay.remove();
        }
        var report_container_id = dialog_id;
        var report_overlay_id = dialog_overlay_id;
        var report_container = document.createElement('div');
        var report_text_paragraph = document.createElement('p');
        report_text_paragraph.append(report_details.text);
        var report_time_paragraph = document.createElement('p');
        report_time_paragraph.append(await utils.miliseconds_to_date(report_details.timestamp * 1000));
        report_container.setAttribute("id", report_container_id);
        report_container.append(report_text_paragraph);
        report_container.append(report_time_paragraph);
        var report_overlay = document.createElement('div');
        report_overlay.setAttribute("id", report_overlay_id);
        report_overlay.addEventListener('click', function() {
            report_container.remove();
            report_overlay.remove();
        });
        document.body.append(report_container, report_overlay);
        document.getElementById(report_details.report_id).style.fontWeight = 'normal';
        setTimeout(async function() { this.socket.emit('report_read', report_details.report_id) }.bind(this), 300);
    }
}

export { Game };