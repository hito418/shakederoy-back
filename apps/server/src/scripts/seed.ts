import { faker } from '@faker-js/faker'
import { hash } from '@node-rs/argon2'
import { db } from '../lib/db'

const USERS_COUNT = 50
const COCKTAILS_COUNT = 100
const ADMIN_COUNT = 5

const cocktailsData = [
  {
    name: 'Mojito',
    description:
      'Un cocktail cubain rafraîchissant à base de rhum blanc, menthe fraîche et citron vert.',
    ingredients:
      '60ml rhum blanc, 30ml jus de citron vert, 20ml sirop de sucre de canne, 8-10 feuilles de menthe fraîche, eau gazeuse, glace pilée',
    instructions:
      'Dans un verre highball, mettre les feuilles de menthe et le sirop. Piler légèrement pour libérer les arômes. Ajouter le jus de citron vert et le rhum. Remplir de glace pilée. Compléter avec de l\'eau gazeuse. Remuer délicatement. Garnir de menthe fraîche et d\'une rondelle de citron vert.',
  },
  {
    name: 'Cosmopolitan',
    description:
      'Cocktail glamour popularisé par Sex and the City, un mélange acidulé de vodka et cranberry.',
    ingredients:
      '45ml vodka, 15ml triple sec, 30ml jus de cranberry, 15ml jus de citron vert frais, zeste de citron',
    instructions:
      'Remplir un shaker de glaçons. Ajouter tous les ingrédients liquides. Shaker vigoureusement pendant 15 secondes. Filtrer dans un verre à martini refroidi. Garnir d\'un zeste de citron flambé ou d\'une rondelle de citron vert.',
  },
  {
    name: 'Old Fashioned',
    description:
      'Le cocktail classique américain par excellence, un mélange riche de bourbon et bitters.',
    ingredients:
      '60ml bourbon ou rye whiskey, 1 morceau de sucre, 2-3 traits d\'angostura bitters, zeste d\'orange, cerise marasquin',
    instructions:
      'Dans un verre old fashioned, déposer le sucre et ajouter les bitters. Ajouter quelques gouttes d\'eau et piler jusqu\'à dissolution. Remplir le verre de glaçons. Ajouter le whiskey et remuer doucement 30 secondes. Exprimer le zeste d\'orange au-dessus du verre et le déposer dedans. Garnir d\'une cerise.',
  },
  {
    name: 'Margarita',
    description:
      'Le cocktail mexicain iconique, parfait équilibre entre tequila, citron vert et triple sec.',
    ingredients:
      '50ml tequila blanco, 25ml triple sec, 25ml jus de citron vert frais, sel pour le bord du verre',
    instructions:
      'Frotter le bord d\'un verre avec un quartier de citron vert et tremper dans le sel. Remplir un shaker de glaçons. Ajouter la tequila, le triple sec et le jus de citron. Shaker vigoureusement 15 secondes. Filtrer dans le verre préparé rempli de glace fraîche. Garnir d\'une rondelle de citron vert.',
  },
  {
    name: 'Piña Colada',
    description:
      'Cocktail tropical crémeux originaire de Porto Rico, évoquant les plages paradisiaques.',
    ingredients:
      '60ml rhum blanc, 90ml jus d\'ananas, 30ml crème de coco, ananas frais, cerise',
    instructions:
      'Remplir un blender de glace pilée. Ajouter le rhum, le jus d\'ananas et la crème de coco. Mixer jusqu\'à obtenir une consistance lisse et crémeuse. Verser dans un verre hurricane ou un grand verre. Garnir d\'un morceau d\'ananas frais et d\'une cerise. Servir avec une paille.',
  },
  {
    name: 'Manhattan',
    description:
      'Cocktail sophistiqué de New York, mariage parfait entre whiskey et vermouth.',
    ingredients:
      '60ml rye whiskey, 30ml vermouth rouge doux, 2 traits d\'angostura bitters, cerise marasquin',
    instructions:
      'Remplir un verre à mélange de glaçons. Ajouter le whiskey, le vermouth et les bitters. Remuer doucement pendant 30 secondes pour diluer et refroidir. Filtrer dans un verre à martini ou coupe refroidi. Garnir d\'une cerise marasquin.',
  },
  {
    name: 'Negroni',
    description:
      'Cocktail italien amer et élégant, parfait pour l\'apéritif avec son équilibre unique.',
    ingredients:
      '30ml gin, 30ml Campari, 30ml vermouth rouge doux, zeste d\'orange',
    instructions:
      'Remplir un verre old fashioned de glaçons. Verser le gin, le Campari et le vermouth directement dans le verre. Remuer doucement pendant 15-20 secondes. Exprimer un zeste d\'orange au-dessus du verre et le déposer dans le cocktail.',
  },
  {
    name: 'Daiquiri',
    description:
      'Cocktail cubain classique, pure simplicité de rhum, citron vert et sucre.',
    ingredients:
      '60ml rhum blanc, 25ml jus de citron vert frais, 15ml sirop simple',
    instructions:
      'Remplir un shaker de glaçons. Ajouter le rhum, le jus de citron vert et le sirop. Shaker vigoureusement pendant 15 secondes. Filtrer dans une coupe à champagne ou un verre à martini refroidi. Garnir d\'une rondelle de citron vert.',
  },
  {
    name: 'Espresso Martini',
    description:
      'Cocktail moderne énergisant alliant vodka et café espresso pour une expérience unique.',
    ingredients:
      '50ml vodka, 30ml liqueur de café (Kahlúa), 30ml espresso frais et refroidi, grains de café',
    instructions:
      'Remplir un shaker de glaçons. Ajouter la vodka, la liqueur de café et l\'espresso fraîchement préparé et légèrement refroidi. Shaker vigoureusement pendant 20 secondes pour créer une belle mousse. Filtrer dans un verre à martini refroidi. Garnir de 3 grains de café sur la mousse.',
  },
  {
    name: 'Whiskey Sour',
    description:
      'Cocktail aigre-doux classique, équilibre parfait entre whiskey, citron et sucre.',
    ingredients:
      '60ml bourbon whiskey, 30ml jus de citron frais, 20ml sirop simple, 1 blanc d\'œuf (optionnel), cerise et orange',
    instructions:
      'Ajouter tous les ingrédients dans un shaker sans glace. Dry shake (sans glace) vigoureusement pendant 10 secondes si vous utilisez du blanc d\'œuf. Ajouter de la glace et shaker à nouveau 15 secondes. Filtrer dans un verre old fashioned avec de la glace fraîche. Garnir d\'une cerise et d\'une demi-rondelle d\'orange.',
  },
  {
    name: 'Aperol Spritz',
    description:
      'Le cocktail italien pétillant de l\'été, léger et rafraîchissant avec son amertume douce.',
    ingredients:
      '90ml Prosecco, 60ml Aperol, 30ml eau gazeuse, rondelle d\'orange, olives vertes',
    instructions:
      'Remplir un grand verre à vin de glaçons. Verser l\'Aperol, puis le Prosecco. Compléter avec l\'eau gazeuse. Remuer délicatement. Garnir d\'une rondelle d\'orange et d\'une olive verte sur un pic.',
  },
  {
    name: 'Caipirinha',
    description:
      'Le cocktail national du Brésil, rustique et puissant à base de cachaça et citron vert.',
    ingredients:
      '60ml cachaça, 1 citron vert coupé en quartiers, 2 cuillères à café de sucre',
    instructions:
      'Couper le citron vert en quartiers et les mettre dans un verre old fashioned. Ajouter le sucre. Piler fermement pour extraire le jus et les huiles. Remplir le verre de glace pilée. Verser la cachaça. Remuer vigoureusement. Servir avec une courte paille.',
  },
  {
    name: 'Moscow Mule',
    description:
      'Cocktail américain rafraîchissant et épicé, traditionnellement servi dans une tasse en cuivre.',
    ingredients:
      '60ml vodka, 15ml jus de citron vert frais, 120ml ginger beer, quartier de citron vert, menthe',
    instructions:
      'Remplir une tasse en cuivre (ou un verre highball) de glaçons. Verser la vodka et le jus de citron vert. Compléter avec la ginger beer. Remuer délicatement. Garnir d\'un quartier de citron vert et d\'une branche de menthe fraîche.',
  },
  {
    name: 'Mai Tai',
    description:
      'Cocktail tiki polynésien complexe et fruité, un classique des bars tropicaux.',
    ingredients:
      '40ml rhum blanc, 20ml rhum ambré, 20ml triple sec, 15ml orgeat (sirop d\'amande), 30ml jus de citron vert, menthe et ananas',
    instructions:
      'Remplir un shaker de glaçons. Ajouter les deux rhums, le triple sec, l\'orgeat et le jus de citron vert. Shaker vigoureusement 15 secondes. Filtrer dans un verre old fashioned rempli de glace pilée. Garnir de menthe fraîche, d\'ananas et d\'un zeste de citron vert.',
  },
  {
    name: 'Bloody Mary',
    description:
      'Le cocktail du brunch par excellence, savoureux et épicé, parfait pour se remettre d\'une soirée.',
    ingredients:
      '60ml vodka, 120ml jus de tomate, 15ml jus de citron, sauce Worcestershire, Tabasco, sel, poivre, céleri',
    instructions:
      'Dans un shaker, combiner la vodka, le jus de tomate, le jus de citron, 3 traits de Worcestershire, 2 traits de Tabasco, une pincée de sel et de poivre. Rouler doucement avec de la glace. Filtrer dans un verre highball rempli de glace. Garnir d\'une branche de céleri, d\'olives, et d\'un quartier de citron.',
  },
  {
    name: 'Mint Julep',
    description:
      'Le cocktail emblématique du Kentucky Derby, rafraîchissant avec son bourbon et sa menthe.',
    ingredients:
      '60ml bourbon, 10ml sirop simple, 8-10 feuilles de menthe fraîche, glace pilée',
    instructions:
      'Dans un julep cup ou verre old fashioned, piler doucement les feuilles de menthe avec le sirop. Remplir le verre de glace pilée. Verser le bourbon. Remuer jusqu\'à ce que le verre devienne givré. Ajouter plus de glace pilée pour former un dôme. Garnir généreusement de menthe fraîche.',
  },
  {
    name: 'Tom Collins',
    description:
      'Cocktail long drink classique et désaltérant, parfait pour les journées chaudes d\'été.',
    ingredients:
      '60ml gin, 30ml jus de citron frais, 15ml sirop simple, eau gazeuse, citron et cerise',
    instructions:
      'Remplir un shaker de glaçons. Ajouter le gin, le jus de citron et le sirop. Shaker vigoureusement 15 secondes. Filtrer dans un verre Collins rempli de glace fraîche. Compléter avec l\'eau gazeuse. Remuer doucement. Garnir d\'une rondelle de citron et d\'une cerise.',
  },
  {
    name: 'French 75',
    description:
      'Cocktail pétillant élégant nommé d\'après un canon français de la Première Guerre mondiale.',
    ingredients:
      '30ml gin, 15ml jus de citron frais, 10ml sirop simple, 60ml champagne, zeste de citron',
    instructions:
      'Remplir un shaker de glaçons. Ajouter le gin, le jus de citron et le sirop. Shaker vigoureusement 15 secondes. Filtrer dans une flûte à champagne. Compléter délicatement avec le champagne. Garnir d\'un long zeste de citron en spirale.',
  },
  {
    name: 'Dark and Stormy',
    description:
      'Cocktail des Bermudes simple mais savoureux, rhum noir et ginger beer.',
    ingredients:
      '60ml rhum noir (idéalement Gosling\'s), 120ml ginger beer, 15ml jus de citron vert, quartier de citron vert',
    instructions:
      'Remplir un verre highball de glaçons. Verser le jus de citron vert. Ajouter la ginger beer. Verser délicatement le rhum noir sur le dos d\'une cuillère pour créer un effet de couches. Garnir d\'un quartier de citron vert. Remuer avant de boire.',
  },
  {
    name: 'Amaretto Sour',
    description:
      'Version douce et amandée du classique sour, onctueux avec sa mousse de blanc d\'œuf.',
    ingredients:
      '60ml amaretto, 30ml jus de citron frais, 15ml sirop simple, 1 blanc d\'œuf, cerise et orange',
    instructions:
      'Ajouter l\'amaretto, le jus de citron, le sirop et le blanc d\'œuf dans un shaker sans glace. Dry shake vigoureusement 15 secondes. Ajouter de la glace et shaker à nouveau 15 secondes. Filtrer dans un verre old fashioned avec de la glace fraîche. Garnir d\'une cerise et d\'une demi-rondelle d\'orange.',
  },
  {
    name: 'Pornstar Martini',
    description:
      'Cocktail moderne fruité et glamour, servi avec un shot de prosecco à côté.',
    ingredients:
      '50ml vodka vanille, 15ml liqueur de fruit de la passion (Passoã), 30ml jus de fruit de la passion, 15ml jus de citron vert, 10ml sirop de vanille, 30ml prosecco, demi fruit de la passion',
    instructions:
      'Remplir un shaker de glaçons. Ajouter la vodka, la liqueur, le jus de fruit de la passion, le jus de citron et le sirop. Shaker vigoureusement 15 secondes. Filtrer dans un verre à martini. Garnir d\'une demi fruit de la passion flottante. Servir avec un shot de prosecco à côté.',
  },
  {
    name: 'Paloma',
    description:
      'Le cocktail mexicain le plus populaire, rafraîchissant avec du pamplemousse et de la tequila.',
    ingredients:
      '60ml tequila blanco, 15ml jus de citron vert, 120ml soda au pamplemousse, sel, quartier de pamplemousse',
    instructions:
      'Frotter le bord d\'un verre highball avec du citron vert et tremper dans le sel. Remplir de glaçons. Verser la tequila et le jus de citron vert. Compléter avec le soda au pamplemousse. Remuer doucement. Garnir d\'un quartier de pamplemousse.',
  },
  {
    name: 'Aviation',
    description:
      'Cocktail classique de l\'ère pré-prohibition, floral et délicat avec sa teinte bleu-violet.',
    ingredients:
      '60ml gin, 15ml liqueur de marasquin, 10ml crème de violette, 20ml jus de citron frais, cerise',
    instructions:
      'Remplir un shaker de glaçons. Ajouter le gin, la liqueur de marasquin, la crème de violette et le jus de citron. Shaker vigoureusement 15 secondes. Filtrer dans une coupe à cocktail refroidie. Garnir d\'une cerise brandied.',
  },
  {
    name: 'Gimlet',
    description:
      'Cocktail britannique minimaliste et élégant, gin et lime dans leur plus simple expression.',
    ingredients: '60ml gin, 25ml jus de citron vert frais, 15ml sirop simple',
    instructions:
      'Remplir un shaker de glaçons. Ajouter le gin, le jus de citron vert et le sirop. Shaker vigoureusement 15 secondes. Filtrer dans une coupe à cocktail ou un verre à martini refroidi. Garnir d\'une rondelle de citron vert.',
  },
  {
    name: 'Bellini',
    description:
      'Cocktail italien pétillant créé au Harry\'s Bar de Venise, doux et fruité.',
    ingredients:
      '100ml prosecco bien froid, 50ml purée de pêche blanche fraîche',
    instructions:
      'Verser la purée de pêche dans une flûte à champagne refroidie. Compléter délicatement avec le prosecco bien froid. Remuer très doucement avec une cuillère à cocktail. Ne pas garnir pour préserver la pureté du cocktail.',
  },
  {
    name: 'Sazerac',
    description:
      'L\'un des plus anciens cocktails américains de La Nouvelle-Orléans, complexe et aromatique.',
    ingredients:
      '60ml rye whiskey, 10ml sirop simple, 3 traits Peychaud\'s bitters, absinthe, zeste de citron',
    instructions:
      'Rincer un verre old fashioned avec de l\'absinthe et jeter l\'excès. Dans un verre à mélange, combiner le whiskey, le sirop et les bitters avec de la glace. Remuer 30 secondes. Filtrer dans le verre préparé (sans glace). Exprimer un zeste de citron au-dessus du verre et jeter le zeste.',
  },
  {
    name: 'Corpse Reviver #2',
    description:
      'Cocktail matinal de l\'ère pré-prohibition conçu pour "raviver les morts" après une soirée.',
    ingredients:
      '25ml gin, 25ml Lillet Blanc, 25ml Cointreau, 25ml jus de citron frais, 1 trait d\'absinthe, cerise',
    instructions:
      'Remplir un shaker de glaçons. Ajouter tous les ingrédients. Shaker vigoureusement 15 secondes. Filtrer dans une coupe à cocktail refroidie. Garnir d\'une cerise ou d\'un zeste d\'orange. Attention: très rafraîchissant mais traître!',
  },
  {
    name: 'Bramble',
    description:
      'Cocktail britannique moderne des années 80, fruité avec des mûres et un équilibre parfait.',
    ingredients:
      '50ml gin, 25ml jus de citron frais, 15ml sirop simple, 15ml crème de mûre, mûres fraîches, citron',
    instructions:
      'Remplir un verre old fashioned de glace pilée. Ajouter le gin, le jus de citron et le sirop dans un shaker avec de la glace. Shaker et filtrer sur la glace pilée. Verser délicatement la crème de mûre sur le dessus. Garnir de mûres fraîches et d\'une rondelle de citron.',
  },
  {
    name: 'Pisco Sour',
    description:
      'Cocktail national du Pérou et du Chili, crémeux et acidulé avec sa mousse caractéristique.',
    ingredients:
      '60ml pisco, 30ml jus de citron vert frais, 20ml sirop simple, 1 blanc d\'œuf, angostura bitters',
    instructions:
      'Ajouter le pisco, le jus de citron, le sirop et le blanc d\'œuf dans un shaker sans glace. Dry shake vigoureusement 20 secondes. Ajouter de la glace et shaker à nouveau 15 secondes. Filtrer dans un verre à cocktail. Ajouter 3 traits d\'angostura bitters sur la mousse et créer un motif avec un pic.',
  },
  {
    name: 'Clover Club',
    description:
      'Cocktail pré-prohibition oublié puis redécouvert, rosé et élégant avec des framboises.',
    ingredients:
      '45ml gin, 15ml vermouth sec, 15ml sirop de framboise, 20ml jus de citron, 1 blanc d\'œuf, framboises',
    instructions:
      'Ajouter tous les ingrédients dans un shaker sans glace. Dry shake 15 secondes. Ajouter de la glace et shaker vigoureusement 15 secondes. Double filtrer dans une coupe à cocktail refroidie. Garnir de framboises fraîches sur un pic.',
  },
  {
    name: 'Singapore Sling',
    description:
      'Cocktail tropical complexe créé au Raffles Hotel de Singapour au début du 20ème siècle.',
    ingredients:
      '30ml gin, 15ml Cherry Heering, 7ml Cointreau, 7ml Bénédictine, 10ml grenadine, 120ml jus d\'ananas, 15ml jus de citron vert, angostura bitters',
    instructions:
      'Remplir un shaker de glaçons. Ajouter tous les ingrédients sauf les bitters. Shaker vigoureusement 15 secondes. Filtrer dans un verre hurricane rempli de glace fraîche. Ajouter un trait d\'angostura sur le dessus. Garnir d\'ananas et d\'une cerise.',
  },
  {
    name: 'Between the Sheets',
    description:
      'Cocktail sophistiqué de l\'entre-deux-guerres, équilibre parfait de spiritueux.',
    ingredients:
      '30ml cognac, 30ml rhum blanc, 30ml triple sec, 20ml jus de citron frais, zeste de citron',
    instructions:
      'Remplir un shaker de glaçons. Ajouter tous les ingrédients. Shaker vigoureusement 15 secondes. Filtrer dans une coupe à cocktail refroidie. Exprimer un zeste de citron au-dessus du verre et le déposer sur le bord.',
  },
  {
    name: 'Boulevardier',
    description:
      'La version bourbon du Negroni, créé par un expatrié américain à Paris dans les années 20.',
    ingredients:
      '45ml bourbon, 30ml Campari, 30ml vermouth rouge doux, zeste d\'orange',
    instructions:
      'Remplir un verre à mélange de glaçons. Ajouter le bourbon, le Campari et le vermouth. Remuer doucement pendant 30 secondes. Filtrer dans un verre à cocktail ou old fashioned avec un gros glaçon. Exprimer et garnir d\'un zeste d\'orange.',
  },
  {
    name: 'Last Word',
    description:
      'Cocktail de l\'ère de la prohibition redécouvert récemment, égalité parfaite de quatre ingrédients.',
    ingredients:
      '22ml gin, 22ml chartreuse verte, 22ml liqueur de marasquin, 22ml jus de citron vert frais',
    instructions:
      'Remplir un shaker de glaçons. Ajouter tous les ingrédients en parts égales. Shaker vigoureusement 15 secondes. Filtrer dans une coupe à cocktail refroidie. Ne nécessite pas de garniture car parfaitement équilibré.',
  },
  {
    name: 'Hemingway Daiquiri',
    description:
      'Version améliorée du daiquiri créée pour Ernest Hemingway, sans sucre mais avec du pamplemousse.',
    ingredients:
      '60ml rhum blanc, 15ml liqueur de marasquin, 25ml jus de citron vert, 25ml jus de pamplemousse',
    instructions:
      'Remplir un shaker de glaçons. Ajouter tous les ingrédients. Shaker vigoureusement 15 secondes. Filtrer dans une coupe à cocktail refroidie. Garnir d\'une rondelle de citron vert. Cocktail puissant et rafraîchissant, à déguster lentement.',
  },
]

