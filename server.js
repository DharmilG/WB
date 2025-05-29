import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage for demo (replace with database in production)
const users = new Map();
const rooms = new Map();
const messages = new Map();

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User joins with name and room code
  socket.on('join-room', ({ userName, roomCode }) => {
    try {
      // Create or get room
      if (!rooms.has(roomCode)) {
        rooms.set(roomCode, {
          id: roomCode,
          users: new Set(),
          createdAt: new Date().toISOString()
        });
        messages.set(roomCode, []);
      }

      const room = rooms.get(roomCode);
      room.users.add(socket.id);

      // Store user info
      users.set(socket.id, {
        id: socket.id,
        name: userName,
        roomCode: roomCode,
        joinedAt: new Date().toISOString()
      });

      // Join socket room
      socket.join(roomCode);

      // Send room history
      const roomMessages = messages.get(roomCode) || [];
      socket.emit('room-history', roomMessages);

      // Notify others in room
      socket.to(roomCode).emit('user-joined', {
        userName,
        userId: socket.id,
        timestamp: new Date().toISOString()
      });

      // Send current room users
      const roomUsers = Array.from(room.users).map(userId => users.get(userId)).filter(Boolean);
      io.to(roomCode).emit('room-users', roomUsers);

      console.log(`${userName} joined room ${roomCode}`);
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Handle new messages
  socket.on('send-message', ({ message, roomCode }) => {
    try {
      const user = users.get(socket.id);
      if (!user || user.roomCode !== roomCode) {
        socket.emit('error', { message: 'Unauthorized' });
        return;
      }

      const messageData = {
        id: uuidv4(),
        text: message,
        sender: user.name,
        senderId: socket.id,
        timestamp: new Date().toISOString(),
        roomCode
      };

      // Store message
      if (!messages.has(roomCode)) {
        messages.set(roomCode, []);
      }
      messages.get(roomCode).push(messageData);

      // Broadcast to room
      io.to(roomCode).emit('new-message', messageData);

      console.log(`Message from ${user.name} in room ${roomCode}: ${message}`);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle typing indicators
  socket.on('typing-start', ({ roomCode }) => {
    const user = users.get(socket.id);
    if (user && user.roomCode === roomCode) {
      socket.to(roomCode).emit('user-typing', { userName: user.name, userId: socket.id });
    }
  });

  socket.on('typing-stop', ({ roomCode }) => {
    const user = users.get(socket.id);
    if (user && user.roomCode === roomCode) {
      socket.to(roomCode).emit('user-stopped-typing', { userName: user.name, userId: socket.id });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    try {
      const user = users.get(socket.id);
      if (user) {
        const room = rooms.get(user.roomCode);
        if (room) {
          room.users.delete(socket.id);

          // Notify others in room
          socket.to(user.roomCode).emit('user-left', {
            userName: user.name,
            userId: socket.id,
            timestamp: new Date().toISOString()
          });

          // Send updated room users
          const roomUsers = Array.from(room.users).map(userId => users.get(userId)).filter(Boolean);
          io.to(user.roomCode).emit('room-users', roomUsers);

          // Clean up empty rooms
          if (room.users.size === 0) {
            rooms.delete(user.roomCode);
            messages.delete(user.roomCode);
          }
        }

        users.delete(socket.id);
        console.log(`${user.name} disconnected from room ${user.roomCode}`);
      }
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:3000"}`);
});
