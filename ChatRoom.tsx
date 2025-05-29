import React, { useState, useEffect, useRef } from 'react'
import {
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Chip,
  Stack,
  IconButton,
  Divider,
  Alert
} from '@mui/material'
import {
  Send,
  ExitToApp,
  Person,
  Bluetooth,
  Wifi,
  WifiOff
} from '@mui/icons-material'
import { ConnectionService } from './ConnectionService'

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
  isOwn?: boolean
}

interface ChatRoomProps {
  user: User
  connectionService: ConnectionService | null
  isOnline: boolean
  onLeave: () => void
}

const ChatRoom: React.FC<ChatRoomProps> = ({ user, connectionService, isOnline, onLeave }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [connectedUsers, setConnectedUsers] = useState<any[]>([])
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (connectionService) {
      // Set up event listeners
      connectionService.on('connected', () => {
        setIsConnected(true)
        connectionService.joinRoom(user.name, user.roomCode)
      })

      connectionService.on('disconnected', () => {
        setIsConnected(false)
      })

      connectionService.on('message', (message: Message) => {
        setMessages(prev => [...prev, { ...message, isOwn: message.senderId === connectionService.getSocketId() }])
      })

      connectionService.on('room-history', (history: Message[]) => {
        setMessages(history.map(msg => ({ ...msg, isOwn: msg.senderId === connectionService.getSocketId() })))
      })

      connectionService.on('room-users', (users: any[]) => {
        setConnectedUsers(users)
      })

      connectionService.on('user-typing', ({ userName }: { userName: string }) => {
        setTypingUsers(prev => [...prev.filter(u => u !== userName), userName])
      })

      connectionService.on('user-stopped-typing', ({ userName }: { userName: string }) => {
        setTypingUsers(prev => prev.filter(u => u !== userName))
      })

      connectionService.on('error', (error: { message: string }) => {
        console.error('Connection error:', error.message)
      })

      // Connect
      connectionService.connect()

      return () => {
        connectionService.disconnect()
      }
    }
  }, [connectionService, user])

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = () => {
    if (newMessage.trim() && connectionService && isConnected) {
      connectionService.sendMessage(newMessage.trim(), user.roomCode)
      setNewMessage('')
      
      // Stop typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      connectionService.stopTyping(user.roomCode)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleTyping = () => {
    if (connectionService && isConnected) {
      connectionService.startTyping(user.roomCode)
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      
      // Set new timeout to stop typing
      typingTimeoutRef.current = setTimeout(() => {
        connectionService.stopTyping(user.roomCode)
      }, 1000)
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <Paper elevation={3} sx={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6">
              Room: {user.roomCode}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user.name}
            </Typography>
          </Box>
          
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              icon={isOnline ? <Wifi /> : <WifiOff />}
              label={isOnline ? 'Online' : 'Offline'}
              color={isOnline ? 'success' : 'warning'}
              size="small"
            />
            
            <Chip
              icon={<Person />}
              label={`${connectedUsers.length} users`}
              size="small"
              variant="outlined"
            />
            
            <IconButton onClick={onLeave} color="error">
              <ExitToApp />
            </IconButton>
          </Stack>
        </Stack>
      </Box>

      {/* Connection Status */}
      {!isConnected && (
        <Alert severity="warning" sx={{ m: 1 }}>
          {isOnline ? 'Connecting to server...' : 'Searching for nearby devices...'}
        </Alert>
      )}

      {/* Messages */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        <List>
          {messages.map((message) => (
            <ListItem
              key={message.id}
              sx={{
                flexDirection: 'column',
                alignItems: message.isOwn ? 'flex-end' : 'flex-start',
                py: 0.5
              }}
            >
              <Paper
                elevation={1}
                sx={{
                  p: 1.5,
                  maxWidth: '70%',
                  bgcolor: message.isOwn ? 'primary.main' : 'grey.100',
                  color: message.isOwn ? 'primary.contrastText' : 'text.primary'
                }}
              >
                {!message.isOwn && (
                  <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                    {message.sender}
                  </Typography>
                )}
                <Typography variant="body1">
                  {message.text}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.7rem' }}>
                  {formatTime(message.timestamp)}
                </Typography>
              </Paper>
            </ListItem>
          ))}
        </List>
        
        {/* Typing indicators */}
        {typingUsers.length > 0 && (
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </Typography>
          </Box>
        )}
        
        <div ref={messagesEndRef} />
      </Box>

      <Divider />

      {/* Message Input */}
      <Box sx={{ p: 2 }}>
        <Stack direction="row" spacing={1}>
          <TextField
            fullWidth
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value)
              handleTyping()
            }}
            onKeyPress={handleKeyPress}
            disabled={!isConnected}
            multiline
            maxRows={3}
          />
          <Button
            variant="contained"
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || !isConnected}
            sx={{ minWidth: 'auto', px: 2 }}
          >
            <Send />
          </Button>
        </Stack>
      </Box>
    </Paper>
  )
}

export default ChatRoom
