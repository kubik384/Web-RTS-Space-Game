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
var fs = require('fs');
var fsPromises = fs.promises;
var Utils = require('./misc_modules/utils.js');
var utils = new Utils();

const DbManager = require('./main_modules/dbManager.js');
const Game = require('./main_modules/game.js');
const PORT = 8080;

const saltRounds = 10;
const gameURL = '/game';
const planetURL = gameURL + '/planet';
const mapURL = gameURL + '/map';
const reportsURL = gameURL + '/reports';
const reportURL = gameURL + '/report';
const messagesURL = gameURL + '/messages';
const messageURL = gameURL + '/message';
const allianceURL = gameURL + '/alliance';
const researchURL = gameURL + '/research';
const profileURL = gameURL + '/profile';
const leaderboardURL = gameURL + '/leaderboard';
var tokens = [];
//switch to jwt token at some point for authentication?
var token_timeouts = {};
var dbManager = new DbManager();
var game = new Game(dbManager, io);
const root = path.resolve('client_side');
const game_properties = path.resolve('server_side/game_properties');
const conversation_dir = path.resolve('server_side/player_conversations');

app.set('port', process.env.PORT || PORT);
app.use('/client_side', express.static(root));// Routing
app.use('/client_side', express.static(game_properties));

app.use(bodyParser.urlencoded({ extended: false }));

app.use(cookieParser());

app.get('/', function(req, res) {
	res.sendFile(path.join(root, 'pages/index.html'));
});

app.post('/register', async function(req, res) {
	var { username, password } = req.body;
	
	if (password != '' && username != '') {
		var query = "SELECT player_id FROM players WHERE username = ?";
		var results = await dbManager.execute_query(query, [username]);
		var player_count = await dbManager.get_player_count();
		if (player_count < 50) {
			if (results.length == 1) {
				res.status(401).send("Entered username already exists, please select a different username");
			} else {
				bcrypt.hash(password, saltRounds, async function(err, hash) {
					if (err) {
						throw err;
					}
					var so_id = await game.get_player_so();
					await dbManager.register_player(username, hash, so_id);
					res.sendStatus(200);
				});
			}
		} else {
			res.status(401).send("The maximum number of players has been reached");
		}
	}
});

