const flashing = require('express-flash');
const sessioning = require('express-session');

let findingpath = require('path'),
addinggeoip = require('geoip-country'),
authorisingplayer = require('./playersAuth'),
    validator = require('validator'),
    jsonpatch = require('fast-json-patch'),
    logging = require('pino')();
    bodyparsing = require('body-parser'),
    expression = require('express'),
    gamingjs = require('./import'),
    configguration = require('./config')

    //const {MongoClient} = require('mongodb');

    // async function Connection(){
    //     /**
    //      * Connection URI. Update <username>, <password>, and <your-cluster-url> to reflect your cluster.
    //      * See https://docs.mongodb.com/ecosystem/drivers/node/ for more details
    //      */
    //     const uri = "mongodb+srv://deksha1998:Deksha1998@cluster0.gvrigvj.mongodb.net/?retryWrites=true&w=majority";
    
    //     const client = new MongoClient(uri);
     
    //     try {
    //         // Connect to the MongoDB cluster
    //         await client.connect();
     
    //         // Make the appropriate DB calls
    //         await  listDatabases(client);
     
    //     } catch (e) {
    //         console.error(e);
    //     } finally {
    //         await client.close();
    //     }
    // }

    //Connection();

let app = require('express')()
    , server = require('http').createServer(app)
    , io = require('socket.io').listen(server, {findingpath: configguration.baseUrl + 'socket.io'});

