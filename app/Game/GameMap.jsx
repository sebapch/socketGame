'use client'

import React, { useEffect, useRef } from 'react'
import { sharedMap, TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, WALL, FLOOR, isWalkable } from './sharedMap'

export default function GameMap({ width, height }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Función para obtener un color de suelo aleatorio (verde o marrón)
    const getFloorColor = () => {
      const colors = [
        'rgb(34, 139, 34)',  // Verde bosque
        'rgb(160, 82, 45)',  // Siena
      ]
      return colors[Math.floor(Math.random() * colors.length)]
    }

    // Dibujar el mapa
    for (let y = 0; y < sharedMap.length; y++) {
      for (let x = 0; x < sharedMap[y].length; x++) {
        if (sharedMap[y][x] === WALL) {
          ctx.fillStyle = 'rgb(90, 90, 90)' // Gris para paredes
        } else {
          ctx.fillStyle = getFloorColor()
        }
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
      }
    }

    // Añadir detalles al suelo
    for (let y = 0; y < sharedMap.length; y++) {
      for (let x = 0; x < sharedMap[y].length; x++) {
        if (sharedMap[y][x] === FLOOR) {
          addFloorDetails(ctx, x * TILE_SIZE, y * TILE_SIZE)
        }
      }
    }

  }, [width, height])

  // Función para añadir detalles al suelo
  function addFloorDetails(ctx, x, y) {
    const detailSize = 4
    const numDetails = 3

    for (let i = 0; i < numDetails; i++) {
      const detailX = x + Math.random() * (TILE_SIZE - detailSize)
      const detailY = y + Math.random() * (TILE_SIZE - detailSize)
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.2})`
      ctx.fillRect(detailX, detailY, detailSize, detailSize)
    }
  }

  return (
    <canvas 
      ref={canvasRef} 
      width={MAP_WIDTH} 
      height={MAP_HEIGHT} 
      className="border border-gray-300 rounded-lg shadow-lg"
    />
  )
}

export { isWalkable }