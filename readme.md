In order to start a server, you need the following:

Wamp server with MySQL
Node with npm
Installed all dependancies (use 'npm install' command)
To start the server, start the MySQL server (wamp), then use script start ('npm start')
MySQL will most likely require a certain databse with set tables, etc.

TODO:
Add token generator for authentication. Redirect anyone trying to access /game without valid token. Start saving user progress - building buildings, getting resources, etc.
start adding JSDOC (documentation)



*Was trying to use MariaDB, but found out it way too complicated for me to establish a connection with the db server alone. Searching for any type of general advice or already answered similar/same issue proved futile. The database does not seem to be very popular among/friendly to amateurs/beginner programmers


*Server currently lacks any means of security and enables all sorts of attacks. It's intended use is for localhost testing purposes only