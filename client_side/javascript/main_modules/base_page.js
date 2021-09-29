"use strict"

class Base_Page {
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
}

export { Base_Page };