import { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { HOST, PORT } from './env';
import { JoinRoomRequest, NewMessageRequest } from './constants'; 


export async function initializeSwagger(app: FastifyInstance) {
  // Registering Swagger for API documentation
  await app.register(swagger, {
    swagger: {
      info: {
        title: 'Real-time Chat API Documentation',
        version: '1.0.0',
        description: `
API documentation for WebSocket events

## WebSocket Events Documentation

This API uses Socket.IO for real-time communication. Below are the available events and their payloads.

### 1. join-room
Join a chat room as either a consultant or patient.

**Emit Event:** \`join-room\`
\`\`\`json
{
  "roomId": "string",
  "role": "consult" | "patient",
  "userId": "string",
  "patientId": "string (optional)",
  "consultId": "string (optional)"
}
\`\`\`

**Response Events:**
- Success: \`chat:room-joined\`
- Error: \`error\`

### 2. chat:new-message
Send a new message in the room.

**Emit Event:** \`chat:new-message\`
\`\`\`json
{
  "roomId": "string",
  "messageContent": "string"
}
\`\`\`

**Response Events:**
- Success: \`chat:new-message\`
- Error: \`error\`

### 3. disconnect
Automatically emitted when client disconnects.

**Response Event:** \`chat:room-left\`

## Testing WebSocket Events
You can test WebSocket events using the /test/websocket endpoints below. These endpoints simulate WebSocket events for testing purposes.
`,
      },
      host: `${HOST}:${PORT}`,
      schemes: ['ws', 'http'],
      consumes: ['application/json'],
      produces: ['application/json'],
      tags: [
        { name: 'websocket', description: 'WebSocket related endpoints' },
        { name: 'test', description: 'Test endpoints for WebSocket events' },
      ],
      definitions: {
        JoinRoomRequest: {
          type: 'object',
          required: ['roomId', 'role', 'userId'],
          properties: {
            roomId: { type: 'string' },
            role: { type: 'string', enum: ['consult', 'patient'] },
            userId: { type: 'string' },
            patientId: { type: 'string' },
            consultId: { type: 'string' },
          },
        },
        NewMessageRequest: {
          type: 'object',
          required: ['roomId', 'messageContent'],
          properties: {
            roomId: { type: 'string' },
            messageContent: { type: 'string' },
          },
        },
      },
    },
  });

  // Registering Swagger UI for easy documentation access
  await app.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      displayRequestDuration: true,
      filter: true,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });

  // Test endpoint definitions and handlers for simulating WebSocket events

  // Example test endpoint for testing `join-room` event
  app.post('/test/websocket/join-room', {
    schema: {
      tags: ['test'],
      summary: 'Test join-room event',
      description: 'Test the join-room WebSocket event by sending a POST request',
      body: {
        type: 'object',
        required: ['roomId', 'role', 'userId'],
        properties: {
          roomId: { type: 'string' },
          role: { type: 'string', enum: ['consult', 'patient'] },
          userId: { type: 'string' },
          patientId: { type: 'string' },
          consultId: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            event: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
    handler: async (request) => {
      const payload = request.body as JoinRoomRequest; // Explicitly cast payload to correct type
      // Emit the `join-room` event via WebSocket
      app.io.emit('join-room', payload);
      return {
        success: true,
        event: 'chat:room-joined',
        data: {
          message: `${payload.role} ${payload.userId} has joined the room.`,
        },
      };
    },
  });

  // Example test endpoint for testing `chat:new-message` event
  app.post('/test/websocket/send-message', {
    schema: {
      tags: ['test'],
      summary: 'Test chat:new-message event',
      description: 'Test the chat:new-message WebSocket event by sending a POST request',
      body: {
        type: 'object',
        required: ['roomId', 'messageContent'],
        properties: {
          roomId: { type: 'string' },
          messageContent: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            event: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                roomId: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
    },
    handler: async (request) => {
      const payload = request.body as NewMessageRequest; 
      const response = {
        success: true,
        event: 'chat:new-message',
        data: {
          message: payload.messageContent,
          roomId: payload.roomId,
          createdAt: new Date().toISOString(),
        },
      };
      app.io.to(payload.roomId).emit('chat:new-message', response.data);
      return response;
    },
  });
}
