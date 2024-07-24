import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // Adjust as needed for production
        methods: ['GET', 'POST'],
    },
});

let players = {};
let rooms = {};

io.on('connection', (socket) => {
    console.log('a user connected:', socket.id);

    socket.on('getRooms', () => {
        socket.emit('rooms', rooms);
    });

    socket.on('joinRoom', (data) => {

        const roomNumber = String(data.room);

        const room = rooms[roomNumber] || { players: {}, playerCount: 0 };

        if (room.playerCount < 2) {
            room.playerCount++;
            room.players[socket.id] = {
                playerId: socket.id,
                playerNumber: room.playerCount,
            };

            rooms[roomNumber] = room;

            socket.join(roomNumber);
            socket.emit('joinedRoom', { roomNumber, playerInfo: room.players[socket.id] });
        } else {
            socket.emit('roomFull');
        }
    });

    socket.on('playerLoadInRoom', (data) => {
        const roomNumber = String(data.roomNumber);
        console.log('playerLoadInRoom received for room:', roomNumber);
        if (rooms[roomNumber]) {
            // Emit to the current socket's room only
            io.to(roomNumber).emit('roomState', rooms[roomNumber].players);
    
            // Notify others in the room about the player who just loaded in, excluding the sender
            socket.to(roomNumber).emit('opponentLoadInRoom', rooms[roomNumber].players[socket.id]);
        }
    });
    
    socket.on('playerReady', (data) => {
        const roomNumber = String(data.roomNumber);
        if (rooms[roomNumber]) {
            socket.to(roomNumber).emit('opponentReady', rooms[roomNumber].players[socket.id]);
        }
    });

    socket.on('playerInGame', (data) => {
        const roomNumber = String(data.roomNumber);
        console.log(`playerInGame event received from socket ID: ${socket.id} for room:`, roomNumber);
        if (rooms[roomNumber]) {
            console.log('Room exists. Checking if player is already in game for socket ID:', socket.id);
            if (rooms[roomNumber].players[socket.id]) {
                if (!rooms[roomNumber].players[socket.id].alreadyInGame) {
                    console.log('Player not marked as in game yet. Marking as in game and emitting currentPlayers.');
                    rooms[roomNumber].players[socket.id].alreadyInGame = true; // Mark as in game
                    io.to(socket.id).emit('currentPlayers', rooms[roomNumber].players);
                } else {
                    console.log('Player already marked as in game. Skipping emission.');
                }
            }
        }
    });

    socket.on('playerMovement', (movementData) => {
        const roomNumber = String(movementData.roomNumber);
        if (rooms[roomNumber] && rooms[roomNumber].players[socket.id]) {
            // Update player position
            rooms[roomNumber].players[socket.id].x = movementData.x;
            rooms[roomNumber].players[socket.id].y = movementData.y;
            // Emit to all in the room except the sender
            socket.to(roomNumber).emit('playerMoved', rooms[roomNumber].players[socket.id]);
        }
    });

    socket.on('playerAnimation', (data) => {
        const roomNumber = String(data.roomNumber);
        if (rooms[roomNumber] && rooms[roomNumber].players[socket.id]) {
            // Emit player animation to all in the room except the sender
            socket.to(roomNumber).emit('playerAnimation', data);
        }
    });

    socket.on('shootBullet', (bulletData) => {
        const roomNumber = String(bulletData.roomNumber);
        if (rooms[roomNumber] && rooms[roomNumber].players[socket.id]) {
            // Emit bullet data to all in the room except the sender
            socket.to(roomNumber).emit('opponentShootBullet', bulletData);
        }
    });

    socket.on('disconnect', () => {
        console.log('user disconnected:', socket.id);
        Object.keys(rooms).forEach((roomNumber) => {
            const room = rooms[roomNumber];
            if (room && room.players[socket.id]) {
                delete room.players[socket.id];
                room.playerCount--;
                if (room.playerCount === 0) {
                    delete rooms[roomNumber];
                } else {
                    io.to(roomNumber).emit('playerDisconnected', socket.id);
                }
            }
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});