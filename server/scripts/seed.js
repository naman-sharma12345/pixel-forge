import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import crypto from 'crypto';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import slugify from 'slugify';
import dotenv from 'dotenv';

dotenv.config();

import { encodePNG, scaleNearest } from './lib/png.js';
import pixelart from './lib/pixelart.js';
import wav from './lib/wav.js';
import obj from './lib/obj.js';

// Try loading models and helpers from project layout, with safe fallbacks
let User, Asset, Review, Cart, Order, Purchase;
let connectDBFunc, saveFileFunc, recalcAssetRatingFunc;

try {
  const userMod = await import('../src/models/User.js');
  User = userMod.User || userMod.default;
} catch {
  User = mongoose.models.User;
}

try {
  const assetMod = await import('../src/models/Asset.js');
  Asset = assetMod.Asset || assetMod.default;
} catch {
  Asset = mongoose.models.Asset;
}

try {
  const reviewMod = await import('../src/models/Review.js');
  Review = reviewMod.Review || reviewMod.default;
} catch {
  Review = mongoose.models.Review;
}

try {
  const cartMod = await import('../src/models/Cart.js');
  Cart = cartMod.Cart || cartMod.default;
} catch {
  Cart = mongoose.models.Cart;
}

try {
  const orderMod = await import('../src/models/Order.js');
  Order = orderMod.Order || orderMod.default;
} catch {
  Order = mongoose.models.Order;
}

try {
  const purchaseMod = await import('../src/models/Purchase.js');
  Purchase = purchaseMod.Purchase || purchaseMod.default;
} catch {
  Purchase = mongoose.models.Purchase;
}

try {
  const dbMod = await import('../src/config/db.js');
  connectDBFunc = dbMod.connectDB || dbMod.default;
} catch {
  connectDBFunc = async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pixelforge';
    return mongoose.connect(uri);
  };
}

try {
  const storageMod = await import('../src/utils/storage.js');
  saveFileFunc = storageMod.saveFile;
} catch {
  saveFileFunc = null;
}

try {
  const reviewsServiceMod = await import('../src/modules/reviews/reviews.service.js');
  recalcAssetRatingFunc = reviewsServiceMod.recalcAssetRating;
} catch {
  recalcAssetRatingFunc = null;
}

// Local saveFile implementation conforming exactly to Section 5
const saveFile = async (buffer, { folder, visibility = 'public', originalName, mimeType }) => {
  if (typeof saveFileFunc === 'function') {
    return saveFileFunc(buffer, { folder, visibility, originalName, mimeType });
  }

  const ext = path.extname(originalName) || (mimeType === 'image/png' ? '.png' : mimeType === 'audio/wav' ? '.wav' : '.bin');
  const base = path.basename(originalName, ext);
  const slug = slugify(base, { lower: true, strict: true }) || 'file';
  const key = `${folder}/${Date.now()}-${nanoid(8)}-${slug}${ext}`;

  const uploadDir = process.env.UPLOAD_DIR || 'uploads';
  const targetDir = path.resolve(process.cwd(), `${uploadDir}/${visibility}/${folder}`);
  fs.mkdirSync(targetDir, { recursive: true });

  const filePath = path.resolve(process.cwd(), `${uploadDir}/${visibility}/${key}`);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);

  const serverUrl = process.env.SERVER_URL || 'http://localhost:5000';
  const url = visibility === 'public' ? `${serverUrl}/uploads/${key}` : '';
  const format = ext.replace('.', '').toLowerCase();

  return {
    url,
    key,
    format,
    mimeType,
    bytes: buffer.length,
  };
};

const ensureUploadDirs = (clean = false) => {
  const uploadDir = process.env.UPLOAD_DIR || 'uploads';
  const dirs = [
    `${uploadDir}/public/avatars`,
    `${uploadDir}/public/thumbnails`,
    `${uploadDir}/public/previews`,
    `${uploadDir}/private/files`,
  ];

  for (const dir of dirs) {
    const resolved = path.resolve(process.cwd(), dir);
    if (clean && fs.existsSync(resolved)) {
      const files = fs.readdirSync(resolved);
      for (const file of files) {
        const fullPath = path.join(resolved, file);
        if (fs.statSync(fullPath).isFile()) {
          fs.unlinkSync(fullPath);
        }
      }
    }
    fs.mkdirSync(resolved, { recursive: true });
  }
};

