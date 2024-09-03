'use client'

import { useState, useEffect, useRef } from 'react'
import { useSocket } from '../socketContext'
import GameMap, { isWalkable } from './GameMap'
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Users } from 'lucide-react'

const MAP_SIZE = 2000
const PLAYER_SIZE = 30
const BULLET_SIZE = 5
const BULLET_SPEED = 10

const characters = [
  "Luna", "Zephyr", "Nova", "Atlas", "Iris", "Orion", "Cora", "Phoenix",
  "Sage", "Axel", "Ivy", "Kai", "Raven", "Finn", "Aria", "Leo",
  "Jade", "Rex", "Skye", "Milo"
]

const characterColors = {
  Luna: "bg-purple-500", Zephyr: "bg-blue-500", Nova: "bg-yellow-500", Atlas: "bg-green-500",
  Iris: "bg-pink-500", Orion: "bg-orange-500", Cora: "bg-red-500", Phoenix: "bg-amber-500",
  Sage: "bg-emerald-500", Axel: "bg-cyan-500", Ivy: "bg-lime-500", Kai: "bg-indigo-500",
  Raven: "bg-violet-500", Finn: "bg-sky-500", Aria: "bg-rose-500", Leo: "bg-amber-600",
  Jade: "bg-teal-500", Rex: "bg-fuchsia-500", Skye: "bg-blue-400", Milo: "bg-orange-400"
}

