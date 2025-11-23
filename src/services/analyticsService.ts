/**
 * Service d'analytics pour suivre l'utilisation de l'application
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

  /**
   * Enregistre un événement analytics
   */
  track(eventType: string, metadata?: Record<string, any>, userId?: string): void {
    const event: AnalyticsEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: eventType,
      userId,
      metadata,
      timestamp: new Date().toISOString(),
    };

    const events = this.getEvents();
    events.push(event);

    // Garder seulement les N derniers événements
    if (events.length > this.MAX_EVENTS) {
      events.shift();
    }

    this.saveEvents(events);
  }

  /**
   * Récupère les statistiques d'utilisation
   */
  getStats(userId?: string): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    recentEvents: AnalyticsEvent[];
    userEvents?: number;
  } {
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
  getPopularResources(limit: number = 10): Array<{ resourceId: string; views: number }> {
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
  getTrendingResources(days: number = 7, limit: number = 10): Array<{ resourceId: string; views: number }> {
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