const additionalCocktails = [
  {
    name: 'Irish Coffee',
    description:
      'Boisson chaude irlandaise réconfortante, parfaite pour les soirées d\'hiver.',
    ingredients:
      '45ml whiskey irlandais, 120ml café chaud fraîchement préparé, 30ml crème fraîche légèrement fouettée, 2 cuillères à café de sucre roux',
    instructions:
      'Préchauffer un verre à Irish coffee avec de l\'eau chaude. Vider et ajouter le sucre et le whiskey. Verser le café chaud et remuer pour dissoudre le sucre. Verser délicatement la crème légèrement fouettée sur le dos d\'une cuillère pour qu\'elle flotte. Ne pas remuer, boire à travers la crème.',
  },
  {
    name: 'Long Island Iced Tea',
    description:
      'Cocktail puissant et trompeur qui ressemble à du thé glacé mais contient 5 alcools différents.',
    ingredients:
      '15ml vodka, 15ml rhum blanc, 15ml gin, 15ml tequila, 15ml triple sec, 25ml jus de citron, 20ml sirop, Cola, citron',
    instructions:
      'Remplir un shaker de glaçons. Ajouter tous les alcools, le jus de citron et le sirop. Shaker vigoureusement. Filtrer dans un verre Collins rempli de glace fraîche. Compléter avec du Cola jusqu\'au bord. Remuer doucement. Garnir d\'un quartier de citron.',
  },
  {
    name: 'Vieux Carré',
    description:
      'Cocktail classique de La Nouvelle-Orléans nommé d\'après le quartier français.',
    ingredients:
      '30ml rye whiskey, 30ml cognac, 30ml vermouth rouge doux, 1 cuillère à café de Bénédictine, 2 traits Peychaud\'s bitters, 2 traits Angostura bitters',
    instructions:
      'Remplir un verre à mélange de glaçons. Ajouter tous les ingrédients. Remuer pendant 30 secondes. Filtrer dans un verre old fashioned avec un gros glaçon. Exprimer un zeste de citron au-dessus et le déposer dans le verre.',
  },
  {
    name: 'Painkiller',
    description:
      'Cocktail tropical des îles Vierges britanniques, cousin du Piña Colada avec du rhum noir.',
    ingredients:
      '60ml rhum noir, 120ml jus d\'ananas, 30ml jus d\'orange, 30ml crème de coco, noix de muscade, ananas et orange',
    instructions:
      'Remplir un shaker de glaçons. Ajouter le rhum, les jus et la crème de coco. Shaker vigoureusement 15 secondes. Filtrer dans un verre hurricane rempli de glace pilée. Râper généreusement de la noix de muscade fraîche sur le dessus. Garnir d\'ananas et d\'orange.',
  },
  {
    name: 'Zombie',
    description:
      'Le cocktail tiki le plus puissant, créé pour ne jamais en servir plus de deux à un client.',
    ingredients:
      '45ml rhum blanc, 45ml rhum ambré, 30ml rhum overproof, 20ml jus de citron vert, 15ml jus de pamplemousse, 10ml grenadine, 10ml sirop orgeat, angostura bitters',
    instructions:
      'Remplir un shaker de glaçons. Ajouter tous les ingrédients sauf le rhum overproof. Shaker vigoureusement. Filtrer dans un verre tiki rempli de glace pilée. Float le rhum overproof sur le dessus. Ajouter un trait d\'angostura. Garnir généreusement de fruits et de menthe.',
  },
  {
    name: 'Ramos Gin Fizz',
    description:
      'Cocktail crémeux et complexe de La Nouvelle-Orléans nécessitant un long shake.',
    ingredients:
      '60ml gin, 15ml jus de citron, 15ml jus de citron vert, 30ml crème, 1 blanc d\'œuf, 20ml sirop, 3 gouttes d\'eau de fleur d\'oranger, eau gazeuse',
    instructions:
      'Ajouter tous les ingrédients sauf l\'eau gazeuse dans un shaker sans glace. Dry shake vigoureusement 1 minute. Ajouter de la glace et shaker encore 1-2 minutes. Filtrer dans un verre Collins sans glace. Laisser reposer puis compléter délicatement avec l\'eau gazeuse.',
  },
  {
    name: 'Tequila Sunrise',
    description:
      'Cocktail visuel spectaculaire des années 70, populaire grâce aux Rolling Stones.',
    ingredients:
      '60ml tequila blanco, 120ml jus d\'orange frais, 15ml grenadine, orange et cerise',
    instructions:
      'Remplir un verre hurricane de glaçons. Verser la tequila et le jus d\'orange. Remuer. Verser lentement la grenadine le long du bord du verre pour créer l\'effet lever de soleil. Ne pas remuer. Garnir d\'une demi-rondelle d\'orange et d\'une cerise.',
  },
  {
    name: 'Bee\'s Knees',
    description:
      'Cocktail de l\'ère de la prohibition, expression des années 20 signifiant "excellent".',
    ingredients:
      '60ml gin, 20ml miel liquide, 20ml jus de citron frais, zeste de citron',
    instructions:
      'Diluer le miel avec un peu d\'eau chaude pour créer un sirop de miel. Remplir un shaker de glaçons. Ajouter le gin, le sirop de miel et le jus de citron. Shaker vigoureusement 15 secondes. Filtrer dans une coupe à cocktail refroidie. Garnir d\'un zeste de citron.',
  },
  {
    name: 'Suffering Bastard',
    description:
      'Cocktail égyptien créé comme remède contre la gueule de bois au Shepheard\'s Hotel du Caire.',
    ingredients:
      '30ml gin, 30ml brandy, 15ml jus de citron vert, 2 traits angostura bitters, ginger beer, menthe et concombre',
    instructions:
      'Remplir un shaker de glaçons. Ajouter le gin, le brandy, le jus de citron et les bitters. Shaker. Filtrer dans un verre Collins rempli de glace. Compléter avec la ginger beer. Garnir d\'une branche de menthe et d\'une tranche de concombre.',
  },
  {
    name: 'Southside',
    description:
      'Mojito au gin de Chicago, favori des gangsters pendant la prohibition.',
    ingredients:
      '60ml gin, 25ml jus de citron frais, 20ml sirop simple, 8 feuilles de menthe fraîche',
    instructions:
      'Piler doucement les feuilles de menthe dans un shaker. Ajouter le gin, le jus de citron et le sirop avec de la glace. Shaker vigoureusement 15 secondes. Double filtrer dans une coupe à cocktail refroidie. Garnir d\'une belle feuille de menthe.',
  },
]

