// Shared encryption utilities for both frontend and backend
// Uses Web Crypto API (browser) and Node.js crypto (server)

export class EncryptionService {
  constructor() {
    this.algorithm = 'AES-GCM';
    this.keyLength = 256;
  }

  // Generate a new encryption key
  async generateKey() {
    if (typeof window !== 'undefined') {
      // Browser environment
      return await window.crypto.subtle.generateKey(
        {
          name: this.algorithm,
          length: this.keyLength,
        },
        true,
        ['encrypt', 'decrypt']
      );
    } else {
      // Node.js environment
      const crypto = await import('crypto');
      return crypto.randomBytes(32); // 256 bits
    }
  }

  // Encrypt a message
  async encrypt(message, key) {
    if (typeof window !== 'undefined') {
      // Browser environment
      const encoder = new TextEncoder();
      const data = encoder.encode(message);
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      
      const encrypted = await window.crypto.subtle.encrypt(
        {
          name: this.algorithm,
          iv: iv,
        },
        key,
        data
      );

      return {
        encrypted: Array.from(new Uint8Array(encrypted)),
        iv: Array.from(iv)
      };
    } else {
      // Node.js environment
      const crypto = await import('crypto');
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipher('aes-256-gcm', key);
      
      let encrypted = cipher.update(message, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return {
        encrypted: encrypted,
        iv: iv.toString('hex'),
        tag: cipher.getAuthTag().toString('hex')
      };
    }
  }

  // Decrypt a message
  async decrypt(encryptedData, key) {
    if (typeof window !== 'undefined') {
      // Browser environment
      const { encrypted, iv } = encryptedData;
      
      const decrypted = await window.crypto.subtle.decrypt(
        {
          name: this.algorithm,
          iv: new Uint8Array(iv),
        },
        key,
        new Uint8Array(encrypted)
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } else {
      // Node.js environment
      const crypto = await import('crypto');
      const { encrypted, iv, tag } = encryptedData;
      
      const decipher = crypto.createDecipher('aes-256-gcm', key);
      decipher.setAuthTag(Buffer.from(tag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    }
  }

  // Generate a room key from room code and user names
  async generateRoomKey(roomCode, userNames) {
    const keyMaterial = roomCode + userNames.sort().join('');
    
    if (typeof window !== 'undefined') {
      // Browser environment
      const encoder = new TextEncoder();
      const keyData = encoder.encode(keyMaterial);
      
      const keyMaterialKey = await window.crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      return await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: encoder.encode('chat-app-salt'),
          iterations: 100000,
          hash: 'SHA-256',
        },
        keyMaterialKey,
        { name: this.algorithm, length: this.keyLength },
        true,
        ['encrypt', 'decrypt']
      );
    } else {
      // Node.js environment
      const crypto = await import('crypto');
      return crypto.pbkdf2Sync(keyMaterial, 'chat-app-salt', 100000, 32, 'sha256');
    }
  }

  // Export key for storage
  async exportKey(key) {
    if (typeof window !== 'undefined') {
      // Browser environment
      const exported = await window.crypto.subtle.exportKey('raw', key);
      return Array.from(new Uint8Array(exported));
    } else {
      // Node.js environment
      return Array.from(key);
    }
  }

  // Import key from storage
  async importKey(keyData) {
    if (typeof window !== 'undefined') {
      // Browser environment
      return await window.crypto.subtle.importKey(
        'raw',
        new Uint8Array(keyData),
        { name: this.algorithm },
        true,
        ['encrypt', 'decrypt']
      );
    } else {
      // Node.js environment
      return Buffer.from(keyData);
    }
  }
}
