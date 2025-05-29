// Bluetooth service for offline peer-to-peer communication
interface Message {
  id: string
  text: string
  sender: string
  senderId: string
  timestamp: string
  roomCode: string
}

export class BluetoothService {
  private device: BluetoothDevice | null = null
  private server: BluetoothRemoteGATTServer | null = null
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null
  private eventListeners: Map<string, Function[]> = new Map()
  
  // Custom service UUID for our chat app
  private readonly SERVICE_UUID = '12345678-1234-1234-1234-123456789abc'
  private readonly CHARACTERISTIC_UUID = '87654321-4321-4321-4321-cba987654321'

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

  async initialize(): Promise<void> {
    if (!navigator.bluetooth) {
      throw new Error('Bluetooth is not supported in this browser')
    }

    try {
      // Request Bluetooth device
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [this.SERVICE_UUID] }],
        optionalServices: [this.SERVICE_UUID]
      })

      if (!this.device.gatt) {
        throw new Error('GATT not available')
      }

      // Connect to GATT server
      this.server = await this.device.gatt.connect()
      
      // Get service
      const service = await this.server.getPrimaryService(this.SERVICE_UUID)
      
      // Get characteristic
      this.characteristic = await service.getCharacteristic(this.CHARACTERISTIC_UUID)
      
      // Start notifications
      await this.characteristic.startNotifications()
      
      // Listen for messages
      this.characteristic.addEventListener('characteristicvaluechanged', (event) => {
        this.handleIncomingMessage(event)
      })

      this.emit('connected')
      
    } catch (error) {
      console.error('Bluetooth initialization failed:', error)
      
      // Fallback to Web RTC or local network discovery
      this.initializeWebRTC()
      throw error
    }
  }

  private async initializeWebRTC() {
    // Fallback implementation using WebRTC for local network communication
    console.log('Initializing WebRTC fallback for local network communication')
    
    try {
      // Create RTCPeerConnection for local discovery
      const pc = new RTCPeerConnection({
        iceServers: [] // No STUN/TURN servers for local network only
      })

      // Create data channel for messaging
      const dataChannel = pc.createDataChannel('chat', {
        ordered: true
      })

      dataChannel.onopen = () => {
        console.log('WebRTC data channel opened')
        this.emit('connected')
      }

      dataChannel.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          this.emit('message', message)
        } catch (error) {
          console.error('Failed to parse WebRTC message:', error)
        }
      }

      // Store reference for sending messages
      this.webRTCDataChannel = dataChannel

    } catch (error) {
      console.error('WebRTC fallback failed:', error)
      this.emit('error', { message: 'Failed to establish local connection' })
    }
  }

  private webRTCDataChannel: RTCDataChannel | null = null

  private handleIncomingMessage(event: Event) {
    try {
      const target = event.target as BluetoothRemoteGATTCharacteristic
      const value = target.value
      
      if (value) {
        const decoder = new TextDecoder()
        const messageData = decoder.decode(value)
        const message = JSON.parse(messageData)
        
        this.emit('message', message)
      }
    } catch (error) {
      console.error('Failed to handle incoming Bluetooth message:', error)
    }
  }

  async sendMessage(message: Message): Promise<void> {
    try {
      const messageData = JSON.stringify(message)
      
      if (this.characteristic) {
        // Send via Bluetooth
        const encoder = new TextEncoder()
        const data = encoder.encode(messageData)
        await this.characteristic.writeValue(data)
      } else if (this.webRTCDataChannel && this.webRTCDataChannel.readyState === 'open') {
        // Send via WebRTC
        this.webRTCDataChannel.send(messageData)
      } else {
        throw new Error('No connection available')
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      this.emit('error', { message: 'Failed to send message' })
    }
  }

  joinRoom(userName: string, roomCode: string): void {
    // For Bluetooth/local network, we simulate joining a room
    console.log(`${userName} joined room ${roomCode} via local connection`)
    
    // Broadcast join message to connected peers
    const joinMessage = {
      type: 'user-joined',
      userName,
      roomCode,
      timestamp: new Date().toISOString()
    }
    
    this.broadcastSystemMessage(joinMessage)
  }

  private async broadcastSystemMessage(message: any): Promise<void> {
    try {
      const messageData = JSON.stringify(message)
      
      if (this.characteristic) {
        const encoder = new TextEncoder()
        const data = encoder.encode(messageData)
        await this.characteristic.writeValue(data)
      } else if (this.webRTCDataChannel && this.webRTCDataChannel.readyState === 'open') {
        this.webRTCDataChannel.send(messageData)
      }
    } catch (error) {
      console.error('Failed to broadcast system message:', error)
    }
  }

  disconnect(): void {
    try {
      if (this.characteristic) {
        this.characteristic.stopNotifications()
        this.characteristic = null
      }
      
      if (this.server) {
        this.server.disconnect()
        this.server = null
      }
      
      if (this.webRTCDataChannel) {
        this.webRTCDataChannel.close()
        this.webRTCDataChannel = null
      }
      
      this.device = null
      this.eventListeners.clear()
      
    } catch (error) {
      console.error('Error during Bluetooth disconnect:', error)
    }
  }

  // Check if Bluetooth is available
  static isSupported(): boolean {
    return 'bluetooth' in navigator
  }

  // Check if WebRTC is available
  static isWebRTCSupported(): boolean {
    return 'RTCPeerConnection' in window
  }
}
