import { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { FastifyRequest } from 'fastify';
import dotenv from 'dotenv';

dotenv.config();


const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

interface JoinRoomBody {
  roomId: string;
  role: 'consult' | 'patient';
  userId: string;
  patientId?: string;
  consultId?: string;
}

interface MessageBody {
  roomId: string;
  messageContent: string;
}

export async function setupSwagger(app: FastifyInstance) {
  await app.register(swagger, {
    swagger: {
      info: {
        title: 'Real-time Chat API Documentation',
        description: `
# WebSocket Events Documentation

This API uses Socket.IO for real-time communication. Below are the available events and their payloads.

## Connection
Connect to WebSocket at: \`ws://${HOST}:${PORT}\`

## Events

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

**Consult Role**

\`\`\`json
{
  "roomId": "123",
  "role": "consult",
  "userId": "666",
  "patientId": "456"
}
\`\`\`

**Patient Role**

\`\`\`json

{
  "roomId": "123",
  "role": "patient",
  "userId": "456",
  "consultId": "666"
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

**Example send from Consult**

\`\`\`json
{
  "roomId": "123",
  "messageContent": "Hello from Consult!"
}
\`\`\`

**Example send from Patient**

\`\`\`json
{
  "roomId": "123",
  "messageContent": "Hello from Patient!"
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
        version: '1.0.0'
      },
      host: `${HOST}:${PORT}`,
      schemes: ['ws','http'],
      consumes: ['application/json'],
      produces: ['application/json'],
      tags: [
        { name: 'websocket', description: 'WebSocket related endpoints' },
        { name: 'test', description: 'Test endpoints for WebSocket events' }
      ],
      definitions: {
        JoinRoomRequest: {
          type: 'object',
          required: ['roomId', 'role', 'userId'],
          properties: {
            roomId: { 
              type: 'string',
              description: 'Unique identifier for the room',
              example: '123'
            },
            role: { 
              type: 'string',
              enum: ['consult', 'patient'],
              description: 'Role of the user joining the room',
              example: 'consult'
            },
            userId: { 
              type: 'string',
              description: 'Unique identifier for the user',
              example: '666'
            },
            patientId: { 
              type: 'string',
              description: 'Optional patient ID for consult role',
              example: '456'
            },
            consultId: { 
              type: 'string',
              description: 'Optional consult ID for patient role',
              example: '666'
            }
          }
        },
        NewMessageRequest: {
          type: 'object',
          required: ['roomId', 'messageContent'],
          properties: {
            roomId: { 
              type: 'string',
              description: 'Room ID where the message is sent',
              example: '123'
            },
            messageContent: { 
              type: 'string',
              description: 'Content of the message',
              example: 'Hello, how are you?'
            }
          }
        },
        Message: {
          type: 'object',
          properties: {
            id: { 
              type: 'integer',
              description: 'Unique identifier for the message',
              example: 1
            },
            content: { 
              type: 'string',
              description: 'Message content',
              example: 'Hello, how are you?'
            },
            userId: { 
              type: 'string',
              description: 'ID of the user who sent the message',
              example: '666'
            },
            roomId: { 
              type: 'string',
              description: 'ID of the room where message was sent',
              example: '123'
            },
            role: { 
              type: 'string',
              enum: ['CONSULT', 'PATIENT'],
              description: 'Role of the message sender',
              example: 'CONSULT'
            },
            createdAt: { 
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when message was created',
              example: '2023-09-20T10:00:00Z'
            }
          }
        },
        Room: {
          type: 'object',
          properties: {
            id: { 
              type: 'string',
              description: 'Unique identifier for the room',
              example: '123'
            },
            token: { 
              type: 'string',
              description: 'Unique token for room access',
              example: '666-456-123'
            },
            createdAt: { 
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when room was created',
              example: '2023-09-20T10:00:00Z'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            message: { 
              type: 'string',
              description: 'Error message',
              example: 'An error occurred while joining the room.'
            }
          }
        }
      }
    }
  });

  await app.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      displayRequestDuration: true,
      filter: true
    },
    staticCSP: true,
    transformStaticCSP: (header) => header
  });

  // Test endpoints for manual WebSocket testing
  app.post<{ Body: JoinRoomBody }>('/test/websocket/join-room', {
    schema: {
      tags: ['test'],
      summary: 'Test join-room event',
      description: 'Test the join-room WebSocket event by sending a POST request',
      body: {
        type: 'object',
        required: ['roomId', 'role', 'userId'],
        properties: {
          roomId: { 
            type: 'string',
            description: 'Unique identifier for the room'
          },
          role: { 
            type: 'string',
            enum: ['consult', 'patient'],
            description: 'Role of the user joining the room'
          },
          userId: { 
            type: 'string',
            description: 'Unique identifier for the user'
          },
          patientId: { 
            type: 'string',
            description: 'Optional patient ID for consult role'
          },
          consultId: { 
            type: 'string',
            description: 'Optional consult ID for patient role'
          }
        }
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
                message: { type: 'string' }
              }
            }
          }
        }
      }
    },
    handler: async (request: FastifyRequest<{ Body: JoinRoomBody }>) => {
      const payload = request.body;
      app.io.emit('join-room', payload);
      return {
        success: true,
        event: 'chat:room-joined',
        data: {
          message: `${payload.role} ${payload.userId} has joined the room.`
        }
      };
    }
  });

  app.post<{ Body: MessageBody }>('/test/websocket/send-message', {
    schema: {
      tags: ['test'],
      summary: 'Test chat:new-message event',
      description: 'Test the chat:new-message WebSocket event by sending a POST request',
      body: {
        type: 'object',
        required: ['roomId', 'messageContent'],
        properties: {
          roomId: { 
            type: 'string',
            description: 'Room ID where the message is sent'
          },
          messageContent: { 
            type: 'string',
            description: 'Content of the message'
          }
        }
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
                createdAt: { type: 'string', format: 'date-time' }
              }
            }
          }
        }
      }
    },
    handler: async (request: FastifyRequest<{ Body: MessageBody }>) => {
      const payload = request.body;
      const response = {
        success: true,
        event: 'chat:new-message',
        data: {
          message: payload.messageContent,
          roomId: payload.roomId,
          createdAt: new Date().toISOString()
        }
      };
      app.io.to(payload.roomId).emit('chat:new-message', response.data);
      return response;
    }
  });

  // WebSocket events documentation endpoint
  app.get('/websocket/events', {
    schema: {
      tags: ['websocket'],
      summary: 'Get WebSocket Events Documentation',
      description: 'Returns detailed documentation for all WebSocket events',
      response: {
        200: {
          type: 'object',
          properties: {
            events: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  payload: {
                    type: 'object',
                    additionalProperties: true
                  },
                  responses: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        event: { type: 'string' },
                        description: { type: 'string' },
                        data: {
                          type: 'object',
                          additionalProperties: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    handler: async () => ({
      events: [
        {
          name: 'join-room',
          description: 'Event to join a chat room',
          payload: {
            type: 'object',
            required: ['roomId', 'role', 'userId'],
            properties: {
              roomId: { 
                type: 'string',
                description: 'Unique identifier for the room'
              },
              role: { 
                type: 'string',
                enum: ['consult', 'patient'],
                description: 'Role of the user joining the room'
              },
              userId: { 
                type: 'string',
                description: 'Unique identifier for the user'
              },
              patientId: { 
                type: 'string',
                description: 'Optional patient ID for consult role'
              },
              consultId: { 
                type: 'string',
                description: 'Optional consult ID for patient role'
              }
            }
          },
          responses: [
            {
              event: 'chat:room-joined',
              description: 'Emitted when a user successfully joins a room',
              data: {
                message: 'string'
              }
            },
            {
              event: 'error',
              description: 'Emitted when an error occurs while joining',
              data: {
                message: 'string'
              }
            }
          ]
        },
        {
          name: 'chat:new-message',
          description: 'Event to send a new message',
          payload: {
            type: 'object',
            required: ['roomId', 'messageContent'],
            properties: {
              roomId: { 
                type: 'string',
                description: 'Room ID where the message is sent'
              },
              messageContent: { 
                type: 'string',
                description: 'Content of the message'
              }
            }
          },
          responses: [
            {
              event: 'chat:new-message',
              description: 'Emitted when a new message is successfully sent',
              data: {
                message: 'string',
                roomId: 'string',
                createdAt: 'string (ISO date)'
              }
            },
            {
              event: 'error',
              description: 'Emitted when an error occurs while sending message',
              data: {
                message: 'string'
              }
            }
          ]
        }
      ]
    })
  });
}

