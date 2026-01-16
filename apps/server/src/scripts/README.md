# Scripts de base de données

## Seeding

Le script de seeding permet de peupler votre base de données avec des données de test réalistes et complètes.

### Exécution

```bash
# Depuis le dossier racine du projet
pnpm --filter @repo/server seed

# Ou depuis le dossier apps/server
pnpm seed
```

### Données générées

Le script crée automatiquement :

#### **Utilisateurs** (50 au total)
- **1 admin principal**
  - Username: `admin`
  - Email: `admin@shakederoy.com`
  - Password: `AdminPassword123!`
  - Rôle: `admin`
  
- **4 admins supplémentaires**
  - Données aléatoires générées avec Faker
  - Password par défaut: `AdminPass123!`
  - Rôle: `admin`

- **45 utilisateurs réguliers**
  - Données aléatoires générées avec Faker
  - Password par défaut: `UserPassword123!`
  - Rôle: `user`
  - ~70% ont une photo de profil

#### **Cocktails** (100 au total)

##### Cocktails classiques authentiques (45)
Des recettes complètes et détaillées de cocktails mondialement reconnus :

- **Cubains :** Mojito, Daiquiri, Hemingway Daiquiri
- **Italiens :** Negroni, Bellini, Aperol Spritz
- **Américains :** Old Fashioned, Manhattan, Mint Julep, Whiskey Sour
- **Mexicains :** Margarita, Paloma, Tequila Sunrise
- **Britanniques :** Gimlet, Tom Collins, Bramble
- **Français :** French 75, Between the Sheets
- **Tropicaux :** Piña Colada, Mai Tai, Singapore Sling, Painkiller
- **Tiki :** Zombie
- **Modernes :** Espresso Martini, Pornstar Martini, Cosmopolitan
- **Classiques pré-prohibition :** Aviation, Last Word, Clover Club, Corpse Reviver #2
- **De La Nouvelle-Orléans :** Sazerac, Vieux Carré, Ramos Gin Fizz
- Et bien d'autres...

##### Variations et cocktails modernes (55)
Des variations créatives et cocktails générés automatiquement avec :
- Différents spiritueux de base (Vodka, Gin, Rhum, Tequila, Whiskey, Cognac)
- Saveurs variées (Fraise, Mangue, Passion, Citron, Framboise, etc.)
- Styles classiques (Fizz, Sour, Punch, Smash, Cooler, Collins, etc.)

### Structure des données

#### Utilisateurs
```typescript
{
  id: string (UUID)
  username: string (unique)
  email: string (unique)
  password: string (hashé avec Argon2)
  role: 'admin' | 'user'
  profile_pic: string | null
  created_at: timestamp
  updated_at: timestamp
}
```

#### Cocktails
```typescript
{
  id: string (UUID)
  name: string (unique)
  description: string
  ingredients: string
  instructions: string
  image: string | null
  created_at: timestamp
  updated_at: timestamp
}
```

### Configuration

Le script peut être personnalisé en modifiant les constantes au début du fichier `seed.ts` :

```typescript
const USERS_COUNT = 50    
const COCKTAILS_COUNT = 100
const ADMIN_COUNT = 5
```

### Sécurité

- Tous les mots de passe sont hashés avec **Argon2** avant insertion
- Les données sensibles ne sont jamais loggées
- La connexion à la base de données est correctement fermée après le seeding

### Avertissements

- Le script **ne vide pas** la base de données avant insertion
- Il ajoute des données aux tables existantes
- Les contraintes d'unicité (username, email, nom de cocktail) peuvent causer des erreurs si les données existent déjà
- Pour réinitialiser complètement la base, utilisez les migrations Drizzle

### Réinitialisation complète

Si vous souhaitez repartir de zéro :

```bash
# 1. Supprimer et recréer la base de données
# Ou utiliser les migrations Drizzle pour reset

# 2. Appliquer les migrations
pnpm --filter @repo/schemas db:push

# 3. Lancer le seeding
pnpm --filter @repo/server seed
```

### Test des données

Après le seeding, vous pouvez tester avec :

1. **Login admin**
   ```bash
   curl -X POST http://localhost:3000/auth/login \
     -H "Content-Type: application/json" \
     -d '{"credential": "admin", "password": "AdminPassword123!"}'
   ```

2. **Récupérer les cocktails**
   ```bash
   curl http://localhost:3000/cocktails
   ```

3. **Récupérer les utilisateurs**
   ```bash
   curl http://localhost:3000/users
   ```

### Dépendances

Le script utilise :
- `@faker-js/faker` : Génération de données aléatoires réalistes
- `@node-rs/argon2` : Hashage sécurisé des mots de passe
- `kysely` : Query builder pour PostgreSQL
- `@repo/schemas` : Types et schémas de la base de données

### Dépannage

**Erreur de connexion à la base de données**
- Vérifiez que PostgreSQL est démarré
- Vérifiez vos variables d'environnement dans `.env`
- Assurez-vous que les migrations sont appliquées

**Erreur d'unicité**
- La base contient déjà des données avec les mêmes usernames/emails/noms
- Réinitialisez la base ou modifiez les données du seed

**Erreur de schéma**
- Vérifiez que les migrations sont à jour
- Vérifiez que le schéma correspond au code

### Bonnes pratiques

1. Exécutez le seeding sur une **base de données de développement** uniquement
2. Ne jamais exécuter en production avec des données de test
3. Gardez une sauvegarde avant de seeder si vous avez des données importantes
4. Personnalisez les mots de passe par défaut pour la production

---

**Créé pour ShakeDeRoy**
