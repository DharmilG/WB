import React, { useState, useEffect } from 'react'
import { Container, Box, Typography, Alert } from '@mui/material'
import JoinForm from './JoinForm'
import ChatRoom from './ChatRoom'
import { ConnectionService } from './ConnectionService'
import { StorageService } from './StorageService'

interface User {
  name: string
  roomCode: string
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [connectionService, setConnectionService] = useState<ConnectionService | null>(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check for saved user session
    const savedUser = StorageService.getUser()
    if (savedUser) {
      setUser(savedUser)
    }

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (user) {
      // Initialize connection service when user joins
      const service = new ConnectionService(isOnline)
      setConnectionService(service)
      
      // Save user session
      StorageService.saveUser(user)
    }
  }, [user, isOnline])

  const handleJoinRoom = async (name: string, roomCode: string) => {
    try {
      setError(null)
      const userData = { name, roomCode }
      setUser(userData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room')
    }
  }

  const handleLeaveRoom = () => {
    if (connectionService) {
      connectionService.disconnect()
    }
    setUser(null)
    setConnectionService(null)
    StorageService.clearUser()
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center">
          Offline Chat App
        </Typography>
        
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
          <Alert 
            severity={isOnline ? 'success' : 'warning'}
            sx={{ minWidth: 200 }}
          >
            {isOnline ? 'Online Mode' : 'Offline Mode'}
          </Alert>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!user ? (
          <JoinForm onJoin={handleJoinRoom} isOnline={isOnline} />
        ) : (
          <ChatRoom 
            user={user}
            connectionService={connectionService}
            isOnline={isOnline}
            onLeave={handleLeaveRoom}
          />
        )}
      </Box>
    </Container>
  )
}

export default App
