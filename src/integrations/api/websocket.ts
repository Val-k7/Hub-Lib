/**
 * Service WebSocket pour les notifications temps réel
 */

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
 */
export class WebSocketService {
  private wsUrl: string;
  private getToken: () => string | null;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private channels: Map<string, Set<NotificationCallback>> = new Map();
  private isConnecting = false;
  private shouldReconnect = true;

  constructor(wsUrl: string, getToken: () => string | null) {
    this.wsUrl = wsUrl;
    this.getToken = getToken;
  }

  /**
   * Connecte au WebSocket
   */
  private connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    const token = this.getToken();
    if (!token) {
      this.isConnecting = false;
      return;
    }

    try {
      // Construire l'URL avec le token
      const url = `${this.wsUrl}?token=${encodeURIComponent(token)}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connecté');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        
        // S'abonner aux canaux existants
        this.channels.forEach((_, channelName) => {
          this.subscribeToChannel(channelName);
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Erreur lors du parsing du message WebSocket:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ Erreur WebSocket:', error);
        this.isConnecting = false;
      };

      this.ws.onclose = () => {
        console.log('WebSocket fermé');
        this.isConnecting = false;
        this.ws = null;

        // Tentative de reconnexion
        if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
          setTimeout(() => {
            if (this.shouldReconnect) {
              this.connect();
            }
          }, delay);
        }
      };
    } catch (error) {
      console.error('Erreur lors de la connexion WebSocket:', error);
      this.isConnecting = false;
    }
  }

  /**
   * Gère les messages reçus
   */
  private handleMessage(message: any): void {
    if (message.type === 'notification' && message.channel) {
      const callbacks = this.channels.get(message.channel);
      if (callbacks) {
        callbacks.forEach((callback) => {
          try {
            callback(message.data || message);
          } catch (error) {
            console.error('Erreur dans le callback de notification:', error);
          }
        });
      }
    }

    // Gérer d'autres types de messages
    if (message.type === 'error') {
      console.error('Erreur WebSocket:', message.error);
    }
  }

  /**
   * S'abonne à un canal
   */
  private subscribeToChannel(channelName: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'subscribe',
          channel: channelName,
        })
      );
    }
  }

  /**
   * Se désabonne d'un canal
   */
  private unsubscribeFromChannel(channelName: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'unsubscribe',
          channel: channelName,
        })
      );
    }
  }

  /**
   * Obtient un canal pour les notifications
   */
  getChannel(name: string): Channel {
    // S'assurer que la connexion est active
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
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
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.subscribeToChannel(name);
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
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(
            JSON.stringify({
              type: 'message',
              channel: name,
              payload,
            })
          );
        }
      },
    };
  }

  /**
   * Déconnecte le WebSocket
   */
  disconnect(): void {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.channels.clear();
  }
}


