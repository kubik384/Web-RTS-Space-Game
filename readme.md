In order to start a server, you need the following:

Wamp server with MySQL
Node with npm
Installed all dependancies (use 'npm install' command)
To start the server, start the MySQL server (wamp), then use script start ('npm start')
MySQL will most likely require a certain databse with set tables, etc.

Use the following parameter order for passing command line arguments:
1 - boolean: set to true to load the game from a file instead of the database
2 - string: the path to the save file from the root directory (e.g. server_side/save_files/save.txt)



*Was trying to use MariaDB, but found out it way too complicated for me to establish a connection with the db server alone. Searching for any type of general advice or already answered similar/same issue proved futile. The database does not seem to be very popular among/friendly to amateurs/beginner programmers


*Server currently lacks any means of security and enables all sorts of attacks. It's intended use is for localhost testing purposes only

For documentation refer to documentation/documentantion.html (outdated, no longer the case)
