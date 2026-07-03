(function () {
  "use strict";

  const CONFIG = window.LLAMITA_GAME_CONFIG;
  if (!CONFIG || typeof llamitaState === "undefined") return;

  const baseRenderLlamita = renderLlamita;
  const baseShowAppView = showAppView;
  const basePlayReaction = playLlamitaReaction;
  const baseShowVisual = showLlamitaVisual;
  const baseCreateBurst = createLlamitaBurst;
  const baseIgniteLlamita = igniteLlamita;

  const runtime = {
    panel: "pet",
    shopCategory: "food",
    arcadeGame: "whack",
    toastTimer: 0,
    lastSignatures: {},
    expiredBoosts: new Set(),
    whack: { running: false, score: 0, hits: 0, hazardsHit: 0, activeIndex: -1, target: null, roundTimer: 0, spawnTimer: 0, endsAt: 0 },
    flappy: { running: false, frame: 0, lastTime: 0, flameY: 180, velocity: 0, obstacles: [], spawnClock: 0, score: 0 },
    snake: { running: false, timer: 0, body: [], direction: { x: 1, y: 0 }, nextDirection: { x: 1, y: 0 }, food: { x: 12, y: 10 }, score: 0, touchStart: null },
    quiz: null
  };

  const ui = {};
  const flappySprite = new Image();
  flappySprite.addEventListener("load", () => drawFlappy());
  flappySprite.src = CONFIG.arcade.flappy.spritePath;

  function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function readableDate(value) {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return localDateKey();
    return new Intl.DateTimeFormat("en", { year: "numeric", month: "long", day: "numeric" }).format(date);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function emberAmountMarkup(value) {
    const amount = Number.isFinite(Number(value)) ? Math.floor(Number(value)) : String(value);
    const currencyName = CONFIG.currency?.name || "Ember";
    const iconPath = CONFIG.currency?.iconPath || "assets/Ember.png";
    return `<span class="ember-amount" aria-label="${escapeHtml(amount)} ${escapeHtml(currencyName)}"><img class="ember-symbol" src="${escapeHtml(iconPath)}" alt="" aria-hidden="true" /><span>${escapeHtml(amount)}</span></span>`;
  }

  function setEmberAmount(element, value) {
    if (!element) return;
    element.innerHTML = emberAmountMarkup(value);
  }

  function clampNumber(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, Number(value) || 0));
  }

  function expectedMaxStat(level) {
    const levelsAfterFirst = Math.max(0, Number(level) - 1);
    const milestoneBonuses = Math.floor(Number(level) / 5) * CONFIG.level.milestoneExtraMax;
    return CONFIG.stats.baseMax + levelsAfterFirst * CONFIG.level.maxStatPerLevel + milestoneBonuses;
  }

  function loveBonusForState(state) {
    const maximum = Math.max(CONFIG.stats.baseMax, Number(state.maxStats?.love) || CONFIG.stats.baseMax);
    const percentage = maximum > 0 ? (clampNumber(state.love, CONFIG.stats.minimum, maximum) / maximum) * 100 : 0;
    const threshold = CONFIG.loveBonus.thresholds.find((entry) => percentage >= Number(entry.minimumPercent));
    return Number(threshold?.multiplier) || 1;
  }

  function careBonusForState(state) {
    const keys = CONFIG.careBonus?.statKeys || ["hunger", "joy", "energy", "cleanliness"];
    const averageRatio = keys.reduce((sum, key) => {
      const maximum = Math.max(CONFIG.stats.baseMax, Number(state.maxStats?.[key]) || CONFIG.stats.baseMax);
      return sum + (maximum > 0 ? clampNumber(state[key], CONFIG.stats.minimum, maximum) / maximum : 0);
    }, 0) / Math.max(1, keys.length);
    return averageRatio * (Number(CONFIG.careBonus?.maximumMultiplier) || 1.25);
  }

  function generateClaimCode(level) {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let suffix = "";
    const bytes = new Uint8Array(4);
    if (window.crypto?.getRandomValues) window.crypto.getRandomValues(bytes);
    for (let index = 0; index < 4; index += 1) {
      const value = window.crypto?.getRandomValues ? bytes[index] : Math.floor(Math.random() * 256);
      suffix += alphabet[value % alphabet.length];
    }
    return `FLAME-${level}-${suffix}`;
  }

  function normalizeCountMap(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, count]) => [key, Math.max(0, Math.floor(Number(count) || 0))])
        .filter(([, count]) => count > 0)
    );
  }

  function normalizeStringArray(value) {
    return Array.isArray(value) ? Array.from(new Set(value.filter((entry) => typeof entry === "string"))) : [];
  }

  function dailyMissionDefinitionsForDate(dateKey) {
    let seed = Array.from(String(dateKey)).reduce((value, character) => ((value * 31) + character.charCodeAt(0)) >>> 0, 2166136261);
    return CONFIG.dailyCareMissions.dailyDifficulties.map((difficulty) => {
      const definitions = CONFIG.dailyCareMissions.missions.filter((mission) => mission.difficulty === difficulty);
      seed = ((seed * 1664525) + 1013904223) >>> 0;
      return definitions[seed % definitions.length];
    }).filter(Boolean).slice(0, CONFIG.dailyCareMissions.count);
  }

  function normalizedDailyCareState(value, dateKey = localDateKey()) {
    const stored = value && typeof value === "object" ? value : {};
    const definitions = new Map(CONFIG.dailyCareMissions.missions.map((mission) => [mission.id, mission]));
    const currentSelectionVersion = CONFIG.dailyCareMissions.selectionVersion;
    const selected = stored.date === dateKey && stored.selectionVersion === currentSelectionVersion && Array.isArray(stored.missions)
      ? stored.missions.map((mission) => {
          const definition = definitions.get(mission?.id);
          if (!definition) return null;
          return {
            id: definition.id,
            progress: clampNumber(Math.floor(Number(mission.progress) || 0), 0, definition.target),
            claimed: Boolean(mission.claimed)
          };
        }).filter(Boolean)
      : [];
    const selectedIds = new Set(selected.map((mission) => mission.id));
    dailyMissionDefinitionsForDate(dateKey).forEach((definition) => {
      if (!selectedIds.has(definition.id) && selected.length < CONFIG.dailyCareMissions.count) {
        selected.push({ id: definition.id, progress: 0, claimed: false });
        selectedIds.add(definition.id);
      }
    });
    return { date: dateKey, selectionVersion: currentSelectionVersion, missions: selected.slice(0, CONFIG.dailyCareMissions.count) };
  }

  function unlockEarnedMilestones(state) {
    CONFIG.milestoneRewards.forEach((reward) => {
      if (state.level < reward.level) return;
      if (!state.unlockedRewards.includes(reward.id)) state.unlockedRewards.push(reward.id);
      if (!state.rewardUnlockDates[reward.id]) state.rewardUnlockDates[reward.id] = new Date().toISOString();
      if (!state.rewardClaimCodes[reward.id]) state.rewardClaimCodes[reward.id] = generateClaimCode(reward.level);
    });
  }

  function migrateLlamitaState(rawState) {
    const fallback = typeof defaultLlamitaState === "function" ? defaultLlamitaState() : {};
    const state = { ...fallback, ...(rawState && typeof rawState === "object" ? rawState : {}) };
    state.saveVersion = CONFIG.saveVersion;
    state.stage = [0, 1, 2, 3].includes(Number(state.stage)) ? Number(state.stage) : 0;
    state.level = Math.max(1, Math.floor(Number(state.level) || 1));
    state.xp = Math.max(0, Number(state.xp) || 0);
    state.embers = Math.max(0, Math.floor(Number(state.embers) || 0));
    state.carePoints = Math.max(0, Math.floor(Number(state.carePoints) || 0));
    state.ownedItems = normalizeStringArray(state.ownedItems);
    state.maxStats = state.maxStats && typeof state.maxStats === "object" ? { ...state.maxStats } : {};
    const earnedMaximum = expectedMaxStat(state.level);
    CONFIG.stats.keys.forEach((key) => {
      state.maxStats[key] = Math.max(CONFIG.stats.baseMax, Number(state.maxStats[key]) || earnedMaximum);
      state[key] = clampNumber(state[key] ?? 80, CONFIG.stats.minimum, state.maxStats[key]);
    });
    state.unlockedRewards = normalizeStringArray(state.unlockedRewards);
    state.claimedRewards = normalizeStringArray(state.claimedRewards);
    state.downloadedRewards = normalizeStringArray(state.downloadedRewards);
    state.rewardUnlockDates = state.rewardUnlockDates && typeof state.rewardUnlockDates === "object" ? { ...state.rewardUnlockDates } : {};
    state.rewardClaimCodes = state.rewardClaimCodes && typeof state.rewardClaimCodes === "object" ? { ...state.rewardClaimCodes } : {};
    state.inventory = normalizeCountMap(state.inventory);
    state.purchasedItems = normalizeCountMap(state.purchasedItems);
    state.permanentUpgrades = state.permanentUpgrades && typeof state.permanentUpgrades === "object" && !Array.isArray(state.permanentUpgrades)
      ? { ...state.permanentUpgrades }
      : {};
    CONFIG.shopItems.filter((item) => item.type === "permanent").forEach((item) => {
      const previouslyPurchased = (state.purchasedItems[item.id] || 0) > 0 || (state.inventory[item.id] || 0) > 0;
      const storedForFamily = state.permanentUpgrades[item.upgradeFamily];
      const storedItem = CONFIG.shopItems.find((candidate) => candidate.id === storedForFamily && candidate.type === "permanent");
      if (previouslyPurchased && (!storedItem || Number(item.tier) > Number(storedItem.tier))) {
        state.permanentUpgrades[item.upgradeFamily] = item.id;
      }
      if (previouslyPurchased) state.purchasedItems[item.id] = Math.max(1, state.purchasedItems[item.id] || 0);
      delete state.inventory[item.id];
    });
    Object.keys(state.permanentUpgrades).forEach((family) => {
      const activeItem = CONFIG.shopItems.find((item) => item.id === state.permanentUpgrades[family] && item.type === "permanent" && item.upgradeFamily === family);
      if (!activeItem) delete state.permanentUpgrades[family];
      else state.purchasedItems[activeItem.id] = Math.max(1, state.purchasedItems[activeItem.id] || 0);
    });
    state.cosmetics = normalizeStringArray(state.cosmetics);
    state.activeCosmetic = state.cosmetics.includes(state.activeCosmetic) ? state.activeCosmetic : null;
    state.activeBoosts = Array.isArray(state.activeBoosts)
      ? state.activeBoosts.filter((boost) => boost && Number(boost.endsAt) > Date.now())
      : [];
    const daily = state.daily && typeof state.daily === "object" ? state.daily : {};
    state.daily = {
      stamps: clampNumber(Math.floor(Number(daily.stamps) || 0), 0, CONFIG.daily.stampsRequired),
      lastClaimDate: typeof daily.lastClaimDate === "string" ? daily.lastClaimDate : "",
      weeklyReady: Boolean(daily.weeklyReady),
      totalClaims: Math.max(0, Math.floor(Number(daily.totalClaims) || 0)),
      totalWeeks: Math.max(0, Math.floor(Number(daily.totalWeeks) || 0))
    };
    state.dailyCare = normalizedDailyCareState(state.dailyCare);
    state.highScores = {
      whack: Math.max(0, Math.floor(Number(state.highScores?.whack) || 0)),
      flappy: Math.max(0, Math.floor(Number(state.highScores?.flappy) || 0)),
      snake: Math.max(0, Math.floor(Number(state.highScores?.snake) || 0)),
      quiz: Math.max(0, Math.floor(Number(state.highScores?.quiz) || 0))
    };
    state.arcade = state.arcade && typeof state.arcade === "object" ? { ...state.arcade } : {};
    state.arcade.lastPlayDate = typeof state.arcade.lastPlayDate === "string" ? state.arcade.lastPlayDate : "";
    state.arcade.playsToday = Math.max(0, Math.floor(Number(state.arcade.playsToday) || 0));
    const quizDaily = state.arcade.quizDaily && typeof state.arcade.quizDaily === "object" ? state.arcade.quizDaily : {};
    state.arcade.quizDaily = {
      date: typeof quizDaily.date === "string" ? quizDaily.date : "",
      attempts: normalizeStringArray(quizDaily.attempts),
      bonusEmbers: Math.max(0, Math.floor(Number(quizDaily.bonusEmbers) || 0))
    };
    if (state.arcade.quizDaily.date !== localDateKey()) {
      state.arcade.quizDaily.date = localDateKey();
      state.arcade.quizDaily.attempts = [];
      state.arcade.quizDaily.bonusEmbers = 0;
    }
    state.arcade.snakeWrapEnabled = Boolean(CONFIG.arcade.snake.wrapAround);
    state.arcade.flappySettings = {
      spriteWidth: CONFIG.arcade.flappy.spriteWidth,
      spriteHeight: CONFIG.arcade.flappy.spriteHeight,
      hitboxRadius: CONFIG.arcade.flappy.hitboxRadius
    };
    state.playerName = typeof state.playerName === "string" && state.playerName.trim() ? state.playerName.trim().slice(0, 28) : "Little Sister";
    state.lastPetRestDrainAt = Math.max(0, Number(state.lastPetRestDrainAt) || 0);
    state.lastPetRewardAt = Math.max(0, Number(state.lastPetRewardAt) || 0);
    state.asleep = Boolean(state.asleep);
    state.sleepRestProgressMs = Math.max(0, Number(state.sleepRestProgressMs) || 0);
    state.lastUpdated = Number(state.lastUpdated) || Date.now();
    state.lastSavedAt = Number(state.lastSavedAt) || 0;
    state.loveBonusMultiplier = loveBonusForState(state);
    state.careBonusMultiplier = careBonusForState(state);
    state.activeMultipliers = state.activeMultipliers && typeof state.activeMultipliers === "object" ? { ...state.activeMultipliers } : {};
    state.balanceVersion = 3;
    state.restRecoveryVersion = 3;
    state.rewardCardLayoutVersion = CONFIG.rewardCards.layoutVersion;
    unlockEarnedMilestones(state);
    return state;
  }

  function upgradedLoadLlamitaState() {
    try {
      const stored = JSON.parse(localStorage.getItem(CONFIG.storageKey) || "null");
      return migrateLlamitaState(stored);
    } catch {
      return migrateLlamitaState(null);
    }
  }

  function upgradedSaveLlamitaState(showFeedback = false) {
    llamitaState.saveVersion = CONFIG.saveVersion;
    llamitaState.lastSavedAt = Date.now();
    llamitaState.loveBonusMultiplier = loveBonusMultiplier();
    llamitaState.careBonusMultiplier = careBonusMultiplier();
    llamitaState.activeMultipliers = {
      love: llamitaState.loveBonusMultiplier,
      care: llamitaState.careBonusMultiplier,
      permanentXp: permanentMultiplier("xpMultiplier"),
      permanentEmber: permanentMultiplier("emberMultiplier"),
      sleepRest: permanentMultiplier("sleepRestMultiplier")
    };
    llamitaState.balanceVersion = 3;
    llamitaState.restRecoveryVersion = 3;
    llamitaState.rewardCardLayoutVersion = CONFIG.rewardCards.layoutVersion;
    llamitaState.arcade.snakeWrapEnabled = Boolean(CONFIG.arcade.snake.wrapAround);
    llamitaState.arcade.flappySettings = {
      spriteWidth: CONFIG.arcade.flappy.spriteWidth,
      spriteHeight: CONFIG.arcade.flappy.spriteHeight,
      hitboxRadius: CONFIG.arcade.flappy.hitboxRadius
    };
    try {
      localStorage.setItem(CONFIG.storßn4ÚÚ$z{-®éÜj×–åF‚‚“°¢6öçFW‡BæÖ÷fUFò†–æFW‚Â“°¢6öçFW‡BæÆ–æUFò†–æFW‚Â6çf2æ†V–v‡B“°¢6öçFW‡BæÖ÷fUFòƒÂ–æFW‚“°¢6öçFW‡BæÆ–æUFò†6çf2çv–GF‚Â–æFW‚“°¢6öçFW‡Bç7G&ö¶R‚“°¢Ğ¢6öçFW‡Bæf–ÆÅ7G–ÆRÒ"6cVƒ6B#°¢6öçFW‡Bæ&Vv–åF‚‚“°¢6öçFW‡Bæ&2‡'VçF–ÖRç6æ¶RæfööBç‚¢6VÆÅ6—¦R²6VÆÅ6—¦Rò"Â'VçF–ÖRç6æ¶RæfööBç’¢6VÆÅ6—¦R²6VÆÅ6—¦Rò"Â6VÆÅ6—¦R¢ã3‚ÂÂÖF‚å’¢"“°¢6öçFW‡Bæf–ÆÂ‚“°¢6öçFW‡Bæf–ÆÅ7G–ÆRÒ"6ffSCfb#°¢6öçFW‡Bæ&Vv–åF‚‚“°¢6öçFW‡Bæ&2‡'VçF–ÖRç6æ¶RæfööBç‚¢6VÆÅ6—¦R²6VÆÅ6—¦R¢ã3‚Â'VçF–ÖRç6æ¶RæfööBç’¢6VÆÅ6—¦R²6VÆÅ6—¦R¢ã3‚Â6VÆÅ6—¦R¢ã2ÂÂÖF‚å’¢"“°¢6öçFW‡Bæf–ÆÂ‚“°¢'VçF–ÖRç6æ¶Ræ&öG’æf÷$V6‚‚‡'BÂ–æFW‚’Óâ°¢6öçFW‡Bæf–ÆÅ7G–ÆRÒ–æFW‚ÓÓÒò"3FC†cS‚"¢–æFW‚R"ò"3s&#Sc‚"¢"3V6#V2#°¢6öçFW‡Bæ&Vv–åF‚‚“°¢6öçFW‡Bç&÷VæE&V7B‡'Bç‚¢6VÆÅ6—¦R²Â'Bç’¢6VÆÅ6—¦R²Â6VÆÅ6—¦RÒ"Â6VÆÅ6—¦RÒ"Â6VÆÅ6—¦R¢ã3“°¢6öçFW‡Bæf–ÆÂ‚“°¢–b†–æFW‚ÓÓÒ’°¢6öçFW‡Bæf–ÆÅ7G–ÆRÒ"6ffb#°¢6öçFW‡Bæ&Vv–åF‚‚“°¢6öçFW‡Bæ&2‡'Bç‚¢6VÆÅ6—¦R²6VÆÅ6—¦R¢ã3‚Â'Bç’¢6VÆÅ6—¦R²6VÆÅ6—¦R¢ã3‚Â6VÆÅ6—¦R¢ãBÂÂÖF‚å’¢"“°¢6öçFW‡Bæ&2‡'Bç‚¢6VÆÅ6—¦R²6VÆÅ6—¦R¢ãc’Â'Bç’¢6VÆÅ6—¦R²6VÆÅ6—¦R¢ã3‚Â6VÆÅ6—¦R¢ãBÂÂÖF‚å’¢"“°¢6öçFW‡Bæf–ÆÂ‚“°¢6öçFW‡Bæf–ÆÅ7G–ÆRÒ"3#63&2#°¢6öçFW‡Bæ&Vv–åF‚‚“°¢6öçFW‡Bæ&2‡'Bç‚¢6VÆÅ6—¦R²6VÆÅ6—¦R¢ã3‚Â'Bç’¢6VÆÅ6—¦R²6VÆÅ6—¦R¢ã3‚Â6VÆÅ6—¦R¢ãbÂÂÖF‚å’¢"“°¢6öçFW‡Bæ&2‡'Bç‚¢6VÆÅ6—¦R²6VÆÅ6—¦R¢ãc’Â'Bç’¢6VÆÅ6—¦R²6VÆÅ6—¦R¢ã3‚Â6VÆÅ6—¦R¢ãbÂÂÖF‚å’¢"“°¢6öçFW‡Bæf–ÆÂ‚“°¢Ğ¢Ò“°¢Ğ ¢gVæ7F–öâ7F'E6æ¶R‚’°¢–b†&6FT6&U&VgW6Â‚’’&WGW&ã°¢VæE6æ¶R†fÇ6R“°¢'VçF–ÖRç6æ¶Rç'Vææ–ærÒG'VS°¢'VçF–ÖRç6æ¶Ræ&öG’Ò·²ƒ¢‚Â“¢ÒÂ²ƒ¢rÂ“¢ÒÂ²ƒ¢bÂ“¢ÕÓ°¢'VçF–ÖRç6æ¶RæF—&V7F–öâÒ²ƒ¢Â“¢Ó°¢'VçF–ÖRç6æ¶RææW‡DF—&V7F–öâÒ²ƒ¢Â“¢Ó°¢'VçF–ÖRç6æ¶RæfööBÒ&æFöÕ6æ¶TfööB‚“°¢'VçF–ÖRç6æ¶Rç66÷&RÒ°¢Fö7VÖVçBçVW'•6VÆV7F÷"‚%¶FF×6æ¶R×66÷&UÒ"’çFW‡D6öçFVçBÒ##°¢Fö7VÖVçBçVW'•6VÆV7F÷"‚%¶FF×6æ¶R×&W7VÇEÒ"’çFW‡D6öçFVçBÒ%vÆÇ2w&&÷VæBâfö–B–÷W'6VÆb#°¢Fö7VÖVçBçVW'•6VÆV7F÷"‚%¶FF×7F'B×6æ¶UÒ"’æF—6&ÆVBÒG'VS°¢G&u6æ¶R‚“°¢'VçF–ÖRç6æ¶RçF–ÖW"Òv–æF÷rç6WD–çFW'fÂ‡7FW6æ¶RÂ4ôäd”ræ&6FRç6æ¶RçF–6´×2“°¢Ğ ¢gVæ7F–öâ6WE6æ¶TF—&V7F–öâ‡‚Â’’°¢–b‚'VçF–ÖRç6æ¶Rç'Vææ–ær’&WGW&ã°¢–b‡'VçF–ÖRç6æ¶RæF—&V7F–öâç‚²‚ÓÓÒbb'VçF–ÖRç6æ¶RæF—&V7F–öâç’²’ÓÓÒ’&WGW&ã°¢'VçF–ÖRç6æ¶RææW‡DF—&V7F–öâÒ²‚Â’Ó°¢Ğ ¢gVæ7F–öâ7FW6æ¶R‚’°¢–b‚'VçF–ÖRç6æ¶Rç'Vææ–ær’&WGW&ã°¢'VçF–ÖRç6æ¶RæF—&V7F–öâÒ²ââç'VçF–ÖRç6æ¶RææW‡DF—&V7F–öâÓ°¢6öç7B†VBÒ'VçF–ÖRç6æ¶Ræ&öG•³Ó°¢6öç7Bw&–E6—¦RÒ4ôäd”ræ&6FRç6æ¶Ræw&–E6—¦S°¢6öç7BæW‡BÒ°¢ƒ¢††VBç‚²'VçF–ÖRç6æ¶RæF—&V7F–öâç‚²w&–E6—¦R’Rw&–E6—¦RÀ¢“¢††VBç’²'VçF–ÖRç6æ¶RæF—&V7F–öâç’²w&–E6—¦R’Rw&–E6—¦P¢Ó°¢6öç7Bv–ÆÄVBÒæW‡Bç‚ÓÓÒ'VçF–ÖRç6æ¶RæfööBç‚bbæW‡Bç’ÓÓÒ'VçF–ÖRç6æ¶RæfööBç“°¢6öç7B6öÆÆ—6–öä&öG’Òv–ÆÄVBò'VçF–ÖRç6æ¶Ræ&öG’¢'VçF–ÖRç6æ¶Ræ&öG’ç6Æ–6RƒÂÓ“°¢6öç7B6VÆbÒ6öÆÆ—6–öä&öG’ç6öÖR‚‡'B’Óâ'Bç‚ÓÓÒæW‡Bç‚bb'Bç’ÓÓÒæW‡Bç’“°¢–b‡6VÆb’°¢VæE6æ¶R‡G'VR“°¢&WGW&ã°¢Ğ¢'VçF–ÖRç6æ¶Ræ&öG’çVç6†–gB†æW‡B“°¢–b‡v–ÆÄVB’°¢'VçF–ÖRç6æ¶Rç66÷&R³Ò°¢Fö7VÖVçBçVW'•6VÆV7F÷"‚%¶FF×6æ¶R×66÷&UÒ"’çFW‡D6öçFVçBÒ7G&–ær‡'VçF–ÖRç6æ¶Rç66÷&R“°¢'VçF–ÖRç6æ¶RæfööBÒ&æFöÕ6æ¶TfööB‚“°¢ÒVÇ6R°¢'VçF–ÖRç6æ¶Ræ&öG’ç÷‚“°¢Ğ¢G&u6æ¶R‚“°¢Ğ ¢gVæ7F–öâVæE6æ¶R†v—fU&Wv&BÒG'VR’°¢6öç7Bv5'Vææ–ærÒ'VçF–ÖRç6æ¶Rç'Vææ–æs°¢'VçF–ÖRç6æ¶Rç'Vææ–ærÒfÇ6S°¢v–æF÷ræ6ÆV$–çFW'fÂ‡'VçF–ÖRç6æ¶RçF–ÖW"“°¢6öç7B7F'D'WGFöâÒFö7VÖVçBçVW'•6VÆV7F÷"‚%¶FF×7F'B×6æ¶UÒ"“°¢–b‡7F'D'WGFöâ’7F'D'WGFöâæF—6&ÆVBÒfÇ6S°¢–b‚v5'Vææ–ærÇÂv—fU&Wv&B’°¢G&u6æ¶R‚“°¢&WGW&ã°¢Ğ¢6öç7B66÷&RÒ'VçF–ÖRç6æ¶Rç66÷&S°¢6öç7B&6TVÖ&W'2Ò66÷&RãÒ#Rò4ôäd”ræ&6FRç6æ¶Rç66÷&S#TVÖ&W"¢66÷&RãÒò4ôäd”ræ&6FRç6æ¶Rç66÷&SVÖ&W"¢ÖF‚æÖ‚ƒRÂ66÷&R¢"“°¢6öç7B‡Ò66÷&RãÒSò4ôäd”ræ&6FRç6æ¶Rç66÷&SS‡¢ÖF‚æÖ‚ƒÂÖF‚æfÆö÷"‡66÷&Rò2’“°¢v&D&6FU&W7VÇB‚'6æ¶R"Â66÷&RÂ&6TVÖ&W'2Â‡Â4ôäd”ræ&6FRç6æ¶Ræ†–v…66÷&T&öçW2ÂFö7VÖVçBçVW'•6VÆV7F÷"‚%¶FF×6æ¶R×&W7VÇEÒ"’“°¢Ğ ¢gVæ7F–öâ6‡VffÆUVW7F–öç2‡VW7F–öç2’°¢6öç7B&W7VÇBÒVW7F–öç2ç6Æ–6R‚“°¢f÷"†ÆWB–æFW‚Ò&W7VÇBæÆVæwF‚Ò²–æFW‚â²–æFW‚ÓÒ’°¢6öç7B7vÒÖF‚æfÆö÷"„ÖF‚ç&æFöÒ‚’¢†–æFW‚²’“°¢·&W7VÇE¶–æFW…ÒÂ&W7VÇE·7vÕÒÒ·&W7VÇE·7vÒÂ&W7VÇE¶–æFW…ÕÓ°¢Ğ¢&WGW&â&W7VÇC°¢Ğ ¢gVæ7F–öâ7F'EV—¢‚’°¢6öç7B6FVv÷'’ÒFö7VÖVçBçVW'•6VÆV7F÷"‚%¶FF×V—¢Ö6FVv÷'•Ò"’çfÇVS°¢6öç7BF–ff–7VÇG’ÒV’çV—¤F–ff–7VÇG“òçfÇVRÇÂ$V7’#°¢–b‡V—¤GFV×EW6VB†6FVv÷'’ÂF–ff–7VÇG’’’°¢WFFUV—¤&WEV’‚“°¢6†÷uFö7B‚%F†—26FVv÷'’æBF–ff–7VÇG’—26ö×ÆWFRf÷"FöF’â"“°¢&WGW&ã°¢Ğ¢6öç7B6VÆV7F–öâÒV—¤&WE6VÆV7F–öâ‚“°¢–b‚6VÆV7F–öâçfÆ–B’°¢WFFUV—¤&WEV’‚“°¢6†÷uFö7B‡6VÆV7F–öâæÖW76vR“°¢&WGW&ã°¢Ğ¢6öç7B²6WGF–æw2Â&WBÒÒ6VÆV7F–öã°¢6öç7BVW7F–öåööÂÒ4ôäd”rçV—¥VW7F–öç5¶6FVv÷'•Óòå¶F–ff–7VÇG•ÒÇÂµÓ°¢–b‡VW7F–öåööÂæÆVæwF‚Â4ôäd”ræ&6FRçV—¢ç&÷VæG2’°¢6†÷uFö7B‚%F†—2V—¢6WB—2æ÷B&VG’–WBâ"“°¢&WGW&ã°¢Ğ¢–b†&6FT6&U&VgW6Â‚’’&WGW&ã°¢ÆÆÖ—F7FFRæ&6FRçV—¤F–Ç’æGFV×G2çW6‚‡V—¤F–Ç”¶W’†6FVv÷'’ÂF–ff–7VÇG’’“°¢ÆÆÖ—F7FFRæVÖ&W'2ÓÒ&WC°¢'VçF–ÖRçV—¢Ò°¢6FVv÷'’À¢F–ff–7VÇG’À¢&WBÀ¢×VÇF—Æ–W#¢6WGF–æw2æ×VÇF—Æ–W"À¢VW7F–öç3¢6‡VffÆUVW7F–öç2‡VW7F–öåööÂ’ç6Æ–6RƒÂ4ôäd”ræ&6FRçV—¢ç&÷VæG2’À¢–æFWƒ¢À¢6÷'&V7C¢À¢ç7vW&VC¢fÇ6P¢Ó°¢Ww&FVE6fTÆÆÖ—F7FFR‚“°¢Fö7VÖVçBçVW'•6VÆV7F÷"‚%¶FF×V—¢×6WGWÒ"’æ†–FFVâÒG'VS°¢Fö7VÖVçBçVW'•6VÆV7F÷"‚%¶FF×V—¢×VW7F–öåÒ"’æ†–FFVâÒfÇ6S°¢Fö7VÖVçBçVW'•6VÆV7F÷"‚%¶FF×V—¢×&W7VÇEÒ"’çFW‡D6öçFVçBÒ"#°¢&VæFW%V—¥VW7F–öâ‚“°¢Ww&FVE&VæFW$ÆÆÖ—F‚“°¢Ğ ¢gVæ7F–öâ&VæFW%V—¥VW7F–öâ‚’°¢6öç7B6W76–öâÒ'VçF–ÖRçV—£°¢–b‚6W76–öâ’&WGW&ã°¢6öç7BVW7F–öâÒ6W76–öâçVW7F–öç5·6W76–öâæ–æFW…Ó°¢Fö7VÖVçBçVW'•6VÆV7F÷"‚%¶FF×V—¢ÖçVÖ&W%Ò"’çFW‡D6öçFVçBÒ7G&–ær‡6W76–öâæ–æFW‚²“°¢Fö7VÖVçBçVW'•6VÆV7F÷"‚%¶FF×V—¢Ö6÷'&V7EÒ"’çFW‡D6öçFVçBÒ7G&–ær‡6W76–öâæ6÷'&V7B“°¢Fö7VÖVçBçVW'•6VÆV7F÷"‚%¶FF×V—¢×&ö×EÒ"’çFW‡D6öçFVçBÒVW7F–öâçVW7F–öã°¢Fö7VÖVçBçVW'•6VÆV7F÷"‚%¶FF×V—¢Öç7vW'5Ò"’æ–ææW$…DÔÂÒVW7F–öâæç7vW'2æÖ‚†ç7vW"Â–æFW‚’ÓâÆ'WGFöâ6Æ73Ò'V—¢Öç7vW""G—SÒ&'WGFöâ"FF×V—¢Öç7vW#Ò"G¶–æFW‡Ò#âG¶W66T‡FÖÂ†ç7vW"—ÓÂö'WGFöãæ’æ¦ö–â‚""“°¢6W76–öâæç7vW&VBÒfÇ6S°¢Ğ ¢gVæ7F–öâç7vW%V—¢†ç7vW$–æFW‚’°¢6öç7B6W76–öâÒ'VçF–ÖRçV—£°¢–b‚6W76–öâÇÂ6W76–öâæç7vW&VB’&WGW&ã°¢6W76–öâæç7vW&VBÒG'VS°¢6öç7BVW7F–öâÒ6W76–öâçVW7F–öç5·6W76–öâæ–æFW…Ó°¢6öç7B6÷'&V7BÒçVÖ&W"†ç7vW$–æFW‚’ÓÓÒVW7F–öâæ6÷'&V7C°¢–b†6÷'&V7B’6W76–öâæ6÷'&V7B³Ò°¢Fö7VÖVçBçVW'•6VÆV7F÷$ÆÂ‚%¶FF×V—¢Öç7vW%Ò"’æf÷$V6‚‚†'WGFöâ’Óâ°¢'WGFöâæF—6&ÆVBÒG'VS°¢–b„çVÖ&W"†'WGFöâæFF6WBçV—¤ç7vW"’ÓÓÒVW7F–öâæ6÷'&V7B’'WGFöâæ6Æ74Æ—7BæFB‚&—2Ö6÷'&V7B"“°¢VÇ6R–b„çVÖ&W"†'WGFöâæFF6WBçV—¤ç7vW"’ÓÓÒçVÖ&W"†ç7vW$–æFW‚’’'WGFöâæ6Æ74Æ—7BæFB‚&—2×w&öær"“°¢Ò“°¢Fö7VÖVçBçVW'•6VÆV7F÷"‚%¶FF×V—¢Ö6÷'&V7EÒ"’çFW‡D6öçFVçBÒ7G&–ær‡6W76–öâæ6÷'&V7B“°¢v–æF÷rç6WEF–ÖV÷WB‚‚’Óâ°¢6W76–öâæ–æFW‚³Ò°¢–b‡6W76–öâæ–æFW‚ãÒ6W76–öâçVW7F–öç2æÆVæwF‚’f–æ—6…V—¢‚“°¢VÇ6R&VæFW%V—¥VW7F–öâ‚“°¢ÒÂcS“°¢Ğ ¢gVæ7F–öâf–æ—6…V—¢‚’°¢6öç7B6W76–öâÒ'VçF–ÖRçV—£°¢–b‚6W76–öâ’&WGW&ã°¢6öç7B66÷&RÒ6W76–öâæ6÷'&V7C°¢6öç7B&Wf–÷W4†–v‚ÒÆÆÖ—F7FFRæ†–v…66÷&W2çV—¢ÇÂ°¢6öç7B—4†–v…66÷&RÒ66÷&Râ&Wf–÷W4†–vƒ°¢–b†—4†–v…66÷&R’ÆÆÖ—F7FFRæ†–v…66÷&W2çV—¢Ò66÷&S°¢6öç7BW&fV7E&÷VæBÒ66÷&RÓÓÒ4ôäd”ræ&6FRçV—¢ç&÷VæG3°¢ÆWB–÷WBÒ°¢ÆWBÖW76vRÒ$&WGFW"ÇV6²æW‡BF–ÖRâ#°¢–b‡6W76–öâæ&WBÓÓÒbb66÷&RãÒ2’°¢6öç7B&6U&Wv&BÒçVÖ&W"„4ôäd”ræ&6FRçV—¢ææô&WD&6U&Wv&G5·66÷&UÒ’ÇÂ°¢–÷WBÒv&DVÖ&W'2‡66ÆVEV—¤&öçW2†&6U&Wv&BÂ6W76–öâæF–ff–7VÇG’’¢6W76–öâæ×VÇF—Æ–W"“°¢ÖW76vRÒW&fV7E&÷VæBò$¦6·÷B"¢%–÷W"'&–v‡Bç7vW"7G&V²V&æVBVÖ&W"#°¢ÒVÇ6R–b‡66÷&RÓÓÒ2’°¢–÷WBÒ6W76–öâæ&WC°¢ÖW76vRÒ%–÷Rv÷B–÷W"&WB&6²â#°¢ÒVÇ6R–b‡66÷&RÓÓÒB’°¢–÷WBÒ6W76–öâæ&WB²v&DVÖ&W'2‡6W76–öâæ&WB¢‡6W76–öâæ×VÇF—Æ–W"Ò’“°¢ÖW76vRÒ$6÷'&V7Bç7vW'2×VÇF—Æ–VB–÷W"VÖ&W"#°¢ÒVÇ6R–b‡W&fV7E&÷VæB’°¢–÷WBÒ6W76–öâæ&WB²v&DVÖ&W'2‡6W76–öâæ&WB¢‡6W76–öâæ×VÇF—Æ–W"Ò’²66ÆVEV—¤&öçW2„4ôäd”ræ&6FRçV—¢æ¦6·÷D&öçW2Â6W76–öâæF–ff–7VÇG’’“°¢ÖW76vRÒ$¦6·÷B#°¢Ğ¢6öç7BW&fV7D&öçW2ÒW&fV7E&÷VæBòv&DVÖ&W'2‡66ÆVEV—¤&öçW2„4ôäd”ræ&6FRçV—¢çW&fV7D&öçW2Â6W76–öâæF–ff–7VÇG’’’¢°¢6öç7B†–v„&öçW2Ò—4†–v…66÷&Rbb66÷&RãÒ2òv&DVÖ&W'2‡66ÆVEV—¤&öçW2„4ôäd”ræ&6FRçV—¢æ†–v…66÷&T&öçW2Â6W76–öâæF–ff–7VÇG’’’¢°¢6öç7B&uF÷FÄVÖ&W'2Ò–÷WB²†–v„&öçW2²W&fV7D&öçW3°¢6öç7B&VgVæF&ÆT&WBÒ66÷&RãÒ2ò6W76–öâæ&WB¢°¢6öç7B&t&öçW4VÖ&W'2ÒÖF‚æÖ‚ƒÂ&uF÷FÄVÖ&W'2Ò&VgVæF&ÆT&WB“°¢6öç7BF–Ç”æWD6ÒV—¥&öw&W76–öäf÷$ÆWfVÂ‚’æF–Ç”æWD6°¢6öç7B&VÖ–æ–ætF–Ç”&öçW2ÒçVÖ&W"æ—4f–æ—FR†F–Ç”æWD6¢òÖF‚æÖ‚ƒÂF–Ç”æWD6ÒÆÆÖ—F7FFRæ&6FRçV—¤F–Ç’æ&öçW4VÖ&W'2¢¢–æf–æ—G“°¢6öç7Bv&FVD&öçW4VÖ&W'2ÒÖF‚æÖ–â‡&t&öçW4VÖ&W'2Â&VÖ–æ–ætF–Ç”&öçW2“°¢6öç7BF÷FÄVÖ&W'2Ò&VgVæF&ÆT&WB²v&FVD&öçW4VÖ&W'3°¢ÆÆÖ—F7FFRæ&6FRçV—¤F–Ç’æ&öçW4VÖ&W'2³Òv&FVD&öçW4VÖ&W'3°¢ÆÆÖ—F7FFRæVÖ&W'2³ÒF÷FÄVÖ&W'3°¢6öç7B&6U‡Ò66÷&R¢"²‡W&fV7E&÷VæBòR²4ôäd”ræ&6FRçV—¢çW&fV7E‡&öçW2¢“°¢6öç7BV&æVE‡Ò&6U‡¢‡×VÇF—Æ–W"‚“°¢&Vv—7FW$&6FUÆ’‚“°¢Ww&FVDw&çDÆÆÖ—F&öw&W72†&6U‡Â“°¢FE7FG2‡²¦÷“¢4ôäd”ræ&6FRçÆ”¦÷•&Wv&BÒ“°¢Ww&FVE6fTÆÆÖ—F7FFR‚“°¢Fö7VÖVçBçVW'•6VÆV7F÷"‚%¶FF×V—¢×VW7F–öåÒ"’æ†–FFVâÒG'VS°¢Fö7VÖVçBçVW'•6VÆV7F÷"‚%¶FF×V—¢×6WGWÒ"’æ†–FFVâÒfÇ6S°¢6öç7B†–v…FW‡BÒ—4†–v…66÷&Rò"æWr†–v‚66÷&R–÷R'&ö¶R–÷W"&V6÷&BæBV&æVB&öçW2VÖ&W""¢"#°¢6öç7BW&fV7EFW‡BÒW&fV7E&÷VæBò"W&fV7BV—¢&öçW3¢WfW'’ç7vW"v26÷'&V7B"¢"#°¢6öç7B6FW‡BÒv&FVD&öçW4VÖ&W'2Â&t&öçW4VÖ&W'2ò"F†RF–Ç’V—¢VÖ&W"Æ–Ö—Bv2&V6†VBâ"¢"#°¢Fö7VÖVçBçVW'•6VÆV7F÷"‚%¶FF×V—¢×&W7VÇEÒ"’çFW‡D6öçFVçBÒG¶ÖW76vWÒG·W&fV7EFW‡GÒG¶†–v…FW‡GÒG¶6FW‡GÒVÖ&W"V&æVC¢G·F÷FÄVÖ&W'7Òâ…V&æVC¢G¶V&æVE‡çFôf—†VBƒ—Òâ¦÷’²G´4ôäd”ræ&6FRçÆ”¦÷•&Wv&GÒæ°¢6†÷uFö7B†Fö7VÖVçBçVW'•6VÆV7F÷"‚%¶FF×V—¢×&W7VÇEÒ"’çFW‡D6öçFVçB“°¢'VçF–ÖRçV—¢ÒçVÆÃ°¢'VçF–ÖRæÆ7E6–væGW&W2ç6†÷Ò"#°¢Ww&FVE&VæFW$ÆÆÖ—F‚“°¢Ğ ¢gVæ7F–öâ&–æD&6FTWfVçG2‚’°¢V’æ&6FUæVÂæFDWfVçDÆ—7FVæW"‚&6Æ–6²"Â†WfVçB’Óâ°¢6öç7BF"ÒWfVçBçF&vWBæ6Æ÷6W7B‚%¶FFÖ&6FRÖvÖR×F&vWEÒ"“°¢–b‡F"’°¢7F÷&6FTvÖW2‚“°¢6WD&6FTvÖR‡F"æFF6WBæ&6FTvÖUF&vWB“°¢&WGW&ã°¢Ğ¢6öç7B†öÆRÒWfVçBçF&vWBæ6Æ÷6W7B‚%¶FF×v†6²Ö†öÆUÒ"“°¢–b††öÆR’†—Ev†6²††öÆRæFF6WBçv†6´†öÆR“°¢–b†WfVçBçF&vWBæ6Æ÷6W7B‚%¶FF×7F'B×v†6µÒ"’’7F'Ev†6²‚“°¢–b†WfVçBçF&vWBæ6Æ÷6W7B‚%¶FF×7F'BÖfÆ•Ò"’’7F'DfÆ’‚“°¢–b†WfVçBçF&vWBæ6Æ÷6W7B‚%¶FF×7F'B×6æ¶UÒ"’’7F'E6æ¶R‚“°¢–b†WfVçBçF&vWBæ6Æ÷6W7B‚%¶FF×7F'B×V—¥Ò"’’7F'EV—¢‚“°¢6öç7BF—&V7F–öâÒWfVçBçF&vWBæ6Æ÷6W7B‚%¶FF×6æ¶RÖF—&V7F–öåÒ"“òæFF6WBç6æ¶TF—&V7F–öã°¢–b†F—&V7F–öâÓÓÒ'W"’6WE6æ¶TF—&V7F–öâƒÂÓ“°¢–b†F—&V7F–öâÓÓÒ&F÷vâ"’6WE6æ¶TF—&V7F–öâƒÂ“°¢–b†F—&V7F–öâÓÓÒ&ÆVgB"’6WE6æ¶TF—&V7F–öâ‚ÓÂ“°¢–b†F—&V7F–öâÓÓÒ'&–v‡B"’6WE6æ¶TF—&V7F–öâƒÂ“°¢6öç7Bç7vW"ÒWfVçBçF&vWBæ6Æ÷6W7B‚%¶FF×V—¢Öç7vW%Ò"“°¢–b†ç7vW"’ç7vW%V—¢†ç7vW"æFF6WBçV—¤ç7vW"“°¢Ò“°¢V’çV—¤F–ff–7VÇG’æFDWfVçDÆ—7FVæW"‚&6†ævR"ÂWFFUV—¤&WEV’“°¢V’çV—¤6FVv÷'’æFDWfVçDÆ—7FVæW"‚&6†ævR"ÂWFFUV—¤&WEV’“°¢V’çV—¤&WD–çWBæFDWfVçDÆ—7FVæW"‚&–çWB"ÂWFFUV—¤&WEV’“°¢V’çV—¤æô&WBæFDWfVçDÆ—7FVæW"‚&6†ævR"ÂWFFUV—¤&WEV’“°¢Fö7VÖVçBçVW'•6VÆV7F÷"‚%¶FFÖfÆ’Ö6çf5Ò"’æFDWfVçDÆ—7FVæW"‚'ö–çFW&F÷vâ"ÂfÆfÆÖR“°¢Fö7VÖVçBçVW'•6VÆV7F÷"‚%¶FF×V—¢ÖF–ff–7VÇG•Ò"’æFDWfVçDÆ—7FVæW"‚&6†ævR"Â&VæFW$&6FU66÷&W2“°¢6öç7B6æ¶T6çf2ÒFö7VÖVçBçVW'•6VÆV7F÷"‚%¶FF×6æ¶RÖ6çf5Ò"“°¢6æ¶T6çf2æFDWfVçDÆ—7FVæW"‚'ö–çFW&F÷vâ"Â†WfVçB’Óâ°¢'VçF–ÖRç6æ¶RçF÷V6…7F'BÒ²ƒ¢WfVçBæ6Æ–VçE‚Â“¢WfVçBæ6Æ–VçE’Ó°¢Ò“°¢6æ¶T6çf2æFDWfVçDÆ—7FVæW"‚'ö–çFW'W"Â†WfVçB’Óâ°¢–b‚'VçF–ÖRç6æ¶RçF÷V6…7F'B’&WGW&ã°¢6öç7B‚ÒWfVçBæ6Æ–VçE‚Ò'VçF–ÖRç6æ¶RçF÷V6…7F'Bçƒ°¢6öç7B’ÒWfVçBæ6Æ–VçE’Ò'VçF–ÖRç6æ¶RçF÷V6…7F'Bç“°¢'VçF–ÖRç6æ¶RçF÷V6…7F'BÒçVÆÃ°¢–b„ÖF‚æ'2‡‚’âÖF‚æ'2‡’’bbÖF‚æ'2‡‚’â’6WE6æ¶TF—&V7F–öâ‡‚âò¢ÓÂ“°¢VÇ6R–b„ÖF‚æ'2‡’’â’6WE6æ¶TF—&V7F–öâƒÂ’âò¢Ó“°¢Ò“°¢Fö7VÖVçBæFDWfVçDÆ—7FVæW"‚&¶W–F÷vâ"Â†WfVçB’Óâ°¢–b‡'VçF–ÖRçæVÂÓÒ&&6FR"’&WGW&ã°¢–b‡'VçF–ÖRæ&6FTvÖRÓÓÒ&fÆ’"bb'VçF–ÖRæfÆ’ç'Vææ–ærbb†WfVçBæ¶W’ÓÓÒ""ÇÂWfVçBæ¶W’ÓÓÒ$'&÷uW"’’°¢WfVçBç&WfVçDFVfVÇB‚“°¢fÆfÆÖR‚“°¢Ğ¢–b‡'VçF–ÖRæ&6FTvÖRÓÓÒ'6æ¶R"bb'VçF–ÖRç6æ¶Rç'Vææ–ær’°¢6öç7BF—&V7F–öç2Ò°¢'&÷uW¢³ÂÓÒÀ¢'&÷tF÷vã¢³ÂÒÀ¢'&÷tÆVgC¢²ÓÂÒÀ¢'&÷u&–v‡C¢³ÂĞ¢Ó°¢–b†F—&V7F–öç5¶WfVçBæ¶W•Ò’°¢WfVçBç&WfVçDFVfVÇB‚“°¢6WE6æ¶TF—&V7F–öâ‚ââæF—&V7F–öç5¶WfVçBæ¶W•Ò“°¢Ğ¢Ğ¢Ò“°¢Ğ ¢gVæ7F–öâ–ç7FÆÄ÷fW'&–FW2‚’°¢ÆöDÆÆÖ—F7FFRÒWw&FVDÆöDÆÆÖ—F7FFS°¢6fTÆÆÖ—F7FFRÒWw&FVE6fTÆÆÖ—F7FFS°¢ÆÆÖ—FÆWfVÅ‡æVVFVBÒWw&FVDÆWfVÅ‡æVVFVC°¢w&çDÆÆÖ—F&öw&W72ÒWw&FVDw&çDÆÆÖ—F&öw&W73°¢Ç”ÆÆÖ—FF–ÖRÒWw&FVDÇ”ÆÆÖ—FF–ÖS°¢'W”ÆÆÖ—F—FVÒÒWw&FVD'W”ÆÆÖ—F—FVÓ°¢6&Tf÷$ÆÆÖ—FÒWw&FVD6&Tf÷$ÆÆÖ—F°¢–væ—FTÆÆÖ—FÒWw&FVD–væ—FTÆÆÖ—F°¢&VæFW$ÆÆÖ—FÒWw&FVE&VæFW$ÆÆÖ—F°¢ÆÆÖ—F–væ—FRç&VÖ÷fTWfVçDÆ—7FVæW"‚&6Æ–6²"Â&6T–væ—FTÆÆÖ—F“°¢ÆÆÖ—F–væ—FRæFDWfVçDÆ—7FVæW"‚&6Æ–6²"ÂWw&FVD–væ—FTÆÆÖ—F“°¢6†÷tf–WrÒgVæ7F–öâWw&FVE6†÷tf–Wr‡f–Wt–B’°¢&6U6†÷tf–Wr‡f–Wt–B“°¢–b‡f–Wt–BÓÓÒ&ÆÆÖ—F"’v–æF÷rç6WEF–ÖV÷WB‚‚’ÓâWw&FVE&VæFW$ÆÆÖ—F‚’Â&VfW'5&VGV6VDÖ÷F–öâò¢#ƒ“°¢Ó°¢Ğ ¢gVæ7F–öâ–æ—F–Æ—¦UWw&FR‚’°¢ÆÆÖ—F7FFRÒÖ–w&FTÆÆÖ—F7FFR†ÆÆÖ—F7FFR“°¢–b‚'V–ÆEWw&FUV’‚’’&WGW&ã°¢–ç7FÆÄ÷fW'&–FW2‚“°¢Ww&FVDÇ”ÆÆÖ—FF–ÖR‚“°¢Ww&FVE6fTÆÆÖ—F7FFR‚“°¢6WDÆÆÖ—F6†÷÷Vâ‡G'VR“°¢6WD7F—fUæVÂ‚'WB"“°¢G&tfÆ’‚“°¢G&u6æ¶R‚“°¢Ww&FVE&VæFW$ÆÆÖ—F‚“°¢Ğ ¢–æ—F–Æ—¦UWw&FR‚“°§Ò’‚“° 