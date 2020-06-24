"use strict"

class Game {
    constructor() {
        this.players = [];
        this.buildingList = ['testBuilding']; //Load later from db
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

    getExpectedKeyword(keyword) {
        switch(keyword) {
            case 'build':
                expect = 'building';
                break;
            case 'demolish':
                expect = 'building';
                break;
            case 'register':
                expect = 'any';
            case 'login':
                expect = 'any';
        }
    }

    process_command(command, player) {
        if (command.length > 1) {
            var command_keywords = str.split(" ");
            var expect = '';
            for (var i = 0; i < command_keywords.length; i++) {
                switch(command_keywords[i]) {
                    case 'build':
                        expect = 'building';
                        break;
                    case 'demolish':
                        expect = 'building';
                        break;
                    case 'register':
                        expect = 'any';
                    case 'login':
                        expect = 'any';
                }
                if (command_keywords[i+1] != expect) {
                    return 'Expected: ' + expect + ' after: ' + command_keywords[i] + ' got ' + command_keywords + ' instead';
                }
            }
            
        } else {
            return 'Command not recognized';
        }
    }
}

module.exports = Game;