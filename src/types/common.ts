/**
 * Types communs pour remplacer les utilisations de 'any'
 */

/**
 * Type pour les données JSON génériques
 */
export type JsonValue = 
  | string 
  | number 
  | boolean 
  | null 
  | JsonValue[] 
  | { [key: string]: JsonValue };

/**
 * Type pour les objets avec clés string
 */
export type StringRecord<T = unknown> = Record<string, T>;

/**
 * Type pour les erreurs inconnues
 */
export type UnknownError = unknown;

/**
 * Type pour les données de requête HTTP
 */
export type RequestData = JsonValue | FormData | URLSearchParams;

/**
 * Type pour les réponses HTTP génériques
 */
export type HttpResponse<T = JsonValue> = {
  data?: T;
  error?: {
    message: string;
    code?: string;
    statusCode?: number;
  };
};

/**
 * Type pour les métadonnées génériques
 */
export type Metadata = StringRecord<JsonValue>;

/**
 * Type pour les options de configuration génériques
 */
export type ConfigOptions = StringRecord<JsonValue>;

/**
 * Type pour les callbacks génériques
 */
export type Callback<T = void> = (data: T) => void | Promise<void>;

/**
 * Type pour les fonctions async génériques
 */
export type AsyncFunction<T = unknown, R = unknown> = (arg: T) => Promise<R>;

