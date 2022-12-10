module.exports = {
	dice: function () {
		return Math.floor(Math.random() * 6) + 1  
	},
	
	gameLogic: function (playinggame, playerId, pos, chipsToMove) {
	
        console.log("Player " + playinggame.playerTurn + " clicked " + pos);
    
		if (playinggame.status != 1 || playinggame.isProcessing || playinggame.players[playinggame.playerTurn].playerId != playerId) return false;
		
		var returningvalue = 0;

		playinggame.isProcessing = true;
		
		resettingidletimeout(playinggame);
		
		if (playinggame.waitingForMove) {
			var positioningchips = [];
			for (var i = 0;i < 4;i++) {
				if (playinggame.players[playinggame.playerTurn].chips[i].pos == pos) positioningchips.push(i);
			}
			
			if (positioningchips.length > 0) {
				var lenghthingchip = playinggame.players[playinggame.playerTurn].chips[positioningchips[0]].distance;
				for (var i = 0; i < chipsToMove;i++) {
					if (lenghthingchip == playinggame.players[playinggame.playerTurn].chips[positioningchips[i]].distance) {
						if (pos < 32) {
							playinggame.players[playinggame.playerTurn].chips[positioningchips[i]].pos = 32 + 15 * playinggame.playerTurn;
							playinggame.players[playinggame.playerTurn].chips[positioningchips[i]].distance = 1;
							knockingonout(playinggame, 32 + 15 * playinggame.playerTurn);
						} else {
							var positioncurr = playinggame.players[playinggame.playerTurn].chips[positioningchips[i]].pos + playinggame.lastDice;
							var distancingnew = playinggame.players[playinggame.playerTurn].chips[positioningchips[i]].distance + playinggame.lastDice
						
							if (positioncurr > 67 && positioncurr < 74) {
								positioncurr += -52;
							}
							
							if (distancingnew > 53) {
								positioncurr = 14 + playinggame.playerTurn*6 + distancingnew;
							}
							
							if (distancingnew == 59) {
								playinggame.players[playinggame.playerTurn].chips[positioningchips[i]].inAtTurn = playinggame.turn;
								
							}
							
							playinggame.players[playinggame.playerTurn].chips[positioningchips[i]].distance = distancingnew;
							playinggame.players[playinggame.playerTurn].chips[positioningchips[i]].pos = positioncurr;
							knockingonout(playinggame, positioncurr);
							
							checkingwinning(playinggame);
						}
						
					}
						
					playinggame.lastMoveTime = new Date();
					
					playinggame.waitingForMove = false;
					playinggame.posiblePos.length = 0; 
					
					returningvalue = 1;
				}
				
				if (playinggame.lastDice != 6) {
					playerplayingnextplayer(playinggame);
				}
			}
			
		
		} else if ((playinggame.boardSize === 8 && pos == 92) || pos === 166) {
			makingupdatepossible(playinggame);
			
			var startingall = true;
			for (var i = 0; i < 4;i++) if (playinggame.players[playinggame.playerTurn].chips[i].distance > 0 && playinggame.players[playinggame.playerTurn].chips[i].distance != 59) startingall = false;
			
			playinggame.throwsLeft--;
			if (playinggame.nextDice == 6) {
				playinggame.throwsLeft = 1;
				if (playinggame.posiblePos.length == 0);
				else playinggame.waitingForMove = true;
			} else if (startingall && playinggame.throwsLeft <= 0 && playinggame.posiblePos.length == 0) {
				playerplayingnextplayer(playinggame)
			} else if (!startingall) {
				if (playinggame.posiblePos.length == 0) playerplayingnextplayer(playinggame);
				else playinggame.waitingForMove = true;
			}
			playinggame.lastDice = playinggame.nextDice;
			playinggame.nextDice = dice();
			
			returningvalue = 1;
		}
		
		checkingwinning(playinggame);
		
		playinggame.isProcessing = false;
		
		if (playinggame.status == 2) returningvalue = 2;
		
		return returningvalue;
	},
	
	createGame: function(players, gameSettings) {
		if (players.length < 2) return;
		
		var playinggame = {}
		playinggame.playerTurn = 0;
		playinggame.turn = 0;
		playinggame.throwsLeft=3;
		playinggame.waitingForMove = false;
		playinggame.nextDice= dice();
		playinggame.lastDice=3;
		playinggame.posiblePos=[];
		playinggame.posiblePosDest=[];
		playinggame.gameId = incrementinggameid;
		playinggame.winners = [];
		playinggame.status = 1;
		playinggame.players = [];
		playinggame.lastMoveTime = new Date();
		playinggame.timeLeftTurn;
		playinggame.isProcessing = false;
		playinggame.idleTimeout = gameSettings.idleTimeout;
		playinggame.idleKickTurns = gameSettings.idleKickTurns;
        playinggame.boardSize = gameSettings.boardSize;
		
		for (var i = 0; i < players.length;i++) {
			playinggame.players[i] = {};
			playinggame.players[i].playerId = players[i].playerId;
			playinggame.players[i].playerName = players[i].playerName;
			playinggame.players[i].chips = [];
			playinggame.players[i].status = 0;
			playinggame.players[i].turnsIdle = 0;
			for (var j = 0; j < 4;j++) {
				playinggame.players[i].chips[j] = {};
				playinggame.players[i].chips[j].pos = j+i*4;
				playinggame.players[i].chips[j].distance = 0;
				playinggame.players[i].chips[j].inAtTurn = -1;
			}
		};
		
		timingoutsetidle(playinggame);
		
		incrementinggameid++;
		
		return playinggame;
	},
	setSocket: function (socket) {
		io = socket;
	},
	setPlayerAuth: function (pa) {
		playerAuth = pa;
	}
};

