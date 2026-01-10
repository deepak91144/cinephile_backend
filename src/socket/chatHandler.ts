import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { Message, FollowRequest } from '../models';

// Track online users: userId -> socketId
const onlineUsers = new Map<string, string>();

export function setupSocketIO(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Helper function to create consistent room IDs
  const getRoomId = (userId1: string, userId2: string) => {
    return [userId1, userId2].sort().join('_');
  };

  // Helper function to check if two users are mutual followers
  const areMutualFollowers = async (userId1: string, userId2: string) => {
    const follow1 = await FollowRequest.findOne({
      from: userId1,
      to: userId2,
      status: 'accepted'
    });
    
    const follow2 = await FollowRequest.findOne({
      from: userId2,
      to: userId1,
      status: 'accepted'
    });

    return follow1 && follow2;
  };

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Register user as online
    socket.on('register_user', ({ userId }) => {
      onlineUsers.set(userId, socket.id);
      console.log(`User ${userId} is now online`);
      
      // Notify all users about this user being online
      io.emit('user_online', { userId });
    });

    // Join a private room with another user
    socket.on('join_room', async ({ currentUserId, otherUserId }) => {
      try {
        // Verify mutual follow
        const canChat = await areMutualFollowers(currentUserId, otherUserId);
        
        if (!canChat) {
          socket.emit('error', { message: 'Can only chat with mutual followers' });
          return;
        }

        const roomId = getRoomId(currentUserId, otherUserId);
        socket.join(roomId);
        console.log(`User ${currentUserId} joined room ${roomId}`);
        
        // Check if other user is online
        const isOtherUserOnline = onlineUsers.has(otherUserId);
        
        socket.emit('room_joined', { 
          roomId,
          otherUserOnline: isOtherUserOnline
        });
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Send a message
    socket.on('send_message', async ({ from, to, content, attachment }) => {
      try {
        // Verify mutual follow
        const canChat = await areMutualFollowers(from, to);
        
        if (!canChat) {
          socket.emit('error', { message: 'Can only chat with mutual followers' });
          return;
        }

        // Save message to database
        const messageData: any = {
          from,
          to,
          read: false
        };

        if (content) messageData.content = content;
        if (attachment) messageData.attachment = attachment;

        const message = await Message.create(messageData);

        // Populate sender info
        await message.populate('from', 'username name avatar');

        const roomId = getRoomId(from, to);
        
        // Broadcast to room (both users)
        io.to(roomId).emit('new_message', message);
        
        console.log(`Message sent in room ${roomId}`);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('typing', ({ from, to }) => {
      const roomId = getRoomId(from, to);
      socket.to(roomId).emit('user_typing', { userId: from });
    });

    // Stop typing
    socket.on('stop_typing', ({ from, to }) => {
      const roomId = getRoomId(from, to);
      socket.to(roomId).emit('user_stop_typing', { userId: from });
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      
      // Find and remove user from online users
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          console.log(`User ${userId} is now offline`);
          
          // Notify all users about this user being offline
          io.emit('user_offline', { userId });
          break;
        }
      }
    });
  });

  return io;
}