export default function Component() {
  const [playerName, setPlayerName] = useState('')
  const [selectedCharacter, setSelectedCharacter] = useState('')
  const [isInGame, setIsInGame] = useState(false)
  const { socket, otherPlayers, playerPosition, playerStats } = useSocket()
  const [bullets, setBullets] = useState([])
  const [otherBullets, setOtherBullets] = useState([])
  const gameAreaRef = useRef(null)
  const [keys, setKeys] = useState({})
  const [showPlayerList, setShowPlayerList] = useState(false)
  const [health, setHealth] = useState(100)

  const handleJoin = () => {
    if (playerName.trim() !== '' && selectedCharacter !== '' && socket) {
      socket.emit('join', { name: playerName, character: selectedCharacter })
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
      if (!playerPosition) return

      const speed = 5
      let newX = playerPosition.x
      let newY = playerPosition.y

      if (keys['w'] || keys['ArrowUp']) {
        if (isWalkable(newX, newY - speed)) {
          newY = Math.max(PLAYER_SIZE / 2, newY - speed)
        }
      }
      if (keys['s'] || keys['ArrowDown']) {
        if (isWalkable(newX, newY + speed)) {
          newY = Math.min(MAP_SIZE - PLAYER_SIZE / 2, newY + speed)
        }
      }
      if (keys['a'] || keys['ArrowLeft']) {
        if (isWalkable(newX - speed, newY)) {
          newX = Math.max(PLAYER_SIZE / 2, newX - speed)
        }
      }
      if (keys['d'] || keys['ArrowRight']) {
        if (isWalkable(newX + speed, newY)) {
          newX = Math.min(MAP_SIZE - PLAYER_SIZE / 2, newX + speed)
        }
      }

      if (newX !== playerPosition.x || newY !== playerPosition.y) {
        socket?.emit('updatePosition', { x: newX, y: newY })
      }
    }

    const gameLoop = setInterval(movePlayer, 16)
    return () => clearInterval(gameLoop)
  }, [keys, playerPosition, socket])

  const handleClick = (e) => {
    if (!gameAreaRef.current || !socket || !playerPosition) return

    const rect = gameAreaRef.current.getBoundingClientRect()
    const viewportX = e.clientX - rect.left
    const viewportY = e.clientY - rect.top

    const targetX = playerPosition.x - window.innerWidth / 2 + viewportX
    const targetY = playerPosition.y - window.innerHeight / 2 + viewportY

    const angle = Math.atan2(targetY - playerPosition.y, targetX - playerPosition.x)
    const velocity = {
      x: Math.cos(angle) * BULLET_SPEED,
      y: Math.sin(angle) * BULLET_SPEED
    }

    const newBullet = { x: playerPosition.x, y: playerPosition.y, velocity }
    setBullets(prev => [...prev, newBullet])
    socket.emit('newBullet', newBullet)

    // Add muzzle flash effect
    const flash = document.createElement('div')
    flash.className = 'absolute bg-yellow-400 rounded-full opacity-75'
    flash.style.width = '20px'
    flash.style.height = '20px'
    flash.style.left = `${window.innerWidth / 2 - 10}px`
    flash.style.top = `${window.innerHeight / 2 - 10}px`
    gameAreaRef.current.appendChild(flash)
    setTimeout(() => flash.remove(), 50)
  }

  useEffect(() => {
    if (!socket) return

    socket.on('bulletUpdate', (serverBullets) => {
      setOtherBullets(serverBullets.filter(bullet => bullet.playerId !== socket.id))
    })

    socket.on('playerHit', () => {
      setHealth(prevHealth => Math.max(0, prevHealth - 10))
    })

    const moveBullets = setInterval(() => {
      setBullets(prevBullets =>
        prevBullets.map(bullet => {
          let newX = bullet.x + bullet.velocity.x
          let newY = bullet.y + bullet.velocity.y

          if (!isWalkable(newX, newY)) {
            return null
          }

          return {
            ...bullet,
            x: newX,
            y: newY
          }
        }).filter(bullet => bullet !== null && 
          bullet.x > 0 && bullet.x < MAP_SIZE &&
          bullet.y > 0 && bullet.y < MAP_SIZE
        )
      )
      socket.emit('updateBullets', bullets)
    }, 16)

    return () => {
      clearInterval(moveBullets)
      socket.off('bulletUpdate')
      socket.off('playerHit')
    }
  }, [socket, bullets])

  if (!isInGame) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-blue-500 to-purple-600 p-4">
        <Card className="w-full max-w-4xl">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">Bienvenido al Juego</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Ingresa tu nombre"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-4 gap-4 mb-4">
              {characters.map((character, index) => (
                <Button
                  key={index}
                  onClick={() => setSelectedCharacter(character)}
                  variant={selectedCharacter === character ? "default" : "outline"}
                  className={`h-20 flex flex-col items-center justify-center ${characterColors[character]}`}
                >
                  <div className={`w-10 h-10 rounded-full ${characterColors[character]} mb-2`}></div>
                  <span className="text-xs">{character}</span>
                </Button>
              ))}
            </div>
            <Button onClick={handleJoin} className="w-full" disabled={!playerName || !selectedCharacter}>
              Aceptar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const mapStyle = {
    width: `${MAP_SIZE}px`,
    height: `${MAP_SIZE}px`,
    position: 'absolute',
    left: `${window.innerWidth / 2 - (playerPosition?.x || 0)}px`,
    top: `${window.innerHeight / 2 - (playerPosition?.y || 0)}px`,
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-gray-200 relative" ref={gameAreaRef} onClick={handleClick}>
      <div style={mapStyle}>
        <GameMap width={MAP_SIZE} height={MAP_SIZE} />
        
        {playerPosition && (
          <div className="absolute" style={{
            left: `${playerPosition.x}px`,
            top: `${playerPosition.y}px`,
            transform: 'translate(-50%, -50%)'
          }}>
            <div className="text-center text-xs font-bold text-white bg-black px-1 rounded mb-1 whitespace-nowrap">
              {playerName}
            </div>
            <div
              className={`rounded-full ${characterColors[selectedCharacter]}`}
              style={{
                width: `${PLAYER_SIZE}px`,
                height: `${PLAYER_SIZE}px`,
              }}
            ></div>
          </div>
        )}
        
        {Array.from(otherPlayers.values()).map((player, index) => (
          <div key={index} className="absolute" style={{
            left: `${player.x}px`,
            top: `${player.y}px`,
            transform: 'translate(-50%, -50%)'
          }}>
            <div className="text-center text-xs font-bold text-white bg-black px-1 rounded mb-1 whitespace-nowrap">
              {player.name}
            </div>
            <div
              className={`rounded-full ${characterColors[player.character]}`}
              style={{
                width: `${PLAYER_SIZE}px`,
                height: `${PLAYER_SIZE}px`,
              }}
            ></div>
          </div>
        ))}
        
        {bullets.map((bullet, index) => (
          <div
            key={`own-${index}`}
            className="absolute bg-yellow-500 rounded-full"
            style={{
              left: `${bullet.x}px`,
              top: `${bullet.y}px`,
              width: `${BULLET_SIZE}px`,
              height: `${BULLET_SIZE}px`,
              transform: 'translate(-50%, -50%)'
            }}
          ></div>
        ))}

        {otherBullets.map((bullet, index) => (
          <div
            key={`other-${index}`}
            className="absolute bg-red-500 rounded-full"
            style={{
              left: `${bullet.x}px`,
              top: `${bullet.y}px`,
              width: `${BULLET_SIZE}px`,
              height: `${BULLET_SIZE}px`,
              transform: 'translate(-50%, -50%)'
            }}
          ></div>
        ))}
      </div>

      <Card className="absolute top-4 left-4 w-64">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Estadísticas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Salud:</span>
              <Progress value={health} className="w-32" />
            </div>
            <div className="flex justify-between">
              <span>Posición:</span>
              <span>X: {Math.round(playerPosition?.x || 0)}, Y: {Math.round(playerPosition?.y || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Kills:</span>
              <Badge variant="secondary">{playerStats?.kills || 0}</Badge>
            </div>
            <div className="flex justify-between">
              <span>Deaths:</span>
              <Badge variant="secondary">{playerStats?.deaths || 0}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button 
        className="absolute top-4 right-4"
        onClick={() => setShowPlayerList(!showPlayerList)}
      >
        {showPlayerList ? 'Ocultar Jugadores' : 'Mostrar Jugadores'}
        <Users className="ml-2 h-4 w-4" />
      </Button>

      {showPlayerList && (
        <Card className="absolute top-20 right-4 w-64">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Jugadores conectados</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <ul>
                {Array.from(otherPlayers.values()).map((player, index) => (
                  <li key={index} className="mb-2 flex justify-between items-center">
                    <span>{player.name}</span>
                    <div>
                      <Badge variant="secondary" className="mr-1">K: {player.kills}</Badge>
                      <Badge variant="secondary">D: {player.deaths}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <Card className="absolute bottom-4 right-4 w-64 h-64">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Minimapa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative w-full h-full bg-gray-300">
            {playerPosition && (
              <div
                className={`absolute w-2 h-2 ${characterColors[selectedCharacter]} rounded-full`}
                style={{
                  left: `${(playerPosition.x / MAP_SIZE) * 100}%`,
                  top: `${(playerPosition.y / MAP_SIZE) * 100}%`,
                }}
              />
            )}
            {Array.from(otherPlayers.values()).map((player, index) => (
              <div
                key={index}
                className={`absolute w-2 h-2 ${characterColors[player.character]} rounded-full`}
                style={{
                  left: `${(player.x / MAP_SIZE) * 100}%`,
                  top: `${(player.y / MAP_SIZE) * 100}%`,
                }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}