# lowf (backend)
## Attention (November 2nd)

**I am currently documenting and cleaning up the lowf codebase. If you want to see lowf in action, you can either go on https://lowf.codes or https://projects.rafaelbitca.me/lowf (first one is being run off my local server, second one is being run off a DigitalOcean droplet). If you want to run lowf by yourself, you will have to give me a moment, as I finish splitting the front and the backend.**

## Description
low-effort one-on-one chatting: just pick a name!

This is the backend for lowf. I am not very wise in the arts of documentation, so here is a small guide on how to do stuff.
## Building and running lowf from source

As you can notice, the backend is in Typescript. In order to compile it into Javascript, you have two choices:

Assuming you are in the main directory...

### The simple choice

```bash
npm run build
cd dist
node index.js

LOWF Backend has started.
```

### The automated choice

```bash
npm start
(...)
LOWF Backend has started.
```

While not ideal for testing with the website (because the website completely stops you from doing ANYTHING if the connection with the server is lost), you can use this choice and with every saved edit, your server will restart.

However, you might not want to run your server immediately, for it is wise to check the configuration file beforehand.

## The configuration file

Within ``src/config.json``, you will find this file structure:

```json
{
    "port": 8082,
    "debug": false,
    "websitedomain": "lowf.codes",
    "logDir": "",
    "reportDir": "",
    "websiteDir": ""
}
```
Parameters:

**port** - the port through which you want to run the backend websocket server

**debug** - whether or not you want to run the server in debug mode (just makes the server send more logs, and if I were you, I'd turn it on and save its output)

**websitedomain** - the website domain through which the websocket server will be run through

*The last three parameters refer to directories. They must be given in full (i.e. /var/www/html). Please do not use relative directories. Make sure you have the right to read and write in these directories.*

**logDir** - the directory in which chat logs are kept

**reportDir** - the directory in which report logs are kept

**websiteDir** - the directory in which the website files are kept

## Chat logs and report logs

Chat logs look like this:

```txt
lowf.codes conversation

This is a conversation between Meow and Denise.

Denise: Hello
Meow: hi
Meow: hiii
Meow: meow
Denise: Bye
```

The log files are named with the pair ID which is generated when two users who are looking for someone to talk to pair together.

Report logs look like this:

```json
{
    "reporter_id":"788e6298-8c04-463c-aced-4b3bfea4ab92",
    "reporter_ip":"192.168.1.254",
    "reporter_name":"Meow",
    "rpairid":"eb9cfdcc-96b3-4e81-bc78-bcf68413c99a",
    "info":{
        "user1id":"788e6298-8c04-463c-aced-4b3bfea4ab92",
        "user1ip":"192.168.1.254",
        "user1name":"Meow",
        "user2id":"e3efc6c8-3f10-4727-a0af-e269769e25e4",
        "user2ip":"80.214.123.216",
        "user2name":"Denise"
    }
}        
```

A few things to note:

- Including user IDs is almost completely useless, but it helps with searching, in case a user does a lot of bad things in one session.
- The pair ID (which allows you to crosscheck with chat logs) is in "rpairid".
- Be very careful with report and chat log files. They may (!) contain personally identifying data, which could land you in hot water with the CNIL or other GDPR overseers.

## States and commands

When there is a connection between the websocket server and the client, they can exchange. The user sends commands, which the server can reject due to state incompatibility with the requested command or missing arguments, and otherwise accept.

Due to security reasons, the server terminates connections with clients who send malformed commands immediately.

Here is a table of commands a client can run:

| Command number | Command name | Command description | Command arguments | Command requirements |
|---|---|---|---|---|
|0|search|Client is now LOOKING [for another client to pair with]|None|Client must be either CONNECTED or DISCONNECTED
|1|disconnect|Client is now DISCONNECTED|None|Client must be either PAIRED or LOOKING
|2|send|Client sends message to other Client in Pair|1 argument: message (string)| Client must be PAIRED
|3|report|Client reports other Client in previous Pair|None|Client must be DISCONNECTED
|4|namechange|Client changes name|1 argument: message (string)|Client must be CONNECTED, PAIRED or DISCONNECTED

And here is a table of states a client can have:

State number | State name | State description
|---|---|---|
|0|CONNECTED|Client has established a connection with the websocket server, but has not started seeking for another Client to pair with yet. By default, upon establishing a connection with the websocket server, the Client is assigned this state.
|1|LOOKING|Client has started seeking for another Client to pair with
|2|PAIRED|Client has paired with another Client
|3|DISCONNECTED|Client has either stopped seeking for another Client, or is no longer paired
|4|BANNED|Client has been banned [not implemented]

Here is a client-side exchange in which a client connects to the websocket server, gives the server its username, starts looking for another client to pair with, and the server successfully assigns the client another client:

*-> is a message sent by the client, <- is a message from the server*

```
-> {"type":"command","body":4,"message":"my_username"}
-> {"type":"command","body":0}
<- {"type":"state","body":1}
<- {"type":"state","body":2,"message":"their_username"}
```

The client, which upon connection is CONNECTED, gives the server its username, then requests to start searching. The server responds with a confirmation of the client's state changing to LOOKING, then sends another state change to the client, this time informing the client is PAIRED. The state change message also includes the username of the other client.

## TODOs
### Administration panel
The client can also theoretically receive a few extra messages from the server:

```
<- {"type": "maintenance"}
<- {"type": "message", "body": 0, "message": "System message: hi"}
```

The maintenance type is not implemented in the backend and is accounted for in the frontend, it is supposed to allow for a graceful termination of connections in case maintenance is to be carried out on the servers.

The message type is exclusively for system broadcasts and personal messages, both of which are implemented in the backend and accounted for in the frontend, but currently, there is no way to actually trigger these functions - they are meant to be used in an administrative panel once I get around doing so.

### Stress test with more than 4 people

Title is self explanatory. I don't have the slightest clue on how to get more than 4 people to test the service out simultaneously.

### Interest pairing

Add interests and allow users with similar interests to connect with each other.

### Captcha support

This is to be able to prevent having issues with bots. Ideally I'd also like to add an automatic disconnecter in case the user stays in a state like "LOOKING" or "DISCONNECTED" for too long.