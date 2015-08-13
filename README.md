# CATS Reference Collections Database

This application was created for cataloguing and retrieving a collection of samples related to the conservation of artwork. This includes paint cross sections, pigments, fibres and various other materials. In addition, any related analysis can also be cataloged. Search results can be viewed individually online, or downloaded as an excel file.

The technology stack for this application is a node/Express Server, Angularjs frontend and Mongodb database.

## Dependencies

For linux, it's recommended to create a user named *node* (the name isn't important - just not root) for running the server.

### Node.js
The application uses *nodejs* to create an http server. To install the latest stable version in Debian, login as *root* and 
install the following

	$ apt-get install curl
	$ curl -sL https://deb.nodesource.com/setup | bash -
	$ apt-get install -y nodejs
	
The remaining instructions may not require *root* so switch to the *node* user.

### Package managers
Npm is required for managing the *node.js* libraries which aren't included in the source.

	$ sudo apt-get install npm

Bower is required for managing the *angularjs* libraries which aren't included in the source. It can be installed using *npm*.

	$ sudo npm install -g bower
	
### Build manager
Grunt will be used to clean and minify the code

	$ sudo npm install -g grunt-cli

### Mongodb
Mongo is used to store the data, users and to persist the sessions. This was tested with version 2.6.5. Visit the link below for installation instructions.

[http://docs.mongodb.org/manual/administration/install-on-linux/](http://docs.mongodb.org/manual/administration/install-on-linux/)

For example, here's the instructions to fetch the latest stable release in Ubuntu

	$ sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10
	$ echo 'deb http://downloads-distro.mongodb.org/repo/ubuntu-upstart dist 10gen' | sudo tee /etc/apt/sources.list.d/mongodb.list
	$ sudo apt-get update
	$ sudo apt-get install -y mongodb-org
	
Move the mongod logs and data to a location accessible by the *node* user

	$ mkdir -p /home/node/mongo/data/db
	$ mkdir -p /home/node/mongo/log/
	$ vi /etc/mongod.conf
		
		dbpath=/home/node/mongo/data/db
		logpath=/home/node/mongo/log/mongod.log
		
###graphicsmagick
For example on Ubuntu

	$ sudo add-apt-repository ppa:dhor/myway
	$ sudo apt-get update
	$ sudo apt-get install graphicsmagick

### Code repository
The project resides on github and requires *git*.

	$ sudo apt-get install git

## How to use

Clone the repository and install the Node and Angular dependencies:

    git clone https://github.com/StatensMuseumforKunst/CATSReferenceCollectionsDb.git
    npm install
    bower install

### Running the application
To run the tests and create the production files, just run grunt:

    grunt

To create the production files without tests (tests require mongod to be running and the correct version of PhantomJS to be installed) use the following command instead:

    grunt clean copy jadeUsemin

To start the app in production mode (uses minified and concatenated js files):

    NODE_ENV=production node app.js
    
Otherwise, to run in development mode, just use:

    NODE_ENV=development node app.js
    
Server runtime logs will be written to ./catsdb.log (logs are configurable in logging.js).

### User management
There is no user interface for managing users of the application, so this needs to be done 'by hand' using the '/user' api 
provided by the Node server, or by logging directly into the database shell. The application will start up with one default 
adminstrator (admin@smk.dk:admin). The password should be changed at first login.

**To create a new user or change existing users password using the api**

First start the application. Then login as admin in the UI, and record the connect.sid cookie received in the login response 
(you'll need firebug or similar to find the cookie). Next use curl to post a request to the enb reports api "user" service using the 
cookie. If changing password, send the user the new password and ask them to change it again themselves upon first login.

	$ curl -H "Content-Type: application/json" --cookie "connect.sid=s%3AIzaNbY6BuBKwcZxkdKI73Mo4.S6hhH7mzJPooqfXPI4TPIdKZws3Cxq3lDYmL%2FEtqgNw"  -d '{"username":"a_user@smk.dk", "password":"a_password", "role":"default"}' http://evakueringsrapporter:3000/user

**To delete a user using the api**

As above, login as admin and record the "connect.sid" cookie and use this service to delete the user

	$ curl -X DELETE --cookie "connect.sid=s%3AIzaNbY6BuBKwcZxkdKI73Mo4.S6hhH7mzJPooqfXPI4TPIdKZws3Cxq3lDYmL%2FEtqgNw" 'http://evakueringsrapporter:3000/user?username=bob@smk.dk'

**To reset the admin user using the database shell**

After installing the app, login to mongo shell ("mongo") and run the following command (replace the ObejctId with the correct id for the admin user)

	> db.users.update({username: "admin@smk.dk"},{ "_id" : ObjectId("53fae078e001c8c6af798ecd"), "username" : "admin@smk.dk", "password" : "$2a$10$j4GD2P.isxPBgMCcEiFrPOBbRl4uTpeG.qQKe.trtnNj1M1yrF.te", "role" : "admin" }, {upsert:"true"})

**To create a new user using the database shell**

	> db.users.insert({"username" : "some.one@smk.dk", "password" : "$2a$10$j4GD2P.isxPBgMCcEiFrPOBbRl4uTpeG.qQKe.trtnNj1M1yrF.te", "role" : "default" })

### Managing the application lifetime
Install 'supervisor' to ensure the application is kept running, even after reboot

    sudo apt-get update
    sudo apt-get install supervisor

Add the following to /etc/supervisor/supervisord.conf 

    [program:mongod]
    command=/usr/bin/mongod
    directory=/home/cpo
    user=root
    autostart=true
    autorestart=true
    redirect_stderr=true
    stdout_logfile=/home/cpo/log/mongod.log
        
    [program:catsdb]
    command=node app.js
    directory=/home/cpo/git/CATSReferenceCollectionsDb
    user=root
    autostart=true
    autorestart=true
    redirect_stderr=true
    environment=NODE_ENV="production"

Run supervisor

    sudo service supervisor start
    
Logs can be found at /var/log/supervisor/supervisord.log.

### Running tests

When called, grunt will automatically run the tests, both backend and frontend. An explanation of the tests and testing tools used in this application can be found [here](/test/README.md).


## Example App

The CATS live instance of the database can be found [here](http://catsdb.smk.dk/). Editing records requires login credentials.

## Contact
[CATS](http://www.cats-cons.dk/)

## License
[MIT](/LICENSE)
