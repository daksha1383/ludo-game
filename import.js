module.exports = {
    dice: function () {
        return Math.floor(Math.random() * 6) + 1;
    },

    gameLogic: function(game, playerId, pos, chipsToMove, moveChipsIn) {
        return gameLogic(game, playerId, pos, chipsToMove, moveChipsIn);
    },

    createGame: function (players, gameSettings) {
        if (players.length < 2) return;

        let gaming = {};
        gaming.turn = 0;
        gaming.throwsLeft = 3;
        gaming.waitingForMove = false;
        gaming.nextDice = dice();
        gaming.posiblePos = [];
        gaming.gameId = gameIdIncrement;
        gaming.status = 1;
        gaming.players = [];
        gaming.lastMoveTime = new Date();
        gaming.timeLeftTurn;
        gaming.playerTurn = 0;
        gaming.lastDice = 3;
        gaming.isProcessing = false;
        gaming.idleTimeout = gameSettings.idleTimeout;
        gaming.idleKickTurns = gameSettings.idleKickTurns;
        gaming.idleKickTurnsTotal = gameSettings.idleKickTurnsTotal;
        gaming.version = 0;
        gaming.winners = [];
        gaming.currentCombo = 0;
        gaming.chatMessages = [];
        gaming.posiblePosDest = [];

        for (let i = 0; i < players.length; i++) {
            let playersplaying = players[i];
            //When playing with only two players, they start on the opposite side of each other
            if (players.length === 2 && i === 1) i++;

            gaming.players[i] = {};
            gaming.players[i].playerId = playersplaying.playerId;
            gaming.players[i].playerName = playersplaying.playerName;
            gaming.players[i].chips = [];
            gaming.players[i].status = 0;
            gaming.players[i].turnsIdle = 0;
            gaming.players[i].turnsIdleTotal = 0;
            gaming.players[i].isBot = playersplaying.isBot;
            for (let j = 0; j < 4; j++) {
                gaming.players[i].chips[j] = {};
                gaming.players[i].chips[j].pos = j + i * 4;
                gaming.players[i].chips[j].distance = 0;
                gaming.players[i].chips[j].inAtTurn = -1;
            }
            gaming.players[i].stats = {};
            gaming.players[i].stats.totalDistance = 0;
            gaming.players[i].stats.sumDistance = 0;
            gaming.players[i].stats.knockouts = 0;
            gaming.players[i].stats.chipsLost = 0;
            gaming.players[i].stats.highestCombo = 0;
            gaming.players[i].stats.largestKnockout = 0;
        }

        setIdleTimeout(gaming);

        gameIdIncrement++;

        if (gaming.players[gaming.playerTurn].isBot) ludoAI(gaming);

        return gaming;
    },
    postChatMessage: function (gaming, playersplaying, text, color) {
        addingmessagestochat(gaming, playersplaying, text, color);
    },
    setSocket: function (socket) {
        io = socket;
    },
    setPlayerAuth: function (pa) {
        playerauthorisation = pa;
    },
    leaveGame: function (gaming, playersplaying) {
        leaveGame(gaming, playersplaying);
    }
};

const logger = require('pino')();
var io, playerauthorisation;
var gameIdIncrement = 0;

var gameTimeout = [];

