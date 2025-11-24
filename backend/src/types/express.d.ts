/**
 * Extension des types Express pour inclure les propriétés personnalisées
 */

import { Request as ExpressRequest } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role?: string;
      };
    }
  }
}

export {};

