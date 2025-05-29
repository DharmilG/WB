// Local storage service for offline functionality
interface User {
  name: string
  roomCode: string
}

interface Message {
  id: string
  text: string
  sender: string
  senderId: string
  timestamp: string
  roomCode: string
}

export class StorageService {
  private static readonly USER_KEY = 'chat-app-user'
  private static readonly MESSAGES_KEY = 'chat-app-messages'
  private static readonly ENCRYPTION_KEY = 'chat-app-encryption-key'

  // User management
  static saveUser(user: User): void {
    try {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user))
    } catch (error) {
      console.error('Failed to save user:', error)
    }
  }

  static getUser(): User | null {
    try {
      const userData = localStorage.getItem(this.USER_KEY)
      return userData ? JSON.parse(userData) : null
    } catch (error) {
      console.error('Failed to get user:', error)
      return null
    }
  }

  static clearUser(): void {
    try {
      localStorage.removeItem(this.USER_KEY)
    } catch (error) {
      console.error('Failed to clear user:', error)
    }
  }

  // Message management
  static addMessage(message: Message): void {
    try {
      const messages = this.getMessages()
      messages.push(message)
      
      // Keep only last 1000 messages to prevent storage overflow
      const recentMessages = messages.slice(-1000)
      
      localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(recentMessages))
    } catch (error) {
      console.error('Failed to add message:', error)
    }
  }

  static getMessages(roomCode?: string): Message[] {
    try {
      const messagesData = localStorage.getItem(this.MESSAGES_KEY)
      const allMessages: Message[] = messagesData ? JSON.parse(messagesData) : []
      
      if (roomCode) {
        return allMessages.filter(msg => msg.roomCode === roomCode)
      }
      
      return allMessages
    } catch (error) {
      console.error('Failed to get messages:', error)
      return []
    }
  }

  static clearMessages(): void {
    try {
      localStorage.removeItem(this.MESSAGES_KEY)
    } catch (error) {
      console.error('Failed to clear messages:', error)
    }
  }

  // Encryption key management
  static saveEncryptionKey(key: ArrayBuffer | number[]): void {
    try {
      const keyArray = Array.from(new Uint8Array(key as ArrayBuffer))
      localStorage.setItem(this.ENCRYPTION_KEY, JSON.stringify(keyArray))
    } catch (error) {
      console.error('Failed to save encryption key:', error)
    }
  }

  static getEncryptionKey(): number[] | null {
    try {
      const keyData = localStorage.getItem(this.ENCRYPTION_KEY)
      return keyData ? JSON.parse(keyData) : null
    } catch (error) {
      console.error('Failed to get encryption key:', error)
      return null
    }
  }

  static clearEncryptionKey(): void {
    try {
      localStorage.removeItem(this.ENCRYPTION_KEY)
    } catch (error) {
      console.error('Failed to clear encryption key:', error)
    }
  }

  // IndexedDB for larger data storage (for future use)
  static async initIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ChatAppDB', 1)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // Create object stores
        if (!db.objectStoreNames.contains('messages')) {
          const messageStore = db.createObjectStore('messages', { keyPath: 'id' })
          messageStore.createIndex('roomCode', 'roomCode', { unique: false })
          messageStore.createIndex('timestamp', 'timestamp', { unique: false })
        }
        
        if (!db.objectStoreNames.contains('files')) {
          const fileStore = db.createObjectStore('files', { keyPath: 'id' })
          fileStore.createIndex('messageId', 'messageId', { unique: false })
        }
      }
    })
  }

  // Utility methods
  static getStorageUsage(): { used: number; available: number } {
    try {
      let used = 0
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          used += localStorage[key].length + key.length
        }
      }
      
      // Estimate available space (5MB typical limit)
      const available = 5 * 1024 * 1024 - used
      
      return { used, available }
    } catch (error) {
      console.error('Failed to calculate storage usage:', error)
      return { used: 0, available: 0 }
    }
  }

  static clearAllData(): void {
    try {
      this.clearUser()
      this.clearMessages()
      this.clearEncryptionKey()
    } catch (error) {
      console.error('Failed to clear all data:', error)
    }
  }
}