function gameLogic(gaming, playerId, pos, chipsToMove, moveChipsIn) {

    if (gaming.status !== 1 || gaming.isProcessing || gaming.players[gaming.playerTurn].playerId !== playerId) return false;

    let returnValue = 0;

    gaming.isProcessing = true;

    resetIdleTimeout(gaming);

    if (gaming.waitingForMove) {

        let chipsOnPos = [];

        for (let i = 0; i < 4; i++) {
            if (gaming.players[gaming.playerTurn].chips[i].pos === pos && (
                moveChipsIn === undefined ||
                (moveChipsIn && gaming.players[gaming.playerTurn].chips[i].distance === 53) ||
                (moveChipsIn === false && gaming.players[gaming.playerTurn].chips[i].distance !== 53))
            ) {
                chipsOnPos.push(i);
            }
        }

        if (chipsOnPos.length > 0) {

            let chipLength = gaming.players[gaming.playerTurn].chips[chipsOnPos[0]].distance;

            for (let i = 0; i < chipsToMove; i++) {

                if (chipLength === gaming.players[gaming.playerTurn].chips[chipsOnPos[i]].distance) {

                    if (pos < 16) {

                        gaming.players[gaming.playerTurn].chips[chipsOnPos[i]].pos = 16 + 13 * gaming.playerTurn;
                        gaming.players[gaming.playerTurn].chips[chipsOnPos[i]].distance = 1;
                        knockoutOn(gaming, 16 + 13 * gaming.playerTurn);

                    } else {

                        let positionnew = gaming.players[gaming.playerTurn].chips[chipsOnPos[i]].pos + gaming.lastDice;
                        let distancenew = gaming.players[gaming.playerTurn].chips[chipsOnPos[i]].distance + gaming.lastDice
                        gaming.players[gaming.playerTurn].stats.totalDistance += gaming.lastDice;
                        gaming.players[gaming.playerTurn].stats.sumDistance += gaming.lastDice;

                        if (positionnew > 67 && positionnew < 74) {
                            positionnew += -52;
                        }

                        if (distancenew > 53) {
                            positionnew = 14 + gaming.playerTurn * 6 + distancenew;
                        }

                        if (distancenew === 59) {
                            gaming.players[gaming.playerTurn].chips[chipsOnPos[i]].inAtTurn = gaming.turn;

                        }

                        gaming.players[gaming.playerTurn].chips[chipsOnPos[i]].distance = distancenew;
                        gaming.players[gaming.playerTurn].chips[chipsOnPos[i]].pos = positionnew;
                        knockoutOn(gaming, positionnew);

                        winningcheck(gaming);
                    }

                }

                gaming.lastMoveTime = new Date();

                gaming.waitingForMove = false;
                gaming.posiblePos.length = 0;

                returnValue = 1;
            }

            if (gaming.lastDice !== 6) {
                playersnextplaying(gaming);
            }
        }


    } else if (pos === 92) {
        updatePossible(gaming);

        let startingall = true;
        for (let i = 0; i < 4; i++) if (gaming.players[gaming.playerTurn].chips[i].distance > 0 && gaming.players[gaming.playerTurn].chips[i].distance !== 59) startingall = false;

        gaming.throwsLeft--;

        if (gaming.nextDice === 6) {

            gaming.throwsLeft = 1;
            gaming.currentCombo++;

            if (gaming.currentCombo > gaming.players[gaming.playerTurn].stats.highestCombo) gaming.players[gaming.playerTurn].stats.highestCombo = gaming.currentCombo;
            if (gaming.posiblePos.length !== 0) gaming.waitingForMove = true;

        } else if (startingall && gaming.throwsLeft <= 0 && gaming.posiblePos.length === 0) {

            playersnextplaying(gaming)

        } else if (!startingall) {

            if (gaming.posiblePos.length === 0) nextPlayer(gaming);
            else gaming.waitingForMove = true;

        }

        gaming.lastDice = gaming.nextDice;
        gaming.nextDice = dice();

        returnValue = 1;
    }

    winningcheck(gaming);

    gaming.isProcessing = false;

    if (gaming.status === 2) returnValue = 2;

    return returnValue;
}

function addingmessagestochat(gaming, playersplaying, text, color=null, visibleFor=null) {
    gaming.chatMessages.push({playersplaying: playersplaying, time: new Date(), text: text, color: color, visibleFor: visibleFor});
    //io.emit("update", "" + game.gameId);
}

function winningcheck(gaming) {

    let everyineverything = true;

    for (let j = 0; j < 4; j++) {
        if (gaming.players[gaming.playerTurn].chips[j].inAtTurn === -1) everyineverything = false;
    }

    if (everyineverything && gaming.players[gaming.playerTurn].status === 0) {
        gaming.players[gaming.playerTurn].status = 2;
        gaming.winners.push(gaming.playerTurn);
    }

    let playingplayersinactive = [];

    for (let j = 0; j < gaming.players.length; j++) if (!gaming.players[j] || gaming.players[j].status === 1) playingplayersinactive.push(j);

    if (gaming.winners.length + playingplayersinactive.length === gaming.players.length - 1) {
        for (let j = 0; j < gaming.players.length; j++) {

            let havingplayerwon = false;

            for (let k = 0; k < gaming.winners.length; k++) {
                if (j === gaming.winners[k]) havingplayerwon = true;
            }

            if (!havingplayerwon && gaming.players[j] && gaming.players[j].status !== 1) {
                gaming.players[gaming.playerTurn].status = 2;
                gaming.winners.push(j);
            }
        }

        gaming.status = 2;

        logger.info("Game id: " + gaming.gameId + ", with players " + playerauthorisation.playerListToString(gaming.players) +
            " ended, " + gaming.players[gaming.playerTurn].playerName + " won.");

        io.emit('gamestop', "" + gaming.gameId);
        if (gameTimeout[gaming.gameId])
            clearTimeout(gameTimeout[gaming.gameId]);
    }
}

