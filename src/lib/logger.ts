/**
 * Système de logging structuré pour Hub-Lib
 * Permet de logger les erreurs avec contexte et métadonnées
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  user?: {
    id: string;
    email?: string;
  };
  url?: string;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;

  /**
   * Log une entrée avec le niveau spécifié
   */
  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    };

    // Ajouter les informations d'erreur si présentes
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    // En production, on pourrait envoyer les erreurs à un service externe
    if (level === LogLevel.ERROR) {
      this.logToConsole(entry);
      this.logToStorage(entry);
      
      // En production, envoyer à un service de monitoring
      if (!this.isDevelopment) {
        this.sendToMonitoring(entry);
      }
    } else if (this.isDevelopment) {
      this.logToConsole(entry);
    }
  }

  /**
   * Log dans la console avec formatage
   */
  private logToConsole(entry: LogEntry) {
    const style = this.getConsoleStyle(entry.level);
    const prefix = `[${entry.level.toUpperCase()}] ${entry.timestamp}`;
    
    if (entry.error) {
      console.group(`%c${prefix}`, style);
      console.error(entry.message, entry.error);
      if (entry.context) {
        console.log('Context:', entry.context);
      }
      console.groupEnd();
    } else {
      console.log(`%c${prefix}`, style, entry.message, entry.context || '');
    }
  }

  /**
   * Stocker les erreurs dans localStorage pour analyse ultérieure
   */
  private logToStorage(entry: LogEntry) {
    try {
      const key = 'hub-lib-errors';
      const existing = localStorage.getItem(key);
      const errors = existing ? JSON.parse(existing) : [];
      
      // Garder seulement les 50 dernières erreurs
      errors.push(entry);
      if (errors.length > 50) {
        errors.shift();
      }
      
      localStorage.setItem(key, JSON.stringify(errors));
    } catch (err) {
      // Ignorer les erreurs de stockage
      console.warn('Impossible de stocker le log:', err);
    }
  }

  /**
   * Envoyer à un service de monitoring (à implémenter selon les besoins)
   */
  private sendToMonitoring(entry: LogEntry) {
    // Exemple: envoyer à Sentry, LogRocket, etc.
    // fetch('/api/logs', { method: 'POST', body: JSON.stringify(entry) })
  }

  /**
   * Obtenir le style console selon le niveau
   */
  private getConsoleStyle(level: LogLevel): string {
    const styles = {
      [LogLevel.DEBUG]: 'color: #6b7280',
      [LogLevel.INFO]: 'color: #3b82f6',
      [LogLevel.WARN]: 'color: #f59e0b',
      [LogLevel.ERROR]: 'color: #ef4444; font-weight: bold',
    };
    return styles[level] || '';
  }

  /**
   * Log de debug (uniquement en développement)
   */
  debug(message: string, context?: Record<string, any>) {
    if (this.isDevelopment) {
      this.log(LogLevel.DEBUG, message, context);
    }
  }

  /**
   * Log d'information
   */
  info(message: string, context?: Record<string, any>) {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log d'avertissement
   */
  warn(message: string, context?: Record<string, any>, error?: Error) {
    this.log(LogLevel.WARN, message, context, error);
  }

  /**
   * Log d'erreur
   */
  error(message: string, error?: Error, context?: Record<string, any>) {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Récupérer les erreurs stockées
   */
  getStoredErrors(): LogEntry[] {
    try {
      const key = 'hub-lib-errors';
      const existing = localStorage.getItem(key);
      return existing ? JSON.parse(existing) : [];
    } catch {
      return [];
    }
  }

  /**
   * Effacer les erreurs stockées
   */
  clearStoredErrors() {
    try {
      localStorage.removeItem('hub-lib-errors');
    } catch {
      // Ignorer
    }
  }
}

export const logger = new Logger();


