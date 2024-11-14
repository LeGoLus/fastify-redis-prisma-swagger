export interface JoinRoomRequest {
    roomId: string;
    role: 'consult' | 'patient';
    userId: string;
    patientId?: string;
    consultId?: string;
  }
  
  export interface NewMessageRequest {
    roomId: string;
    messageContent: string;
  }

  export interface RoomSession {
    roomId: string;
    role: 'consult' | 'patient';
    userId: string;
    patientId?: string;
    consultId?: string;
  }