const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
  cors: { origin: "*" } 
});

const HOST_NAME = "Mickey Gathee";
const HOST_PIN = "mickey123"; // <-- Change your secret PIN here

app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

let onlineUsers = {};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join private room
  socket.on('joinRoom', ({ username, roomCode, isHost }) => {
    const finalUsername = isHost ? `${HOST_NAME} [HOST]` : username;
    
    socket.join(roomCode);
    socket.username = finalUsername;
    socket.roomCode = roomCode;
    socket.isHost = isHost || false;

    onlineUsers[socket.id] = { 
      username: finalUsername, 
      room: roomCode, 
      isHost: socket.isHost,
      id: socket.id
    };

    socket.emit('systemMessage', `Welcome! This private server is hosted by ${HOST_NAME}`);
    socket.to(roomCode).emit('systemMessage', `${finalUsername} joined`);
    io.to(roomCode).emit('updateUsers', Object.values(onlineUsers).filter(u => u.room === roomCode));
  });

  // Private message - only same room sees it
  socket.on('privateMessage', (data) => {
    const messageData = {
      user: data.user,
      text: data.text,
      time: new Date().toLocaleTimeString(),
      isHost: data.user.includes(HOST_NAME),
      roomCode: data.roomCode
    };
    io.to(data.roomCode).emit('privateMessage', messageData);
  });

  // HOST ONLY: Clear chat for everyone
  socket.on('hostClearChat', (roomCode) => {
    if(socket.isHost){
      io.to(roomCode).emit('clearChat');
      io.to(roomCode).emit('systemMessage', `${HOST_NAME} cleared the chat`);
    }
  });

  // HOST ONLY: Kick user
  socket.on('hostKickUser', (targetId) => {
    if(socket.isHost){
      const targetSocket = io.sockets.sockets.get(targetId);
      if(targetSocket){
        targetSocket.emit('kicked');
        targetSocket.leave(targetSocket.roomCode);
      }
    }
  });

  socket.on('disconnect', () => {
    if(onlineUsers[socket.id]){
      const room = onlineUsers[socket.id].room;
      socket.to(room).emit('systemMessage', `${onlineUsers[socket.id].username} left`);
      delete onlineUsers[socket.id];
      io.to(room).emit('updateUsers', Object.values(