var io, playerAuth;
var incrementinggameid = 0;

var positiondicing = 166

var timingoutgame = [];

function checkingwinning(playinggame) {
								
	var allinning = true;
	for (var j = 0; j < 4;j++) {
		if (playinggame.players[playinggame.playerTurn].chips[j].inAtTurn == -1) allinning = false;
	}
	
	if (allinning && playinggame.players[playinggame.playerTurn].status == 0) {
		console.log("Game " + ": Player " + playinggame.players[playinggame.playerTurn].playerName + " won. ");
		playinggame.players[playinggame.playerTurn].status = 2;
		playinggame.winners.push(playinggame.playerTurn);
	}
	
	var playersinactiveplaying = [];
	for (var j = 0;j < playinggame.players.length;j++) if (playinggame.players[j].status == 1) playersinactiveplaying.push(j);
	
	if (playinggame.winners.length + playersinactiveplaying.length == playinggame.players.length - 1) {
		for (var j = 0; j < playinggame.players.length;j++) {
			var woninghas = false;
			for (var k = 0;k < playinggame.winners.length;k++) {
				if (j == playinggame.winners[k]) woninghas = true;
			}
			
			if (!woninghas && playinggame.players[j].status != 1) {	
				playinggame.players[playinggame.playerTurn].status = 2;
				playinggame.winners.push(j);
			}
		}
		playinggame.status = 2;
		io.emit('gamestop', "" + playinggame.gameId);
	}
}

function resettingidletimeout (playinggame, idle) {
	
	if (timingoutgame[playinggame.gameId]) clearTimeout(timingoutgame[playinggame.gameId]);
	if (!idle) playinggame.players[playinggame.playerTurn].turnsIdle = 0;
	playinggame.lastMoveTime = new Date();
	timingoutsetidle(playinggame, playerAuth);
}

function timingoutsetidle (playinggame) {
	
	timingoutgame[playinggame.gameId] = setTimeout(function () {
		playinggame.players[playinggame.playerTurn].turnsIdle++;
		if (playinggame.players[playinggame.playerTurn].turnsIdle === playinggame.idleKickTurns) {
			playinggame.players[playinggame.playerTurn].status = 1;
			playerAuth.setIngame(playinggame.players[playinggame.playerTurn].playerId, false);
			checkingwinning(playinggame);
		}
		playerplayingnextplayer(playinggame);
		playinggame.waitingForMove = false;
		//makingupdatepossible(game);
		playinggame.posiblePos = [positiondicing];
		io.emit("update", "" + playinggame.gameId);
		resettingidletimeout(playinggame, true);
	}, playinggame.idleTimeout);
}

