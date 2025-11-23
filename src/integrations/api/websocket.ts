/**
 * Service WebSocket pour les notifications temps réel
 * Utilise Socket.IO pour la communication avec le backend
 */

import { io, Socket } from 'socket.io-client';
import type { NotificationCallback } from './types.js';

interface Channel {
  on(event: string, callback: NotificationCallback): {
    subscribe: () => {
      data: {
        subscription: {
          unsubscribe: () => void;
        };
      };
    };
  };
  send(payload: any): void;
}

/**
 * Service WebSocket pour la communication temps réel
 * Utilise Socket.IO pour la compatibilité avec le backend
 */
export class WebSocketService {
  private wsUrl: string;
  private getToken: () => string | null;
  private socket: Socket | null = null;
  private channels: Map<string, Set<NotificationCallback>> = new Map();
  private isConnecting = false;
  private shouldReconnect = true;

  constructor(wsUrl: string, getToken: () => string | null) {
    this.wsUrl = wsUrl;
    this.getToken = getToken;
  }

  /**
   * Connecte au serveur Socket.IO
   */
  private connect(): void {
    if (this.socket?.connected || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    const token = this.getToken();
    if (!token) {
      this.isConnecting = false;
      return;
    }

    try {
      // Créer la connexion Socket.IO
      this.socket = io(this.wsUrl, {
        auth: {
          token: token,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      this.socket.on('connect', () => {
        console.log('✅ Socket.IO connecté');
        this.isConnecting = false;
        
        // S'abonner aux canaux existants
        this.channels.forEach((_, channelName) => {
          this.subscribeToChannel(channelName);
        });
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Socket.IO déconnecté:', reason);
        this.isConnecting = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Erreur de connexion Socket.IO:', error.message);
        this.isConnecting = false;
      });

      // Écouter les notifications
      this.socket.on('notification', (data: any) => {
        this.handleNotification(data);
      });

      // Écouter les mises à jour de ressources
      this.socket.on('resource:update', (data: any) => {
        const callbacks = this.channels.get(`resource:updates:${data.resourceId}`);
        if (callbacks) {
          callbacks.forEach((callback) => {
            try {
              callback(data);
            } catch (error) {
              console.error('Erreur dans le callback de mise à jour de ressource:', error);
            }
          });
        }
      });

      // Écouter les votes sur suggestions
      this.socket.on('suggestion:vote', (data: any) => {
        const callbacks = this.channels.get('suggestions:votes');
        if (callbacks) {
          callbacks.forEach((callback) => {
            try {
              callback(data);
            } catch (error) {
              console.error('Erreur dans le callback de vote:', error);
            }
          });
        }
      });

      // Écouter les événements d'erreur
      this.socket.on('error', (error: any) => {
        console.error('Erreur Socket.IO:', error);
      });
    } catch (error) {
      console.error('Erreur lors de la connexion Socket.IO:', error);
      this.isConnecting = false;
    }
  }

  /**
   * Gère les notifications reçues
   */
  private handleNotification(notification: any): void {
    const userId = notification.userId;
    if (userId) {
      const callbacks = this.channels.get(`notifications:${userId}`);
      if (callbacks) {
        callbacks.forEach((callback) => {
          try {
            callback(notification);
          } catch (error) {
            console.error('Erreur dans le callback de notification:', error);
          }
        });
      }
    }
  }

  /**
   * S'abonne à un canal
   */
  private subscribeToChannel(channelName: string): void {
    if (this.socket?.connected) {
      if (channelName.startsWith('resource:updates:')) {
        const resourceId = channelName.replace('resource:updates:', '');
        this.socket.emit('subscribe:resource', resourceId);
      } else if (channelName === 'suggestions:votes') {
        this.socket.emit('subscribe:suggestions');
      } else {
        this.socket.emit('subscribe', channelName);
      }
    }
  }

  /**
   * Se désabonne d'un canal
   */
  private unsubscribeFromChannel(channelName: string): void {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe', channelName);
    }
  }

  /**
   * Obtient un canal pour les notifications
   */
  getChannel(name: string): Channel {
    // S'assurer que la connexion est active
    if (!this.socket || !this.socket.connected) {
      this.connect();
    }

    return {
      on: (event: string, callback: NotificationCallback) => {
        // Ajouter le callback au canal
        if (!this.channels.has(name)) {
          this.channels.set(name, new Set());
        }
        this.channels.get(name)!.add(callback);

        // S'abonner au canal si la connexion est active
        if (this.socket?.connected) {
          this.subscribeToChannel(name);
        } else {
          // Si pas encore connecté, attendre la connexion
          this.socket?.on('connect', () => {
            this.subscribeToChannel(name);
          });
        }

        return {
          subscribe: () => ({
            data: {
              subscription: {
                unsubscribe: () => {
                  // Retirer le callback
                  const callbacks = this.channels.get(name);
                  if (callbacks) {
                    callbacks.delete(callback);
                    // Si plus de callbacks, se désabonner
                    if (callbacks.size === 0) {
                      this.channels.delete(name);
                      this.unsubscribeFromChannel(name);
                    }
                  }
                },
              },
            },
          }),
        };
      },
      send: (payload: any) => {
        if (this.socket?.connected) {
          this.socket.emit('message', {
            channel: name,
            payload,
          });
        }
      },
    };
  }

  /**
   * Déconnecte le Socket.IO
   */
  disconnect(): void {
    this.shouldReconnect = false;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.channels.clear();
  }
}


