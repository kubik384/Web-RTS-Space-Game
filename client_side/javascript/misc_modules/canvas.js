"use strict"

class Canvas {
    constructor(canvas, draw_func, init_zoom = 0.025, min_zoom = 0.00025, max_zoom = 24) {
        this.canvas = canvas;
        this.width;
        this.height;
        this.logic_loop;
        this.zoom = init_zoom;
        this.min_zoom = min_zoom;
        this.max_zoom = max_zoom;
        this.xOffset = 0;
        this.yOffset = 0;
        this.time_passed;
        this.dragging = false;
        this.dist_travelled = {x: 0, y:0};
        this.draw = draw_func;
        this.ctx = this.canvas.getContext("2d");
        this.rect = this.canvas.getBoundingClientRect();
        window.onresize = this.window_resize_handler();

        /*
        this.canvas.addEventListener('contextmenu', e => {
            e.preventDefault();
            var x = e.clientX - this.xOffset - this.rect.left;// - this.map_canvas_border;
            var y = e.clientY - this.yOffset - this.rect.top;// - this.map_canvas_border;
        });
        */

        this.canvas.addEventListener('wheel', e => {
            e.preventDefault();
            var x = e.clientX - this.rect.left;// - this.map_canvas_border;
            var y = e.clientY - this.rect.top;// - this.map_canvas_border;
            if (e.deltaY < 0) {
                if (this.zoom < max_zoom) {
                    const deltaZoom = 1.25;
                    var oldZoom = this.zoom;
                    this.zoom *= deltaZoom;
                    var zoomRatio = (this.zoom - oldZoom)/oldZoom;
                    this.xOffset += (this.xOffset - x) * zoomRatio;
                    this.yOffset += (this.yOffset - y) * zoomRatio;
                }
            } else {
                if (this.zoom > min_zoom) {
                    const deltaZoom = 0.8;
                    var oldZoom = this.zoom;
                    this.zoom *= deltaZoom;
                    var zoomRatio = (oldZoom - this.zoom)/oldZoom;
                    this.xOffset -= (this.xOffset - x) * zoomRatio;
                    this.yOffset -= (this.yOffset - y) * zoomRatio;
                }
            }
        });

        this.canvas.addEventListener('mouseup', e => {
            /*
            if (e.button == 0) {
                var cursor = {button_code: 0};
                cursor.x = (e.clientX - this.xOffset - this.map_rect.left/* - this.map_canvas_border*//*)/this.zoom;
                cursor.y = (e.clientY - this.yOffset - this.map_rect.top/* - this.map_canvas_border*//*)/this.zoom;
            }
            */
        });

        this.canvas.addEventListener('mousedown', e => {
            //left click
            if (e.button == 0) {
                this.dragging = true;
            }
        });

        window.addEventListener('mouseup', e => {
            //left click
            if (e.button == 0) {
                this.dist_travelled.x = 0;
                this.dist_travelled.y = 0;
                this.dragging = false;
            }
        });

        document.addEventListener('mousemove', e => {
            if (this.dragging) {
                this.xOffset += e.movementX;
                this.yOffset += e.movementY;
                this.dist_travelled.x += Math.abs(e.movementX);
                this.dist_travelled.y += Math.abs(e.movementY);
            }
        });

        window.addEventListener("visibilitychange", () => {
            this.dragging = false;
            this.dist_travelled.x = 0;
            this.dist_travelled.y = 0;
        });
        this.tick_timestamp = Date.now();
        this.draw_timestamp = Date.now();
        window.requestAnimationFrame(this.draw.bind(this));
    }

    window_resize_handler() {
        //var dpi = window.devicePixelRatio;
        var height = +getComputedStyle(this.canvas).getPropertyValue("height").slice(0, -2);
        var width = +getComputedStyle(this.canvas).getPropertyValue("width").slice(0, -2);
        this.width = width; //* dpi;
        this.height = height; //* dpi;
        this.xOffset = width/2;
        this.yOffset = height/2;
        this.canvas.setAttribute('height', this.height);
        this.canvas.setAttribute('width', this.width);
        window.requestAnimationFrame(this.draw.bind(this));
        return this.window_resize_handler.bind(this);
    }
}

export { Canvas };