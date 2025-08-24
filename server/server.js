// npx serve -s build

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Environment variables
const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';


const corsOptions ={
    origin: ['https://master.d1zvkss672qhs2.amplifyapp.com'],
    methods: ['GET', 'POST'],
    credentials: false,       
}
app.use(cors(corsOptions));


const io = socketIo(server, {
    cors: {
        origin: ['https://master.d1zvkss672qhs2.amplifyapp.com'],
        methods: ['GET', 'POST'],
        credentials: false,       
    }
});




const suits = ['s', 'd', "c", "h" ];
const values = ['1','2','3','4','5','6','7','8','9','10','j','q','k'];
const deck = [];
suits.forEach(suit => {
  values.forEach(val => {
    deck.push(`${suit}${val}`);
  });
});



let inGame = false;
let playerLimit = 8;
let players = [];

let pile = [];
let lastThrownCards = [];
let turn = 0;
let hands = [];
let firstCardPlayed = false;
let stackCleared = false;
let pass = false;
let jumpin = false;
let passedPlayer = null;
let lock = false;
let fastlock = false;
let recentpass = null;

io.on('connection', (socket) => {

    if (inGame) {
        console.log(`Player ${socket.id} tried to connect but game already started.`);
        socket.emit('PlayerIndex', -1);
        socket.disconnect(true); // <-- This forcibly disconnects the client
        return;
    }

    let playerIndexCounter = -1;
    for (let i = 0; i <= playerLimit-1; i++) {
        if (players[i] == null){
            playerIndexCounter = i;
            players[i] = socket.id;

            console.log(`Player ${socket.id} connected as Player ${playerIndexCounter + 1}`);
            socket.emit('PlayerIndex', playerIndexCounter);   //io emits to all clients socket to one
            io.emit("PlayerInfo", [...players]);
            break;
        }
        
        if (playerIndexCounter == -1){
         socket.emit('PlayerIndex', -1);  
        }
    }


    socket.on('LaunchGame', () => {
        resetGameState()
        io.emit('ResetState');

        inGame = true;

        // Shuffle the deck
        const shuffled = [...deck].sort(() => Math.random() - 0.5);

        // Prepare hands
        const playerCount = players.filter(Boolean).length;
        const cardsPerPlayer = Math.floor(shuffled.length / playerCount);
        const remainder = shuffled.length % playerCount;

        let dealt = 0;
        for (let i = 0; i < playerCount; i++) {
            let extra = i < remainder ? 1 : 0; // Give remainder to first players
            hands[i] = shuffled.slice(dealt, dealt + cardsPerPlayer + extra);
            dealt += cardsPerPlayer + extra;
        }



        // Send hands to each player
        players.forEach((socketId, idx) => {
            io.to(socketId).emit('PlayerHand', hands[idx]);
        });

 
        io.emit('GameStarted');
        io.emit('PlayerHandSizes', hands.map(h => h ? h.length : 0));


        const s3Owner = hands.findIndex(hand => hand.includes("s3"));
        if (s3Owner !== -1) {
            turn = s3Owner;
            const socketId = players[s3Owner];
            io.to(socketId).emit('feedback', 'You are starting!');
        } else {
            turn = 0;
        }
        io.emit('TurnInfo', turn);

    });
    
    socket.on('Pass', () => {
        const pIndex = players.indexOf(socket.id);
        const playerCount = players.filter(Boolean).length;

        if (recentpass === pIndex) {
            io.emit('feedback', 'Pile cleared bottled up');

            pile = [];
            io.emit('PileUpdate', pile);
            
            turn = players.indexOf(socket.id);
            io.emit('TurnInfo', turn);
        
            recentpass = null;
            return;
        }


        socket.emit('feedback', 'You passed your turn.');
        players.forEach((id) => {
        if (id !== pIndex) {
            io.to(id).emit('feedback', `Player ${pIndex + 1} Passed`);
        }
        })
        
        for (let i = 1; i < playerCount; i++) {
            const candidate = (turn + i) % playerCount;
            if (hands[candidate].length > 0) {
                turn = candidate;
                break;
            }
        }

        // No turn played
        if (!recentpass)  {recentpass = pIndex;}
        // Also needs to be cleared
        passedPlayer = null;
        io.emit('PassedPlayerInfo', passedPlayer);
        io.emit('TurnInfo', turn);

    });

    socket.on('throwCards', async ({cards}) => {
        const pIndex = players.indexOf(socket.id);
        const playerCount = players.filter(Boolean).length;

        if (lock) {
            socket.emit('feedback', 'Wait for server');
            return;
        }
        if (fastlock && pIndex === turn) {
            socket.emit('feedback', 'Fast Lock in effect');
            return;
        }
        if (!isValidThrow(cards, socket)){
            return;
        }

        //passed player cannot play or jump anyway so clear
        passedPlayer = null;
        //viable turn so no turn back
        recentpass = false;

        hands[pIndex] = hands[pIndex].filter(c => !cards.includes(c));
        lastThrownCards = cards;
        pile.push(...lastThrownCards);

        
        io.emit('ThrownCardsUpdate', { cards: lastThrownCards, thrownBy: pIndex });
        socket.emit('PlayerHand', hands[pIndex]);
        io.emit('PlayerHandSizes', hands.map(h => h ? h.length : 0));


        await new Promise(resolve => setTimeout(resolve, 500));  // <-------------
        io.emit('PileUpdate', pile);




        // Check if player has only 2s left after this throw
        if ( hands[pIndex].length > 0 && hands[pIndex].every(card => cardValue(card) === 2) )  {
            io.emit('GameOver', pIndex , true);
        }
        
        const playersWithCards = hands.filter(hand => hand.length > 0);
        if (playersWithCards.length === 1) {
            const lastPlayerIndex = hands.findIndex(hand => hand.length > 0);
            io.emit('GameOver', lastPlayerIndex);
            return;
        }


        if (hands[pIndex].length === 0) {
            io.emit('feedback', `Player ${pIndex + 1} cleared hand!`);
        }

        if (jumpin)
        {
            jumpin = false;
            pile = [];


            // If the player still has cards, keep the turn; else, find next viable
            if (hands[pIndex].length === 0) {
                for (let i = 1; i < playerCount; i++) {
                    const candidate = (pIndex + i) % playerCount;
                    if (hands[candidate].length > 0) {
                        turn = candidate;
                        break;
                    }
                }
            } else {
                turn = pIndex;
            }

            socket.emit('feedback', 'You jumped in!');
            players.forEach((id) => {
                if (id !== socket.id) {
                    io.to(id).emit('feedback', `Player ${pIndex + 1} jumped in!`);
                }
            });
        }

        
        else if (stackCleared) {
            stackCleared = false;
            pile = [];


        // If the player still has cards, keep the turn; else, find next viable
            if (hands[pIndex].length === 0) {
                for (let i = 1; i < playerCount; i++) {
                    const candidate = (pIndex + i) % playerCount;
                    if (hands[candidate].length > 0) {
                        turn = candidate;
                        break;
                    }
                }
            }


            socket.emit('feedback', 'Extra Turn!');
            players.forEach((id) => {
                if (id !== socket.id) {
                    io.to(id).emit('feedback', 'Stack cleared!');
                }
            });
        }

        else if (pass) {
            pass = false;

            // Find next viable player to pass (has cards)
            let nextTurn = turn;
            for (let i = 1; i < playerCount; i++) {
                const candidate = (turn + i) % playerCount;
                if (hands[candidate].length > 0) {
                    nextTurn = candidate;
                    break;
                }
            }

            // Find next viable player after the passed player 
            let newTurn = nextTurn;
            for (let i = 1; i < playerCount; i++) {
                const candidate = (nextTurn + i) % playerCount;
                if (hands[candidate].length > 0) {
                    newTurn = candidate;
                    break;
                }
            }

            const skippedSocketId = players[nextTurn];
            if (skippedSocketId) {
                io.to(skippedSocketId).emit('feedback', 'You got passed!');
            }

            // Feedback for the player who passed (current turn)
            const currentSocketId = players[turn];
            if (currentSocketId) {
                io.to(currentSocketId).emit('feedback', `You passed player ${nextTurn + 1}!`);
            }
            
            // Feedback for all other players
            players.forEach((id, idx) => {
                if ( idx !== turn && idx !== nextTurn ){
                    io.to(id).emit('feedback', `Player ${turn + 1} passed player ${nextTurn + 1}`);
                }
            });

            passedPlayer = nextTurn;
            turn = newTurn
        }

        else {
            for (let i = 1; i < playerCount; i++) {
                const candidate = (turn + i) % playerCount;
                if (hands[candidate].length > 0) {
                    turn = candidate;
                    break;
                }
            }

        }

        io.emit('TurnInfo', turn);
        io.emit('PassedPlayerInfo', passedPlayer);

        lock = true;
        await new Promise(resolve => setTimeout(resolve, 1000));  // <--------------

        io.emit('PileUpdate', pile);


        await new Promise(resolve => setTimeout(resolve, 500));  // <--------------
        lock = false;

        //dont need fastlock
        if (pile.length === 0) {return;}
        fastlock = true;
        setTimeout(() => {
            fastlock = false;
        }, 500);

    });


    socket.on('ResetServer', ({ hard = false }) => {

        resetGameState(hard)

        io.emit('ResetState');

        if (hard)
        {
            players = [];
            io.emit('ForceReconnect');
            console.log('Game has been reset and all clients will reconnect.');
        }

        
    });

socket.on('disconnect', () => {
    const index = players.indexOf(socket.id);

    // Legit player with assigned index
    if (index !== -1) {
        players.splice(index, 1);
        // Optionally, keep the array at playerLimit length (fill with nulls at the end)
        while (players.length < playerLimit) {
            players.push(null);
        }
        console.log(`Slot ${index} is now free and players shifted`);

        resetGameState()

        io.emit('ResetState');

        io.emit("PlayerInfo", [...players]);

        players.forEach((socketId, idx) => {
            if (socketId) {
                io.to(socketId).emit('PlayerIndex', idx);
            }
        });

        io.emit('feedback', 'A player disconnected. Game has been reset.');
    } else {
        console.log(`Not assigned ${socket.id} left`);
    }
    });

});

