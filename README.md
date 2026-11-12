# Zen Pin To

Mod Sine pour Zen Browser. **Option+Maj+P** ouvre une palette qui range l'onglet courant :

- dans un dossier, avec son arborescence (« EN COURS › CLIENT ») et une puce à la couleur de son espace ;
- ou dans un autre espace (lignes « Espace … »).

Tapez plusieurs mots pour filtrer (« pro airbnb »), puis Entrée. L'onglet est épinglé s'il ne l'était pas. Les dossiers de l'espace courant apparaissent en premier.

Réglage en haut de `pin-to.uc.js` : `FOLLOW = true` fait suivre l'onglet quand il change d'espace. Passez à `false` pour rester où vous êtes.

## Installation

1. Installer Sine : https://github.com/CosmoCreeper/Sine/releases/latest
2. Dans Zen : Settings > Sine Mods > Settings, cocher « Enable installing JS from unofficial sources ».
3. Mettre ces fichiers (`theme.json`, `pin-to.uc.js`) à la racine d'un dépôt GitHub public.
4. Settings > Sine Mods, champ « username/repo », taper `votre-compte/zen-pin-to`, puis Install.
5. Redémarrer Zen.
