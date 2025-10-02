
        // Game State
        const gameState = {
            players: [],
            currentPlayer: null,
            mapType: null,
            mapData: [],
            gamePhase: 'waiting', // waiting, playing, voting, ended
            roundTime: 300, // 5 minutes in seconds
            timeRemaining: 300,
            murderer: null,
            detective: null,
            votes: {},
            clues: [],
            weapons: [],
            keys: [],
            secretPassages: [],
            isLocalGame: true,
            musicEnabled: true
        };

        // Map Templates
        const mapTemplates = {
            mansion: {
                name: "Haunted Mansion",
                width: 20,
                height: 15,
                tiles: []
            },
            school: {
                name: "Abandoned School",
                width: 25,
                height: 18,
                tiles: []
            },
            forest: {
                name: "Dark Forest",
                width: 30,
                height: 20,
                tiles: []
            },
            spaceship: {
                name: "Derelict Spaceship",
                width: 22,
                height: 16,
                tiles: []
            }
        };

        // Player Class
        class Player {
            constructor(name, id) {
                this.name = name;
                this.id = id;
                this.role = 'innocent';
                this.x = 0;
                this.y = 0;
                this.alive = true;
                this.inventory = [];
                this.hasVoted = false;
            }

            move(dx, dy) {
                const newX = this.x + dx;
                const newY = this.y + dy;
                
                if (isValidMove(newX, newY)) {
                    this.x = newX;
                    this.y = newY;
                    updatePlayerPosition(this);
                    checkForInteractions(this);
                }
            }

            interact() {
                // Check for nearby objects
                const nearbyObjects = getNearbyObjects(this.x, this.y);
                if (nearbyObjects.length > 0) {
                    nearbyObjects.forEach(obj => {
                        if (obj.type === 'weapon') {
                            this.inventory.push(obj);
                            showMessage(`You found a ${obj.name}!`);
                            removeObject(obj);
                        } else if (obj.type === 'clue') {
                            this.inventory.push(obj);
                            showMessage(`You found a clue: ${obj.description}`);
                            removeObject(obj);
                        } else if (obj.type === 'key') {
                            this.inventory.push(obj);
                            showMessage(`You found a key!`);
                            removeObject(obj);
                        }
                    });
                }
            }

            kill(target) {
                if (this.role === 'murderer' && target.alive && target.role !== 'murderer') {
                    target.alive = false;
                    showMessage(`${target.name} has been eliminated!`);
                    updatePlayerList();
                    checkWinConditions();
                }
            }
        }

        // Initialize Game
        function showPlayerSetup() {
            document.getElementById('playerSetup').style.display = 'flex';
        }

        function startLocalGame() {
            const playerName = document.getElementById('playerName').value || 'Player';
            showLoadingScreen();
            
            setTimeout(() => {
                initializeGame(playerName);
                hideLoadingScreen();
            }, 1500);
        }

        function startMultiplayerGame() {
            showMessage("Multiplayer feature coming soon!");
            // For now, start a local game
            startLocalGame();
        }

        function initializeGame(playerName) {
            // Create players
            gameState.players = [
                new Player(playerName, 1),
                new Player("AI Player 2", 2),
                new Player("AI Player 3", 3),
                new Player("AI Player 4", 4),
                new Player("AI Player 5", 5),
                new Player("AI Player 6", 6)
            ];
            
            gameState.currentPlayer = gameState.players[0];
            
            // Assign roles
            assignRoles();
            
            // Generate map
            generateRandomMap();
            
            // Start game
            startGame();
        }

        function assignRoles() {
            const roles = ['murderer', 'detective'];
            const remainingPlayers = [...gameState.players];
            
            // Assign murderer
            const murdererIndex = Math.floor(Math.random() * remainingPlayers.length);
            remainingPlayers[murdererIndex].role = 'murderer';
            gameState.murderer = remainingPlayers[murdererIndex];
            remainingPlayers.splice(murdererIndex, 1);
            
            // Assign detective
            const detectiveIndex = Math.floor(Math.random() * remainingPlayers.length);
            remainingPlayers[detectiveIndex].role = 'detective';
            gameState.detective = remainingPlayers[detectiveIndex];
            remainingPlayers.splice(detectiveIndex, 1);
            
            // Rest are innocents
            remainingPlayers.forEach(player => {
                player.role = 'innocent';
            });
            
            // Show role to current player
            const roleInfo = document.getElementById('roleInfo');
            roleInfo.textContent = `Role: ${gameState.currentPlayer.role.toUpperCase()}`;
            
            if (gameState.currentPlayer.role === 'murderer') {
                roleInfo.style.color = '#ff0000';
            } else if (gameState.currentPlayer.role === 'detective') {
                roleInfo.style.color = '#0066ff';
            } else {
                roleInfo.style.color = '#00ff00';
            }
        }

        function generateRandomMap() {
            const mapTypes = Object.keys(mapTemplates);
            gameState.mapType = mapTypes[Math.floor(Math.random() * mapTypes.length)];
            const mapTemplate = mapTemplates[gameState.mapType];
            
            // Create map grid
            gameState.mapData = [];
            for (let y = 0; y < mapTemplate.height; y++) {
                const row = [];
                for (let x = 0; x < mapTemplate.width; x++) {
                    // Create walls around the border
                    if (x === 0 || x === mapTemplate.width - 1 || 
                        y === 0 || y === mapTemplate.height - 1) {
                        row.push('wall');
                    } else {
                        // Randomly place walls inside
                        row.push(Math.random() < 0.1 ? 'wall' : 'floor');
                    }
                }
                gameState.mapData.push(row);
            }
            
            // Add doors
            for (let i = 0; i < 5; i++) {
                const x = Math.floor(Math.random() * (mapTemplate.width - 2)) + 1;
                const y = Math.floor(Math.random() * (mapTemplate.height - 2)) + 1;
                gameState.mapData[y][x] = 'door';
            }
            
            // Add secret passages
            for (let i = 0; i < 3; i++) {
                const x = Math.floor(Math.random() * (mapTemplate.width - 2)) + 1;
                const y = Math.floor(Math.random() * (mapTemplate.height - 2)) + 1;
                gameState.mapData[y][x] = 'secret';
                gameState.secretPassages.push({x, y});
            }
            
            // Place players
            gameState.players.forEach(player => {
                let placed = false;
                while (!placed) {
                    const x = Math.floor(Math.random() * (mapTemplate.width - 2)) + 1;
                    const y = Math.floor(Math.random() * (mapTemplate.height - 2)) + 1;
                    if (gameState.mapData[y][x] === 'floor') {
                        player.x = x;
                        player.y = y;
                        placed = true;
                    }
                }
            });
            
            // Place objects
            placeObjects();
            
            // Render map
            renderMap();
        }

        function placeObjects() {
            // Place weapons
            const weaponTypes = ['🔪', '🔫', '🗡️', '🔨'];
            for (let i = 0; i < 4; i++) {
                const weapon = {
                    type: 'weapon',
                    name: weaponTypes[i],
                    x: Math.floor(Math.random() * (mapTemplates[gameState.mapType].width - 2)) + 1,
                    y: Math.floor(Math.random() * (mapTemplates[gameState.mapType].height - 2)) + 1
                };
                gameState.weapons.push(weapon);
            }
            
            // Place clues
            const clueDescriptions = [
                "A bloody fingerprint",
                "A torn piece of clothing",
                "A mysterious note",
                "A hidden diary entry",
                "A surveillance photo"
            ];
            for (let i = 0; i < 5; i++) {
                const clue = {
                    type: 'clue',
                    description: clueDescriptions[i],
                    x: Math.floor(Math.random() * (mapTemplates[gameState.mapType].width - 2)) + 1,
                    y: Math.floor(Math.random() * (mapTemplates[gameState.mapType].height - 2)) + 1
                };
                gameState.clues.push(clue);
            }
            
            // Place keys
            for (let i = 0; i < 3; i++) {
                const key = {
                    type: 'key',
                    name: '🔑',
                    x: Math.floor(Math.random() * (mapTemplates[gameState.mapType].width - 2)) + 1,
                    y: Math.floor(Math.random() * (mapTemplates[gameState.mapType].height - 2)) + 1
                };
                gameState.keys.push(key);
            }
        }

        function renderMap() {
            const mapElement = document.getElementById('gameMap');
            mapElement.innerHTML = '';
            mapElement.style.display = 'block';
            
            const tileSize = 40;
            const mapTemplate = mapTemplates[gameState.mapType];
            
            // Render tiles
            for (let y = 0; y < mapTemplate.height; y++) {
                for (let x = 0; x < mapTemplate.width; x++) {
                    const tile = document.createElement('div');
                    tile.className = `mapTile ${gameState.mapData[y][x]}`;
                    tile.style.left = `${x * tileSize}px`;
                    tile.style.top = `${y * tileSize}px`;
                    tile.style.width = `${tileSize}px`;
                    tile.style.height = `${tileSize}px`;
                    mapElement.appendChild(tile);
                }
            }
            
            // Render objects
            [...gameState.weapons, ...gameState.clues, ...gameState.keys].forEach(obj => {
                const objElement = document.createElement('div');
                objElement.className = `interactiveObject ${obj.type}`;
                objElement.style.left = `${obj.x * tileSize}px`;
                objElement.style.top = `${obj.y * tileSize}px`;
                objElement.textContent = obj.name || '📄';
                mapElement.appendChild(objElement);
            });
            
            // Render players
            gameState.players.forEach(player => {
                const playerElement = document.createElement('div');
                playerElement.className = `player ${player.role}`;
                playerElement.id = `player-${player.id}`;
                playerElement.style.left = `${player.x * tileSize + 5}px`;
                playerElement.style.top = `${player.y * tileSize + 5}px`;
                playerElement.textContent = player.name[0].toUpperCase();
                mapElement.appendChild(playerElement);
            });
        }

        function startGame() {
            // Hide start screen
            document.getElementById('startScreen').style.display = 'none';
            
            // Show game elements
            document.getElementById('gameHUD').style.display = 'flex';
            document.getElementById('controls').style.display = 'flex';
            document.getElementById('inventory').style.display = 'flex';
            
            // Update player list
            updatePlayerList();
            
            // Start timer
            startTimer();
            
            // Start background music
            if (gameState.musicEnabled) {
                document.getElementById('backgroundMusic').play();
            }
            
            // Set game phase
            gameState.gamePhase = 'playing';
            
            // Add keyboard controls
            document.addEventListener('keydown', handleKeyPress);
            
            // Start AI behavior
            startAIBehavior();
            
            showMessage(`Game started! You are the ${gameState.currentPlayer.role}.`);
        }

        function handleKeyPress(e) {
            if (gameState.gamePhase !== 'playing') return;
            
            const player = gameState.currentPlayer;
            if (!player.alive) return;
            
            switch(e.key.toLowerCase()) {
                case 'w':
                case 'arrowup':
                    player.move(0, -1);
                    break;
                case 's':
                case 'arrowdown':
                    player.move(0, 1);
                    break;
                case 'a':
                case 'arrowleft':
                    player.move(-1, 0);
                    break;
                case 'd':
                case 'arrowright':
                    player.move(1, 0);
                    break;
                case 'e':
                    player.interact();
                    break;
                case 'q':
                    useItem();
                    break;
                case 'm':
                    toggleMap();
                    break;
            }
        }

        function isValidMove(x, y) {
            const mapTemplate = mapTemplates[gameState.mapType];
            if (x < 0 || x >= mapTemplate.width || y < 0 || y >= mapTemplate.height) {
                return false;
            }
            
            const tile = gameState.mapData[y][x];
            if (tile === 'wall') {
                return false;
            }
            
            if (tile === 'door') {
                // Check if player has a key
                const hasKey = gameState.currentPlayer.inventory.some(item => item.type === 'key');
                if (!hasKey) {
                    showMessage("You need a key to open this door!");
                    return false;
                }
            }
            
            return true;
        }

        function updatePlayerPosition(player) {
            const playerElement = document.getElementById(`player-${player.id}`);
            if (playerElement) {
                const tileSize = 40;
                playerElement.style.left = `${player.x * tileSize + 5}px`;
                playerElement.style.top = `${player.y * tileSize + 5}px`;
            }
        }

        function checkForInteractions(player) {
            // Check if player is on a secret passage
            const onSecretPassage = gameState.secretPassages.some(
                passage => passage.x === player.x && passage.y === player.y
            );
            
            if (onSecretPassage) {
                showMessage("You found a secret passage!");
                // Teleport to another secret passage
                const otherPassages = gameState.secretPassages.filter(
                    passage => passage.x !== player.x || passage.y !== player.y
                );
                if (otherPassages.length > 0) {
                    const targetPassage = otherPassages[Math.floor(Math.random() * otherPassages.length)];
                    player.x = targetPassage.x;
                    player.y = targetPassage.y;
                    updatePlayerPosition(player);
                }
            }
        }

        function getNearbyObjects(x, y) {
            const nearby = [];
            const checkRange = 1;
            
            [...gameState.weapons, ...gameState.clues, ...gameState.keys].forEach(obj => {
                if (Math.abs(obj.x - x) <= checkRange && Math.abs(obj.y - y) <= checkRange) {
                    nearby.push(obj);
                }
            });
            
            return nearby;
        }

        function removeObject(obj) {
            if (obj.type === 'weapon') {
                gameState.weapons = gameState.weapons.filter(w => w !== obj);
            } else if (obj.type === 'clue') {
                gameState.clues = gameState.clues.filter(c => c !== obj);
            } else if (obj.type === 'key') {
                gameState.keys = gameState.keys.filter(k => k !== obj);
            }
            
            // Remove from DOM
            const objects = document.querySelectorAll('.interactiveObject');
            objects.forEach(el => {
                if (el.textContent === (obj.name || '📄')) {
                    el.remove();
                }
            });
        }

        function useItem() {
            const player = gameState.currentPlayer;
            if (player.inventory.length === 0) {
                showMessage("You have no items to use!");
                return;
            }
            
            const item = player.inventory[0];
            if (item.type === 'weapon' && player.role === 'murderer') {
                // Find nearby players to kill
                const nearbyPlayers = gameState.players.filter(p => 
                    p.alive && p !== player && 
                    Math.abs(p.x - player.x) <= 1 && Math.abs(p.y - player.y) <= 1
                );
                
                if (nearbyPlayers.length > 0) {
                    const target = nearbyPlayers[0];
                    player.kill(target);
                    player.inventory = player.inventory.filter(i => i !== item);
                } else {
                    showMessage("No players nearby to eliminate!");
                }
            } else {
                showMessage("You can't use this item right now!");
            }
        }

        function updatePlayerList() {
            const playerListElement = document.getElementById('playerList');
            playerListElement.innerHTML = '';
            
            gameState.players.forEach(player => {
                const playerDiv = document.createElement('div');
                playerDiv.className = 'playerIndicator';
                playerDiv.innerHTML = `
                    <div class="playerStatus ${player.alive ? '' : 'dead'}"></div>
                    <span>${player.name}</span>
                `;
                playerListElement.appendChild(playerDiv);
            });
        }

        function startTimer() {
            const timerInterval = setInterval(() => {
                if (gameState.gamePhase !== 'playing') {
                    clearInterval(timerInterval);
                    return;
                }
                
                gameState.timeRemaining--;
                const minutes = Math.floor(gameState.timeRemaining / 60);
                const seconds = gameState.timeRemaining % 60;
                document.getElementById('timer').textContent = 
                    `Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
                
                if (gameState.timeRemaining <= 0) {
                    clearInterval(timerInterval);
                    endRound();
                }
            }, 1000);
        }

        function endRound() {
            gameState.gamePhase = 'voting';
            showVotingScreen();
        }

        function showVotingScreen() {
            const votingScreen = document.getElementById('votingScreen');
            votingScreen.style.display = 'flex';
            
            const votingOptions = document.getElementById('votingOptions');
            votingOptions.innerHTML = '';
            
            gameState.players.forEach(player => {
                if (player.alive) {
                    const option = document.createElement('div');
                    option.className = 'voteOption';
                    option.textContent = player.name;
                    option.onclick = () => selectVote(player.id);
                    votingOptions.appendChild(option);
                }
            });
        }

        function selectVote(playerId) {
            gameState.votes[gameState.currentPlayer.id] = playerId;
            
            // Update UI
            document.querySelectorAll('.voteOption').forEach(option => {
                option.classList.remove('selected');
            });
            event.target.classList.add('selected');
        }

        function submitVote() {
            if (!gameState.votes[gameState.currentPlayer.id]) {
                showMessage("Please select a player to vote for!");
                return;
            }
            
            // Simulate AI votes
            gameState.players.forEach(player => {
                if (player.id !== gameState.currentPlayer.id && player.alive) {
                    const alivePlayers = gameState.players.filter(p => p.alive);
                    const randomTarget = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
                    gameState.votes[player.id] = randomTarget.id;
                }
            });
            
            // Count votes
            const voteCount = {};
            Object.values(gameState.votes).forEach(targetId => {
                voteCount[targetId] = (voteCount[targetId] || 0) + 1;
            });
            
            // Find player with most votes
            let maxVotes = 0;
            let votedOutPlayer = null;
            for (const [playerId, votes] of Object.entries(voteCount)) {
                if (votes > maxVotes) {
                    maxVotes = votes;
                    votedOutPlayer = gameState.players.find(p => p.id == playerId);
                }
            }
            
            // Eliminate voted out player
            if (votedOutPlayer) {
                votedOutPlayer.alive = false;
                showMessage(`${votedOutPlayer.name} was voted out! They were the ${votedOutPlayer.role}.`);
            }
            
            // Hide voting screen
            document.getElementById('votingScreen').style.display = 'none';
            
            // Check win conditions
            checkWinConditions();
            
            // Reset for next round or end game
            if (gameState.gamePhase === 'playing') {
                gameState.timeRemaining = 300;
                startTimer();
            }
        }

        function checkWinConditions() {
            const alivePlayers = gameState.players.filter(p => p.alive);
            const aliveInnocents = alivePlayers.filter(p => p.role === 'innocent');
            const aliveMurderer = alivePlayers.find(p => p.role === 'murderer');
            const aliveDetective = alivePlayers.find(p => p.role === 'detective');
            
            // Murderer wins if all innocents are dead
            if (aliveInnocents.length === 0 && aliveMurderer) {
                endGame('murderer');
                return;
            }
            
            // Innocents win if murderer is eliminated
            if (!aliveMurderer) {
                endGame('innocents');
                return;
            }
            
            // Detective wins if they eliminate the murderer
            if (aliveDetective && !aliveMurderer) {
                endGame('detective');
                return;
            }
            
            // Check if only murderer and one other player remain
            if (alivePlayers.length === 2 && aliveMurderer) {
                endGame('murderer');
                return;
            }
        }

        function endGame(winner) {
            gameState.gamePhase = 'ended';
            
            const endScreen = document.getElementById('endScreen');
            const endMessage = document.getElementById('endMessage');
            const endDetails = document.getElementById('endDetails');
            
            endScreen.style.display = 'flex';
            
            if (winner === gameState.currentPlayer.role || 
                (winner === 'innocents' && gameState.currentPlayer.role === 'detective')) {
                endMessage.className = 'winMessage';
                endMessage.textContent = 'VICTORY!';
                endDetails.textContent = `You won as the ${gameState.currentPlayer.role}!`;
            } else {
                endMessage.className = 'loseMessage';
                endMessage.textContent = 'DEFEAT';
                endDetails.textContent = `The ${winner} won this round.`;
            }
            
            // Stop music
            document.getElementById('backgroundMusic').pause();
        }

        function restartGame() {
            // Reset game state
            gameState.players = [];
            gameState.currentPlayer = null;
            gameState.mapData = [];
            gameState.gamePhase = 'waiting';
            gameState.timeRemaining = 300;
            gameState.votes = {};
            gameState.clues = [];
            gameState.weapons = [];
            gameState.keys = [];
            gameState.secretPassages = [];
            
            // Hide end screen
            document.getElementById('endScreen').style.display = 'none';
            
            // Start new game
            startLocalGame();
        }

        function backToMenu() {
            // Reset game state
            gameState.players = [];
            gameState.currentPlayer = null;
            gameState.mapData = [];
            gameState.gamePhase = 'waiting';
            gameState.timeRemaining = 300;
            gameState.votes = {};
            gameState.clues = [];
            gameState.weapons = [];
            gameState.keys = [];
            gameState.secretPassages = [];
            
            // Hide game elements
            document.getElementById('gameMap').style.display = 'none';
            document.getElementById('gameHUD').style.display = 'none';
            document.getElementById('controls').style.display = 'none';
            document.getElementById('inventory').style.display = 'none';
            document.getElementById('endScreen').style.display = 'none';
            
            // Show start screen
            document.getElementById('startScreen').style.display = 'flex';
            
            // Stop music
            document.getElementById('backgroundMusic').pause();
        }

        function showMessage(message) {
            const messageElement = document.getElementById('gameMessages');
            messageElement.textContent = message;
            messageElement.style.display = 'block';
            
            setTimeout(() => {
                messageElement.style.display = 'none';
            }, 3000);
        }

        function toggleMusic() {
            const music = document.getElementById('backgroundMusic');
            const button = document.querySelector('.audioButton');
            
            if (gameState.musicEnabled) {
                music.pause();
                button.textContent = '🔇';
                gameState.musicEnabled = false;
            } else {
                music.play();
                button.textContent = '🔊';
                gameState.musicEnabled = true;
            }
        }

        function toggleMap() {
            const mapElement = document.getElementById('gameMap');
            if (mapElement.style.opacity === '0.5') {
                mapElement.style.opacity = '1';
            } else {
                mapElement.style.opacity = '0.5';
            }
        }

        function showInstructions() {
            alert(`How to Play Mystery Mansion:

ROLES:
• Murderer: Eliminate all innocents without being caught
• Detective: Find and eliminate the murderer
• Innocent: Survive and help identify the killer

CONTROLS:
• WASD or Arrow Keys: Move
• E: Interact with objects
• Q: Use item in inventory
• M: Toggle map visibility

OBJECTIVES:
• Find weapons to defend yourself
• Collect clues to identify the murderer
• Discover secret passages for quick escapes
• Vote out the murderer in voting rounds

Good luck, and trust no one!`);
        }

        function showLoadingScreen() {
            document.getElementById('loadingScreen').style.display = 'flex';
        }

        function hideLoadingScreen() {
            document.getElementById('loadingScreen').style.display = 'none';
        }

        // AI Behavior
        function startAIBehavior() {
            setInterval(() => {
                if (gameState.gamePhase !== 'playing') return;
                
                gameState.players.forEach(player => {
                    if (player.id !== gameState.currentPlayer.id && player.alive) {
                        // Simple AI movement
                        const dx = Math.random() < 0.5 ? -1 : 1;
                        const dy = Math.random() < 0.5 ? -1 : 1;
                        
                        if (Math.random() < 0.5) {
                            player.move(dx, 0);
                        } else {
                            player.move(0, dy);
                        }
                        
                        // AI interaction
                        if (Math.random() < 0.1) {
                            player.interact();
                        }
                        
                        // Murderer AI behavior
                        if (player.role === 'murderer') {
                            const nearbyPlayers = gameState.players.filter(p => 
                                p.alive && p !== player && 
                                Math.abs(p.x - player.x) <= 1 && Math.abs(p.y - player.y) <= 1
                            );
                            
                            if (nearbyPlayers.length > 0 && Math.random() < 0.3) {
                                const weapon = player.inventory.find(item => item.type === 'weapon');
                                if (weapon) {
                                    player.kill(nearbyPlayers[0]);
                                }
                            }
                        }
                    }
                });
            }, 2000);
        }

        // Initialize game on load
        window.onload = () => {
            // Set up initial state
            document.getElementById('gameMap').style.display = 'none';
            document.getElementById('gameHUD').style.display = 'none';
            document.getElementById('controls').style.display = 'none';
            document.getElementById('inventory').style.display = 'none';
            document.getElementById('votingScreen').style.display = 'none';
            document.getElementById('endScreen').style.display = 'none';
            document.getElementById('loadingScreen').style.display = 'none';
        };