function resetIdleTimeout(gaming, idle) {

    if (gameTimeout[gaming.gameId]) clearTimeout(gameTimeout[gaming.gameId]);
    if (!idle) gaming.players[gaming.playerTurn].turnsIdle = 0;
    gaming.lastMoveTime = new Date();
    setIdleTimeout(gaming, playerauthorisation);
}

function setIdleTimeout(gaming) {

    gameTimeout[gaming.gameId] = setTimeout(function () {
        gaming.players[gaming.playerTurn].turnsIdle++;
        gaming.players[gaming.playerTurn].turnsIdleTotal++;

        if (gaming.players[gaming.playerTurn].turnsIdle === gaming.idleKickTurns || gaming.players[gaming.playerTurn].turnsIdleTotal === gaming.idleKickTurnsTotal) {
            gaming.players[gaming.playerTurn].status = 1;
            playerauthorisation.setIngame(gaming.players[gaming.playerTurn].playerId, false);
            addChatMessage(gaming, null, gaming.players[gaming.playerTurn].playerName + " kicked for inactivity.", "#ff0000");
            logger.info("Game id: " + gaming.gameId + ", player " + gaming.players[gaming.playerTurn].playerName + " kicked for inactivity.");
            winningcheck(gaming);
        } else {
            //Send waring to player in chat
            addingmessagestochat(
                gaming,
                null,
                "You will be kicked from the game if idle for " + Math.min(gaming.idleKickTurns - gaming.players[gaming.playerTurn].turnsIdle, gaming.idleKickTurnsTotal - gaming.players[gaming.playerTurn].turnsIdleTotal) + " more turns!",
                "#ff0000",
                [gaming.players[gaming.playerTurn].playerId]);
        }

        playersnextplaying(gaming);
        gaming.waitingForMove = false;
        gaming.posiblePos = [92];
        io.emit("update", "" + gaming.gameId);
        if (gaming.status === 1)
            resetIdleTimeout(gaming, true);
    }, gaming.idleTimeout);
}

function leaveGame(gaming, playersplaying, update) {
    for (let i = 0; i < gaming.players.length; i++) {

        if (gaming.players[i] && gaming.players[i].playerId === playersplaying.playerId) {

            gaming.players[i].status = 1;
            playerauthorisation.setIngame(playersplaying.playerId, false);
            winningcheck(gaming);
            playersnextplaying(gaming);
            gaming.waitingForMove = false;
            gaming.posiblePos = [92];

            if (gaming.playerTurn === i && gaming.status === 1)
                resetIdleTimeout(gaming, true);

            io.emit("update", "" + gaming.gameId);
        }
    }
}

function knockoutOn(gaming, pos) {
    for (let i = 0; i < gaming.players.length; i++) {

        if (gaming.players[i] && i !== gaming.playerTurn) {

            let knockingchipsout = 0;

            for (let j = 0; j < 4; j++) {

                if (gaming.players[i].chips[j].pos === pos) {
                    if (i === 0 && pos !== 16) {
                        gaming.players[i].chips[j].pos = j + i * 4;
                        gaming.players[i].chips[j].distance = 0;
                        gaming.players[gaming.playerTurn].stats.knockouts++;
                        gaming.players[i].stats.chipsLost++;
                        knockingchipsout++;
                        recallingsumofdistance(gaming, i);
                    }
                    if (i === 1 && pos !== 29) {
                        gaming.players[i].chips[j].pos = j + i * 4;
                        gaming.players[i].chips[j].distance = 0;
                        gaming.players[gaming.playerTurn].stats.knockouts++;
                        gaming.players[i].stats.chipsLost++;
                        knockingchipsout++;
                        recallingsumofdistance(gaming, i);
                    }
                    if (i === 2 && pos !== 42) {
                        gaming.players[i].chips[j].pos = j + i * 4;
                        gaming.players[i].chips[j].distance = 0;
                        gaming.players[gaming.playerTurn].stats.knockouts++;
                        gaming.players[i].stats.chipsLost++;
                        knockingchipsout++;
                        recallingsumofdistance(gaming, i);
                    }
                    if (i === 3 && pos !== 55) {
                        gaming.players[i].chips[j].pos = j + i * 4;
                        gaming.players[i].chips[j].distance = 0;
                        gaming.players[gaming.playerTurn].stats.knockouts++;
                        gaming.players[i].stats.chipsLost++;
                        knockingchipsout++;
                        recallingsumofdistance(gaming, i);
                    }
                }
            }

            if (knockingchipsout > gaming.players[gaming.playerTurn].stats.largestKnockout) gaming.players[gaming.playerTurn].stats.largestKnockout = knockingchipsout;
        }
    }
}

