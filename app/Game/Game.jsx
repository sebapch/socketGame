'use client'

import { useState, useEffect, useRef } from 'react'
import { useSocket } from '../socketContext'
import GameMap from './GameMap'

const MAP_SIZE = 2000
const PLAYER_SIZE = 30

export default function Game() {
  const [playerName, setPlayerName] = useState('')
  const [isInGame, setIsInGame] = useState(false)
  const { socket, otherPlayers } = useSocket()
  const [position, setPosition] = useState({ x: MAP_SIZE / 2, y: MAP_SIZE / 2 })
  const [bullets, setBullets] = useState([])
  const [otherBullets, setOtherBullets] = useState([])
  const gameAreaRef = useRef(null)
  const [keys, setKeys] = useState({})
  const [showPlayerList, setShowPlayerList] = useState(false)

  const handleJoin = () => {
    if (playerName.trim() !== '' && socket) {
      socket.emit('join', playerName)
      setIsInGame(true)
    }
  }

  useEffect(() => {
    if (!socket) return

    const handleKeyDown = (e) => setKeys(prev => ({ ...prev, [e.key]: true }))
    const handleKeyUp = (e) => setKeys(prev => ({ ...prev, [e.key]: false }))

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [socket])

  useEffect(() => {
    const movePlayer = () => {
      const speed = 5
      let newX = position.x
      let newY = position.y

      if (keys['w'] || keys['ArrowUp']) newY = Math.max(PLAYER_SIZE / 2, position.y - speed)
      if (keys['s'] || keys['ArrowDown']) newY = Math.min(MAP_SIZE - PLAYER_SIZE / 2, position.y + speed)
      if (keys['a'] || keys['ArrowLeft']) newX = Math.max(PLAYER_SIZE / 2, position.x - speed)
      if (keys['d'] || keys['ArrowRight']) newX = Math.min(MAP_SIZE - PLAYER_SIZE / 2, position.x + speed)

      if (newX !== position.x || newY !== position.y) {
        setPosition({ x: newX, y: newY })
        socket?.emit('updatePosition', { x: newX, y: newY })
      }
    }

    const gameLoop = setInterval(movePlayer, 16)
    return () => clearInterval(gameLoop)
  }, [keys, position, socket])

  const handleClick = (e) => {
    if (!gameAreaRef.current || !socket) return

    const rect = gameAreaRef.current.getBoundingClientRect()
    const viewportX = e.clientX - rect.left
    const viewportY = e.clientY - rect.top

    const targetX = position.x - window.innerWidth / 2 + viewportX
    const targetY = position.y - window.innerHeight / 2 + viewportY

    const angle = Math.atan2(targetY - position.y, targetX - position.x)
    const velocity = {
      x: Math.cos(angle) * 5,
      y: Math.sin(angle) * 5
    }

    const newBullet = { x: position.x, y: position.y, velocity }
    setBullets(prev => [...prev, newBullet])
    socket.emit('newBullet', newBullet)
  }

  useEffect(() => {
    if (!socket) return

    socket.on('bulletUpdate', (serverBullets) => {
      setOtherBullets(serverBullets.filter(bullet => bullet.playerId !== socket.id))
    })

    const moveBullets = setInterval(() => {
      setBullets(prevBullets =>
        prevBullets.map(bullet => ({
          ...bullet,
          x: bullet.x + bullet.velocity.x,
          y: bullet.y + bullet.velocity.y
        })).filter(bullet =>
          bullet.x > 0 && bullet.x < MAP_SIZE &&
          bullet.y > 0 && bullet.y < MAP_SIZE
        )
      )
      socket.emit('updateBullets', bullets)
    }, 16)

    return () => {
      clearInterval(moveBullets)
      socket.off('bulletUpdate')
    }
  }, [socket, bullets])

  if (!isInGame) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-3xl font-bold mb-6 text-center">Bienvenido al Juego</h1>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Ingresa tu nombre"
            className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleJoin}
            className="w-full px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            Aceptar
          </button>
        </div>
      </div>
    )
  }

  const mapStyle = {
    width: `${MAP_SIZE}px`,
    height: `${MAP_SIZE}px`,
    position: 'absolute',
    left: `${window.innerWidth / 2 - position.x}px`,
    top: `${window.innerHeight / 2 - position.y}px`,
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-gray-200 relative" ref={gameAreaRef} onClick={handleClick}>
      <div style={mapStyle}>
        <GameMap width={MAP_SIZE} height={MAP_SIZE} />
        
        {/* Jugador principal (círculo rojo) */}
        <div
          className="absolute bg-red-500 rounded-full"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: `${PLAYER_SIZE}px`,
            height: `${PLAYER_SIZE}px`,
            transform: 'translate(-50%, -50%)'
          }}
        ></div>
        
        {/* Otros jugadores (círculos azules) */}
        {Array.from(otherPlayers.values()).map((player, index) => (
          <div
            key={index}
            className="absolute bg-blue-500 rounded-full"
            style={{
              left: `${player.x}px`,
              top: `${player.y}px`,
              width: `${PLAYER_SIZE}px`,
              height: `${PLAYER_SIZE}px`,
              transform: 'translate(-50%, -50%)'
            }}
          ></div>
        ))}
        
        {/* Balas del jugador actual */}
        {bullets.map((bullet, index) => (
          <div
            key={`own-${index}`}
            className="absolute w-2 h-2 bg-black rounded-full"
            style={{ left: `${bullet.x}px`, top: `${bullet.y}px` }}
          ></div>
        ))}

        {/* Balas de otros jugadores */}
        {otherBullets.map((bullet, index) => (
          <div
            key={`other-${index}`}
            className="absolute w-2 h-2 bg-red-500 rounded-full"
            style={{ left: `${bullet.x}px`, top: `${bullet.y}px` }}
          ></div>
        ))}
      </div>

      {/* Overlay con información */}
      <div className="absolute top-4 left-4 bg-white bg-opacity-80 p-4 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-2">Coordenadas:</h2>
        <p>X: {Math.round(position.x)}, Y: {Math.round(position.y)}</p>
      </div>

      <button 
        className="absolute top-4 right-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        onClick={() => setShowPlayerList(!showPlayerList)}
      >
        {showPlayerList ? 'Ocultar Jugadores' : 'Mostrar Jugadores'}
      </button>

      {showPlayerList && (
        <div className="absolute top-20 right-4 w-64 bg-white bg-opacity-80 p-4 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold">Jugadores conectados:</h2>
            <button 
              className="text-gray-500 hover:text-gray-700 focus:outline-none"
              onClick={() => setShowPlayerList(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <ul>
            {Array.from(otherPlayers.values()).map((player, index) => (
              <li key={index} className="mb-1">{player.name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}