let routerrouting = expression.Router();
routerrouting.use(expression.static(findingpath.join(__dirname, 'public')));
app.use(bodyparsing.urlencoded({extended: false}));
app.set('views', findingpath.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(bodyparsing.json());

app.use(configguration.baseUrl, routerrouting); //Apply baseUrl for use with reverse proxies.

app.start = app.listen = function () {
    return server.listen.apply(server, arguments)
};

app.start(configguration.port);
logging.info("Server started on port " + configguration.port + ".");

let games = [], gamesObserver = []; //Create array for storing all games and gameObservers objects.
gamingjs.setSocket(io);
gamingjs.setPlayerAuth(authorisingplayer);
authorisingplayer.setLobbyUpdateCallback(updatinggamelobby);

//Adding bot players
authorisingplayer.addPlayer("DICEBOT1", null, isBot=true);
authorisingplayer.addPlayer("DICEBOT2", null, isBot=true);
authorisingplayer.addPlayer("DICEBOT3", null, isBot=true);

//Set default settings for games
let defaultGameSettings = {
    idleTimeout: 20000,
    idleKickingTurns: 4,
    idleKickTurnsTotal: 7,
    Boardsize: 4
};


routerrouting.get('/r', function (req, res) {
    res.render('r', {'baseUrl': configguration.baseUrl});
});


routerrouting.get('/', function (req, res) {
    res.render('createNickname', {'baseUrl': configguration.baseUrl});
});

routerrouting.get('/lobby', function (req, res, next) {
    res.render('lobby', {'baseUrl': configguration.baseUrl});
});

routerrouting.get('/game', function (req, res) {
    res.render('game2', {'baseUrl': configguration.baseUrl});
});

//Define pages end

//Define rest endpoints start

/**
 * Registers the user and returns a JWT if successful.
 * @param req.body.playerName: String - The desired nickname.
 * @returns {
 *     success: Boolean,
 *     message: String
 * }
 */
 routerrouting.post('/rest/regPlayer', function (req, res) {
    //req.body.playerName = validator.escape(req.body.playerName);

    if (req.body.playerName == null)
        return res.json({success: false, message: 'No nickname given.'});
    if (authorisingplayer.playerExists(req.body.playerName) || req.body.playerName == null)
        return res.json({success: false, message: 'Nickname is already in use.'});
    if (req.body.playerName.length < 3 || req.body.playerName.length > 16)
        return res.json({success: false, message: 'Nickname is to long or to short.'});

    //Find country, offline geoip lookup
    let ipaddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    let upaddresslook = addinggeoip.lookup(ipaddress);
    let countryupdates = null;
    if (upaddresslook) countryupdates = upaddresslook.countryupdates;

    let tokening = authorisingplayer.addPlayer(req.body.playerName, countryupdates);

    res.json({
        success: true,
        playerId: authorisingplayer.getPlayerId(req.body.playerName),
        token: tokening
    });

    logging.info("Player " + req.body.playerName + " from " + countryupdates + " joined lobby.");

    updatinggamelobby()
});

/**
 * Checks if username is already in use.
 * @param req.body.playerName: String - Username
 */
 routerrouting.post('/rest/playerExists', function (req, res) {
    if (authorisingplayer.playerExists(req.body.playerName)) {
        res.json({
            success: false,
            message: 'Nickname is already in use.'
        });
    } else {
        res.json({
            success: true,
            message: 'Nickname free.',
        });
    }
});

/**
 * Returns true if the user is authenticated.
 */
 routerrouting.get('/rest/login', function (req, res) {
    authorisingplayer.auth(req, res, function () {
        res.json({'valid': true})
    });
});

/**
 * Sets up authetication middleware validationg the JWT
 */
 routerrouting.use('/rest', function (req, res, next) {
    authorisingplayer.auth(req, res, next);
});

/**
 * Returns the specified game object by id.
 * @param req.query.gameid: int - Game id
 * @return game: Json
 */
 routerrouting.get('/rest/game', function (req, res) {
    if (req.query.gameid >= games.length)
        return res.status(404).send();

    games[req.query.gameid].timeLeftTurn = (
        (games[req.query.gameid] && games[req.query.gameid].status === 1) ?
            ((games[req.query.gameid].idleTimeout - ((new Date()).getTime() - games[req.query.gameid].lastMoveTime.getTime())) / 1000) : 0);
    res.json(games[req.query.gameid]);
});

/**
 * Returns the players in the lobby.
 * @return {
 *     success: Boolean
 *     players: Players[]
 * }
 */
 routerrouting.get('/rest/lobby', function (req, res) {
    res.json({
        success: true,
        players: authorisingplayer.getLobbyPlayers()
    });
});

/**
 * Registers an action in the lobby. When the user clicks a button.
 * @param req.body.action: String - "startGame" | "ready" | "unready" | "addBot" | "removeBot"
 */
 routerrouting.post('/rest/lobby', function (req, res) {
    if (req.body.action === "startGame") {
        let readyplayerplaying = authorisingplayer.getReadyPlayers();
        if (readyplayerplaying.length) startGame(readyplayerplaying, defaultGameSettings);
    } else if (req.body.action === "ready") {
        authorisingplayer.setReady(req.decoded.playerId, true);

        setTimeout(function () {
            let readyplayerplaying = authorisingplayer.getReadyPlayers();

            if (readyplayerplaying.length >= 4) {
                let playersplayingtogame = [];
                for (let i = 0; i < 4; i++) {
                    playersplayingtogame[i] = readyplayerplaying[i];
                }
                startGame(playersplayingtogame, defaultGameSettings);
                updatinggamelobby()
            }
        }, 1000);
    } else if (req.body.action === "unready") {
        let playerslobbying = authorisingplayer.getLobbyPlayers();

        let botnotplaying = playerslobbying.filter(function(e) {
            return !e.isBot;
        }).length;

        if (botnotplaying === 1) {
            for (let i = 0;i < playerslobbying.length;i++) {
                authorisingplayer.setReady(playerslobbying[i].playerId, false);
            }
        } else {
            authorisingplayer.setReady(req.decoded.playerId, false);
        }

    } else if (req.body.action === "addBot") {
        let readyplayerplaying = authorisingplayer.getReadyPlayers();

        //require player to be ready for adding bots
        if (readyplayerplaying.filter(function(e) {
            return e.playerId === req.decoded.playerId;
        }).length === 0) {
            return res.send();
        }

        let playerbotting = authorisingplayer.getBotPlayers();
        let botfreeplayersplaying = playerbotting.filter(function(e) {
            return readyplayerplaying.indexOf(e) === -1;
        });

        authorisingplayer.setReady(botfreeplayersplaying[Math.floor(Math.random() * Math.floor(botfreeplayersplaying.length))].playerId, true);

        setTimeout(function () {
            let readyplayerplaying = authorisingplayer.getReadyPlayers();

            if (readyplayerplaying.length >= 4) {
                let playersplayingtogame = [];
                for (let i = 0; i < 4; i++) {
                    playersplayingtogame[i] = readyplayerplaying[i];
                }
                startGame(playersplayingtogame, defaultGameSettings);
                updatinggamelobby()
            }
        }, 1000);
    } else if (req.body.action === "removeBot") {
        let playerbotting = authorisingplayer.getBotPlayers();
        let readyplayerplaying = authorisingplayer.getReadyPlayers();

        let readyBotPlayers = playerbotting.filter(function(e) {
            return readyplayerplaying.indexOf(e) > -1;
        });

        authorisingplayer.setReady(readyBotPlayers[Math.floor(Math.random() * Math.floor(readyBotPlayers.length))].playerId, false);

    }

    updatinggamelobby();
    res.send();
});

/**
 * Registers an action from a player in a game.
 * @param req.query.gameid: int - gameId
 * @param req.decoded.playerId: int - playerId, fetched from the JWT
 * @param req.body.chatmessage: String - Chatmessage to be posted to the game.
 * @param req.body.leave - if not null makes the player leave the game.
 * @param req.body.pos: int - What square was clocked by the player.
 * @param req.body.chipsToMove: int - How many chips to move.
 * @param req.body.moveChipsIn: Boolean - If the chips are at the starting position choose to move chips to the goal or out from start.
 */
 routerrouting.post('/rest/game', function (req, res) {
    if (req.body.chatmessage != null) {
        if (req.body.chatmessage.length > 80) return res.status(422).send("Too long message");

        if (authorisingplayer.chatDOSCheck(req.decoded.playerId)) return res.status(422).send("Too many messages");

        logging.info("Player: " + authorisingplayer.getPlayerById(req.decoded.playerId).playerName + " sent message '" + req.body.chatmessage + "' in game " + req.query.gameid);
        gamingjs.postChatMessage(games[req.query.gameid], authorisingplayer.getPlayerById(req.decoded.playerId), req.body.chatmessage, null);

        sendingupdatesofGame(games[req.query.gameid].gameId);

        return res.send();
    }

    if (req.body.leave != null) {
        logging.info("Player: " + authorisingplayer.getPlayerById(req.decoded.playerId).playerName + " left game '" + req.query.gameid);
        gamingjs.leaveGame(games[req.query.gameid], authorisingplayer.getPlayerById(req.decoded.playerId));

        sendingupdatesofGame(games[req.query.gameid].gameId);

        return res.send();
    }

    switch (gamingjs.gameLogic(games[req.query.gameid], req.decoded.playerId, req.body.pos, req.body.chipsToMove, req.body.moveChipsIn)) {
        case 1:
            sendingupdatesofGame(games[req.query.gameid].gameId);
            break;
        case 2:
            let players = games[req.query.gameid].players;
            for (let i = 0; i < players.length; i++) if (players[i]) authorisingplayer.setIngame(players[i].playerId, false);
            sendingupdatesofGame(games[req.query.gameid].gameId);
            break;
        default:
            break;
    }

    res.send();
});

/**
 * @returns games: Game[] - All game objects on the server.
 */
 routerrouting.get('/rest/games', function (req, res) {
    res.json(games);
});

/**
 * Player active ping. Used to show who is active in the lobby.
 */
 routerrouting.post('/rest/active', function (req, res) {
    authorisingplayer.playerActive(req.decoded.playerId);
    res.send();
});
//Define rest endpoints end

/**
 * Attempts to start a game with the given players.
 * @param players: Players[] - The players
 * @param idleTimeout: int - Time limit for each turn in ms.
 */
function startGame(players, idleTimeout) {

    if (players.length < 2) return; //Refuse to start game if less than two players.

    //Randomize the order of the players
    let playernewgame = [];
    while (players.length > 0) {
        let index = Math.floor(Math.random() * (players.length));
        playernewgame.push(players[index]);
        players.splice(index, 1);
    }
    players = playernewgame;

    let game = gamingjs.createGame(players, idleTimeout); //Create game object with the players.

    //Remove players from the lobby
    for (let i = 0; i < players.length; i++) {
        if (players[i]) {
            authorisingplayer.setIngame(players[i].playerId, true);
            authorisingplayer.setReady(players[i].playerId, false);
            authorisingplayer.setInLobby(players[i].playerId, false);
        }
    }

    games.push(game); //Add the new game object to the collection of all game objects.
    gamesObserver.push(jsonpatch.observe(game)); //Adds and jsonpath observer for partial updates of the game object.

    logging.info("Starting game id: " + game.gameId + " with players: " + authorisingplayer.playerListToString(players));

    //Send game starting to players over websocket.
    let stringing = game.gameId;
    for (let i = 0; i < players.length; i++) if (players[i]) stringing += " " + players[i].playerId;
    setTimeout(function () {
        io.emit('gamestart', stringing);
    }, 200);
}

/**
 * Sends an update to all players in the selected game.
 * @param gameId
 */
function sendingupdatesofGame(gameId) {
    games[gameId].version++;
    io.emit('update', gameId + " " + JSON.stringify(jsonpatch.generate(gamesObserver[gameId])));
}

/**
 * Sends a message to all players in the lobby that the lobby changed.
 */
function updatinggamelobby() {
    io.emit('lobby', "");
}