function isValidThrow(cards , socket) {
    const pIndex = players.indexOf(socket.id)


    // Block any throw of more than one card if any card is a 2
    if (cards.length > 1 && cards.every(card => cardValue(card) === 2)) {
        socket.emit('feedback', 'You cannot throw multiple 2s!');
        return false;
    }
    if (cards.some(card => cardValue(card) === 2) && cards.length > 1) {
        socket.emit('feedback', 'You cannot pair 2 with other values!');
        return false;
    }

    const firstValue = cardValue(cards[0]);
    if (!cards.every(card => cardValue(card) === firstValue)) {
        socket.emit('feedback', 'The cards you throw must have the same value!');
        return false;
    }


    // 1. First Card Must be "s3"
    if (!firstCardPlayed){
        if (turn !== pIndex) {
            socket.emit('feedback', 'Not your turn!');
            return false;
        }
        if (cards.length === 1 && cards[0] === "s3") {
            firstCardPlayed = true;
            return true;
        } else {
            socket.emit('feedback', 'First card must be only "s3"!');
            return false;
        }
    }

    // Not your Turn but Jump In
    if (turn !== pIndex) {
        // Cant jump in with a 4 stack
        if (pile.length > 0 && cards.length !== 4) {
            const thrownVal = cardValue(cards[0]);

            const tempPile = [...pile, ...cards];
            const lastFour = tempPile.slice(-4);

            if (
                lastFour.length === 4 &&
                lastFour.every(card => cardValue(card) === thrownVal)
            ) {
                if (passedPlayer === pIndex) {
                    socket.emit('feedback', 'You are passed and cannot jump in!');
                    return false;
                }
                jumpin = true;
                return true;

            }
        }
        socket.emit('feedback', 'Not your turn!');
        return false;
    }

    // 2 Clears the stack
    if (cardValue(cards[0]) === 2){
        stackCleared = true;
        return true;
    }
    
    // Full clear
    if (cards.length === 4) {
        stackCleared = true;
        return true;
    }


    // Check Throwing
    if (pile.length > 0) {
        const thrownValue = cardValue(cards[0]);
        const lastValue = cardValue(lastThrownCards[0]);


        if (cards.length < lastThrownCards.length) {
            if (thrownValue === lastValue) {
                // Check first if 4 stack is achieved if not pass the player
                const tempPile = [...pile, ...cards];
                const lastFour = tempPile.slice(-4);
                if (  lastFour.length === 4 && lastFour.every(card => cardValue(card) === thrownValue)) {
                    stackCleared = true;
                    return true;
                }
                else {
                    pass = true;
                    return true;
                }
            }
            else {
                socket.emit('feedback', 'Needs to be same value if less than stack!');
                return false;
            }

        } 


        else if (cards.length === lastThrownCards.length) {
            if (thrownValue < lastValue) {
                socket.emit('feedback', 'If matching the stack you must throw equal or more value card!');
                return false;
            }
            else if (thrownValue === lastValue) {
                
                const tempPile = [...pile, ...cards];
                const lastFour = tempPile.slice(-4);
                if ( lastFour.length === 4 && lastFour.every(card => cardValue(card) === thrownValue)) {
                    stackCleared = true;
                    return true;
                }
                // That only leaves 1 card on 1
                else {
                    pass = true;
                    return true;
                }

            }
            else {
                return true;
            }
        }


        else {
            // 3 Stack at > 2,1 if same value must be the last card clear
            if (cards.length === 3) {
                if (thrownValue == lastValue){
                    stackCleared = true;
                    return true;
                }
                return true;
            }
            // 2 Stack at > 1 no extra condition on same value
            else {
               return true;
            }


        }


    }
    else {
        // No last thrown cards, so any valid card can be thrown
        return true;
    }
}



