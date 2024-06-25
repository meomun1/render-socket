import { createServer } from 'node:http'
import next from 'next'
import { Server } from 'socket.io'

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || 'localhost'
const port = process.env.PORT || 3001
const app = next({ dev })
const handler = app.getRequestHandler()

app.prepare().then(() => {
	const httpServer = createServer(handler)

	const io = new Server(httpServer, {
		cors: {
			origin: '*',
			methods: ['GET', 'POST'],
		},
	})

	const userRooms = new Map()

	io.on('connection', (socket) => {
		console.log('a user connected')

		socket.on('disconnect', () => {
			console.log('user disconnected')
			userRooms.delete(socket.id)
		})

		socket.on('message', (msg) => {
			const room = userRooms.get(socket.id)
			if (room) {
				io.to(room).emit('message', msg)
			}
		})

		socket.on('room', (room) => {
			userRooms.set(socket.id, room)
			socket.join(room)
			io.to(room).emit('room', { room, message: `You are in room ${room}` })
		})
	})

	httpServer
		.once('error', (err) => {
			console.error(err)
			process.exit(1)
		})
		.listen(port, () => {
			console.log(`> Ready on http://${hostname}:${port}`)
		})
})
