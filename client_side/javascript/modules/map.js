"use strict"

class Game {
    constructor(socket) {
        this.socket = socket;
        this.map_canvas = document.getElementById("map");
        this.map_ctx = this.map_canvas.getContext("2d");
    }

    async request_data() {
        this.socket.emit('map_datapack_request', document.cookie.split('token=')[1]);
    }

    async setup_game(datapack) {
        this.map_ctx.moveTo(0, 0);
        this.map_ctx.lineTo(200, 100);
        this.map_ctx.stroke();
    }

    window_resize_handler() {
        var dpi = window.devicePixelRatio;
        var map_height = +getComputedStyle(this.map_canvas).getPropertyValue("height").slice(0, -2);
        var map_width = +getComputedStyle(this.map_canvas).getPropertyValue("width").slice(0, -2);
        this.map_canvas.setAttribute('height', map_height * dpi);
        this.map_canvas.setAttribute('width', map_width * dpi);
        return this.window_resize_handler.bind(this);
    }
}

export { Game };