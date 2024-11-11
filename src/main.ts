import fastify from 'fastify';
import { PrismaClient, Role } from '@prisma/client';
import fastifyCors from '@fastify/cors';
import fastifyIO from 'fastify-socket.io';
import { setupSwagger } from './swagger';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || 'localhost';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

interface JoinRoomRequest {
  roomId: string;
  role: 'consult' | 'patient';
  userId: string;
  patientId?: string; 
  consultId?: string; 
}

async function buildServer() {
  const app = fastify();

  // Register plugins
  await app.register(fastifyCors, {
    origin: CORS_ORIGIN,
  });
  
  await app.register(fastifyIO, {
    cors: {
      origin: CORS_ORIGIN,
      methods: ['GET', 'POST'],
    },
  });
  
  await setupSwagger(app);

  app.io.on('connection', (socket) => {
    console.log('Client connected');
    let roomId: string | undefined;
    let role: 'consult' | 'patient' | undefined;
    let userId: string | undefined;

    socket.on('join-room', async (data: JoinRoomRequest) => {
      const { roomId: newRoomId, role: newRole, userId: newUserId, patientId, consultId } = data;
      userId = newUserId;

      try {
        roomId = newRoomId;
        role = newRole;

        // Check if the user exists, if not create a new user
        let user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          // Create a new user if they don't exist
          user = await prisma.user.create({
            data: {
              id: userId,
              username: `user${userId}`,
              name: `User ${userId}`,
              email: `user${userId}@example.com`,
              connected: true,
            },
          });
        } else {
          // Update existing user status to connected
          await prisma.user.update({
            where: { id: userId },
            data: { connected: true },
          });
        }

        // Generate token based on the role
        const token = role === 'consult'
          ? `${userId}-${patientId || ''}-${newRoomId}`
          : `${consultId || ''}-${userId}-${newRoomId}`;

        // Check if room with this token already exists
        let room = await prisma.room.findUnique({
          where: { token },
          include: { RoomUser: true },
        });

        if (!room) {
          // If the room doesn't exist, create a new room
          room = await prisma.room.create({
            data: {
              id: newRoomId,
              token,
              RoomUser: {
                create: {
                  userId: userId,
                  role: newRole === 'consult' ? Role.CONSULT : Role.PATIENT,
                },
              },
            },
            include: { RoomUser: true },
          });

          console.log(`User ${userId} with role ${newRole} joined room: ${newRoomId}`);
          await prisma.message.create({
            data: {
              roomId: newRoomId,
              userId: userId,
              role: newRole === 'consult' ? Role.CONSULT : Role.PATIENT,
              content: `${newRole} ${userId} has joined the room.`,
            },
          });

          app.io.to(newRoomId).emit('chat:room-joined', {
            message: `${newRole} ${userId} has joined the room.`,
          });
        } else {
          // If the room exists, check if the user is already in the room
          const existingEntry = await prisma.roomUser.findUnique({
            where: {
              roomId_userId: {
                roomId: newRoomId,
                userId: userId,
              },
            },
          });

          if (existingEntry) {
            console.log(`${newRole} ${userId} is already in the room: ${newRoomId}`);
            return; 
          }

          // Create RoomUser entry if user is not already in the room
          await prisma.roomUser.create({
            data: {
              roomId: newRoomId,
              userId: userId,
              role: newRole === 'consult' ? Role.CONSULT : Role.PATIENT,
            },
          });

          console.log(`User ${userId} with role ${newRole} joined room: ${newRoomId}`);
          await prisma.message.create({
            data: {
              roomId: newRoomId,
              userId: userId,
              role: newRole === 'consult' ? Role.CONSULT : Role.PATIENT,
              content: `${newRole} ${userId} has joined the room.`,
            },
          });

          app.io.to(newRoomId).emit('chat:room-joined', {
            message: `${newRole} ${userId} has joined the room.`,
          });
        }

        socket.join(newRoomId);
      } catch (error) {
        console.error("Error joining room:", error);
        socket.emit("error", { message: "An error occurred while joining the room." });
      }
    });

    socket.on('disconnect', async () => {
      if (roomId && role && userId) {
        console.log(`${role} disconnected from room: ${roomId}`);

        try {
          // Mark user as disconnected in the database
          await prisma.user.update({
            where: { id: userId },
            data: { connected: false },
          });

          // Remove user from the room
          await prisma.roomUser.delete({
            where: {
              roomId_userId: {
                roomId: roomId,
                userId: userId,
              },
            },
          });

          await prisma.message.create({
            data: {
              roomId: roomId,
              userId: userId,
              role: role === 'consult' ? Role.CONSULT : Role.PATIENT,
              content: `${role} ${userId} has disconnected from the room.`,
            },
          });

          app.io.to(roomId).emit('chat:room-left', {
            message: `${role} ${userId} has disconnected from the room.`,
          });
        } catch (error) {
          console.error("Error during disconnection:", error);
        }
      } else {
        console.log('Client disconnected without a room.');
      }
    });

    socket.on('chat:new-message', async (data: { roomId: string; messageContent: string }) => {
      const { roomId, messageContent } = data;
      console.log('messageContent', messageContent);

      if (!userId) {
        console.error("User ID is undefined, cannot send message.");
        socket.emit("error", { message: "User ID is undefined, cannot send message." });
        return;
      }

      try {
        await prisma.message.create({
          data: {
            roomId,
            userId: userId,
            role: role === 'consult' ? Role.CONSULT : Role.PATIENT,
            content: messageContent,
          },
        });

        app.io.to(roomId).emit('chat:new-message', {
          message: messageContent,
          roomId,
          createdAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("error", { message: "An error occurred while sending the message." });
      }
    });
  });

  return app;
}

async function main() {
  const app = await buildServer();
  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`Server started at http://localhost:${PORT}`);
    console.log(`Swagger documentation available at http://localhost:${PORT}/documentation`);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();



