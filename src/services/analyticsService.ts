/**
 * Service d'analytics pour suivre l'utilisation de l'application
 * Utilise le backend API avec fallback localStorage pour le mode offline
 */

interface AnalyticsEvent {
  id: string;
  type: string;
  userId?: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

class AnalyticsService {
  private readonly ANALYTICS_KEY = 'hub-lib-analytics';
  private readonly MAX_EVENTS = 1000; // Limite d'événements stockés
  private readonly API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  private useApiClient: boolean;

  constructor() {
    // Vérifier si on doit utiliser l'API backend
    this.useApiClient = import.meta.env.VITE_USE_API_CLIENT === 'true';
  }

  /**
   * Enregistre un événement analytics
   */
  async track(eventType: string, metadata?: Record<string, any>, userId?: string): Promise<void> {
    const event: AnalyticsEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: eventType,
      userId,
      resourceId: metadata?.resourceId,
      metadata,
      timestamp: new Date().toISOString(),
    };

    // Si on utilise l'API backend, envoyer au backend
    if (this.useApiClient) {
      try {
        // Récupérer le token d'accès depuis localStorage
        const accessToken = localStorage.getItem('hub-lib-access-token');
        
        const response = await fetch(`${this.API_BASE_URL}/api/analytics/track`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({
            event: eventType,
            resourceId: metadata?.resourceId,
            metadata: {
              ...metadata,
              resourceId: undefined, // Ne pas dupliquer
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        // Événement envoyé avec succès, on peut le supprimer du cache local s'il y en a un
        return;
      } catch (error) {
        // En cas d'erreur, sauvegarder en localStorage pour retry plus tard
        console.warn('Erreur lors de l\'envoi de l\'événement analytics, sauvegarde locale:', error);
        const events = this.getEvents();
        events.push(event);
        if (events.length > this.MAX_EVENTS) {
          events.shift();
        }
        this.saveEvents(events);
        return;
      }
    }

    // Mode localStorage uniquement (fallback ou mode local)
    const events = this.getEvents();
    events.push(event);

    // Garder seulement les N derniers événements
    if (events.length > this.MAX_EVENTS) {
      events.shift();
    }

    this.saveEvents(events);
  }

  /**
   * Retente d'envoyer les événements en cache vers le backend
   */
  async retryFailedEvents(): Promise<void> {
    if (!this.useApiClient) return;

    const events = this.getEvents();
    if (events.length === 0) return;

    const accessToken = localStorage.getItem('hub-lib-access-token');
    const failedEvents: AnalyticsEvent[] = [];

    for (const event of events) {
      try {
        const response = await fetch(`${this.API_BASE_URL}/api/analytics/track`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({
            event: event.type,
            resourceId: event.resourceId,
            metadata: event.metadata,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        failedEvents.push(event);
      }
    }

    // Garder seulement les événements qui ont échoué
    if (failedEvents.length !== events.length) {
      this.saveEvents(failedEvents);
    }
  }

  /**
   * Récupère les statistiques d'utilisation
   */
  async getStats(userId?: string): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    recentEvents: AnalyticsEvent[];
    userEvents?: number;
  }> {
    // Si on utilise l'API backend, récupérer depuis le backend
    if (this.useApiClient) {
      try {
        const accessToken = localStorage.getItem('hub-lib-access-token');
        const response = await fetch(`${this.API_BASE_URL}/api/analytics/stats`, {
          headers: {
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        });

        if (response.ok) {
          const backendStats = await response.json();
          
          // Convertir le format backend en format frontend
          const recentEvents: AnalyticsEvent[] = backendStats.recentEvents?.map((e: any) => ({
            id: `event_${Date.now()}_${Math.random()}`,
            type: e.event,
            metadata: {},
            timestamp: e.date,
          })) || [];

          return {
            totalEvents: backendStats.totalEvents || 0,
            eventsByType: backendStats.eventsByType || {},
            recentEvents,
            userEvents: backendStats.userEvents,
          };
        }
      } catch (error) {
        console.warn('Erreur lors de la récupération des stats depuis le backend, fallback localStorage:', error);
      }
    }

    // Fallback localStorage
    const events = this.getEvents();
    const filteredEvents = userId 
      ? events.filter(e => e.userId === userId)
      : events;

    const eventsByType: Record<string, number> = {};
    filteredEvents.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
    });

    return {
      totalEvents: filteredEvents.length,
      eventsByType,
      recentEvents: filteredEvents.slice(-50).reverse(),
      userEvents: userId ? filteredEvents.length : undefined,
    };
  }

  /**
   * Récupère les ressources les plus consultées
   */
  async getPopularResources(limit: number = 10): Promise<Array<{ resourceId: string; views: number }>> {
    // Si on utilise l'API backend, récupérer depuis le backend
    if (this.useApiClient) {
      try {
        const response = await fetch(`${this.API_BASE_URL}/api/analytics/popular-resources?limit=${limit}`);
        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        console.warn('Erreur lors de la récupération des ressources populaires depuis le backend, fallback localStorage:', error);
      }
    }

    // Fallback localStorage
    const events = this.getEvents();
    const viewEvents = events.filter(e => e.type === 'resource_view' && e.resourceId);
    
    const resourceViews: Record<string, number> = {};
    viewEvents.forEach(event => {
      if (event.resourceId) {
        resourceViews[event.resourceId] = (resourceViews[event.resourceId] || 0) + 1;
      }
    });

    return Object.entries(resourceViews)
      .map(([resourceId, views]) => ({ resourceId, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);
  }

  /**
   * Récupère les tendances (ressources populaires récentes)
   */
  async getTrendingResources(days: number = 7, limit: number = 10): Promise<Array<{ resourceId: string; views: number }>> {
    // Si on utilise l'API backend, récupérer depuis le backend
    if (this.useApiClient) {
      try {
        const response = await fetch(`${this.API_BASE_URL}/api/analytics/popular-resources?limit=${limit}&days=${days}`);
        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        console.warn('Erreur lors de la récupération des tendances depuis le backend, fallback localStorage:', error);
      }
    }

    // Fallback localStorage
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const events = this.getEvents();
    const recentViewEvents = events.filter(e => 
      e.type === 'resource_view' && 
      e.resourceId &&
      new Date(e.timestamp) >= cutoffDate
    );

    const resourceViews: Record<string, number> = {};
    recentViewEvents.forEach(event => {
      if (event.resourceId) {
        resourceViews[event.resourceId] = (resourceViews[event.resourceId] || 0) + 1;
      }
    });

    return Object.entries(resourceViews)
      .map(([resourceId, views]) => ({ resourceId, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);
  }

  /**
   * Exporte les données analytics
   */
  exportData(): AnalyticsEvent[] {
    return this.getEvents();
  }

  /**
   * Efface toutes les données analytics
   */
  clear(): void {
    localStorage.removeItem(this.ANALYTICS_KEY);
  }

  private getEvents(): AnalyticsEvent[] {
    const data = localStorage.getItem(this.ANALYTICS_KEY);
    return data ? JSON.parse(data) : [];
  }

  private saveEvents(events: AnalyticsEvent[]): void {
    localStorage.setItem(this.ANALYTICS_KEY, JSON.stringify(events));
  }
}

export const analyticsService = new AnalyticsService();

// Track automatiquement certains événements
if (typeof window !== 'undefined') {
  // Retenter d'envoyer les événements en cache au chargement
  analyticsService.retryFailedEvents();

  // Track les vues de page
  let lastPath = window.location.pathname;
  const trackPageView = () => {
    if (window.location.pathname !== lastPath) {
      analyticsService.track('page_view', { path: window.location.pathname });
      lastPath = window.location.pathname;
    }
  };

  // Track au changement de route
  window.addEventListener('popstate', trackPageView);
  
  // Track les clics sur les ressources
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const resourceLink = target.closest('[data-resource-id]');
    if (resourceLink) {
      const resourceId = resourceLink.getAttribute('data-resource-id');
      if (resourceId) {
        analyticsService.track('resource_click', { resourceId });
      }
    }
  });
}