async function seedUsers() {
  console.log('👥 Seeding users...')

  const usersToCreate = []

  usersToCreate.push({
    username: 'admin',
    email: 'admin@shakederoy.com',
    password: await hash('AdminPassword123!'),
    role: 'admin' as const,
    profile_pic: faker.image.avatar(),
  })

  for (let i = 0; i < ADMIN_COUNT - 1; i++) {
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    usersToCreate.push({
      username: faker.internet
        .username({ firstName, lastName })
        .toLowerCase(),
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      password: await hash('AdminPass123!'),
      role: 'admin' as const,
      profile_pic: faker.image.avatar(),
    })
  }

  for (let i = 0; i < USERS_COUNT - ADMIN_COUNT - 1; i++) {
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    usersToCreate.push({
      username: faker.internet
        .username({ firstName, lastName })
        .toLowerCase(),
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      password: await hash('UserPassword123!'),
      role: 'user' as const,
      profile_pic: Math.random() > 0.3 ? faker.image.avatar() : null,
    })
  }

  const insertedUsers = await db
    .insertInto('users')
    .values(usersToCreate)
    .returningAll()
    .execute()

  console.log(`Created ${insertedUsers.length} users`)
  console.log(`   - ${ADMIN_COUNT} admins`)
  console.log(`   - ${USERS_COUNT - ADMIN_COUNT} regular users`)
  console.log('\nAdmin credentials:')
  console.log('   Username: admin')
  console.log('   Email: admin@shakederoy.com')
  console.log('   Password: AdminPassword123!')

  return insertedUsers
}

