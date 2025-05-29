import React, { useState } from 'react'
import {
  Paper,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  Chip,
  Stack
} from '@mui/material'
import { Person, Group, Wifi, WifiOff } from '@mui/icons-material'

interface JoinFormProps {
  onJoin: (name: string, roomCode: string) => void
  isOnline: boolean
}

const JoinForm: React.FC<JoinFormProps> = ({ onJoin, isOnline }) => {
  const [name, setName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [errors, setErrors] = useState<{ name?: string; roomCode?: string }>({})

  const generateRoomCode = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    setRoomCode(code)
  }

  const validateForm = () => {
    const newErrors: { name?: string; roomCode?: string } = {}

    if (!name.trim()) {
      newErrors.name = 'Name is required'
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters'
    }

    if (!roomCode.trim()) {
      newErrors.roomCode = 'Room code is required'
    } else if (roomCode.trim().length < 3) {
      newErrors.roomCode = 'Room code must be at least 3 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onJoin(name.trim(), roomCode.trim().toUpperCase())
    }
  }

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 500, mx: 'auto' }}>
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Join Chat Room
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Enter your name and room code to start chatting
        </Typography>
      </Box>

      <Stack direction="row" spacing={1} sx={{ mb: 3, justifyContent: 'center' }}>
        <Chip
          icon={isOnline ? <Wifi /> : <WifiOff />}
          label={isOnline ? 'Online' : 'Offline'}
          color={isOnline ? 'success' : 'warning'}
          variant="outlined"
        />
      </Stack>

      {!isOnline && (
        <Alert severity="info" sx={{ mb: 3 }}>
          You're in offline mode. You can still chat with nearby devices using Bluetooth or local network.
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={!!errors.name}
          helperText={errors.name}
          margin="normal"
          InputProps={{
            startAdornment: <Person sx={{ mr: 1, color: 'action.active' }} />
          }}
        />

        <TextField
          fullWidth
          label="Room Code"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          error={!!errors.roomCode}
          helperText={errors.roomCode || 'Enter an existing room code or create a new one'}
          margin="normal"
          InputProps={{
            startAdornment: <Group sx={{ mr: 1, color: 'action.active' }} />
          }}
        />

        <Box sx={{ mt: 2, mb: 3 }}>
          <Button
            variant="outlined"
            onClick={generateRoomCode}
            fullWidth
            sx={{ mb: 2 }}
          >
            Generate New Room Code
          </Button>
        </Box>

        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          sx={{ mt: 2 }}
        >
          Join Room
        </Button>
      </form>

      <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          <strong>Features:</strong>
          <br />
          • No phone number required
          <br />
          • Works online and offline
          <br />
          • End-to-end encryption
          <br />
          • Unlimited messaging
        </Typography>
      </Box>
    </Paper>
  )
}

export default JoinForm
