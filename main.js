"use strict"

var express = require('express');
var app = express();
var http = require('http');
var path = require('path');
var server = http.Server(app);
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var bcrypt = require('bcrypt');
var io = require('socket.io')(server, {pingInterval: 1500});

const DbManager = require('./server_side/main_modules/dbManager.js');
const Game = require('./server_side/main_modules/Game.js');

const saltRounds = 10;
const gameURL = '/game';
const planetURL = gameURL + '/planet';
const mapURL = gameURL + '/map';
const messageURL = gameURL + '/message';
const researchURL = gameURL + '/research';
var dbManager = new DbManager();
var game = new Game(dbManager, io);
const root = __dirname;
var tokens = [];
var socketTable = {};

app.set('port', 8080);
app.use('/client_side', express.static(root + '/client_side'));// Routing

app.use(bodyParser.urlencoded({ extended: false }));

app.use(cookieParser());

app.get('/', function(req, res) {
	res.sendFile(path.join(root + '/client_side', 'pages/index.html'));
});

app.post('/register', function(req, res) {
	var { username, password } = req.body;
	
	if (password != '' && username != '') {
		var query = "SELECT password FROM players WHERE username = ?";
		dbManager.execute_query(query, [username]).then(results => {
			if (results.length == 1) {
				res.sendStatus(401);
			} else {
				bcrypt.hash(password, saltRounds, function(err, hash) {
					if (err) {
						throw err;
					}
					query = "INSERT INTO players (username, password, galaxy_id, space_object_id) VALUES ( ? , ? , ? , ? )";
					dbManager.execute_query(query, [username, hash, 1, 2]).then(() => {
						res.sendStatus(200);
					}).catch(err => { throw err });
				});
			}
		}).catch(err => {
			throw err;
		});
	}
});

app.post('/login', function(req, res) {
	var { username, password } = req.body;
	
	var query = "SELECT password FROM players WHERE username = ?";
	dbManager.execute_query(query, [username]).then(results => {
		if (results.length == 1) {
			bcrypt.compare(password, results[0].password, function(err, passwordsMatch) {
				if (err) { throw err; }
				if (passwordsMatch) {
					//Client saves username as token, which is then sent from client to the server to authorize actions sent through socket for every action. If players object does not have attribute equal to token, then action is not executed and user is redirected back to login page instead
					tokens.push(username);
					//res.cookie('token', username, { maxAge: 900000 });
					//increased for debugging purposes
					res.cookie('token', username, { maxAge: 9000000000 });
					//Would use redirect, however according to answers from stack overflow, when using ajax, express redirect does not work and has to be created from client's side instead
					res.send(req.protocol + '://' + req.get('host') + planetURL);
				} else {
					res.sendStatus(401);
				}
			});
		} else {
			res.sendStatus(401);
		}
	}).catch(err => {
		throw err;
	});
});

app.get(planetURL, function(req,res) {
	if (req.cookies.token !== undefined) {
		if (tokens.findIndex(token => token == req.cookies.token) != -1) {
			res.sendFile(path.join(root + '/client_side', 'pages/planet.html'));
		} else {
			res.clearCookie('token');
			res.redirect(303, '/');
		}
	} else {
		res.redirect(303, '/');
	}
});

app.get(mapURL, function(req,res) {
	if (req.cookies.token !== undefined) {
		if (tokens.findIndex(token => token == req.cookies.token) != -1) {
			res.sendFile(path.join(root + '/client_side', 'pages/map.html'));
		} else {
			res.clearCookie('token');
			res.redirect(303, '/');
		}
	} else {
		res.redirect(303, '/');
	}
});

app.get(messageURL, function(req,res) {
	if (req.cookies.token !== undefined) {
		if (tokens.findIndex(token => token == req.cookies.token) != -1) {
			res.sendFile(path.join(root + '/client_side', 'pages/message.html'));
		} else {
			res.clearCookie('token');
			res.redirect(303, '/');
		}
	} else {
		res.redirect(303, '/');
	}
});

app.get(researchURL, function(req,res) {
	if (req.cookies.token !== undefined) {
		if (tokens.findIndex(token => token == req.cookies.token) != -1) {
			res.sendFile(path.join(root + '/client_side', 'pages/research.html'));
		} else {
			res.clearCookie('token');
			res.redirect(303, '/');
		}
	} else {
		res.redirect(303, '/');
	}
});

app.use(function(req, res){
	res.redirect('/');
});

// Starts the server
server.listen(8080, function() {
	console.log('Starting server on port 8080');
	game.setup_game();
});

// Add the WebSocket handlers
io.on('connection', socket => {
	socket.on('planet_datapack_request', token => {
		socketTable[socket.id] = token;
		dbManager.get_starter_datapack(token).then(datapack => { socket.emit('starter_datapack', JSON.stringify(datapack)); });
	});

	socket.on('upgrade_building', building => {
		var token = socketTable[socket.id];
		dbManager.upgrade_building(token, building).catch(e => {
			if (e != 'Not enough resources to upgrade building') {
				throw e;
			}
		});
	});

	socket.on('fetch_building_details', data => {
		dbManager.get_building_details(data).then(results => { socket.emit('building_fetch_result', results[0]);});
	});

	socket.on('cancel_building_update', building => {
		var token = socketTable[socket.id];
		dbManager.cancel_building_update(token, building);
	});

	socket.on('downgrade_building', building => {
		var token = socketTable[socket.id];
		dbManager.downgrade_building(token, building);
	});

	socket.on('map_datapack_request', (token, layout) => {
		game.addPlayer(socket, token).then(() => {
			socket.gameAdded = true;
			socketTable[socket.id] = token;
			game.get_map_datapack(layout, socket.id).then(result => {socket.emit('map_datapack', JSON.stringify(result))});
		});
	});

	socket.on('build_units', (units) => {
		var token = socketTable[socket.id];
		dbManager.build_units(token, units).catch(e => {
			if (e != 'Not enough resources to build all units' && e != 'Invalid units input received') {
				throw e;
			}
		});
	});

	socket.on('request', (...args) => {
		var request_id = args[0];
		if (request_id === 'restart') {
			restart_server(socket, args[1]);
		} else {
			var token = socketTable[socket.id];
			game.process_request(socket, token, request_id);
		}
	});

	socket.on('set_movepoint', (x, y) => {
		game.set_movepoint(socket.id, x, y);
	});

	socket.on('disconnect', () => {
		//doing this "logs out" the user every time they try to switch pages (e.g. go from planet to map - causes disconnect and is removed from the tokens, which causes them to end up the next time on the login page)
		//tokens.splice(tokens.findIndex(token => token == socketTable[socket.id]), 1);
		delete socketTable[socket.id];
		if (socket.gameAdded !== undefined) {
			game.removePlayer(socket);
		}
	});
});

function restart_server(socket, layout) {
	if (socket !== undefined) {
		var token = socketTable[socket.id];
	}
	delete require.cache[require.resolve('./server_side/main_modules/Game.js')];
	delete require.cache[require.resolve('./server_side/main_modules/dbManager.js')];
	const DbManager = require('./server_side/main_modules/dbManager.js');
	const Game = require('./server_side/main_modules/Game.js');
	dbManager = new DbManager();
	game.stop();
	game = new Game(dbManager, io);
	game.setup_game().then(() => {
		if (socket !== undefined) {
			game.addPlayer(socket, token).then(() => {
				socket.gameAdded = true;
				game.get_map_datapack(layout, socket.id).then(result => {socket.emit('map_datapack', JSON.stringify(result))});
			});
		}
	});
}