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
        this.space_objects = [];
        this.system_center_object;
        this.layout;
    }

    async request_data() {
        this.socket.emit('map_datapack_request', document.cookie.split('token=')[1]);
    }

    async setup_game(p_datapack) {
        var datapack = JSON.parse(p_datapack);
        console.log(datapack);  
        const query_string = window.location.search;
        const url_parameters = new URLSearchParams(query_string);
        this.layout = url_parameters.get('layout');
        this.map_canvas = document.getElementById("map");
        this.map_ctx = this.map_canvas.getContext("2d");
        window.onresize = this.window_resize_handler();
        this.space_objects = datapack.space_objects;
        var system_center_object_index
        for (var i = 0; i < this.space_objects.length; i++) {
            this.space_objects[i].image = document.getElementById(this.space_objects[i].image);
            if (this.space_objects[i].x == 0 && this.space_objects[i].y == 0) {
                system_center_object_index = i;
            }
        }
        this.system_center_object = this.space_objects.splice(system_center_object_index, 1)[0];
        this.xOffset = this.map_width/2;
        this.yOffset = this.map_height/2;
        window.requestAnimationFrame(this.loop.bind(this));
    }

    update(progress) {
        for (var i = 0; i < this.space_objects.length; i++) {
            //changes the speed of the planet according to how far it is from the sun
            //TODO: Assign rotation speed to space objects? Make it possible to go into negative values -> rotate other way (does that happen in space? do all planets rotate the same direction?)
            this.space_objects[i].rot += progress/1000/((2 + Math.abs(this.space_objects[i].x) + Math.abs(this.space_objects[i].y))/2/50*3);
            if (this.space_objects[i].rot > 360) {
                this.space_objects[i].rot -= 360;
            }
        }
    }
    
    draw() {
        this.map_ctx.clearRect(0, 0, this.map_width, this.map_height);
        for (var i = 0; i < this.space_objects.length; i++) {
            this.map_ctx.save();
            this.map_ctx.translate(this.xOffset, this.yOffset);
            //rotation sped up by 256 times for debugging purposes
            this.map_ctx.rotate(this.space_objects[i].rot * 256 * Math.PI / 180);
            this.map_ctx.drawImage(this.space_objects[i].image, this.space_objects[i].x - this.space_objects[i].width/2, this.space_objects[i].y - this.space_objects[i].width/2, this.space_objects[i].width, this.space_objects[i].height);
            this.map_ctx.restore();
        }
        this.map_ctx.drawImage(this.system_center_object.image, this.system_center_object.x + this.xOffset - this.system_center_object.width/2, this.system_center_object.y + this.yOffset - this.system_center_object.width/2, this.system_center_object.width, this.system_center_object.height);
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