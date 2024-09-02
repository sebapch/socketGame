'use client'

import React, { useEffect, useRef } from 'react'

export default function GameMap({ width, height }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Función para generar un color aleatorio entre verde y marrón
    const getTerrainColor = () => {
      const r = Math.floor(Math.random() * 60) + 30
      const g = Math.floor(Math.random() * 100) + 100
      const b = Math.floor(Math.random() * 30)
      return `rgb(${r},${g},${b})`
    }

    // Función para generar un color de agua
    const getWaterColor = () => {
      const r = Math.floor(Math.random() * 20) + 30
      const g = Math.floor(Math.random() * 20) + 100
      const b = Math.floor(Math.random() * 55) + 200
      return `rgb(${r},${g},${b})`
    }

    // Tamaño de cada "celda" del terreno
    const cellSize = 10

    // Generar mapa de ruido para el terreno
    const noise = Array(Math.ceil(width / cellSize)).fill().map(() => 
      Array(Math.ceil(height / cellSize)).fill().map(() => Math.random())
    )

    // Suavizar el ruido
    for (let i = 0; i < 5; i++) {
      for (let x = 0; x < noise.length; x++) {
        for (let y = 0; y < noise[x].length; y++) {
          let sum = 0
          let count = 0
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              if (noise[x + dx] && noise[x + dx][y + dy] !== undefined) {
                sum += noise[x + dx][y + dy]
                count++
              }
            }
          }
          noise[x][y] = sum / count
        }
      }
    }

    // Dibujar el terreno
    for (let x = 0; x < width; x += cellSize) {
      for (let y = 0; y < height; y += cellSize) {
        const noiseValue = noise[Math.floor(x / cellSize)][Math.floor(y / cellSize)]
        if (noiseValue < 0.3) {
          ctx.fillStyle = getWaterColor()
        } else {
          ctx.fillStyle = getTerrainColor()
        }
        ctx.fillRect(x, y, cellSize, cellSize)
      }
    }

    // Añadir árboles
    const numTrees = 100
    for (let i = 0; i < numTrees; i++) {
      const x = Math.random() * width
      const y = Math.random() * height
      if (noise[Math.floor(x / cellSize)][Math.floor(y / cellSize)] >= 0.3) {
        drawTree(ctx, x, y)
      }
    }

    // Añadir rocas
    const numRocks = 50
    for (let i = 0; i < numRocks; i++) {
      const x = Math.random() * width
      const y = Math.random() * height
      if (noise[Math.floor(x / cellSize)][Math.floor(y / cellSize)] >= 0.3) {
        drawRock(ctx, x, y)
      }
    }

  }, [width, height])

  // Función para dibujar un árbol
  function drawTree(ctx, x, y) {
    ctx.fillStyle = 'rgb(30,80,30)'
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x - 10, y + 20)
    ctx.lineTo(x + 10, y + 20)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = 'rgb(100,50,0)'
    ctx.fillRect(x - 2, y + 20, 4, 10)
  }

  // Función para dibujar una roca
  function drawRock(ctx, x, y) {
    ctx.fillStyle = 'rgb(100,100,100)'
    ctx.beginPath()
    ctx.ellipse(x, y, 5, 3, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  return (
    <canvas 
      ref={canvasRef} 
      width={width} 
      height={height} 
      className="border border-gray-300 rounded-lg shadow-lg"
    />
  )
}