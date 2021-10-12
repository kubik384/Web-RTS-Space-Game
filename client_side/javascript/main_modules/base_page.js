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
}

export { Base_Page };