function cardValue(card) {
    const val = card.slice(1);
    if (val === 'j') return 11;
    if (val === 'q') return 12;
    if (val === 'k') return 13;
    if (val === '1') return 14; // Ace high
    return parseInt(val, 10); // for '2'...'10'
}



// Serve static files from React build in production
if (NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../build')));
    
    // API info page for direct server access
    app.get('/api', (req, res) => {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Card Game Server</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; margin: 50px; }
                    .container { max-width: 600px; margin: 0 auto; }
                    h1 { color: #333; }
                    p { color: #666; line-height: 1.6; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🎮 Card Game Server</h1>
                    <p>This is the backend server for the Card Game application.</p>
                    <p>The server is running and ready to handle WebSocket connections.</p>
                    <p><strong>Server Status:</strong> Online</p>
                    <p><strong>Environment:</strong> ${NODE_ENV}</p>
                    <p><strong>Port:</strong> ${PORT}</p>
                    <hr>
                    <p>To play the game, visit the main application.</p>
                </div>
            </body>
            </html>
        `);
    });
    
    // Handle React routing, return all requests to React app
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../build', 'index.html'));
    });
} else {
    // Development mode - serve static files from public directory
    app.use(express.static('public'));
}

// Start server on the specified port
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} in ${NODE_ENV} mode`);
});

function resetGameState(hard = false) {
    inGame = false;
    pile = [];
    lastThrownCards = [];
    turn = 0;
    hands = [];
    firstCardPlayed = false;
    stackCleared = false;
    pass = false;
    jumpin = false;
    passedPlayer = null;
    lock = false;
    fastlock = false;
    recentpass = null;

    io.emit('ResetState');

    if (hard) {
        players = [];
        io.emit('ForceReconnect');
        console.log('Game has been reset and all clients will reconnect.');
    }
}