async function seedCocktails() {
  console.log('\nSeeding cocktails...')

  const cocktailsToCreate = []

  for (const cocktail of cocktailsData) {
    cocktailsToCreate.push({
      name: cocktail.name,
      description: cocktail.description,
      ingredients: cocktail.ingredients,
      instructions: cocktail.instructions,
      image: null,
    })
  }

  for (const cocktail of additionalCocktails) {
    cocktailsToCreate.push({
      name: cocktail.name,
      description: cocktail.description,
      ingredients: cocktail.ingredients,
      instructions: cocktail.instructions,
      image: null,
    })
  }

  const remainingCount = COCKTAILS_COUNT - cocktailsToCreate.length
  const baseSpirits = ['Vodka', 'Gin', 'Rhum', 'Tequila', 'Whiskey', 'Cognac']
  const flavors = [
    'Fraise',
    'Mangue',
    'Passion',
    'Citron',
    'Framboise',
    'Pêche',
    'Coco',
    'Menthe',
    'Basilic',
    'Gingembre',
  ]
  const styles = [
    'Fizz',
    'Sour',
    'Punch',
    'Smash',
    'Cooler',
    'Collins',
    'Rickey',
    'Flip',
  ]

  for (let i = 0; i < remainingCount; i++) {
    const spirit = faker.helpers.arrayElement(baseSpirits)
    const flavor = faker.helpers.arrayElement(flavors)
    const style = faker.helpers.arrayElement(styles)
    const name = `${flavor} ${spirit} ${style}`

    cocktailsToCreate.push({
      name: name,
      description: faker.lorem.sentence({ min: 15, max: 25 }),
      ingredients: [
        `${faker.number.int({ min: 30, max: 60 })}ml ${spirit.toLowerCase()}`,
        `${faker.number.int({ min: 15, max: 30 })}ml jus de ${flavor.toLowerCase()}`,
        `${faker.number.int({ min: 10, max: 20 })}ml sirop simple`,
        `${faker.number.int({ min: 15, max: 25 })}ml jus de citron`,
        faker.helpers.arrayElement([
          'eau gazeuse',
          'soda',
          'tonic',
          'ginger beer',
        ]),
        'glace',
        faker.helpers.arrayElement([
          'menthe fraîche',
          'zeste de citron',
          'fruit frais',
          'cerise',
        ]),
      ].join(', '),
      instructions: [
        'Remplir un shaker de glaçons.',
        `Ajouter le ${spirit.toLowerCase()}, le jus de ${flavor.toLowerCase()}, le sirop et le jus de citron.`,
        'Shaker vigoureusement pendant 15 secondes.',
        `Filtrer dans un verre ${faker.helpers.arrayElement(['highball', 'old fashioned', 'à cocktail', 'Collins'])} rempli de glace fraîche.`,
        'Compléter avec le soda.',
        'Garnir selon les préférences.',
      ].join(' '),
      image: null,
    })
  }

  const insertedCocktails = await db
    .insertInto('cocktails')
    .values(cocktailsToCreate)
    .returningAll()
    .execute()

  console.log(`Created ${insertedCocktails.length} cocktails`)
  console.log(
    `   - ${cocktailsData.length + additionalCocktails.length} classic cocktails`
  )
  console.log(
    `   - ${remainingCount} generated variations and modern cocktails`
  )

  return insertedCocktails
}

async function seed() {
  try {
    console.log('🌱 Starting database seeding...\n')
    console.log('=' .repeat(60))

    const existingUsers = await db
      .selectFrom('users')
      .select('id')
      .limit(1)
      .execute()

    if (existingUsers.length > 0) {
      console.log(
        '\n⚠️  Database already contains data. Do you want to continue?'
      )
      console.log(
        '   This will add more data to your existing database.\n'
      )
    }

    const users = await seedUsers()

    const cocktails = await seedCocktails()

    console.log('\n' + '='.repeat(60))
    console.log('🎉 Seeding completed successfully!')
    console.log('=' .repeat(60))
    console.log('\n📊 Summary:')
    console.log(`   Total users: ${users.length}`)
    console.log(`   Total cocktails: ${cocktails.length}`)
    console.log('\n💡 Next steps:')
    console.log('   1. Start your server: pnpm dev')
    console.log('   2. Test the API endpoints')
    console.log(
      '   3. Login with admin credentials to access admin features'
    )
    console.log('\n')
  } catch (error) {
    console.error('\n❌ Seeding failed:')
    console.error(error)
    process.exit(1)
  } finally {
    await db.destroy()
  }
}

seed()
