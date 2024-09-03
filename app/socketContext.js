'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [otherPlayers, setOtherPlayers] = useState(new Map());
  const [playerPosition, setPlayerPosition] = useState(null);
  const [playerStats, setPlayerStats] = useState({ kills: 0, deaths: 0 });

  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.on('playersState', (players) => {
      const playersMap = new Map(players);
      const selfPlayer = playersMap.get(newSocket.id);
      if (selfPlayer) {
        setPlayerPosition({ x: selfPlayer.x, y: selfPlayer.y });
        setPlayerStats({ kills: selfPlayer.kills, deaths: selfPlayer.deaths });
      }
      playersMap.delete(newSocket.id); // Remove self from other players
      setOtherPlayers(playersMap);
    });

    newSocket.on('playerMoved', (player) => {
      if (player.id === newSocket.id) {
        setPlayerPosition({ x: player.x, y: player.y });
        setPlayerStats({ kills: player.kills, deaths: player.deaths });
      } else {
        setOtherPlayers(prev => new Map(prev).set(player.id, player));
      }
    });

    newSocket.on('updatePlayerList', (players) => {
      const playersMap = new Map(players.map(p => [p.id, p]));
      const selfPlayer = playersMap.get(newSocket.id);
      if (selfPlayer) {
        setPlayerPosition({ x: selfPlayer.x, y: selfPlayer.y });
        setPlayerStats({ kills: selfPlayer.kills, deaths: selfPlayer.deaths });
      }
      playersMap.delete(newSocket.id); // Remove self from other players
      setOtherPlayers(playersMap);
    });

    newSocket.on('playerDisconnected', (playerId) => {
      setOtherPlayers(prev => {
        const newMap = new Map(prev);
        newMap.delete(playerId);
        return newMap;
      });
    });

    newSocket.on('playerHit', ({ x, y }) => {
      setPlayerPosition({ x, y });
      setPlayerStats(prev => ({ ...prev, deaths: prev.deaths + 1 }));
    });

    return () => newSocket.close();
  }, []);

  return (
    <SocketContext.Provider value={{ socket, otherPlayers, playerPosition, playerStats }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}