app.post('/login_page/login', function(req, res) {
	var { username, password } = req.body;
	
	var query = "SELECT password FROM players WHERE username = ?";
	dbManager.execute_query(query, [username]).then(results => {
		if (results.length == 1) {
			bcrypt.compare(password, results[0].password, function(err, passwordsMatch) {
				if (err) { throw err; }
				if (passwordsMatch) {
					//Client saves username as token, which is then sent from client to the server to authorize actions sent through socket for every action. If players object does not have attribute equal to token, then action is not executed and user is redirected back to login page instead
					if (!is_valid_token(username)) {
						tokens.push(username);
					}
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
	if (req.cookies !== undefined && req.cookies.token !== undefined) {
		if (is_valid_token(req.cookies.token)) {
			res.sendFile(path.join(root, 'pages/planet.html'));
		} else {
			res.clearCookie('token');
			res.redirect(303, '/');
		}
	} else {
		res.redirect(303, '/');
	}
});

app.get(mapURL, function(req,res) {
	if (req.cookies !== undefined && req.cookies.token !== undefined) {
		if (is_valid_token(req.cookies.token)) {
			res.sendFile(path.join(root, 'pages/map.html'));
		} else {
			res.clearCookie('token');
			res.redirect(303, '/');
		}
	} else {
		res.redirect(303, '/');
	}
});

app.get(messagesURL, function(req,res) {
	if (req.cookies !== undefined && req.cookies.token !== undefined) {
		if (is_valid_token(req.cookies.token)) {
			res.sendFile(path.join(root, 'pages/message.html'));
		} else {
			res.clearCookie('token');
			res.redirect(303, '/');
		}
	} else {
		res.redirect(303, '/');
	}
});

app.get(messageURL, async function(req,res) {
	if (req.cookies !== undefined && req.cookies.token !== undefined) {
		if (is_valid_token(req.cookies.token)) {
			let conversation_id = req.query.id;
			let conversation_file = path.join(conversation_dir, `conversation_${conversation_id}.txt`);
			let readstream = fs.createReadStream(conversation_file);
			readstream.pipe(res);
			readstream.on('error', (err) => {
				if (err.code == 'ENOENT') {
					console.log('Error: Conversation file was not found');
					res.status(409).send();
				} else {
					console.log('Error occured when reading report file: ' + err);
					res.status(500).send();
				}
			});
			res.on('error', (err) => {
				console.log('Error occured when writing out report file: ' + err);
				res.status(500).send();
			});
			readstream.on('finish', () => {
				res.status(200).send();
			});
		} else {
			res.clearCookie('token');
			res.redirect(303, '/');
		}
	} else {
		res.redirect(303, '/');
	}
});


app.get(researchURL, function(req,res) {
	if (req.cookies !== undefined && req.cookies.token !== undefined) {
		if (is_valid_token(req.cookies.token)) {
			res.sendFile(path.join(root, 'pages/research.html'));
		} else {
			res.clearCookie('token');
			res.redirect(303, '/');
		}
	} else {
		res.redirect(303, '/');
	}
});

app.get(reportsURL, function(req,res) {
	if (req.cookies !== undefined && req.cookies.token !== undefined) {
		if (is_valid_token(req.cookies.token)) {
			res.sendFile(path.join(root, 'pages/report.html'));
		} else {
			res.clearCookie('token');
			res.redirect(303, '/');
		}
	} else {
		res.redirect(303, '/');
	}
});

app.get(reportURL, async function(req,res) {
	if (req.cookies !== undefined && req.cookies.token !== undefined) {
		if (is_valid_token(req.cookies.token)) {
			var username = req.cookies.token;
			var report_id = req.query.id;
			var report_details = await dbManager.get_report_details(report_id, username);
			if (report_details !== undefined) {
				if (report_details.file_id !== null) {
					var readstream = await game.get_fr(report_details.file_id);
					readstream.pipe(res);
					readstream.on('error', (err) => {
						if (err.code == 'ENOENT') {
							console.log('Error: Fight Record was not found despite remaining in "available" state');
							res.status(409).send();
						} else {
							console.log('Error occured when reading report file: ' + err);
							res.status(500).send();
						}
					});
					res.on('error', (err) => {
						console.log('Error occured when writing out report file: ' + err);
						res.status(500).send();
					});
					readstream.on('finish', () => {
						res.status(200).send();
					});
				} else {
					res.status(404).send();
				}
			} else {
				res.status(400).send();
			}
		} else {
			res.clearCookie('token');
			res.redirect(303, '/');
		}
	} else {
		res.redirect(303, '/');
	}
});

app.get(allianceURL, function(req,res) {
	if (req.cookies !== undefined && req.cookies.token !== undefined) {
		if (is_valid_token(req.cookies.token)) {
			res.sendFile(path.join(root, 'pages/alliance.html'));
		} else {
			res.clearCookie('token');
			res.redirect(303, '/');
		}
	} else {
		res.redirect(303, '/');
	}
});

app.get(profileURL, function(req,res) {
	if (req.cookies !== undefined && req.cookies.token !== undefined) {
		if (is_valid_token(req.cookies.token)) {
			res.sendFile(path.join(root, 'pages/profile.html'));
		} else {
			res.clearCookie('token');
			res.redirect(303, '/');
		}
	} else {
		res.redirect(303, '/');
	}
});

app.get(leaderboardURL, function(req,res) {
	if (req.cookies !== undefined && req.cookies.token !== undefined) {
		if (is_valid_token(req.cookies.token)) {
			res.sendFile(path.join(root, 'pages/leaderboard.html'));
		} else {
			res.clearCookie('token');
			res.redirect(303, '/');
		}
	} else {
		res.redirect(303, '/');
	}
});

app.listen(3000);

app.use(function(req, res){
	res.redirect('/');
});

// Starts the server
server.listen(process.env.PORT || PORT, function() {
	console.log('Starting server on port ' + PORT);
	game.setup_game();
});

io.use((socket, next) => {
	if (socket.handshake.auth.token !== undefined && tokens.findIndex(token => token == socket.handshake.auth.token) != -1) {
		socket.username = socket.handshake.auth.token;
		socket.token = socket.handshake.auth.token;
		next();
	} else {
		next(new Error("Authentication failed"));
	}
});

// Add the WebSocket handlers
io.on('connection', socket => {
	socket.on('planet_datapack_request', () => {
		dbManager.get_planet_datapack(socket.username).then(datapack => { socket.emit('starter_datapack', JSON.stringify(datapack)); });
	});

	socket.on('update_building', (building_id, downgrade) => {
		if (downgrade == 1) {
			dbManager.downgrade_building(socket.username, building_id);
		} else {
			dbManager.upgrade_building(socket.username, building_id).catch(e => {
				if (e != 'Not enough resources to upgrade building') {
					throw e;
				}
			});
		}
	});


	socket.on('cancel_building_update', building => {
		dbManager.cancel_building_update(socket.username, building);
	});

	socket.on('map_datapack_request', () => {
		game.addPlayer(socket, socket.username).then(() => {
			socket.gameAdded = true;
			game.get_map_datapack(socket.username).then(result => {socket.emit('map_datapack', JSON.stringify(result))});
		});
	});

	socket.on('build_units', (units) => {
		dbManager.build_units(socket.username, units).catch(e => {
			if (e != 'Not enough resources to build all units' && e != 'Invalid units input received') {
				throw e;
			}
		});
	});

	socket.on('request', (...args) => {
		var request_id = args[0];
		var passed_args = args.slice(1);
		if (request_id === 'restart') {
			if (socket.username == 'Newstory') {
				restart_server(socket, passed_args[0]);
			}
		} else {
			game.process_request(socket.username, request_id, passed_args);
		}
	});

	socket.on('set_movepoint', (x, y) => {
		game.set_movepoint(socket.username, x, y);
	});

	socket.on('assign_fleet', (object_type, object_id) => {
		game.assign_fleet(socket.username, object_type, object_id);
	});

	socket.on('send_expedition', (units, length_type) => {
		game.send_expedition(socket.username, units, length_type);
	});

	socket.on('report_datapack_request', () => {
		dbManager.get_report_datapack(socket.username).then(datapack => { socket.emit('report_datapack', JSON.stringify(datapack)); });
	});

	socket.on('load_report', report_id => {
		game.get_report_details(report_id).then(report_details => { socket.emit('report_details', JSON.stringify(report_details)); });
	});

	socket.on('reports_displayed', timestamp => {
		dbManager.mark_reports_displayed(socket.username, timestamp);
	});

	socket.on('report_read', report_id => {
		dbManager.mark_report_displayed(report_id);
	});

	socket.on('get_fr_status', async (report_id) => {
		var report_details = await dbManager.get_report_details(report_id, username);
		socket.emit('fr_availability', (report_details !== undefined && report_details.file_id !== null));
	});

	socket.on('message_datapack_request', () => {
		dbManager.get_message_datapack(socket.username).then(datapack => {socket.emit('message_datapack', JSON.stringify(datapack));});
	});

	socket.on('create_conversation', async (username, subject, text, confirmation_timestamp) => {
		let timestamp = await utils.get_timestamp();
		let conversation_id = (await dbManager.create_conversation(socket.username, username, subject, timestamp)).insertId;
		socket.emit('conversation_created', socket.username, conversation_id, timestamp, confirmation_timestamp);
		let file_path = path.join(conversation_dir, `conversation_${conversation_id}.txt`);
		let file_handle = await fsPromises.open(file_path, 'a+');
		let file = file_handle.createWriteStream();
		file.on('error', (err) => {
			throw (err);
		});
		text.replace(/>/g, "&gt;").replace(/</g, "&lt;");
		file.write(`<${timestamp}_${socket.username}>\n${text}`);
		file.end();
	});

	socket.on('write_message', async (conversation_id, text, confirmation_timestamp) => {
		let timestamp = await utils.get_timestamp();
		socket.emit('message_received', socket.username, timestamp, confirmation_timestamp);
		await dbManager.update_conversation_timestamp(conversation_id, timestamp);
		let file_path = path.join(conversation_dir, `conversation_${conversation_id}.txt`);
		let file_handle = await fsPromises.open(file_path, 'a+');
		let file = file_handle.createWriteStream();
		file.on('error', (err) => {
			throw (err);
		});
		text.replace(/>/g, "&gt;").replace(/</g, "&lt;");
		file.write(`\n<${timestamp}_${socket.username}>\n${text}`);
		file.end();
	});

	socket.on('research_datapack_request', () => {
		dbManager.get_research_datapack(socket.username).then(datapack => { socket.emit('research_datapack', JSON.stringify(datapack)); });
	});

	socket.on('research_technology', tech_id => {
		dbManager.research_technology(socket.username, tech_id);
	});

	socket.on('request_profile_datapack', username => {
		dbManager.get_profile_datapack(username).then(results => { socket.emit('profile_datapack', JSON.stringify(results)); });
	});

	socket.on('request_leaderboard_datapack', () => {
		dbManager.get_leaderboard_datapack(socket.username).then(leaderboard_datapack => { socket.emit('leaderboard_datapack', JSON.stringify(leaderboard_datapack)); });
	});

	socket.on('request_alliance_datapack', () => {
		dbManager.get_alliance_datapack(socket.username).then(alliance_datapack => { socket.emit('alliance_datapack', JSON.stringify(alliance_datapack)); });
	});

	socket.on('invite_alliance', username => {
		dbManager.invite_player(socket.username, username);
	});
	

	socket.on('disconnect', () => {
		//When the player is switching between pages (map, planet, etc.,), they got the set amount of time specified in the timeout to reconnect before getting logged out
		token_timeouts[socket.token] = setTimeout(function() { tokens.splice(tokens.findIndex(token => token == socket.username), 1); }.bind(this), 12000);
		if (socket.gameAdded !== undefined) {
			game.removePlayer(socket.username);
			socket.gameAdded = undefined;
		}
	});
});

//does not refresh the cache of the code for main.js -> any changes in main.js will not be loaded when restarting through FE
function restart_server(socket) {
	var token;
	if (socket !== undefined) {
		token = socket.token;
	}
	delete require.cache[require.resolve('./main_modules/game.js')];
	delete require.cache[require.resolve('./main_modules/dbManager.js')];
	const DbManager = require('./main_modules/dbManager.js');
	const Game = require('./main_modules/game.js');
	dbManager = new DbManager();
	game.stop();
	game = new Game(dbManager, io);
	game.setup_game().then(() => {
		if (socket !== undefined) {
			game.addPlayer(socket, token).then(() => {
				socket.gameAdded = true;
				game.get_map_datapack(socket.username).then(result => {socket.emit('map_datapack', JSON.stringify(result))});
			});
		}
	});
}

function is_valid_token(p_token) {
	var isValid_token = tokens.findIndex(token => token == p_token) != -1
	if (isValid_token) {
		var timeout = token_timeouts[p_token];
		clearTimeout(timeout);
	}
	return isValid_token;
}



/*
NOTES/IDEAS/TODOS:

add alliances = need to add discussions (make it like messages)
add to ui how much a research adds/what it does/unlocks/...

make it possible to orbit bombard planets, steal their resources, destroy them with advanced ships, colonize planets, transport resources, add alliance research (dedicated alliance planet of one of the planets with an alliance lab that costs shitload, etc.). Make planets have limited resources as to force players to have limited impact? Need to finish and polish up the expedition option
finish unit and building descriptions, need to add images
need to also update the saving system and make sure everything is being saved properly while not taking too much space
need to figure out and polish the record system (zip the files to reduce size, improve the ai for certain units a bit, add spectate option and slow down the computation (try to move it onto a seperate thread?))
need to change unit images on the map?
update messages to prevent xss attacks
update login page to prevent injection, xss attemps, etc.
update the login token to something that's not username
need to update code around inputs to be able to handle wrong type of data sent
Need to figure out what to do about the generation of the map and how will new players be added to the game
update BE to include research in flight combat calculations - implement fleets to have "technology upgrades" and if a technology is researched, only by visiting a planet (with buildings that can create the units that are part of the fleet? -> else upgrade only units that can be created in the fleet on that planet? Also require the buildings required for that technology to be available, else the technology cannot be applied?)
implement measures against brute forcing login attempts, spamming messages or any other commands (fleet move point, upgrade, cancel upgrade, ..)

save login and certain actions data?
fix the issues with speed control for fight records -> pausing during the end causes some of the units that should've been destroyed to stay on the canvas + when paused and unpaused, there's clearly an issue with interpol going over the board, which should've been fixed by adjusting the value of last tick timestamp?
issues with placing projectiles (rotation issue?)

remake the dialog ui more to an image of a "science-fiction scroll" with the middle being a screen while the top and bottom are thin holders
update code to enable translations
make fleet fight animation for people to see -> select some sort of spectate button or something -> animation of the left panel moving to the right, taking the rest of the page (make it possible to make it fullscreen?)
fix the server updates array for map
make fight execution calculate another thread?
remake report texts -> use ids instead of text to save space
add dark mode?
add technology requirements even into the panel itself
need to update messages to have checks in the username field (also on the BE), lengths of text, etc.
add titles to the available resources and units in Planet
update the metainfo for google
implement energy to get ready for the goal of making cubes around suns, extracting gas from gas giants, etc -> alliance goals as well as endgame goals
add tech to enable recyclators to gather res from asteroids and also gives them very weak fighting capabilities?
opening profile ifram (basically another page while being logged on the same account) causes log outs -> fix

make certain shields/ship hulls more resistant to weaker-type weapons? e.g. corvette have 40%/60% dmg reduction against light laser?
gauss cannon - cannon shooting high-density material at extremely high velocities (https://en.wikipedia.org/wiki/Coilgun), ion cannon - firing a beam made purely out of positrons which effectivelly drains shield energy, beam cannon -> fires a highly-concetrated beam of electrons at extreme speeds Electrons however do not interact with shield energy, which effectivelly deflects them, making them ineffective when fired against shielded targets, plasma cannon -> firing extremely heated and compressed (concentrated) particles of neutral gas (https://en.wikipedia.org/wiki/Plasma_(physics)), neutron cannon -> works like gauss cannon, however, instead of shooting high-density materials such as Osmium, Platinum or Iridium, the cannon's technology enables it to fire neutron superfluid which creates a strong grativational fields even at molecular quantities at even higher velocities, making it the ultimate weapon of destruction (https://www.google.com/search?q=neutron+star+consists+of&sxsrf=AOaemvIFovoJRs4xUP61-XXvg-yLKIPslA%3A1634659719605&ei=h-1uYaygJIbXkwW4rZvgAQ&ved=0ahUKEwjs_6j_7dbzAhWG66QKHbjWBhwQ4dUDCA4&uact=5&oq=neutron+star+consists+of&gs_lcp=Cgdnd3Mtd2l6EAMyBQgAEIAEMgYIABAWEB46BAgjECc6BAgAEEM6BAguEEM6CwguEIAEEMcBENEDOgUILhCABDoFCAAQywE6BQguEMsBOgoIABCABBCHAhAUOgUIABCRAkoECEEYAFCotQhYuOoIYL7rCGgIcAJ4AIABnwGIAdAXkgEFMjAuMTCYAQCgAQHAAQE&sclient=gws-wiz)
specialized ships made for strenghtening and supplying other ship's shields or making a bigger shield 

Have x layers of the space to make it feel more 3D? Interface - selecting a fleet displays images and names of ships (left side of the page, takes half page, can be scrolled through, shows hp, shields, fire power). Selecting a ship displays the state of the ship and it's crew (takes half page, right side of the page, displays detailed state of the ship and it's crew). Also the rarer the metal for a research/building something is needed, the more it metals it consumes (ratio - steel:metal = 1, iridium:metal = 10000)
Needs to be grid-like turn-based. Unfortunately can't be real-time for thousands of players (too much server load). Update the grid every minute? 
try the app with throttling - increase delay to 200ms


remake the player creating/deleting triggeres to be part of the js code to prevent forgetting about it or something messing up?
TECHNOLOGIES:

Beginner ones - 
Kerosene propellant
satellites with basic radio (do radio waves carry through space - how did sputnik 1 communicated?) function utilizing batteries

avorion - for inspiring
https://www.youtube.com/watch?v=tCx9uxLc6b8 - inspirace
https://www.google.com/search?q=infinitum+game&sxsrf=AOaemvIumH-03ABs7lhVznolvVSe80fBzA:1633716930243&source=lnms&tbm=isch&sa=X&ved=2ahUKEwjl9KjqtbvzAhWil4sKHZbmDAwQ_AUoAXoECAEQAw&biw=1920&bih=947&dpr=1#imgrc=rv8RirzazKHODM


instead of making shield stronger for each higher class ship, make the shields take different % damage from different weapon types? e.g. Cruiser shield would take only 40% dmg from Fighters, while e.g. 150% from battleship heavy-laser type cannons?
isntead of upgrading buildings, make them upgraded thorugh research -> research a tech and then cost for implementing it in selected buildings
make attacks from behind/traps/whatever possible -> destroy transporters with fuel, threatening the fleet to run out of fuel and getting stuck?
make player classes? maybe just make the research classes? enable the players who don't have a lot of time to play the game to focus on making resources, etc., and also give access to different types of ships for different types of players -> the "less time" players can have large transporters as the only class?

make planets closer to sun be less habitable, but create more energy from solar plants through sun (needs to build hydroponic farms instead of orchads, people are less happy) people can get replaced by robots, etc., make energy production fluctuate according to the distance of the planet from the sun. Make it possible to built houses over appartments -> increases pop happiness, but costier/takes more place on the planet/map grid?
power lines also a "building" that can be upgraded? or transformers or something that decides how much energy can be transported max. to a singular building?
limit max amount of ships by food or something? Maybe make building ships unlimited, but in order to use them, they need to be populated with pop -> limiting the amount of ships one can send out, but not how many one can create?

make a max. speed limit for fleets?
make fleets slow down when flying over a space object? make it look like they are flying "over" the space object? Those closer they are to the center, the slower they fly, also affected by how big the object is
assigning a fleet to a space object is now a hack on how to "nullify" fleet's velocity instantly -> need to make some limitation that only if the fleet is below certain speed can it get assigned to a space object
make abandoned fleets able to crash into space objects? able to recover some of the resources if it's like a planet or something, not from sun or other "flaming" objects
add z to the game -> e.g. if fleets are flying over a space object, their z goes up and so their size goes up as well, since they are getting closer to the camera
center icon to the right of the fleet name in the left pane on map -> select that to center on that fleet on the canvas (and zoom in)
consider prototype way of researching
ship names -> https://www.youtube.com/watch?v=303_Xj8FKJU
Further available reasearch
Fusion - utilizes deuterium (plasma technology)
ICBM - research for stronger explosives (default would be nuclear from uranium)
Warp engine - utilizes antimatter, builds from crystals
super conductors (enabling quantum computers, ...)
Quantum computers?
Technologies for more efficient resource gathering
Spying technologies with hiding, jamming etc. capabilities
Defensive batteries, technologies
Technologies for countering ICBM
Laser
Ion
AI technologies
Technologies increasing research speed (such as AI, quantum computers, ...)
dyson spehere
Energy technologies - nuclear energy replacing coal, ... (https://www.youtube.com/watch?v=pP44EPBMb8A)
https://www.youtube.com/watch?v=ulCdoCfw-bY - goal of the game? Endgame?
Shields technologies, intergallactic technologies to gain resources from other planets, asteroids, etc.
https://www.youtube.com/watch?v=v3y8AIEX_dU
transport technologies, weapons for armies, weapons for space battleships, etc.
https://www.youtube.com/watch?v=p_8yK2kmxoo
technology - replace crew with ai - slightly better aim, etc., but easier to damage the ships or take out or something. Also can't abandon or betray you on expeditions?
ships with augments?
https://elite-dangerous.fandom.com/wiki/Miner


Be able to steal resources or research better ways to gather resources and from deeper heights?
Finite non-renewable resources - technologies to be able to replace them/produce them other ways, ...
https://en.wikipedia.org/wiki/List_of_Star_Trek_materials
https://www.space.com/21201-star-trek-technology-explained-infographic.html


naprogramovat základní reserach tree -> lock a player into certain branch of the research tree that are dedicated to certain playstyles? Such as Raider, Nomad, Turtle, Spy, ... And then, have specific technologies tied to specific buildings and their level? Or maybe all technologies will be researched in a research lab? Or perhaps both -> research most technologies in research lab, but need a building of a specific level to create a prototype using the technology? Or maybe just tie it to both -> need certain building and level AND a lab and a certain level of the lab. 
https://preview.redd.it/qlat38v3lp351.png?width=1912&format=png&auto=webp&s=8eb2babe3bed09cb16997ae88d56edad7376e87e
https://www.pcgamesn.com/wp-content/uploads/2021/04/stellaris-tech-tree-tool.jpg
naprogramovat sending fleets to expeditions - inspiration: https://ogame.fandom.com/wiki/Expedition
make messages that will be decided and added to the original message after the event has been calculated/happened/whatever? Like fighting off pirates - The fleet has managed to fight off the attacking pirate fleet. The return time will be significantly extended due to the damage suffered
if need more gun technologies inspiration (e.g. dark energy calibrated radiation waves/beams/...?) -> https://www.google.com/search?q=dark+matter&sxsrf=AOaemvKU_j4z1bTICChU_i83dRagW-7wMQ%3A1634659748400&ei=pO1uYeHaF8-5kwW6g4ngDA&ved=0ahUKEwjhvIaN7tbzAhXP3KQKHbpBAswQ4dUDCA4&uact=5&oq=dark+matter&gs_lcp=Cgdnd3Mtd2l6EAMyBQgAEJECMgsILhCABBDHARCvATIFCC4QywEyBQguEIAEMgUIABDLATIFCAAQywEyBQgAEMsBMgUILhDLATIFCAAQgAQyBQgAEMsBOgcIABBHELADOgQIIxAnOgQIABBDOgsILhCABBDHARCjAjoLCC4QgAQQxwEQ0QM6BAguEEM6DQguEMcBEK8BEAoQywE6CAgAEMsBEIsDOg4ILhCABBDHARCvARCLA0oECEEYAFCInQhYoqYIYISnCGgCcAJ4AIABeYgBrwiSAQMyLjiYAQCgAQHIAQi4AQLAAQE&sclient=gws-wiz
https://en.wikipedia.org/wiki/Coilgun
https://www.google.com/search?q=photon+cannon&oq=photon+cannon&aqs=chrome..69i57j0i512l4j0i10i512j0i512l4.1531j0j7&sourceid=chrome&ie=UTF-8
https://en.wikipedia.org/wiki/Ion_gun (-> usable terms e.g. "ion flux")
https://starcitizen.fandom.com/wiki/List_of_ship_and_vehicle_weapons
some kind of funny meme cannon - like gauss blurr, able to slowly blurr ships out of existence, or just decreasing their quality until they turn into a fighter, or something?

create in-game events, such as issues with pollution, potential nuclear plants explosion(?), etc.

have technologies divided into trees? - like for fleet improvements for aggressive players, resource gatherers from space, resource gatherers from planets - even for specific rare resources?, nomads - move among planets, gathering resources and being able to run from enemies?, defensive players - allows masking planets, information players - allows to mask fleets and spy on players? Also have some sort of intention declaring function - such as personal friendship/war etc. declaring that the information players can figure out? - they can't and shouldn't be able to access messages from other players, since there can even be some privat information, also people would use outside ways of communication to avoid this feature from being used against them. Have some sort of also psychology technologies for affecting players, making their population rebel, steal resources and deliver them to the manipulating player or even ships, etc.?

technologies to move own planet - propel and to be able to survive without sun? - nomads = ppl who use ships to transport themselves around the universe, gather resources and build more ships. This technology enables to make the entire planet into a "ship"?

at the beginning, see stars as only small shining stars, not knowing their exact distance and size? Only when research progresses, the planets size, look and distance becomes more clear

implement space culture?

add discord integration?

naprogramovat using asteroid resources with the fleet - issues: moving planet prevents the fleet from settling on it, too much speedup - crashes into planet - need the fleet to slow down more when closer to the target - especially if the target is moving it's direction

add aliens to expeditions, attacking fleets? And slowly increase the chances of running into an abandoned fleet filled with aliens as the world grows older?
*/