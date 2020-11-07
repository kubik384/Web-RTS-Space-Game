"use strict"

class Game {
    constructor(socket) {
        this.socket = socket;
        this.lastRender = 0;
        this.xOffset = 0;
        this.yOffset = 0;
        this.map_canvas;
        this.map_ctx;
        this.map_width;
        this.map_height;
        this.planet;
        this.star;
    }

    async request_data() {
        this.socket.emit('map_datapack_request', document.cookie.split('token=')[1]);
    }

    async setup_game(datapack) {
        this.map_canvas = document.getElementById("map");
        this.map_ctx = this.map_canvas.getContext("2d");
        window.onresize = this.window_resize_handler();
        this.planet = datapack.main_planet;
        this.star = datapack.main_star;
        this.planet.image = document.getElementById("planet");
        this.star.image = document.getElementById("star");
        this.xOffset = this.map_width/2;
        this.yOffset = this.map_height/2;
        window.requestAnimationFrame(this.loop.bind(this));
    }

    update(progress) {
        //changes the speed of the planet according to how far it is from the sun
        this.planet.rot += progress/1000/((this.planet.x + this.planet.y)/2/50*3);
        if (this.planet.rot > 360) {
            this.planet.rot -= 360;
        }
    }
    
    draw() {
        this.map_ctx.clearRect(0, 0, this.map_width, this.map_height);
        this.map_ctx.save();
        this.map_ctx.translate(this.star.x + this.xOffset, this.star.y + this.yOffset);
        this.map_ctx.rotate(this.planet.rot * 256 * Math.PI / 180);
        this.map_ctx.drawImage(this.planet.image, this.planet.x - this.star.x - 5, this.planet.y - this.star.y - 5, 10, 10);
        this.map_ctx.restore();
        this.map_ctx.drawImage(this.star.image, this.star.x + this.xOffset - 80, this.star.y + this.yOffset - 80, 160, 160);
    }
    
    loop(timestamp) {
        var progress = timestamp - this.lastRender;
        
        this.update(progress);
        this.draw();
        
        this.lastRender = timestamp;
        window.requestAnimationFrame(this.loop.bind(this));
    }

    window_resize_handler() {
        var dpi = window.devicePixelRatio;
        var map_height = +getComputedStyle(this.map_canvas).getPropertyValue("height").slice(0, -2);
        var map_width = +getComputedStyle(this.map_canvas).getPropertyValue("width").slice(0, -2);
        this.map_width = map_width * dpi;
        this.map_height =  map_height * dpi;
        this.map_canvas.setAttribute('height', this.map_height);
        this.map_canvas.setAttribute('width', this.map_width);
        return this.window_resize_handler.bind(this);
    }
}

export { Game };