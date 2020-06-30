"use strict"

const saltRounds = 10;
const gameURL = '/game';
var players = {};

var express = require('express');
var app = express();
var mysql = require('mysql');
var http = require('http');
var path = require('path');
var server = http.Server(app);
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser')
var bcrypt = require('bcrypt');
var io = require('socket.io')(server, {pingInterval: 1500});

app.set('port', 8080);
app.use('/client_side', express.static(__dirname + '/client_side'));// Routing

//Credentials for connecting to the db 
var con = mysql.createConnection({
	host: "localhost",
	user: "root",
	password: null,
	port: 3308,
	database: "improvisationalDB"
});
con.connect( err => { if (err) throw err; });

app.use(bodyParser.urlencoded({ extended: false }));

app.use(cookieParser());

app.get('/', function(req, res) {
	res.sendFile(path.join(__dirname + '/client_side', 'pages/index.html'));
});

app.post('/register', function(req, res) {
	var { username, password } = req.body;
	
	if (password != '' && username != '') {
		var sql = "SELECT password FROM players WHERE username = '" + username + "'";
		con.query(sql, function (err, results) {
			if (err) {
				throw err;
			}
			if (results.length == 1) {
				res.sendStatus(401);
			} else {
				bcrypt.hash(password, saltRounds, function(err, hash) {
					if (err) {
						throw err;
					}
					var sql = `INSERT INTO players (username, password) VALUES ('${username}', '${hash}')`;
					con.query(sql, function (err, results) {
						if (err) {
							throw err;
						}
						res.sendStatus(200);
					});
				});
			}
		});
	}
});

app.post('/login', function(req, res) {
	var { username, password } = req.body;
	

	var sql = "SELECT password FROM players WHERE username = '" + username + "'";
	con.query(sql, function (err, results) {
		if (err) {
			throw err;
		}
		if (results.length == 1) {
			bcrypt.compare(password, results[0].password, function(err, passwordsMatch) {
				if (err) {
					throw err;
				}
				if (passwordsMatch) {
					//Client saves username as token, which is then sent from client to the server to authorize actions sent through socket for every action. If players object does not have attribute equal to token, then action is not executed and user is redirected back to login page instead
					players[username] = true;
					res.cookie('token', username, { maxAge: 900000, httpOnly: false });
					//Would use redirect, however according to answers from stack overflow, when using ajax, express redirect does not work and has to be created from client's side instead
					res.send(req.protocol + '://' + req.get('host') + gameURL);
				} else {
					res.sendStatus(401);
				}
			});
		} else {
			res.sendStatus(401);
		}
	});
});

app.get(gameURL, function(req,res) {
	if (req.cookies.token !== undefined) {
		if (players[req.cookies.token]) {
			res.sendFile(path.join(__dirname + '/client_side', 'pages/game.html'));
		} else {
			res.clearCookie('token');
		}
	} else {
		res.redirect(303, '/');
	}
});

// Starts the server
server.listen(8080, function() {
	console.log('Starting server on port 8080');
});

// Add the WebSocket handlers
io.on('connection', socket => {
	socket.on('login_player', token => {
		//game.add_player(socket.id);
		var sql = 'SELECT credit FROM players WHERE username = ?';
		con.query(sql, [token], function (err, result) {
			if (err) {
				throw err;
			} else {
				socket.emit('starter_datapack', result[0].credit);
			}
		});
	});

	socket.on('add_credits', (amount, token) => {
		var sql = `UPDATE players SET credit = credit + ? WHERE username = ?`;
		con.query(sql, [amount, token], function (err, result) {
			if (err) {
				throw err;
			} else {
				socket.emit('added_credits', amount);
			}
		});
	});

	socket.on('disconnect', () => {
		game.remove_player(socket.id);
		//delete players[token];
	});
});

var Game = require('./server_modules/s_game.js');

var game = new Game();