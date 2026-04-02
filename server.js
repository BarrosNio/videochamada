const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve the index.html file statically
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Room states to temporarily hold chat history per room
const rooms = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId, nickname) => {
    socket.join(roomId);
    
    // Initialize room if not exists
    if (!rooms[roomId]) {
      rooms[roomId] = { messages: [], users: [] };
    }
    
    // Send previous chat history to the newly joined user
    if (rooms[roomId].messages.length > 0) {
      socket.emit('chat-history', rooms[roomId].messages);
    }
    
    // Notify others in room
    socket.to(roomId).emit('user-joined', socket.id, nickname);
    console.log(`${nickname} (${socket.id}) joined room: ${roomId}`);
  });

  // WebRTC Signaling Events
  socket.on('offer', (roomId, offer) => {
    socket.to(roomId).emit('offer', socket.id, offer);
  });

  socket.on('answer', (roomId, answer) => {
    socket.to(roomId).emit('answer', socket.id, answer);
  });

  socket.on('ice-candidate', (roomId, candidate) => {
    socket.to(roomId).emit('ice-candidate', socket.id, candidate);
  });
  
  // Custom Sys Message
  socket.on('sys-msg', (roomId, nickname) => {
    socket.to(roomId).emit('sys-msg', nickname);
  });

  // Chat System routing
  socket.on('chat-message', (roomId, messageData) => {
    // Store temporarily in session config limited to 100 max
    if (rooms[roomId]) {
       rooms[roomId].messages.push(messageData);
       if (rooms[roomId].messages.length > 100) rooms[roomId].messages.shift();
    }
    // Broadcast to others in the room
    socket.to(roomId).emit('chat-message', messageData);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Socket.io WebRTC Server running on http://localhost:${PORT}`);
});
