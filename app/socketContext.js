'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [otherPlayers, setOtherPlayers] = useState(new Map());

  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.on('playersState', (players) => {
      const playersMap = new Map(players);
      playersMap.delete(newSocket.id); // Remove self from other players
      setOtherPlayers(playersMap);
    });

    newSocket.on('playerMoved', (player) => {
      setOtherPlayers(prev => new Map(prev).set(player.id, player));
    });

    newSocket.on('updatePlayerList', (players) => {
      const playersMap = new Map(players.map(p => [p.id, p]));
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

    return () => newSocket.close();
  }, []);

  return (
    <SocketContext.Provider value={{ socket, otherPlayers }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}