import React, { useEffect, useState } from 'react';
import * as Lucide from 'lucide-react';
import { Volume2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { IconType } from 'react-icons';

/*
 * Requiere: npm i react-icons
 *
 * - Lucide: TODOS los iconos (carga sincrónica, mismos nombres que antes: 'Sword', 'Wand2', etc.)
 * - Game Icons (react-icons/gi): ~4000 iconos de fantasía/RPG, carga lazy.
 *   Sus nombres empiezan con "Gi" (ej: 'GiCrossedSwords'), así que no chocan con Lucide
 *   y lo que ya tengas guardado sigue funcionando.
 */

export interface IconEntry {
  name: string;
  label: string;
}

export interface IconCategoryGroup {
  name: string;
  icons: IconEntry[];
}

/* ------------------------------------------------------------------ */
/* Categorías curadas (las originales, para Lucide)                    */
/* ------------------------------------------------------------------ */

export const ICON_CATEGORIES: IconCategoryGroup[] = [
  {
    name: 'Combat & Weapons',
    icons: [
      { name: 'Sword', label: 'Sword' },
      { name: 'Swords', label: 'Dual Swords' },
      { name: 'Axe', label: 'Battleaxe' },
      { name: 'Hammer', label: 'Warhammer' },
      { name: 'Shield', label: 'Shield' },
      { name: 'ShieldAlert', label: 'Defend / Block' },
      { name: 'ShieldCheck', label: 'Armor Protection' },
      { name: 'Crosshair', label: 'Archery / Aim' },
      { name: 'Target', label: 'Bullseye' },
      { name: 'Bomb', label: 'Explosion / Bomb' },
      { name: 'Skull', label: 'Death / Critical' },
      { name: 'Bone', label: 'Bone / Skeleton' },
    ],
  },
  {
    name: 'Magic & Spells',
    icons: [
      { name: 'Wand2', label: 'Magic Wand' },
      { name: 'Sparkles', label: 'Arcane Magic' },
      { name: 'Zap', label: 'Lightning Spell' },
      { name: 'Flame', label: 'Fireball / Fire' },
      { name: 'FlameKindling', label: 'Campfire Magic' },
      { name: 'Ghost', label: 'Illusion / Spirit' },
      { name: 'Eye', label: 'Divination / Perception' },
      { name: 'Moon', label: 'Lunar / Darkness' },
      { name: 'Sun', label: 'Radiant / Dawn' },
      { name: 'Gem', label: 'Spell Gem' },
      { name: 'Scroll', label: 'Spell Scroll' },
      { name: 'BookOpen', label: 'Grimoire' },
    ],
  },
  {
    name: 'Ambience & Nature',
    icons: [
      { name: 'CloudRain', label: 'Rain / Storm' },
      { name: 'CloudLightning', label: 'Thunder' },
      { name: 'CloudSnow', label: 'Blizzard / Ice' },
      { name: 'Wind', label: 'Howling Wind' },
      { name: 'Waves', label: 'Ocean Waves' },
      { name: 'Droplets', label: 'Water Drips' },
      { name: 'Trees', label: 'Forest / Woods' },
      { name: 'Mountain', label: 'Mountain / Cave' },
      { name: 'Tent', label: 'Campsite' },
      { name: 'Compass', label: 'Wilderness' },
      { name: 'MapPin', label: 'Dungeon Room' },
    ],
  },
  {
    name: 'Tavern & Adventure',
    icons: [
      { name: 'Beer', label: 'Ale / Tavern' },
      { name: 'Wine', label: 'Banquet' },
      { name: 'Utensils', label: 'Feast' },
      { name: 'Dices', label: 'Dice Roll' },
      { name: 'Coins', label: 'Gold / Loot' },
      { name: 'Crown', label: 'Royalty / King' },
      { name: 'Key', label: 'Key / Chest' },
      { name: 'Lock', label: 'Locked Door' },
      { name: 'Unlock', label: 'Lockpick' },
      { name: 'DoorOpen', label: 'Creaky Door' },
      { name: 'Footprints', label: 'Sneak / Stealth' },
      { name: 'Bell', label: 'Alarm Bell' },
      { name: 'Hourglass', label: 'Time Running Out' },
      { name: 'Clock', label: 'Church Bells' },
    ],
  },
  {
    name: 'Monsters & Danger',
    icons: [
      { name: 'Bug', label: 'Spider / Swarm' },
      { name: 'Rat', label: 'Dungeon Rat' },
      { name: 'Cat', label: 'Beast / Feline' },
      { name: 'Bird', label: 'Raven / Griffin' },
      { name: 'Fish', label: 'Sea Monster' },
      { name: 'AlertTriangle', label: 'Trap / Danger' },
      { name: 'Biohazard', label: 'Poison / Acid' },
      { name: 'HeartPulse', label: 'Heartbeat / Tension' },
      { name: 'Activity', label: 'Combat Pulse' },
    ],
  },
  {
    name: 'Music & Audio',
    icons: [
      { name: 'Music', label: 'BGM / Melody' },
      { name: 'AudioLines', label: 'Sound Waves' },
      { name: 'Volume2', label: 'SFX' },
      { name: 'Disc', label: 'Lute / Bard Song' },
      { name: 'Radio', label: 'Broadcast' },
      { name: 'Feather', label: 'Gentle Melody' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Lucide: todos los iconos                                            */
/* ------------------------------------------------------------------ */

// Filtra los exports que no son iconos (createLucideIcon, aliases "XxxIcon", "LucideXxx", etc.)
export const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  Object.entries(Lucide).filter(
    ([key, value]) =>
      /^[A-Z]/.test(key) &&
      !/Icon$/.test(key) &&
      !key.startsWith('Lucide') &&
      (typeof value === 'object' || typeof value === 'function')
  )
) as Record<string, LucideIcon>;

/** "CloudLightning" -> "Cloud Lightning"; "GiCrossedSwords" -> "Crossed Swords" */
export const prettyLabel = (name: string): string =>
  name
    .replace(/^Gi(?=[A-Z])/, '')
    .replace(/([a-z])([A-Z0-9])/g, '$1 $2')
    .replace(/([0-9])([A-Z])/g, '$1 $2');

let lucideCatalog: IconEntry[] | null = null;
/** Lista de TODOS los iconos de Lucide (nombre + label), ordenada alfabéticamente. */
export const getLucideCatalog = (): IconEntry[] => {
  if (!lucideCatalog) {
    lucideCatalog = Object.keys(ICON_MAP)
      .sort()
      .map((name) => ({ name, label: prettyLabel(name) }));
  }
  return lucideCatalog;
};

/* ------------------------------------------------------------------ */
/* Game Icons (react-icons/gi): carga lazy                             */
/* ------------------------------------------------------------------ */

type GiRecord = Record<string, IconType>;

let giCache: GiRecord | null = null;
let giPromise: Promise<GiRecord> | null = null;

export const loadGiIcons = (): Promise<GiRecord> => {
  if (giCache) return Promise.resolve(giCache);
  if (!giPromise) {
    giPromise = import('react-icons/gi').then((mod) => {
      const { default: _ignored, ...rest } = mod as unknown as Record<string, unknown>;
      giCache = rest as GiRecord;
      return giCache;
    });
  }
  return giPromise;
};

/** Devuelve el set de Game Icons (null mientras carga). Con enabled=false no dispara la carga. */
export const useGiIcons = (enabled = true): GiRecord | null => {
  const [gi, setGi] = useState<GiRecord | null>(giCache);
  useEffect(() => {
    if (giCache) {
      setGi(giCache);
      return;
    }
    if (!enabled) return;
    let alive = true;
    loadGiIcons().then((icons) => alive && setGi(icons));
    return () => {
      alive = false;
    };
  }, [enabled]);
  return gi;
};

/** Lista de TODOS los Game Icons. Pasale el resultado de useGiIcons(). */
export const getGiCatalog = (gi: GiRecord | null): IconEntry[] =>
  gi
    ? Object.keys(gi)
        .filter((k) => /^Gi[A-Z0-9]/.test(k))
        .sort()
        .map((name) => ({ name, label: prettyLabel(name) }))
    : [];

// Categorías curadas de Game Icons. Los nombres que no existan en tu versión se descartan solos.
const GI_CATEGORY_NAMES: Record<string, string[]> = {
  'RPG · Combate': [
    'GiCrossedSwords', 'GiBroadsword', 'GiBattleAxe', 'GiMaceHead', 'GiDaggers', 'GiCrossbow',
    'GiBowman', 'GiShield', 'GiCheckedShield', 'GiArrowhead', 'GiSpearHook', 'GiAxeSword',
    'GiPunch', 'GiSkullCrossedBones', 'GiBloodySword', 'GiHeavyArrow',
  ],
  'RPG · Magia': [
    'GiMagicSwirl', 'GiMagicPortal', 'GiFireBowl', 'GiFireball', 'GiLightningTrio', 'GiSpellBook',
    'GiWizardStaff', 'GiCrystalBall', 'GiPotionBall', 'GiPentacle', 'GiRuneStone', 'GiMagicLamp',
    'GiHolySymbol', 'GiAngelWings', 'GiBurningSkull', 'GiIceBolt',
  ],
  'RPG · Monstruos': [
    'GiDragonHead', 'GiDragonBreath', 'GiSkeleton', 'GiZombieHand', 'GiGhost', 'GiWolfHowl',
    'GiSpiderWeb', 'GiGoblinHead', 'GiOrcHead', 'GiDevilMask', 'GiCrow', 'GiBatWing',
    'GiTrollHead', 'GiVampireDracula', 'GiWerewolf', 'GiKraken', 'GiGriffinSymbol', 'GiSlime',
  ],
  'RPG · Taberna y aventura': [
    'GiTavern', 'GiBeerStein', 'GiWineGlass', 'GiMeat', 'GiTreasureMap', 'GiOpenChest',
    'GiCoinsPile', 'GiLockpicks', 'GiDoor', 'GiBellShape', 'GiCampfire', 'GiRollingDices',
    'GiCastle', 'GiCrown', 'GiKeyring', 'GiScrollUnfurled',
  ],
  'RPG · Ambiente': [
    'GiStormy', 'GiThunderSkull', 'GiSnowflake1', 'GiWaveCrest', 'GiForest', 'GiCaveEntrance',
    'GiWaterDrop', 'GiBigWave', 'GiTornado', 'GiVolcano', 'GiNightSky', 'GiDesert', 'GiSwamp',
    'GiFootsteps', 'GiRiver', 'GiHeartBeats',
  ],
  'RPG · Música': [
    'GiLyre', 'GiFlute', 'GiDrum', 'GiTrumpet', 'GiHarp', 'GiViolin', 'GiMusicalNotes',
    'GiBugleCall', 'GiHorn', 'GiBanjo', 'GiTambourine',
  ],
};

export const getGiCategories = (gi: GiRecord | null): IconCategoryGroup[] =>
  gi
    ? Object.entries(GI_CATEGORY_NAMES)
        .map(([name, names]) => ({
          name,
          icons: names.filter((n) => gi[n]).map((n) => ({ name: n, label: prettyLabel(n) })),
        }))
        .filter((c) => c.icons.length > 0)
    : [];

/* ------------------------------------------------------------------ */
/* Búsqueda sobre todo el catálogo                                     */
/* ------------------------------------------------------------------ */

/**
 * Busca en Lucide + Game Icons (si ya cargaron). Devuelve máx `limit` resultados
 * para no renderizar miles de iconos de golpe.
 */
export const searchIcons = (query: string, gi: GiRecord | null, limit = 200): IconEntry[] => {
  const q = query.trim().toLowerCase().replace(/\s+/g, '');
  if (!q) return [];
  const all = [...getLucideCatalog(), ...getGiCatalog(gi)];
  return all
    .filter((i) => i.name.toLowerCase().includes(q) || i.label.toLowerCase().replace(/\s+/g, '').includes(q))
    .slice(0, limit);
};

/* ------------------------------------------------------------------ */
/* Componente                                                          */
/* ------------------------------------------------------------------ */

interface SoundIconProps {
  name: string;
  className?: string;
  size?: number;
}

export const SoundIcon: React.FC<SoundIconProps> = ({ name, className = 'w-5 h-5', size }) => {
  const isGi = name.startsWith('Gi');
  const gi = useGiIcons(isGi);

  if (isGi) {
    const GiIcon = gi?.[name];
    if (GiIcon) return <GiIcon className={className} size={size} />;
    // mientras carga (o si no existe) mostramos el fallback
    return <Volume2 className={className} size={size} />;
  }

  const IconComponent = ICON_MAP[name] || Volume2;
  return <IconComponent className={className} size={size} />;
};
