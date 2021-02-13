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

const DbManager = require('./modules/dbManager.js');

const saltRounds = 10;
const gameURL = '/game';
const planetURL = gameURL + '/planet';
const mapURL = gameURL + '/map';
const messageURL = gameURL + '/message';
const researchURL = gameURL + '/research';
const dbManager = new DbManager();
const root = path.resolve(__dirname, '..');
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
					query = "INSERT INTO players (username, password) VALUES ( ? , ? )";
					dbManager.execute_query(query, [username, hash]).then(() => {
						res.sendStatus(200);
					}).catch(err => { console.log(err) });
				});
			}
		}).catch(err => {
			console.log(err);
		});
	}
});

app.post('/login', function(req, res) {
	var { username, password } = req.body;
	
	var query = "SELECT password FROM players WHERE username = ?";
	dbManager.execute_query(query, [username]).then(results => {
		if (results.length == 1) {
			bcrypt.compare(password, results[0].password, function(err, passwordsMatch) {
				if (err) {
					throw err;
				}
				if (passwordsMatch) {
					//Client saves username as token, which is then sent from client to the server to authorize actions sent through socket for every action. If players object does not have attribute equal to token, then action is not executed and user is redirected back to login page instead
					tokens.push(username);
					res.cookie('token', username, { maxAge: 900000 });
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
		console.log(err);
	});
});

app.get(planetURL, function(req,res) {
	if (req.cookies.token !== undefined) {
		if (tokens.findIndex(token => { if (token == req.cookies.token) { return true; } }) != -1) {
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
		if (tokens.findIndex(token => { if (token == req.cookies.token) { return true; } }) != -1) {
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
		if (tokens.findIndex(token => { if (token == req.cookies.token) { return true; } }) != -1) {
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
		if (tokens.findIndex(token => { if (token == req.cookies.token) { return true; } }) != -1) {
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
});

// Add the WebSocket handlers
io.on('connection', socket => {
	//Planet
	socket.on('planet_datapack_request', token => {
		socketTable[socket.id] = token;
		dbManager.get_starter_datapack(token, result => { socket.emit('starter_datapack', JSON.stringify(result)) });
	});

	socket.on('upgrade_building', building => {
		var token = socketTable[socket.id];
		dbManager.upgrade_building(token, building);
	});

	socket.on('fetch_building_details', data => {
		dbManager.get_building_details(data).then((results) => {
			socket.emit('building_fetch_result', results[0]);
		});
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
		socketTable[socket.id] = token;
		dbManager.get_map_datapack(layout, result => { socket.emit('map_datapack', JSON.stringify(result)) });
	});

	socket.on('disconnect', () => {
		tokens.slice(tokens.findIndex(token => { if (token == socketTable[socket.id]) { return true; } }), 1);
		delete socketTable[socket.id];
	});
});