function playersnextplaying(gaming) {

    if (gaming.status !== 1) return;

    gaming.playerTurn++;
    gaming.currentCombo = 0;

    if (gaming.playerTurn === gaming.players.length) {
        gaming.turn++;
        gaming.playerTurn = 0;

    }

    if (!gaming.players[gaming.playerTurn]) return playersnextplaying(gaming);

    let havingplayerwon = false;

    for (let i = 0; i < gaming.winners.length; i++) {
        if (gaming.playerTurn === gaming.winners[i]) havingplayerwon = true;
    }

    if (!havingplayerwon && gaming.players[gaming.playerTurn].status === 0) {

        let notStartedChips = 0;
        let finishingchip = 0;

        for (let i = 0; i < 4; i++) {
            if (gaming.players[gaming.playerTurn].chips[i].distance === 0) notStartedChips++;
            if (gaming.players[gaming.playerTurn].chips[i].distance === 59) finishingchip++;
        }

        gaming.throwsLeft = 1;

        if (notStartedChips + finishingchip === 4) gaming.throwsLeft = 3;

        if (gaming.players[gaming.playerTurn].isBot) ludoAI(gaming);

    } else {
        playersnextplaying(gaming);
    }
}

function dice() {
    return Math.floor(Math.random() * 6) + 1
}

function recallingsumofdistance(gaming, playerIndex) {
    gaming.players[playerIndex].stats.sumDistance = 0;

    for (let i = 0; i < 4; i++) gaming.players[playerIndex].stats.sumDistance += gaming.players[playerIndex].chips[i].distance;
}

function updatePossible(gaming) {
    gaming.posiblePos.length = 0;
    gaming.posiblePosDest.length = 0;

    for (let i = 0; i < 4; i++) {

        if (gaming.players[gaming.playerTurn].chips[i].distance + gaming.nextDice > 59) ;
        else if (gaming.players[gaming.playerTurn].chips[i].pos < 16 && gaming.nextDice === 6) gaming.posiblePos.push(gaming.players[gaming.playerTurn].chips[i].pos);
        else if (gaming.players[gaming.playerTurn].chips[i].pos >= 16) gaming.posiblePos.push(gaming.players[gaming.playerTurn].chips[i].pos);

        if (gaming.posiblePos[gaming.posiblePos.length - 1] === gaming.players[gaming.playerTurn].chips[i].pos) {

            if (gaming.players[gaming.playerTurn].chips[i].pos < 16) {
                gaming.posiblePosDest.push(16 + 13 * gaming.playerTurn);
            } else {

                let positionnew = gaming.players[gaming.playerTurn].chips[i].pos + gaming.nextDice;
                let distancenew = gaming.players[gaming.playerTurn].chips[i].distance + gaming.nextDice;

                if (positionnew > 67 && positionnew < 74) {
                    positionnew += -52;
                }

                if (distancenew > 53) {
                    positionnew = 14 + gaming.playerTurn * 6 + distancenew
                }

                gaming.posiblePosDest.push(positionnew);
            }
        }
    }
}

function ludoAI(gaming) {
    let playerpresentcurrent = gaming.players[gaming.playerTurn];
    setTimeout(function () {
        if (gaming.players[gaming.playerTurn].isBot && playerpresentcurrent === gaming.players[gaming.playerTurn]) {
            if (gaming.waitingForMove && gaming.posiblePos.length > 0) {
                let moving = false;
                if (gaming.lastDice === 6) {
                    for (let j = 0; j < 4; j++) {
                        if (gaming.players[gaming.playerTurn].chips[j].distance === 0) {
                            gameLogic(gaming, gaming.players[gaming.playerTurn].playerId, gaming.players[gaming.playerTurn].chips[j].pos, 1);
                            moving = true;
                            break;
                        }
                    }
                }
                if (!moving) {
                    gameLogic(gaming, gaming.players[gaming.playerTurn].playerId, gaming.posiblePos[0], 1);
                }
            }
            else {
                gameLogic(gaming, gaming.players[gaming.playerTurn].playerId, 92, 1);
            }

            io.emit("update", "" + gaming.gameId);
            ludoAI(gaming);
        }
    }, 400);
}