const runPool = async (items, limit, fn) => {
  const results = [];
  let index = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i], i, items.length);
    }
  });
  await Promise.all(workers);
  return results;
};

// Main Seed Function
async function seed() {
  const args = process.argv.slice(2);
  const isReset = args.includes('--reset');
  const isForce = args.includes('--force');

  if (process.env.NODE_ENV === 'production' && !isForce) {
    console.error('Refusing to seed in production without --force');
    process.exit(1);
  }

  console.log('Connecting to database...');
  await connectDBFunc();
  console.log('Database connected.');

  ensureUploadDirs(isReset);

  if (isReset) {
    console.log('Resetting all database collections...');
    await Promise.all([
      User?.deleteMany({}),
      Asset?.deleteMany({}),
      Review?.deleteMany({}),
      Cart?.deleteMany({}),
      Order?.deleteMany({}),
      Purchase?.deleteMany({}),
    ]);
    console.log('Collections emptied.');
  }

  // 1. Users
  console.log('Seeding users...');
  const passwordHash = typeof User.hashPassword === 'function'
    ? await User.hashPassword('Password123')
    : await bcrypt.hash('Password123', 10);

  // Admin
  const adminUser = await User.create({
    name: 'Admin',
    username: 'admin',
    email: 'admin@pixelforge.dev',
    passwordHash,
    role: 'admin',
  });

  // Creators
  const creatorProfiles = [
    { username: 'pixelpip', name: 'Pixel Pip', bio: 'Sprite artist & dungeon crawler designer' },
    { username: 'retrorogue', name: 'Retro Rogue', bio: '8-bit fantasy characters & monster sprites' },
    { username: 'chiptunechris', name: 'Chiptune Chris', bio: 'Chiptune composer & retro arcade SFX wizard' },
    { username: 'tilesmith', name: 'Tile Smith', bio: 'Modular tileset architect & biome builder' },
    { username: 'voxelvera', name: 'Voxel Vera', bio: 'Low-poly 3D modeler & environment props' },
    { username: 'neonnomad', name: 'Neon Nomad', bio: 'Cyberpunk UI kits & neon VFX animations' },
  ];

  const creators = [];
  for (const c of creatorProfiles) {
    const avatarPng = pixelart.spriteCharacter(c.username);
    const uploadedAvatar = await saveFile(avatarPng, {
      folder: 'avatars',
      visibility: 'public',
      originalName: `${c.username}-avatar.png`,
      mimeType: 'image/png',
    });

    const user = await User.create({
      name: c.name,
      username: c.username,
      email: `${c.username}@pixelforge.dev`,
      passwordHash,
      role: 'creator',
      avatarUrl: uploadedAvatar.url,
      avatarKey: uploadedAvatar.key,
      bio: c.bio,
    });
    creators.push(user);
  }

  // Buyers
  const buyerNames = [
    'gamedev_alex', 'indie_maya', 'samurai_sam', 'lunar_lucas',
    'pixel_priya', 'retro_ravi', 'cyber_chloe', 'arcade_aaron',
  ];
  const buyers = [];
  for (const b of buyerNames) {
    const user = await User.create({
      name: b.split('_').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
      username: b,
      email: `${b}@pixelforge.dev`,
      passwordHash,
      role: 'buyer',
    });
    buyers.push(user);
  }

  console.log(`Created 1 admin, ${creators.length} creators, and ${buyers.length} buyers.`);

  // 2. Assets (48 total spread across 10 categories)
  console.log('Generating 48 procedural assets with files...');
  const assetBlueprints = [
    // sprites (5)
    { cat: 'sprites', creatorIdx: 0, title: 'Dungeon Crawl Item Icons 16x16', price: 99, free: false, license: 'standard', tags: ['pixel', '16x16', 'rpg', 'items', 'dungeon'] },
    { cat: 'sprites', creatorIdx: 1, title: 'Retro Monsters Sprite Pack', price: 149, free: false, license: 'standard', tags: ['monsters', 'sprites', 'retro', '8-bit'] },
    { cat: 'sprites', creatorIdx: 0, title: 'Classic RPG Weapons & Shields', price: 0, free: true, license: 'cc0', tags: ['weapons', 'shields', 'free', 'pixel', 'rpg'] },
    { cat: 'sprites', creatorIdx: 1, title: 'Cyberpunk Drone & Bot Sprites', price: 199, free: false, license: 'extended', tags: ['cyberpunk', 'bots', 'scifi', 'sprites'] },
    { cat: 'sprites', creatorIdx: 0, title: 'Farm Harvest & Crops Pack', price: 49, free: false, license: 'standard', tags: ['farming', 'pixel', 'crops', 'sim'] },

    // tilesets (5)
    { cat: 'tilesets', creatorIdx: 3, title: 'Forest Overworld Tileset 16x16', price: 299, free: false, license: 'standard', tags: ['tileset', 'forest', '16x16', 'overworld'] },
    { cat: 'tilesets', creatorIdx: 3, title: 'Deep Dungeon Stone Wall Tiles', price: 199, free: false, license: 'standard', tags: ['dungeon', 'stone', 'tileset', 'pixel'] },
    { cat: 'tilesets', creatorIdx: 3, title: 'Basic Village & Dirt Path Tiles', price: 0, free: true, license: 'cc0', tags: ['village', 'free', 'tileset', 'starter'] },
    { cat: 'tilesets', creatorIdx: 3, title: 'Ancient Desert Ruin Biome', price: 249, free: false, license: 'extended', tags: ['desert', 'ruins', 'biome', 'tileset'] },
    { cat: 'tilesets', creatorIdx: 3, title: 'Floating Sky Kingdom Platform Tiles', price: 349, free: false, license: 'standard', tags: ['sky', 'platformer', 'tileset', 'fantasy'] },

    // characters (5)
    { cat: 'characters', creatorIdx: 1, title: 'Hero Knight Animated Spritesheet', price: 199, free: false, license: 'standard', tags: ['character', 'hero', 'knight', 'animated'] },
    { cat: 'characters', creatorIdx: 1, title: 'Shadow Ninja Warrior Character', price: 249, free: false, license: 'extended', tags: ['ninja', 'character', 'warrior', 'shadow'] },
    { cat: 'characters', creatorIdx: 0, title: 'Rookie Slime & Goblin Mob Pack', price: 0, free: true, license: 'cc0', tags: ['monsters', 'slime', 'goblin', 'free'] },
    { cat: 'characters', creatorIdx: 0, title: 'Elven Archer & Ranger Set', price: 149, free: false, license: 'standard', tags: ['archer', 'ranger', 'elf', 'fantasy'] },
    { cat: 'characters', creatorIdx: 1, title: 'Cyber Mercenary Combat Rig', price: 299, free: false, license: 'standard', tags: ['cyberpunk', 'mercenary', 'character', 'scifi'] },

    // ui (5)
    { cat: 'ui', creatorIdx: 5, title: 'Neon HUD & Cyberpunk Dialog Box', price: 149, free: false, license: 'standard', tags: ['ui', 'hud', 'cyberpunk', 'neon'] },
    { cat: 'ui', creatorIdx: 5, title: 'Classic Fantasy RPG Menu Panels', price: 199, free: false, license: 'extended', tags: ['ui', 'rpg', 'menu', 'panels', 'pixel'] },
    { cat: 'ui', creatorIdx: 5, title: 'Minimalist Health & Mana Bar Kit', price: 0, free: true, license: 'cc0', tags: ['bars', 'health', 'mana', 'ui', 'free'] },
    { cat: 'ui', creatorIdx: 5, title: 'Arcade Scoreboard & Button Prompts', price: 99, free: false, license: 'standard', tags: ['arcade', 'buttons', 'scoreboard', 'ui'] },
    { cat: 'ui', creatorIdx: 5, title: 'Dark Gothic Inventory & Tooltip Frames', price: 249, free: false, license: 'standard', tags: ['inventory', 'gothic', 'tooltip', 'ui'] },

    // backgrounds (5)
    { cat: 'backgrounds', creatorIdx: 3, title: 'Parallax Mountain Sunset Horizon', price: 199, free: false, license: 'standard', tags: ['background', 'parallax', 'mountain', 'sunset'] },
    { cat: 'backgrounds', creatorIdx: 3, title: 'Cyber City Skylines at Night', price: 299, free: false, license: 'extended', tags: ['cyberpunk', 'city', 'night', 'background'] },
    { cat: 'backgrounds', creatorIdx: 3, title: 'Starry Cosmic Nebula Skybox', price: 0, free: true, license: 'cc0', tags: ['space', 'nebula', 'stars', 'free'] },
    { cat: 'backgrounds', creatorIdx: 3, title: 'Mystic Forest Canopy Parallax', price: 149, free: false, license: 'standard', tags: ['forest', 'canopy', 'parallax', 'nature'] },
    { cat: 'backgrounds', creatorIdx: 3, title: 'Dungeon Crypt Stone Backdrop', price: 99, free: false, license: 'standard', tags: ['dungeon', 'crypt', 'backdrop', 'stone'] },

    // vfx (5)
    { cat: 'vfx', creatorIdx: 4, title: 'Pixel Fire & Explosion Animations', price: 149, free: false, license: 'standard', tags: ['vfx', 'fire', 'explosion', 'pixel'] },
    { cat: 'vfx', creatorIdx: 4, title: 'Arcane Magic Spell Bursts 32x32', price: 199, free: false, license: 'standard', tags: ['vfx', 'magic', 'arcane', 'particles'] },
    { cat: 'vfx', creatorIdx: 4, title: 'Dust Cloud & Footstep Particle Sheet', price: 0, free: true, license: 'cc0', tags: ['dust', 'particles', 'vfx', 'free'] },
    { cat: 'vfx', creatorIdx: 4, title: 'Electric Spark & Plasma Discharge', price: 149, free: false, license: 'extended', tags: ['spark', 'plasma', 'electric', 'scifi'] },
    { cat: 'vfx', creatorIdx: 4, title: 'Water Splash & Bubble Effects Pack', price: 99, free: false, license: 'standard', tags: ['water', 'splash', 'bubble', 'vfx'] },

    // fonts (5)
    { cat: 'fonts', creatorIdx: 5, title: 'Retro Arcade 8x8 Bitmap Font', price: 99, free: false, license: 'standard', tags: ['font', 'bitmap', '8x8', 'arcade'] },
    { cat: 'fonts', creatorIdx: 5, title: 'Gothic Medieval Pixel Typeface', price: 149, free: false, license: 'extended', tags: ['font', 'medieval', 'gothic', 'pixel'] },
    { cat: 'fonts', creatorIdx: 5, title: 'Monospace Terminal Courier Pixel', price: 0, free: true, license: 'cc0', tags: ['font', 'monospace', 'terminal', 'free'] },
    { cat: 'fonts', creatorIdx: 5, title: 'Cyberpunk Bold Digital Display Font', price: 129, free: false, license: 'standard', tags: ['font', 'cyberpunk', 'bold', 'display'] },
    { cat: 'fonts', creatorIdx: 5, title: 'Chunky 16-Bit Boss Fight Title Font', price: 199, free: false, license: 'standard', tags: ['font', 'chunky', '16-bit', 'boss'] },

    // 3d (5)
    { cat: '3d', creatorIdx: 4, title: 'Low-Poly Fantasy Crystal Shards .obj', price: 149, free: false, license: 'standard', tags: ['3d', 'low-poly', 'crystal', 'obj'] },
    { cat: '3d', creatorIdx: 4, title: 'Low-Poly Modular Dungeon Chest & Crate', price: 199, free: false, license: 'standard', tags: ['3d', 'chest', 'crate', 'low-poly'] },
    { cat: '3d', creatorIdx: 4, title: 'Ancient Low-Poly Stepped Pyramid Prop', price: 0, free: true, license: 'cc0', tags: ['3d', 'pyramid', 'ancient', 'free'] },
    { cat: '3d', creatorIdx: 4, title: 'Voxel Sci-Fi Generator & Beacon', price: 299, free: false, license: 'extended', tags: ['3d', 'voxel', 'scifi', 'beacon'] },
    { cat: '3d', creatorIdx: 4, title: 'Stylized Medieval Weapon Collection 3D', price: 349, free: false, license: 'standard', tags: ['3d', 'weapons', 'medieval', 'low-poly'] },

    // sfx (5)
    { cat: 'sfx', creatorIdx: 2, title: '8-Bit Arcade Coins & Power-Ups SFX', price: 99, free: false, license: 'standard', tags: ['sfx', 'arcade', 'coin', '8-bit', 'audio'] },
    { cat: 'sfx', creatorIdx: 2, title: 'Laser Gun & Sci-Fi Blaster Audio Pack', price: 149, free: false, license: 'standard', tags: ['sfx', 'laser', 'blaster', 'scifi', 'audio'] },
    { cat: 'sfx', creatorIdx: 2, title: 'Basic Platformer Jump & Hit Sounds', price: 0, free: true, license: 'cc0', tags: ['sfx', 'jump', 'hit', 'free', 'audio'] },
    { cat: 'sfx', creatorIdx: 2, title: 'Explosions, Impacts & Rumbles SFX', price: 199, free: false, license: 'extended', tags: ['sfx', 'explosion', 'impact', 'rumble'] },
    { cat: 'sfx', creatorIdx: 2, title: 'Retro Menu Blip & Select UI Clicks', price: 49, free: false, license: 'standard', tags: ['sfx', 'ui', 'blip', 'click', 'audio'] },

    // music (4)
    { cat: 'music', creatorIdx: 2, title: 'Chiptune Adventure Boss Battle Theme', price: 299, free: false, license: 'standard', tags: ['music', 'chiptune', 'boss', 'loop', 'audio'] },
    { cat: 'music', creatorIdx: 2, title: 'Cozy Town & Village Background Loop', price: 199, free: false, license: 'standard', tags: ['music', 'town', 'cozy', 'loop', 'audio'] },
    { cat: 'music', creatorIdx: 2, title: '8-Bit Dungeon Crawl Ambient Track', price: 0, free: true, license: 'cc0', tags: ['music', 'dungeon', 'ambient', 'free', 'loop'] },
    { cat: 'music', creatorIdx: 2, title: 'Cyber City Synthwave Arcade Track', price: 399, free: false, license: 'extended', tags: ['music', 'synthwave', 'cyberpunk', 'loop'] },
  ];

  const createdAssets = await runPool(assetBlueprints, 4, async (bp, idx, total) => {
    const creator = creators[bp.creatorIdx];
    const seedStr = `${bp.cat}-${idx}`;
    const mediaKind = (bp.cat === 'sfx' || bp.cat === 'music') ? 'audio' : (bp.cat === 'fonts' || bp.cat === '3d') ? 'other' : 'image';

    // 1. Thumbnail
    const thumbPng = (bp.cat === 'characters')
      ? pixelart.spriteCharacter(seedStr)
      : pixelart.coverFor(bp.cat, seedStr);

    const thumbUpload = await saveFile(thumbPng, {
      folder: 'thumbnails',
      visibility: 'public',
      originalName: `${slugify(bp.title, { lower: true, strict: true })}-thumb.png`,
      mimeType: 'image/png',
    });

    // 2. Previews & Main File
    const previews = [];
    let mainFileBuffer;
    let mainOriginalName;
    let mainMimeType;
    let fileFormats = ['png'];
    let meta = {};

    if (mediaKind === 'audio') {
      const sampleRate = 22050;
      let pSamples;
      if (bp.cat === 'music') {
        pSamples = wav.chiptuneLoop(seedStr, 8, 128, sampleRate);
        meta = { durationSec: 15, bpm: 128, loopable: true, sampleRate };
      } else {
        pSamples = idx % 2 === 0 ? wav.coin(sampleRate) : wav.laser(sampleRate);
        meta = { durationSec: 1, sampleRate };
      }
      const wavBuf = wav.encodeWav(pSamples, sampleRate);
      const prevUpload = await saveFile(wavBuf, {
        folder: 'previews',
        visibility: 'public',
        originalName: `${slugify(bp.title, { lower: true, strict: true })}-preview.wav`,
        mimeType: 'audio/wav',
      });
      previews.push({ url: prevUpload.url, key: prevUpload.key, kind: 'audio' });

      mainFileBuffer = wavBuf;
      mainOriginalName = `${slugify(bp.title, { lower: true, strict: true })}.wav`;
      mainMimeType = 'audio/wav';
      fileFormats = ['wav'];
    } else if (bp.cat === '3d') {
      const objText = obj.generateObj(idx % 2 === 0 ? 'crystal' : 'cube');
      mainFileBuffer = Buffer.from(objText, 'utf8');
      mainOriginalName = `${slugify(bp.title, { lower: true, strict: true })}.obj`;
      mainMimeType = 'text/plain';
      fileFormats = ['obj'];

      const prevPng = pixelart.coverFor('3d', seedStr);
      const prevUpload = await saveFile(prevPng, {
        folder: 'previews',
        visibility: 'public',
        originalName: `${slugify(bp.title, { lower: true, strict: true })}-preview.png`,
        mimeType: 'image/png',
      });
      previews.push({ url: prevUpload.url, key: prevUpload.key, kind: 'image' });
      meta = { resolution: 'Low-Poly' };
    } else {
      let sheetPng;
      if (bp.cat === 'characters') {
        sheetPng = pixelart.spriteSheet(seedStr, 6);
        meta = { resolution: '16x16', frames: 6 };
      } else if (bp.cat === 'tilesets') {
        sheetPng = pixelart.tileset(seedStr);
        meta = { resolution: '16x16' };
      } else if (bp.cat === 'backgrounds') {
        sheetPng = pixelart.background(seedStr);
        meta = { resolution: '320x180' };
      } else if (bp.cat === 'ui') {
        sheetPng = pixelart.uiKit(seedStr);
        meta = { resolution: '128x96' };
      } else if (bp.cat === 'vfx') {
        sheetPng = pixelart.vfx(seedStr);
        meta = { resolution: '32x32', frames: 8 };
      } else {
        sheetPng = pixelart.bitmapFont(seedStr);
        meta = { resolution: '8x8' };
      }

      mainFileBuffer = sheetPng;
      mainOriginalName = `${slugify(bp.title, { lower: true, strict: true })}.png`;
      mainMimeType = 'image/png';
      fileFormats = ['png'];

      const prevUpload = await saveFile(sheetPng, {
        folder: 'previews',
        visibility: 'public',
        originalName: `${slugify(bp.title, { lower: true, strict: true })}-prev.png`,
        mimeType: 'image/png',
      });
      previews.push({ url: prevUpload.url, key: prevUpload.key, kind: 'image' });
    }

    // 3. Save Private Product File
    const mainUpload = await saveFile(mainFileBuffer, {
      folder: 'files',
      visibility: 'private',
      originalName: mainOriginalName,
      mimeType: mainMimeType,
    });

    const isFeatured = idx < 6;
    const desc = `High-quality ${bp.cat} package for 2D/3D indie game development. Includes clean assets, full commercial rights, and easy engine integration. Ideal for RPGs, platformers, arcade, and adventure projects.`;

    const assetDoc = await Asset.create({
      title: bp.title,
      slug: `${slugify(bp.title, { lower: true, strict: true })}-${nanoid(6).toLowerCase()}`,
      description: desc,
      creator: creator._id,
      category: bp.cat,
      mediaKind,
      tags: bp.tags,
      price: bp.price,
      license: bp.license,
      fileFormats,
      meta,
      thumbnail: { url: thumbUpload.url, key: thumbUpload.key },
      previews,
      file: {
        key: mainUpload.key,
        format: mainUpload.format,
        mimeType: mainUpload.mimeType,
        bytes: mainUpload.bytes,
        originalName: mainOriginalName,
      },
      fileInfo: {
        format: mainUpload.format,
        bytes: mainUpload.bytes,
        originalName: mainOriginalName,
      },
      status: 'published',
      isFeatured,
      stats: { views: 0, downloads: 0, sales: 0, ratingAvg: 0, ratingCount: 0, wishlistCount: 0 },
    });

    console.log(`[${idx + 1}/${total}] ${bp.title}`);
    return assetDoc;
  });

  // 3. Orders, Purchases & History
  console.log('Seeding order history and purchases...');
  const allPurchases = [];
  const paidAssets = createdAssets.filter((a) => a.price > 0);
  const freeAssets = createdAssets.filter((a) => a.price === 0);

  for (const buyer of buyers) {
    const orderCount = 3 + Math.floor(Math.random() * 5); // 3-7 orders
    for (let o = 0; o < orderCount; o++) {
      const pastDays = Math.floor(Math.random() * 58) + 1;
      const orderDate = new Date(Date.now() - pastDays * 86400000);

      // Pick 1-2 random paid assets
      const assetA = paidAssets[Math.floor(Math.random() * paidAssets.length)];
      const items = [{
        asset: assetA._id,
        title: assetA.title,
        price: assetA.price,
        creator: assetA.creator,
        license: assetA.license,
        creatorEarning: assetA.price - Math.round((assetA.price * 10) / 100),
      }];

      if (Math.random() < 0.3) {
        const assetB = paidAssets[Math.floor(Math.random() * paidAssets.length)];
        if (assetB._id.toString() !== assetA._id.toString()) {
          items.push({
            asset: assetB._id,
            title: assetB.title,
            price: assetB.price,
            creator: assetB.creator,
            license: assetB.license,
            creatorEarning: assetB.price - Math.round((assetB.price * 10) / 100),
          });
        }
      }

      const subtotal = items.reduce((sum, i) => sum + i.price, 0);
      const platformFee = items.reduce((sum, i) => sum + (i.price - i.creatorEarning), 0);
      const total = subtotal;

      const order = await Order.create({
        user: buyer._id,
        items,
        subtotal,
        platformFee,
        total,
        currency: 'INR',
        status: 'paid',
        provider: 'mock',
        providerOrderId: 'mock_' + nanoid(14),
        providerPaymentId: 'mockpay_' + nanoid(10),
        paidAt: orderDate,
        createdAt: orderDate,
      });

      for (const item of items) {
        try {
          const p = await Purchase.create({
            user: buyer._id,
            asset: item.asset,
            order: order._id,
            pricePaid: item.price,
            downloadCount: Math.floor(Math.random() * 3),
            lastDownloadedAt: orderDate,
            createdAt: orderDate,
          });
          allPurchases.push(p);
          await Asset.updateOne({ _id: item.asset }, { $inc: { 'stats.sales': 1 } });
        } catch {
          // Ignore duplicate purchases per buyer
        }
      }
    }

    // 1-2 Free claims
    const freeClaimAsset = freeAssets[Math.floor(Math.random() * freeAssets.length)];
    if (freeClaimAsset) {
      try {
        const p = await Purchase.create({
          user: buyer._id,
          asset: freeClaimAsset._id,
          order: null,
          pricePaid: 0,
          downloadCount: 1,
          createdAt: new Date(),
        });
        allPurchases.push(p);
      } catch {
        // Ignore duplicate
      }
    }
  }

  // Update views & downloads on all assets
  for (const asset of createdAssets) {
    const refreshed = await Asset.findById(asset._id);
    const sales = refreshed?.stats?.sales || 0;
    const views = sales * (10 + Math.floor(Math.random() * 30)) + Math.floor(Math.random() * 40) + 15;
    const downloads = sales + Math.floor(Math.random() * 5);
    const wishlists = Math.floor(Math.random() * 25);
    await Asset.updateOne(
      { _id: asset._id },
      { $set: { 'stats.views': views, 'stats.downloads': downloads, 'stats.wishlistCount': wishlists } }
    );
  }

  // 4. Reviews (~60% of purchases)
  console.log('Seeding reviews and recalculating ratings...');
  const reviewComments = [
    'Incredible quality and fits right into my game!',
    'Clean pixel art and great color palette.',
    'The audio loop is catchy and easy to integrate.',
    'Well organized sprite sheet with crisp animations.',
    'Super helpful UI components, saved me days of work.',
    'Great value for the price. Would buy again!',
    'Amazing low-poly models, optimized and look sharp.',
    'Lovely chiptune tracks, brings that authentic 90s feel.',
    'Crisp sound effects, exactly what my platformer needed.',
    'Top tier assets! Developer is very talented.',
    'Good sprites, though a few extra frames would be nice.',
    'Easy to import and works right out of the box.',
    'The color harmony on these tilesets is fantastic.',
    'Wonderful character design, very expressive.',
    'Highly recommended for any indie game developer!',
    'Solid pack, good variety of sounds.',
    'Clear font shapes, easily readable on retro resolutions.',
    'The particle VFX look brilliant in motion.',
    'Seamless parallax layers, works perfectly.',
    'Great CC0 resource for prototyping.',
    'Awesome aesthetic, matches my project perfectly.',
    'The animations are smooth and fluid.',
    'Great audio fidelity, punchy sound design.',
    'A must-have bundle for 2D platformer creators.',
    'Fantastic craftsmanship and attention to detail.',
  ];

  const ratingsWeights = [5, 5, 5, 4, 4, 3];
  const reviewedAssetIds = new Set();

  for (const purchase of allPurchases) {
    if (Math.random() < 0.6) {
      const rating = ratingsWeights[Math.floor(Math.random() * ratingsWeights.length)];
      const comment = reviewComments[Math.floor(Math.random() * reviewComments.length)];

      try {
        await Review.create({
          asset: purchase.asset,
          user: purchase.user,
          rating,
          comment,
        });
        reviewedAssetIds.add(purchase.asset.toString());
      } catch {
        // Unique index { asset: 1, user: 1 } protects duplicates
      }
    }
  }

  // Recalculate rating stats for all reviewed assets
  for (const assetId of reviewedAssetIds) {
    if (typeof recalcAssetRatingFunc === 'function') {
      await recalcAssetRatingFunc(assetId);
    } else {
      const revs = await Review.find({ asset: assetId });
      if (revs.length > 0) {
        const sum = revs.reduce((acc, r) => acc + r.rating, 0);
        const ratingAvg = Math.round((sum / revs.length) * 10) / 10;
        await Asset.updateOne(
          { _id: assetId },
          { $set: { 'stats.ratingAvg': ratingAvg, 'stats.ratingCount': revs.length } }
        );
      }
    }
  }

  // 5. Summary Table
  const totalUsers = await User.countDocuments();
  const totalCreators = await User.countDocuments({ role: 'creator' });
  const totalAssets = await Asset.countDocuments();
  const totalOrders = await Order.countDocuments();
  const totalPurchases = await Purchase.countDocuments();
  const totalReviews = await Review.countDocuments();

  console.log('\n================ PIXEL FORGE SEED SUMMARY ================');
  console.log(`Users:     ${totalUsers} (1 admin, ${totalCreators} creators, ${totalUsers - totalCreators - 1} buyers)`);
  console.log(`Assets:    ${totalAssets} across 10 categories`);
  console.log(`Orders:    ${totalOrders} paid simulated orders`);
  console.log(`Purchases: ${totalPurchases} ownership records`);
  console.log(`Reviews:   ${totalReviews} ratings & reviews`);
  console.log('==========================================================');
  console.log('\nDEMO CREDENTIALS (All passwords: Password123)');
  console.log('Admin:   admin@pixelforge.dev');
  console.log('Creator: pixelpip@pixelforge.dev');
  console.log('Buyer:   gamedev_alex@pixelforge.dev');
  console.log('==========================================================\n');

  await mongoose.disconnect();
  console.log('Database disconnected. Seeding completed successfully.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
