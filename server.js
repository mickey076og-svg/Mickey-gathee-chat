const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;
const HOST_NAME = "Mickey Gathee";
const HOST_PIN = process.env.HOST_PIN || "mickey123";

// Serve chat page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Room data
let rooms = {};

io.on('connection', (socket) => {

  socket.on('joinRoom', (data) => {
    const { username, roomCode, isHost } = data;
    socket.join(roomCode);
    socket.username = username;
    socket.roomCode = roomCode;
    socket.isHost = isHost;

    if (!rooms[roomCode]) rooms[roomCode] = [];

    // Remove old entry if same socket
    rooms[roomCode] = rooms[roomCode].filter(u => u.id!== socket.id);
    rooms[roomCode].push({ id: socket.id, username, isHost });

    io.to(roomCode).emit('systemMessage', `${username} joined`);
    io.to(roomCode).emit('updateUsers', rooms[roomCode]);
    console.log(`${username} joined ${roomCode}`);
  });

  socket.on('privateMessage', (data) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    io.to(data.roomCode).emit('privateMessage', {
      user: data.user,
      text: data.text,
      time: time,
      isHost: data.user.includes('[HOST]')
    });
  });

  socket.on('hostClearChat', (roomCode) => {
    if (socket.isHost) {
      io.to(roomCode).emit('clearChat');
      io.to(roomCode).emit('systemMessage', `Host ${HOST_NAME} cleared the chat`);
    }
  });

  socket.on('disconnect', () => {
    if (socket.roomCode && rooms[socket.roomCode]) {
      rooms[socket.roomCode] = rooms[socket.roomCode].filter(u => u.id!== socket.id);
      io.to(socket.roomCode).emit('systemMessage', `${socket.username} left`);
      io.to(socket.roomCode).emit('updateUsers', rooms[socket.roomCode]);
    }
  });

});

server.listen(PORT, () => {
  console.log(`Mickey Gathee Chat Live on port ${PORT}`);
});
