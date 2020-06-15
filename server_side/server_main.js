"use strict"

var express = require('express');
var app = express();
var mysql = require('mysql');
var http = require('http');
var path = require('path');
var server = http.Server(app);
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt');
var io = require('socket.io')(server, {pingInterval: 1500});

app.set('port', 8080);
app.use('/client_side', express.static(__dirname + '/../' + '/client_side'));// Routing

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

app.get('/', function(req, res) {
	res.sendFile(path.join(__dirname + '/../' + '/client_side', 'pages/index.html'));
});

app.post('/register', function(req, res) {
	res.send('test');
});

app.post('/login', function(req, res) {
	res.send('test');
});

app.post('/game', function(req,res) {
	var username = req.body.uName;
	var password = req.body.psw;
	

	var sql = "SELECT password FROM players WHERE Username = '" + username + "'";
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
					res.sendFile(path.join(__dirname + '/../' + '/client_side', 'pages/game.html'));
				} else {
					console.log('Passwords do not match');
					//send error message to be displayed to the client
				}
			});
		}
	});	
});

// Starts the server
server.listen(8080, function() {
	console.log('Starting server on port 8080');
});

// Add the WebSocket handlers
io.on('connection', socket => {
	socket.on('new_player', () => {
		socket.emit('Message', 'Connection established...');
		game.add_player(socket.id);
		socket.emit('Message', 'Number of players: ' + game.get_player_number());
	}); 

	socket.on('command', command => {
		socket.emit('Message', game.process_command(command), socket.id);
	})

	socket.on('disconnect', () => {
		game.remove_player(socket.id);
	});
});

var Game = require('./modules/s_game.js');

var game = new Game();