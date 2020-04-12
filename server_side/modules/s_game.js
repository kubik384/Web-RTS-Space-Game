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

    process_command(command, player) {
        if (command.length > 1) {
            var command_keywords = str.split(" ");  
            var expect = '';
            switch(command_keywoards) {
                case 'build':
                    expect = 'building';
                    break;
                case 'demolish':
                    expect = 'building';
                    break;
            }
        } else {
            return 'Command not recognized';
        }
    }
}

module.exports = Game;