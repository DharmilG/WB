import { io, Socket } from 'socket.io-client'
import { BluetoothService } from './BluetoothService'
import { StorageService } from './StorageService'

export class ConnectionService {
  private socket: Socket | null = null
  private bluetoothService: BluetoothService | null = null
  private isOnline: boolean
  private eventListeners: Map<string, Function[]> = new Map()

  constructor(isOnline: boolean) {
    this.isOnline = isOnline
    if (!isOnline) {
      this.bluetoothService = new BluetoothService()
    }
  }

  // Event emitter methods
  on(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)
  }

  emit(event: string, data?: any) {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(callback => callback(data))
    }
  }

  connect() {
    if (this.isOnline) {
      this.connectToServer()
    } else {
      this.connectToBluetooth()
    }
  }

  private connectToServer() {
    const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'
    
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling']
    })

    this.socket.on('connect', () => {
      console.log('Connected to server')
      this.emit('connected')
    })

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server')
      this.emit('disconnected')
    })

    this.socket.on('new-message', (message) => {
      this.emit('message', message)
      // Store message locally
      StorageService.addMessage(message)
    })

    this.socket.on('room-history', (messages) => {
      this.emit('room-history', messages)
      // Store messages locally
      messages.forEach((msg: any) => StorageService.addMessage(msg))
    })

    this.socket.on('room-users', (users) => {
      this.emit('room-users', users)
    })

    this.socket.on('user-joined', (data) => {
      console.log(`${data.userName} joined the room`)
    })

    this.socket.on('user-left', (data) => {
      console.log(`${data.userName} left the room`)
    })

    this.socket.on('user-typing', (data) => {
      this.emit('user-typing', data)
    })

    this.socket.on('user-stopped-typing', (data) => {
      this.emit('user-stopped-typing', data)
    })

    this.socket.on('error', (error) => {
      console.error('Socket error:', error)
      this.emit('error', error)
    })
  }

  private async connectToBluetooth() {
    if (this.bluetoothService) {
      try {
        await this.bluetoothService.initialize()
        
        this.bluetoothService.on('connected', () => {
          this.emit('connected')
        })

        this.bluetoothService.on('message', (message) => {
          this.emit('message', message)
          StorageService.addMessage(message)
        })

        this.bluetoothService.on('error', (error) => {
          this.emit('error', error)
        })

        // Load offline messages
        const offlineMessages = StorageService.getMessages()
        this.emit('room-history', offlineMessages)

      } catch (error) {
        console.error('Bluetooth connection failed:', error)
        this.emit('error', { message: 'Bluetooth connection failed' })
      }
    }
  }

  joinRoom(userName: string, roomCode: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('join-room', { userName, roomCode })
    } else if (this.bluetoothService) {
      // For Bluetooth, we simulate joining a room
      this.bluetoothService.joinRoom(userName, roomCode)
    }
  }

  sendMessage(message: string, roomCode: string) {
    const messageData = {
      id: Date.now().toString(),
      text: message,
      sender: 'You',
      senderId: this.getSocketId(),
      timestamp: new Date().toISOString(),
      roomCode
    }

    if (this.socket && this.socket.connected) {
      this.socket.emit('send-message', { message, roomCode })
    } else if (this.bluetoothService) {
      this.bluetoothService.sendMessage(messageData)
      // Add to local storage immediately for offline mode
      StorageService.addMessage(messageData)
      this.emit('message', { ...messageData, isOwn: true })
    }
  }

  startTyping(roomCode: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('typing-start', { roomCode })
    }
  }

  stopTyping(roomCode: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('typing-stop', { roomCode })
    }
  }

  getSocketId(): string {
    if (this.socket) {
      return this.socket.id || 'unknown'
    }
    return 'bluetooth-' + Date.now()
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    if (this.bluetoothService) {
      this.bluetoothService.disconnect()
    }
    this.eventListeners.clear()
  }
}
