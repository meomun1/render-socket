import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'

const app = express()
const server = createServer(app)
const io = new Server(server, {
	cors: {
		origin: '*', // Adjust as needed for production
		methods: ['GET', 'POST'],
	},
})

let players = {}
let playerCount = 0

io.on('connection', (socket) => {
	console.log('a user connected:', socket.id)

	// Check if there are already 2 players connected
	if (playerCount < 2) {
		playerCount++
		let playerNumber = playerCount
		console.log('playerNumber:', playerNumber)

		players[socket.id] = {
			playerId: socket.id,
			playerNumber: playerNumber,
			// y: config.height / 5,
			// x: config.width / 2,
		}

		// Send current players to new player
		socket.emit('currentPlayers', players)

		// Notify other players about new player
		socket.broadcast.emit('newPlayer', players[socket.id])
	} else {
		socket.emit('gameFull')
	}

	socket.on('playerMovement', (movementData) => {
		if (players[socket.id]) {
			players[socket.id].x = movementData.x
			players[socket.id].y = movementData.y
			// Broadcast to other players
			socket.broadcast.emit('playerMoved', players[socket.id])
		}
	})

	socket.on('playerAnimation', (data) => {
		// Broadcast the animation change to all other clients
		socket.broadcast.emit('playerAnimation', data)
		console.log('playerAnimation', data.animationKey)
	})

	// Server-side code
	socket.on('shootBullet', (bulletData) => {
		socket.broadcast.emit('opponentShootBullet', bulletData)
	})

	socket.on('disconnect', () => {
		console.log('user disconnected:', socket.id)
		if (players[socket.id]) {
			delete players[socket.id]
			playerCount--
			io.emit('playerDisconnected', socket.id)
		}
	})
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`)
})
