# Exemples d'annotations Swagger/OpenAPI

Ce document montre comment documenter les endpoints API avec Swagger/OpenAPI.

## Exemple de documentation d'endpoint

```typescript
/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Inscription d'un nouvel utilisateur
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: password123
 *               username:
 *                 type: string
 *                 example: johndoe
 *     responses:
 *       201:
 *         description: Utilisateur créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 access_token:
 *                   type: string
 *                 refresh_token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Erreur de validation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/signup', ...);
```

## Exemple avec authentification

```typescript
/**
 * @swagger
 * /api/resources:
 *   get:
 *     summary: Liste toutes les ressources accessibles
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filtrer par catégorie
 *       - in: query
 *         name: tags
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Filtrer par tags
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Nombre de résultats à retourner
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Décalage pour la pagination
 *     responses:
 *       200:
 *         description: Liste des ressources
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resources:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Resource'
 *                 total:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 offset:
 *                   type: integer
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', authMiddleware, ...);
```

## Exemple avec paramètres de route

```typescript
/**
 * @swagger
 * /api/resources/{id}:
 *   get:
 *     summary: Récupère une ressource par son ID
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la ressource
 *     responses:
 *       200:
 *         description: Détails de la ressource
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Resource'
 *       404:
 *         description: Ressource non trouvée
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', authMiddleware, ...);
```

## Exemple avec upload de fichier

```typescript
/**
 * @swagger
 * /api/files/upload:
 *   post:
 *     summary: Upload un fichier
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Fichier à uploader (max 10MB)
 *     responses:
 *       201:
 *         description: Fichier uploadé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 file:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     fileName:
 *                       type: string
 *                     url:
 *                       type: string
 *       400:
 *         description: Erreur de validation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/upload', authMiddleware, upload.single('file'), ...);
```

## Schémas personnalisés

Les schémas suivants sont déjà définis dans `src/config/swagger.ts` :
- `Error` - Format d'erreur standard
- `Resource` - Modèle de ressource
- `User` - Modèle d'utilisateur

Vous pouvez ajouter d'autres schémas dans la section `components.schemas` de `swagger.ts`.

## Accès à la documentation

Une fois le serveur démarré, la documentation est accessible à :
- Interface Swagger UI : `http://localhost:3001/api/docs`
- Spécification JSON : `http://localhost:3001/api/docs.json`