function knockingonout(playinggame, pos) {
	for (var i = 0;i < playinggame.players.length;i++) {
		if (i != playinggame.playerTurn) {
			for (var j = 0;j < 4;j++) {
				if (playinggame.players[i].chips[j].pos == pos) {
					if (i == 0 && pos != 32) {
						playinggame.players[i].chips[j].pos = j+i*4;
						playinggame.players[i].chips[j].distance = 0;1
					}
					if (i == 1 && pos != 47) {
						playinggame.players[i].chips[j].pos = j+i*4;
						playinggame.players[i].chips[j].distance = 0;
					}
					if (i == 2 && pos != 62) {
						playinggame.players[i].chips[j].pos = j+i*4;
						playinggame.players[i].chips[j].distance = 0;
					}
					if (i == 3 && pos != 77) {
						playinggame.players[i].chips[j].pos = j+i*4;
						playinggame.players[i].chips[j].distance = 0;
					}
                    if (i == 4 && pos != 92) {
						playinggame.players[i].chips[j].pos = j+i*4;
						playinggame.players[i].chips[j].distance = 0;
					}
                    if (i == 5 && pos != 107) {
						playinggame.players[i].chips[j].pos = j+i*4;
						playinggame.players[i].chips[j].distance = 0;
					}
                    if (i == 6 && pos != 122) {
						playinggame.players[i].chips[j].pos = j+i*4;
						playinggame.players[i].chips[j].distance = 0;
					}
                    if (i == 7 && pos != 137) {
						playinggame.players[i].chips[j].pos = j+i*4;
						playinggame.players[i].chips[j].distance = 0;
					}
				}
			}
		}
	}
}

function playerplayingnextplayer(playinggame) {
	
	if (playinggame.status != 1) return;
	
	playinggame.playerTurn++;
	if (playinggame.playerTurn == playinggame.players.length) {
		playinggame.turn++;
		playinggame.playerTurn = 0;
	}
	
	var woninghas = false;
	for (var i = 0;i < playinggame.winners.length;i++) {
		if (playinggame.playerTurn == playinggame.winners[i]) woninghas = true;
	}
	
	if (!woninghas && playinggame.players[playinggame.playerTurn].status == 0) {
	
		var notStartedChips = 0;
		var chipsFinished = 0;
		for (var i = 0; i < 4;i++) {
			if (playinggame.players[playinggame.playerTurn].chips[i].distance == 0) notStartedChips++;
			if (playinggame.players[playinggame.playerTurn].chips[i].distance == 126) chipsFinished++;
		}

		playinggame.throwsLeft = 1;
		
		if (notStartedChips + chipsFinished == 4) playinggame.throwsLeft = 3;		
	
	} else {
		playerplayingnextplayer(playinggame);
	}
}

function dice() {
	return Math.floor(Math.random() * 6) + 1  
}

function makingupdatepossible(playinggame) {
	playinggame.posiblePos.length = 0;
	playinggame.posiblePosDest.length = 0;
	
	for (var i = 0;i < 4;i++) {
		if (playinggame.players[playinggame.playerTurn].chips[i].distance + playinggame.nextDice > 126);
		else if (playinggame.players[playinggame.playerTurn].chips[i].pos < 4*playinggame.boardSize && playinggame.nextDice == 6) playinggame.posiblePos.push(playinggame.players[playinggame.playerTurn].chips[i].pos);
		else if (playinggame.players[playinggame.playerTurn].chips[i].pos >= 4*playinggame.boardSize) playinggame.posiblePos.push(playinggame.players[playinggame.playerTurn].chips[i].pos);
		
		if (playinggame.posiblePos[playinggame.posiblePos.length - 1] == playinggame.players[playinggame.playerTurn].chips[i].pos) {
			if (playinggame.players[playinggame.playerTurn].chips[i].pos < 4*playinggame.boardSize) {
				playinggame.posiblePosDest.push(4*playinggame.boardSize + 13 * playinggame.playerTurn);
			} else {
				var positioncurr = playinggame.players[playinggame.playerTurn].chips[i].pos + playinggame.nextDice;
				var distancingnew = playinggame.players[playinggame.playerTurn].chips[i].distance + playinggame.nextDice;
			
				if (positioncurr > 67 && positioncurr < 74) {
					positioncurr += -52;
				}
				
				if (distancingnew > 53) {
					positioncurr = 14 + playinggame.playerTurn * 6 + distancingnew
				}
				
				playinggame.posiblePosDest.push(positioncurr);
			}
		}
	}
}