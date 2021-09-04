"use strict"

class Base_Page {
    async setup_page(parsed_datapack) {
        this.new_reports_count = parsed_datapack.new_reports_count;
        if (this.new_reports_count !== 0) {
            var new_reports_count_div = document.getElementById('new_report_count');
            new_reports_count_div.textContent = this.new_reports_count;
            new_reports_count_div.setAttribute('style', 'display: block');
        }
    }
}

export { Base_Page };