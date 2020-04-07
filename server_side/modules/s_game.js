"use strict"

class Game {
    constructor() {
        this.players = [];
    }

    add_player(p_player) {
        this.players.push(p_player);
    }

    remove_player(p_player) {
        this.players.splice(this.players.findIndex((player) => player = p_player), 1);
    }

    get_player_number() {
        return this.players.length;
    }

    process_command(command) {
        if (command === "help") {
            return ('Fuck you');
        } else {
            return ('Unrecognized command, type help for the list of available commands');
        }
    }
}

module.exports = Game;