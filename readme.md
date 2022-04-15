In order to start a server, you need the following:

Wamp server with MySQL
Node with npm
Installed all dependancies (use 'npm install' command)
To start the server, start the MySQL server (wamp) (needs to be port 3306, user with username root without set password), then use script start ('npm start')
Import the database from the database folder

Use the following parameter order for passing command line arguments:
1 - string: the path to the save file from the root directory (e.g. server_side/save_files/save.txt)



*Was trying to use MariaDB, but found out it way too complicated for me to establish a connection with the db server alone. Searching for any type of general advice or already answered similar/same issue proved futile. The database does not seem to be very popular among/friendly to amateurs/beginner programmers


*Server currently lacks any means of security and enables all sorts of attacks. It's intended use is for localhost testing purposes only

For documentation refer to documentation/documentantion.html (outdated, no longer the case)


I've given up on this project due to lack of time to work on it further. Unfortunately, I've been planning a huge code optimization and refactor for a long time, but never got to do it. And with the lack of comments, reading the code is likely very difficult. If you've somehow managed to find this project and for some reason wish to understand or utilize any of the code, feel free to add me on discord and ask away - Newstory#1476







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