const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

app.use(express.static(path.join(__dirname, 'public')));

// Memória simples de salas
const rooms = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId, nickname) => {
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }

    socket.to(roomId).emit('user-joined');

    socket.on('offer', offer => {
      socket.to(roomId).emit('offer', offer);
    });

    socket.on('answer', answer => {
      socket.to(roomId).emit('answer', answer);
    });

    socket.on('ice-candidate', candidate => {
      socket.to(roomId).emit('ice-candidate', candidate);
    });

    socket.on('chat-message', msg => {
      io.to(roomId).emit('chat-message', msg);
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
