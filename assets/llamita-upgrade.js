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
    whack: { running: false, score: 0, activeIndex: -1, target: null, roundTimer: 0, spawnTimer: 0, endsAt: 0 },
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
    state.highScores = {
      whack: Math.max(0, Math.floor(Number(state.highScores?.whack) || 0)),
      flappy: Math.max(0, Math.floor(Number(state.highScores?.flappy) || 0)),
      snake: Math.max(0, Math.floor(Number(state.highScores?.snake) || 0)),
      quiz: Math.max(0, Math.floor(Number(state.highScores?.quiz) || 0))
    };
    state.arcade = state.arcade && typeof state.arcade === "object" ? { ...state.arcade } : {};
    state.arcade.lastPlayDate = typeof state.arcade.lastPlayDate === "string" ? state.arcade.lastPlayDate : "";
    state.arcade.playsToday = Math.max(0, Math.floor(Number(state.arcade.playsToday) || 0));
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
    state.activeMultipliers = state.activeMultipliers && typeof state.activeMultipliers === "object" ? { ...state.activeMultipliers } : {};
    state.balanceVersion = 2;
    state.restRecoveryVersion = 2;
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
    llamitaState.activeMultipliers = {
      love: llamitaState.loveBonusMultiplier,
      permanentXp: permanentMultiplier("xpMultiplier"),
      permanentEmber: permanentMultiplier("emberMultiplier"),
      sleepRest: permanentMultiplier("sleepRestMultiplier")
    };
    llamitaState.balanceVersion = 2;
    llamitaState.restRecoveryVersion = 2;
    llamitaState.rewardCardLayoutVersion = CONFIG.rewardCards.layoutVersion;
    llamitaState.arcade.snakeWrapEnabled = Boolean(CONFIG.arcade.snake.wrapAround);
    llamitaState.arcade.flappySettings = {
      spriteWidth: CONFIG.arcade.flappy.spriteWidth,
      spriteHeight: CONFIG.arcade.flappy.spriteHeight,
      hitboxRadius: CONFIG.arcade.flappy.hitboxRadius
    };
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(llamitaState));
      if (showFeedback) {
        showToast("Game saved successfully! Your progress is safe.");
        if (ui.saveStatus) ui.saveStatus.textContent = "Game saved successfully! Your progress is safe.";
      }
      return true;
    } catch {
      if (showFeedback) showToast("Your progress could not be saved on this device.");
      return false;
    }
  }

  function statMaximum(key) {
    return Math.max(CONFIG.stats.baseMax, Number(llamitaState.maxStats?.[key]) || CONFIG.stats.baseMax);
  }

  function setStat(key, value) {
    llamitaState[key] = clampNumber(value, CONFIG.stats.minimum, statMaximum(key));
  }

  function addStats(changes) {
    Object.entries(changes || {}).forEach(([key, amount]) => {
      if (!CONFIG.stats.keys.includes(key)) return;
      if (amount === "max") {
        setStat(key, statMaximum(key));
      } else {
        setStat(key, llamitaState[key] + Number(amount || 0));
      }
    });
  }

  function cleanupBoosts(showExpiredMessage = true) {
    const now = Date.now();
    const expired = llamitaState.activeBoosts.filter((boost) => Number(boost.endsAt) <= now);
    if (!expired.length) return false;
    llamitaState.activeBoosts = llamitaState.activeBoosts.filter((boost) => Number(boost.endsAt) > now);
    if (showExpiredMessage) {
      expired.forEach((boost) => {
        if (runtime.expiredBoosts.has(boost.id)) return;
        runtime.expiredBoosts.add(boost.id);
        showToast(`${boost.name || "Boost"}: Boost expired`);
      });
    }
    upgradedSaveLlamitaState();
    return true;
  }

  function xpMultiplier() {
    cleanupBoosts(false);
    const timedMultiplier = llamitaState.activeBoosts.reduce((value, boost) => value * (Number(boost.xpMultiplier) || 1), 1);
    return timedMultiplier * permanentMultiplier("xpMultiplier") * loveBonusMultiplier();
  }

  function decayMultiplier() {
    cleanupBoosts(false);
    return llamitaState.activeBoosts.reduce((value, boost) => value * (Number(boost.decayMultiplier) || 1), 1);
  }

  function emberMultiplier() {
    cleanupBoosts(false);
    const levelMultiplier = 1 + Math.floor(llamitaState.level / CONFIG.level.emberMultiplierStepLevels) * CONFIG.level.emberMultiplierStep;
    const boostMultiplier = llamitaState.activeBoosts.reduce((value, boost) => value * (Number(boost.emberMultiplier) || 1), 1);
    return levelMultiplier * boostMultiplier * permanentMultiplier("emberMultiplier") * loveBonusMultiplier();
  }

  function awardEmbers(baseReward) {
    return Math.max(0, Math.round(Number(baseReward || 0) * emberMultiplier()));
  }

  function upgradedLevelXpNeeded(level = llamitaState.level) {
    return CONFIG.level.xpBase + Number(level) * CONFIG.level.xpPerLevel;
  }

  function itemsUnlockedAt(level) {
    return CONFIG.shopItems.filter((item) => Number(item.unlockLevel) === Number(level));
  }

  function milestoneAt(level) {
    return CONFIG.milestoneRewards.find((reward) => reward.level === Number(level)) || null;
  }

  function unlockMilestone(reward) {
    if (!reward) return false;
    if (!llamitaState.unlockedRewards.includes(reward.id)) llamitaState.unlockedRewards.push(reward.id);
    if (!llamitaState.rewardUnlockDates[reward.id]) llamitaState.rewardUnlockDates[reward.id] = new Date().toISOString();
    if (!llamitaState.rewardClaimCodes[reward.id]) llamitaState.rewardClaimCodes[reward.id] = generateClaimCode(reward.level);
    return true;
  }

  function applyLevelUp(level) {
    const maxIncrease = CONFIG.level.maxStatPerLevel + (level % 5 === 0 ? CONFIG.level.milestoneExtraMax : 0);
    CONFIG.stats.keys.forEach((key) => {
      llamitaState.maxStats[key] += maxIncrease;
      setStat(key, llamitaState[key] + maxIncrease);
    });
    const levelEmbers = awardEmbers(CONFIG.level.levelUpEmberBase + level * CONFIG.level.levelUpEmberPerLevel);
    llamitaState.embers += levelEmbers;
    const reward = milestoneAt(level);
    if (reward) unlockMilestone(reward);
    return {
      level,
      maxIncrease,
      levelEmbers,
      reward,
      newItems: itemsUnlockedAt(level),
      emberIncrease: level % CONFIG.level.emberMultiplierStepLevels === 0
    };
  }

  function upgradedGrantLlamitaProgress(baseXp, baseEmbers) {
    const earnedXp = Math.max(0, Number(baseXp || 0) * xpMultiplier());
    const earnedEmbers = awardEmbers(baseEmbers);
    llamitaState.xp += earnedXp;
    llamitaState.embers += earnedEmbers;
    const levelUps = [];
    while (llamitaState.xp >= upgradedLevelXpNeeded(llamitaState.level)) {
      llamitaState.xp -= upgradedLevelXpNeeded(llamitaState.level);
      llamitaState.level += 1;
      levelUps.push(applyLevelUp(llamitaState.level));
    }
    if (llamitaState.stage > 0) {
      llamitaState.stage = llamitaState.level >= 5 ? 3 : llamitaState.level >= 3 ? 2 : 1;
    }
    upgradedSaveLlamitaState();
    if (levelUps.length) {
      showLevelUpPopup(levelUps[levelUps.length - 1], levelUps);
      basePlayReaction("is-growing");
      baseCreateBurst(["\u2665", "\u2605", "\u2726"], "#ffd765", 15);
    }
    return levelUps.length > 0;
  }

  function applyAwakeDecay(minutes) {
    const multiplier = decayMultiplier();
    Object.entries(CONFIG.stats.awakeDecayPerMinute).forEach(([key, rate]) => {
      const permanentDecayMultiplier = key === "love" ? permanentMultiplier("loveDecayMultiplier") : 1;
      setStat(key, llamitaState[key] - Number(rate) * minutes * multiplier * permanentDecayMultiplier);
    });
  }

  function applySleepingSegment(minutes) {
    const multiplier = decayMultiplier();
    setStat("energy", llamitaState.energy + sleepRestRecoveryPerMinute() * minutes);
    Object.entries(CONFIG.stats.sleepingDecayPerMinute).forEach(([key, rate]) => {
      const permanentDecayMultiplier = key === "love" ? permanentMultiplier("loveDecayMultiplier") : 1;
      setStat(key, llamitaState[key] - Number(rate) * minutes * multiplier * permanentDecayMultiplier);
    });
    upgradedGrantLlamitaProgress(CONFIG.stats.sleepXpPerMinute * minutes, 0);
  }

  function upgradedApplyLlamitaTime() {
    if (llamitaState.stage === 0) return false;
    const now = Date.now();
    const rawElapsedMs = Math.max(0, now - llamitaState.lastUpdated);
    const minimumElapsed = llamitaState.asleep ? 900 : 5000;
    if (rawElapsedMs < minimumElapsed) return false;
    let remainingMinutes = Math.min(CONFIG.stats.maxOfflineMinutes, rawElapsedMs / 60000);
    let autoWoke = false;
    cleanupBoosts();

    if (llamitaState.asleep) {
      let loops = 0;
      while (remainingMinutes > 0.0001 && llamitaState.asleep && loops < 20) {
        loops += 1;
        const restMissing = Math.max(0, statMaximum("energy") - llamitaState.energy);
        if (restMissing <= 0.001) {
          llamitaState.asleep = false;
          autoWoke = true;
          break;
        }
        const minutesToFull = restMissing / sleepRestRecoveryPerMinute();
        const sleepMinutes = Math.min(remainingMinutes, minutesToFull);
        applySleepingSegment(sleepMinutes);
        remainingMinutes -= sleepMinutes;
        if (llamitaState.energy >= statMaximum("energy") - 0.001) {
          setStat("energy", statMaximum("energy"));
          llamitaState.asleep = false;
          autoWoke = true;
        }
      }
    }

    if (remainingMinutes > 0.0001) applyAwakeDecay(remainingMinutes);
    llamitaState.lastUpdated = now;
    llamitaState.sleepRestProgressMs = 0;
    upgradedSaveLlamitaState();
    if (autoWoke) {
      setLlamitaMessage("Rest is fully restored! Your little flame woke up bright and cozy.", 8000);
      showToast("Rest is fully restored!");
      baseCreateBurst(["\u2600", "\u2726"], "#ffd765", 9);
    }
    return true;
  }

  function actionMessage(action, reducedPetReward) {
    if (action === "feed") return "Mmm... that tastes like a warm little hug.";
    if (action === "play") return "Again! Your little flame feels happier.";
    if (action === "clean") return "So sparkly! I can almost see my tiny glow.";
    if (action === "pet" && reducedPetReward) return "So cozy! She loved that, even if she is already very cuddled.";
    if (action === "pet") return ["She loved that!", "So cozy!", "Your little flame feels happier."][llamitaState.carePoints % 3];
    return "Your little flame is glowing.";
  }

  function upgradedCareForLlamita(action) {
    if (llamitaState.stage === 0) {
      igniteLlamita();
      return;
    }
    if (isLlamitaHatching || (llamitaState.asleep && action !== "sleep")) return;
    const now = Date.now();
    if (now - llamitaLastActionAt < 600) return;
    llamitaLastActionAt = now;
    upgradedApplyLlamitaTime();

    if (action === "sleep") {
      window.clearTimeout(llamitaVisualTimer);
      llamitaVisualState = "";
      llamitaVisualUntil = 0;
      if (llamitaState.asleep) {
        llamitaState.asleep = false;
        setLlamitaMessage("Good morning! Sleep Mode has ended.", 6500);
        baseCreateBurst(["\u2600", "\u2665"], "#ffd765", 7);
      } else if (llamitaState.energy >= statMaximum("energy") - 0.01) {
        setLlamitaMessage("Rest is already fully restored. I am ready to stay with you.", 6500);
        showToast("Rest is already full.");
        return;
      } else {
        llamitaState.asleep = true;
        setLlamitaMessage("Your little flame is resting... Let Sleep until Rest is full, or choose Wake Up.", 8000);
        baseCreateBurst(["\u263e", "\u2726"], "#b7d6ff", 7);
      }
      llamitaState.carePoints += 1;
      llamitaState.lastUpdated = Date.now();
      upgradedSaveLlamitaState();
      upgradedRenderLlamita();
      return;
    }

    const config = CONFIG.actions[action];
    if (!config) return;
    let stats = { ...config.stats };
    let xp = config.xp;
    let embers = config.embers;
    let reducedPetReward = false;
    let visual = "happy";
    let reaction = "react-pet";
    let symbols = ["\u2665", "\u2726"];
    let color = "#ff8b83";

    if (action === "pet") {
      reducedPetReward = now - llamitaState.lastPetRewardAt < config.cooldownMs;
      if (reducedPetReward) {
        stats = { joy: 1, love: 2 };
        xp = 0.5;
        embers = 0;
      }
      if (now - llamitaState.lastPetRestDrainAt >= config.restDrainCooldownMs) {
        stats.energy = -1;
        llamitaState.lastPetRestDrainAt = now;
      }
      llamitaState.lastPetRewardAt = now;
    } else if (action === "feed") {
      visual = llamitaState.carePoints % 2 === 0 ? "burrito" : "taco";
      reaction = "react-feed";
      symbols = ["\u2665", "\u00b7", "\u2726"];
    } else if (action === "play") {
      visual = "play";
      reaction = "react-play";
      symbols = ["\u2605", "\u2726"];
      color = "#ffcf5a";
    } else if (action === "clean") {
      visual = "shower";
      reaction = "react-clean";
      symbols = ["\u2726", "\u00b0"];
      color = "#8de1c4";
    }

    activePermanentItems().forEach((item) => {
      const effect = item.permanentEffect;
      if (!effect || effect.action !== action || !CONFIG.stats.keys.includes(effect.stat)) return;
      stats[effect.stat] = Number(stats[effect.stat] || 0) + Number(effect.actionBonus ?? effect.amount ?? 0);
    });

    addStats(stats);
    llamitaState.carePoints += 1;
    baseShowVisual(visual, action === "feed" || action === "clean" ? 2400 : 1900);
    setLlamitaMessage(actionMessage(action, reducedPetReward), 6500);
    upgradedGrantLlamitaProgress(xp, embers);
    llamitaState.lastUpdated = Date.now();
    upgradedSaveLlamitaState();
    upgradedRenderLlamita();
    basePlayReaction(reaction);
    baseCreateBurst(symbols, color, action === "pet" ? 9 : 7);
  }

  function upgradedIgniteLlamita() {
    if (llamitaState.stage > 0 || isLlamitaHatching) return;
    isLlamitaHatching = true;
    llamitaHabitat.classList.add("is-hatching");
    llamitaIgnite.disabled = true;
    setLlamitaMessage("Hold still... the tiny spark is listening.", 2300);
    baseCreateBurst(["\u2726", "\u00b7"], "#ffd765", 10);
    const birthDelay = prefersReducedMotion ? 80 : 650;
    const finishDelay = prefersReducedMotion ? 180 : 2150;
    window.setTimeout(() => {
      llamitaState.stage = llamitaState.level >= 5 ? 3 : llamitaState.level >= 3 ? 2 : 1;
      setStat("hunger", Math.max(llamitaState.hunger, 84));
      setStat("joy", Math.max(llamitaState.joy, 88));
      setStat("energy", Math.max(llamitaState.energy, 86));
      setStat("cleanliness", Math.max(llamitaState.cleanliness, 90));
      setStat("love", Math.max(llamitaState.love, 92));
      llamitaState.carePoints += 1;
      llamitaState.embers = Math.max(4, llamitaState.embers);
      llamitaState.lastUpdated = Date.now();
      baseShowVisual("hello", 3600);
      upgradedSaveLlamitaState();
      upgradedRenderLlamita();
      baseCreateBurst(["\u2665", "\u2726"], "#ff9f68", 12);
    }, birthDelay);
    window.setTimeout(() => {
      isLlamitaHatching = false;
      llamitaHabitat.classList.remove("is-hatching");
      setLlamitaMessage("Oh! I am your little flame now.", 7000);
      upgradedRenderLlamita();
    }, finishDelay);
  }

  function itemById(itemId) {
    return CONFIG.shopItems.find((item) => item.id === itemId) || null;
  }

  function activePermanentItems() {
    return Object.values(llamitaState.permanentUpgrades || {}).map(itemById).filter(Boolean);
  }

  function permanentMultiplier(effectKey) {
    return activePermanentItems().reduce((value, item) => value * (Number(item.permanentEffect?.[effectKey]) || 1), 1);
  }

  function itemStatMultiplier(statKey) {
    return activePermanentItems().reduce((value, item) => {
      const effect = item.permanentEffect;
      return effect?.itemStat === statKey ? value * (Number(effect.itemMultiplier) || 1) : value;
    }, 1);
  }

  function loveBonusMultiplier() {
    return loveBonusForState(llamitaState);
  }

  function sleepRestRecoveryPerMinute() {
    return CONFIG.stats.sleepRestPerMinute * permanentMultiplier("sleepRestMultiplier");
  }

  function ownedItemCount(item) {
    if (item.type === "cosmetic") return llamitaState.cosmetics.includes(item.id) ? 1 : 0;
    if (item.type === "permanent") return (llamitaState.purchasedItems[item.id] || 0) > 0 ? 1 : 0;
    return Math.max(0, Number(llamitaState.inventory[item.id]) || 0);
  }

  function activateBoost(boostConfig, name, sourceId) {
    const now = Date.now();
    llamitaState.activeBoosts = llamitaState.activeBoosts.filter((boost) => boost.group !== boostConfig.group);
    llamitaState.activeBoosts.push({
      id: `${sourceId}-${now}`,
      sourceId,
      name,
      group: boostConfig.group,
      xpMultiplier: Number(boostConfig.xpMultiplier) || 1,
      emberMultiplier: Number(boostConfig.emberMultiplier) || 1,
      decayMultiplier: Number(boostConfig.decayMultiplier) || 1,
      startedAt: now,
      endsAt: now + Number(boostConfig.durationMinutes) * 60000
    });
  }

  function upgradedBuyLlamitaItem(itemId) {
    const item = itemById(itemId);
    if (!item) return;
    if (llamitaState.level < item.unlockLevel) {
      showToast(`Locked until Level ${item.unlockLevel}.`);
      return;
    }
    if (item.type === "cosmetic" && llamitaState.cosmetics.includes(item.id)) {
      showToast("Owned");
      return;
    }
    if (item.type === "permanent" && (llamitaState.purchasedItems[item.id] || 0) > 0) {
      showToast(`${item.name} is already owned.`);
      return;
    }
    if (item.maxOwned && (llamitaState.inventory[item.id] || 0) >= item.maxOwned) {
      showToast(`You can only hold ${item.maxOwned} ${item.name} at a time.`);
      return;
    }
    if (llamitaState.embers < item.price) {
      showToast(`You need ${item.price - llamitaState.embers} more Ember.`);
      return;
    }
    llamitaState.embers -= item.price;
    llamitaState.purchasedItems[item.id] = (llamitaState.purchasedItems[item.id] || 0) + 1;
    if (item.type === "cosmetic") {
      llamitaState.cosmetics.push(item.id);
      llamitaState.activeCosmetic = item.id;
    } else if (item.type === "permanent") {
      llamitaState.permanentUpgrades[item.upgradeFamily] = item.id;
      CONFIG.shopItems.filter((candidate) => candidate.type === "permanent" && candidate.upgradeFamily === item.upgradeFamily).forEach((candidate) => {
        delete llamitaState.inventory[candidate.id];
      });
    } else {
      llamitaState.inventory[item.id] = (llamitaState.inventory[item.id] || 0) + 1;
    }
    llamitaState.carePoints += 1;
    upgradedSaveLlamitaState();
    upgradedRenderLlamita();
    const purchaseMessage = item.type === "permanent"
      ? `${item.name} is now your highest active tier.`
      : `${item.name} was added to your ${item.type === "cosmetic" ? "cosmetics" : "Inventory"}.`;
    showToast(purchaseMessage);
    baseCreateBurst([item.icon, "\u2726"], "#ffd765", 8);
  }

  function applyItemEffects(item) {
    const effects = item.effects || {};
    const adjustedStats = {};
    CONFIG.stats.keys.forEach((key) => {
      if (!(key in effects)) return;
      adjustedStats[key] = effects[key] === "max" ? "max" : Number(effects[key] || 0) * itemStatMultiplier(key);
    });
    addStats(adjustedStats);
    if (effects.fillMain) CONFIG.stats.main.forEach((key) => setStat(key, statMaximum(key)));
    if (effects.fillAll) CONFIG.stats.keys.forEach((key) => setStat(key, statMaximum(key)));
    if (effects.atLeastMain) CONFIG.stats.main.forEach((key) => setStat(key, Math.max(llamitaState[key], statMaximum(key) * (Number(effects.atLeastMain) / 100))));
    if (effects.activeBoost) activateBoost(effects.activeBoost, item.name, item.id);
    if (effects.xp) upgradedGrantLlamitaProgress(effects.xp, 0);
  }

  function useInventoryItem(itemId) {
    const item = itemById(itemId);
    if (!item || (llamitaState.inventory[itemId] || 0) < 1) return;
    applyItemEffects(item);
    llamitaState.inventory[itemId] -= 1;
    if (llamitaState.inventory[itemId] <= 0) delete llamitaState.inventory[itemId];
    llamitaState.carePoints += 1;
    llamitaState.lastUpdated = Date.now();
    upgradedSaveLlamitaState();
    upgradedRenderLlamita();
    if (item.category === "food" || item.category === "combo") baseShowVisual(llamitaState.carePoints % 2 ? "taco" : "burrito", 2300);
    setLlamitaMessage(`${item.name} wrapped your little flame in a warm glow.`, 7000);
    showToast(`${item.name} used.`);
    baseCreateBurst([item.icon, "\u2665", "\u2726"], "#ffbd65", 10);
  }

  function equipCosmetic(itemId) {
    if (!llamitaState.cosmetics.includes(itemId)) return;
    llamitaState.activeCosmetic = llamitaState.activeCosmetic === itemId ? null : itemId;
    upgradedSaveLlamitaState();
    upgradedRenderLlamita();
    showToast(llamitaState.activeCosmetic ? "Cosmetic equipped." : "Cosmetic removed.");
  }

  function showToast(message) {
    if (!ui.toast) return;
    ui.toast.textContent = message;
    ui.toast.classList.add("is-visible");
    window.clearTimeout(runtime.toastTimer);
    runtime.toastTimer = window.setTimeout(() => ui.toast.classList.remove("is-visible"), 3600);
  }

  function showLevelUpPopup(change, allChanges) {
    if (!ui.levelModal) return;
    const lines = [
      "Max Hunger increased.",
      "Max Joy increased.",
      "Max Rest increased."
    ];
    if (change.emberIncrease) lines.push("Ember earnings increased.");
    if (change.newItems.length) lines.push("New shop items unlocked.");
    if (change.reward) lines.push("Special Reward unlocked!");
    if (allChanges.length > 1) lines.unshift(`${allChanges.length} levels reached in one bright burst.`);
    ui.levelModal.classList.toggle("is-legendary", change.level >= 100);
    ui.levelModal.classList.toggle("is-milestone", change.level % 5 === 0);
    ui.levelModal.querySelector("[data-level-number]").textContent = String(change.level);
    ui.levelModal.querySelector("[data-level-title]").textContent = "Level Up!";
    ui.levelModal.querySelector("[data-level-copy]").textContent = `Your little flame reached Level ${change.level}.`;
    ui.levelModal.querySelector("[data-level-list]").innerHTML = lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
    ui.levelBackdrop.hidden = false;
  }

  function closeLevelPopup() {
    if (ui.levelBackdrop) ui.levelBackdrop.hidden = true;
  }

  function formatBoostTime(endsAt) {
    const totalSeconds = Math.max(0, Math.ceil((Number(endsAt) - Date.now()) / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  function boostLabel(boost) {
    const labels = [];
    if (boost.xpMultiplier >= 2) labels.push("Double XP active");
    else if (boost.xpMultiplier > 1) labels.push("XP Boost active");
    if (boost.decayMultiplier < 1) labels.push("Stats decrease slower");
    if (boost.emberMultiplier > 1) labels.push("Ember Boost active");
    return labels.join(" + ") || boost.name;
  }

  function renderStatsAndGrowth() {
    llamitaNeeds.forEach((needElement) => {
      const key = needElement.dataset.need;
      const maximum = statMaximum(key);
      const current = clampNumber(llamitaState[key], CONFIG.stats.minimum, maximum);
      const percent = maximum > 0 ? (current / maximum) * 100 : 0;
      needElement.querySelector("[data-need-value]").textContent = `${Math.round(current)} / ${Math.round(maximum)}`;
      needElement.querySelector("[data-need-meter]").style.width = `${Math.min(100, percent)}%`;
    });
    const xpNeeded = upgradedLevelXpNeeded();
    const xpDisplay = llamitaState.xp < 10 ? llamitaState.xp.toFixed(1) : Math.round(llamitaState.xp).toString();
    const nextMilestone = CONFIG.milestoneRewards.find((reward) => reward.level > llamitaState.level);
    llamitaGrowthLabel.textContent = nextMilestone
      ? `Level ${llamitaState.level} \u2022 reward at Level ${nextMilestone.level}`
      : `Level ${llamitaState.level} \u2022 legendary glow`;
    llamitaGrowthValue.textContent = `${xpDisplay} / ${xpNeeded} XP`;
    llamitaGrowthMeter.style.width = `${Math.min(100, (llamitaState.xp / xpNeeded) * 100)}%`;
    llamitaSleepLabel.textContent = llamitaState.asleep ? "Wake Up" : "Sleep Mode";
    if (llamitaState.level >= 100) llamitaStageName.textContent = "Legendary Flame";
    llamitaShopBalance.textContent = `${llamitaState.embers} Ember`;
    llamitaHabitat.dataset.cosmetic = llamitaState.activeCosmetic || "";
    if (ui.loveBonus) {
      ui.loveBonus.textContent = `Love Bonus · Current bonus: x${loveBonusMultiplier().toFixed(2)}`;
      ui.loveBonus.title = "Keep Love high to earn small bonus rewards.";
    }
  }

  function renderActiveBoosts() {
    cleanupBoosts();
    const permanent = activePermanentItems();
    const signature = `${llamitaState.activeBoosts.map((boost) => `${boost.id}:${Math.ceil((boost.endsAt - Date.now()) / 1000)}`).join("|")}::${permanent.map((item) => item.id).join("|")}`;
    if (runtime.lastSignatures.boosts === signature) return;
    runtime.lastSignatures.boosts = signature;
    const timedMarkup = llamitaState.activeBoosts.map((boost) => `
      <div class="llamita-boost-chip">
        <span>${escapeHtml(boostLabel(boost))}</span>
        <span>${formatBoostTime(boost.endsAt)}</span>
      </div>
    `).join("");
    const permanentMarkup = permanent.map((item) => `
      <div class="llamita-boost-chip is-permanent">
        <span>${item.icon} ${escapeHtml(item.name)}</span>
        <span>Highest tier active</span>
      </div>
    `).join("");
    if (ui.petBoosts) {
      ui.petBoosts.innerHTML = `${permanentMarkup ? '<span class="llamita-effect-heading">Permanent Upgrades</span>' : ""}${permanentMarkup}${timedMarkup ? '<span class="llamita-effect-heading">Active Boosts</span>' : ""}${timedMarkup}`;
    }
    if (ui.inventoryBoosts) ui.inventoryBoosts.innerHTML = timedMarkup || '<div class="llamita-empty-state">No active boosts right now.</div>';
    if (ui.inventoryUpgrades) ui.inventoryUpgrades.innerHTML = permanentMarkup || '<div class="llamita-empty-state">Permanent upgrades from the shop will appear here.</div>';
  }

  function renderShopStats() {
    if (!ui.shopStats) return;
    const values = {
      hunger: [llamitaState.hunger, statMaximum("hunger")],
      joy: [llamitaState.joy, statMaximum("joy")],
      rest: [llamitaState.energy, statMaximum("energy")],
      ember: [llamitaState.embers, null]
    };
    Object.entries(values).forEach(([key, pair]) => {
      const element = ui.shopStats.querySelector(`[data-shop-stat="${key}"]`);
      if (!element) return;
      element.textContent = pair[1] === null ? String(Math.floor(pair[0])) : `${Math.round(pair[0])}/${Math.round(pair[1])}`;
    });
  }

  function renderShop() {
    if (!ui.shopGrid) return;
    renderShopStats();
    const signature = `${runtime.shopCategory}:${llamitaState.level}:${llamitaState.embers}:${JSON.stringify(llamitaState.inventory)}:${JSON.stringify(llamitaState.purchasedItems)}:${JSON.stringify(llamitaState.permanentUpgrades)}:${llamitaState.cosmetics.join(",")}`;
    if (runtime.lastSignatures.shop === signature) return;
    runtime.lastSignatures.shop = signature;
    ui.shopBalance.textContent = `${llamitaState.embers} Ember`;
    ui.shopCategories.querySelectorAll("[data-shop-category]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.shopCategory === runtime.shopCategory);
    });
    const items = CONFIG.shopItems.filter((item) => item.category === runtime.shopCategory);
    ui.shopGrid.innerHTML = items.map((item) => {
      const locked = llamitaState.level < item.unlockLevel;
      const ownedCosmetic = item.type === "cosmetic" && llamitaState.cosmetics.includes(item.id);
      const maxed = item.maxOwned && (llamitaState.inventory[item.id] || 0) >= item.maxOwned;
      const activePermanent = item.type === "permanent" ? itemById(llamitaState.permanentUpgrades[item.upgradeFamily]) : null;
      const permanentUnavailable = item.type === "permanent" && activePermanent && Number(activePermanent.tier) >= Number(item.tier);
      const disabled = locked || ownedCosmetic || maxed || permanentUnavailable || llamitaState.embers < item.price;
      const price = ownedCosmetic
        ? "Owned"
        : maxed
          ? "Full"
          : activePermanent?.id === item.id
            ? "Active"
            : permanentUnavailable
              ? "Replaced"
              : `${item.price} \u2666`;
      const ownedCount = ownedItemCount(item);
      const permanentState = item.type !== "permanent"
        ? ""
        : activePermanent?.id === item.id
          ? "Currently active · Highest tier active"
          : permanentUnavailable
            ? `Replaced by ${activePermanent.name}`
            : "Replaces lower tiers";
      return `
        <button class="glow-shop-card" type="button" data-buy-item="${item.id}" ${disabled ? "disabled" : ""}>
          <span class="glow-shop-card-icon" aria-hidden="true">${item.icon}</span>
          <span class="glow-shop-card-copy">
            ${item.type === "permanent" ? '<span class="glow-shop-permanent-tag">Permanent Upgrade</span>' : ""}
            <strong>${escapeHtml(item.name)}</strong>
            <span>${escapeHtml(item.description)}</span>
            ${permanentState ? `<span class="glow-shop-tier-state">${escapeHtml(permanentState)}</span>` : ""}
            <span class="glow-shop-owned">Owned: ${ownedCount}x</span>
          </span>
          <span class="glow-shop-price"><span>${price}</span>${locked ? `<span class="glow-shop-level">Level ${item.unlockLevel}</span>` : ""}</span>
        </button>
      `;
    }).join("");
  }

  function renderInventory() {
    if (!ui.inventoryList) return;
    const signature = `${JSON.stringify(llamitaState.inventory)}:${llamitaState.cosmetics.join(",")}:${llamitaState.activeCosmetic}:${llamitaState.ownedItems.join(",")}`;
    if (runtime.lastSignatures.inventory === signature) return;
    runtime.lastSignatures.inventory = signature;
    const rows = Object.entries(llamitaState.inventory).map(([itemId, count]) => {
      const item = itemById(itemId);
      if (!item || count < 1) return "";
      return `
        <div class="inventory-row">
          <span class="inventory-icon" aria-hidden="true">${item.icon}</span>
          <span class="inventory-copy"><strong>${escapeHtml(item.name)} x${count}</strong><span>${item.type === "boost" ? "One-time use" : "Consumable"} \u2022 ${escapeHtml(item.description)}</span></span>
          <button class="llamita-small-button" type="button" data-use-item="${item.id}">Use</button>
        </div>
      `;
    }).join("");
    ui.inventoryList.innerHTML = rows || '<div class="llamita-empty-state">Your Inventory is waiting for its first tiny treasure.</div>';
    ui.cosmeticsList.innerHTML = llamitaState.cosmetics.length
      ? llamitaState.cosmetics.map((itemId) => {
          const item = itemById(itemId);
          if (!item) return "";
          const active = llamitaState.activeCosmetic === itemId;
          return `
            <div class="inventory-row">
              <span class="inventory-icon" aria-hidden="true">${item.icon}</span>
              <span class="inventory-copy"><strong>${escapeHtml(item.name)}</strong><span>Cosmetic \u2022 Owned</span></span>
              <button class="llamita-secondary-button" type="button" data-equip-cosmetic="${item.id}">${active ? "Remove" : "Equip"}</button>
            </div>
          `;
        }).join("")
      : '<div class="llamita-empty-state">Cosmetics you unlock in the shop will appear here.</div>';
    ui.legacyList.innerHTML = llamitaState.ownedItems.length
      ? llamitaState.ownedItems.map((itemId) => `<div class="inventory-row"><span class="inventory-icon" aria-hidden="true">\u2665</span><span class="inventory-copy"><strong>${escapeHtml(itemId.replaceAll("-", " "))}</strong><span>Owned legacy keepsake \u2022 its original helper effect remains safe</span></span><span class="reward-status">Owned</span></div>`).join("")
      : "";
  }

  function renderDaily() {
    if (!ui.stampGrid) return;
    const today = localDateKey();
    const signature = `${llamitaState.daily.stamps}:${llamitaState.daily.lastClaimDate}:${llamitaState.daily.weeklyReady}:${today}:${llamitaState.embers}`;
    if (runtime.lastSignatures.daily === signature) return;
    runtime.lastSignatures.daily = signature;
    const stamps = [];
    for (let day = 1; day <= CONFIG.daily.stampsRequired; day += 1) {
      const collected = day <= llamitaState.daily.stamps;
      const gift = day === CONFIG.daily.stampsRequired;
      const symbol = collected ? "\u2713" : gift ? "\u2605" : "\u25a1";
      stamps.push(`<div class="glow-stamp ${collected ? "is-collected" : ""} ${gift ? "is-gift" : ""}"><span>Day ${day}</span><span class="glow-stamp-symbol">${symbol}</span></div>`);
    }
    ui.stampGrid.innerHTML = stamps.join("");
    const claimedToday = llamitaState.daily.lastClaimDate === today;
    ui.dailyClaim.disabled = claimedToday || llamitaState.daily.weeklyReady;
    ui.dailyClaim.textContent = claimedToday ? "Come back tomorrow" : "Collect Daily Glow Stamp";
    ui.weeklyClaim.hidden = !llamitaState.daily.weeklyReady;
    ui.dailyStatus.textContent = llamitaState.daily.weeklyReady
      ? "Weekly Glow Bottle unlocked!"
      : claimedToday
        ? "You visited your little flame today. Come back tomorrow for your next stamp."
        : "Collect 7 stamps to unlock a Weekly Glow Bottle.";
  }

  function nextMilestoneReward() {
    return CONFIG.milestoneRewards.find((reward) => reward.level > llamitaState.level) || null;
  }

  function renderRewards() {
    if (!ui.rewardList) return;
    const signature = `${llamitaState.level}:${llamitaState.unlockedRewards.join(",")}:${llamitaState.claimedRewards.join(",")}:${llamitaState.downloadedRewards.join(",")}:${llamitaState.playerName}`;
    if (runtime.lastSignatures.rewards === signature) return;
    runtime.lastSignatures.rewards = signature;
    const next = nextMilestoneReward();
    ui.currentLevel.textContent = `Level ${llamitaState.level}`;
    ui.nextReward.textContent = next ? `${next.name} at Level ${next.level}` : "Legendary path complete";
    ui.rewardDistance.textContent = next ? `Only ${next.level - llamitaState.level} levels left until your next special reward.` : "Every special reward on the Flame Bond Journey is unlocked.";
    const previousLevel = Math.floor(llamitaState.level / 5) * 5;
    const progress = next ? ((llamitaState.level - previousLevel) / Math.max(1, next.level - previousLevel)) * 100 : 100;
    ui.rewardProgress.style.width = `${Math.min(100, progress)}%`;
    ui.rewardList.innerHTML = CONFIG.milestoneRewards.map((reward) => {
      const unlocked = llamitaState.unlockedRewards.includes(reward.id);
      const claimed = llamitaState.claimedRewards.includes(reward.id);
      const downloaded = llamitaState.downloadedRewards.includes(reward.id);
      const status = claimed ? "Claimed" : unlocked ? "Unlocked" : "Locked";
      const here = reward.level === llamitaState.level;
      return `
        <article class="reward-path-card ${unlocked ? "is-unlocked" : ""} ${claimed ? "is-claimed" : ""}">
          <div class="reward-level-badge level-medal is-milestone ${reward.level >= 100 ? "is-legendary" : ""}" aria-label="Level ${reward.level}"><span>${reward.level}</span></div>
          <div class="reward-path-copy">
            ${here ? '<span class="reward-you-are-here">You are here</span>' : ""}
            <span class="reward-status">${status}</span>
            <h4>${escapeHtml(reward.name)}</h4>
            <p>${unlocked ? `Claim Code: ${escapeHtml(llamitaState.rewardClaimCodes[reward.id])}` : `Reach Level ${reward.level} to unlock this personal reward.`}</p>
            ${reward.creative && unlocked ? `<p class="creative-disclaimer">${escapeHtml(CONFIG.creativeDisclaimer)}</p>` : ""}
            <div class="reward-actions">
              <button class="llamita-primary-button" type="button" data-download-reward="${reward.id}" ${unlocked ? "" : "disabled"}>${downloaded ? "Download Again" : "Download Reward Card"}</button>
              ${unlocked && !claimed ? `<button class="llamita-secondary-button" type="button" data-claim-reward="${reward.id}">Mark as Claimed</button>` : ""}
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  function renderSavePanel() {
    if (!ui.saveStatus) return;
    if (document.activeElement !== ui.playerName) ui.playerName.value = llamitaState.playerName;
    ui.saveStatus.textContent = llamitaState.lastSavedAt
      ? `Your progress is safe. Last saved ${new Date(llamitaState.lastSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`
      : "Your progress is safe.";
  }

  function renderArcadeScores() {
    if (!ui.arcadePanel) return;
    ui.arcadePanel.querySelectorAll("[data-high-score]").forEach((element) => {
      element.textContent = String(llamitaState.highScores[element.dataset.highScore] || 0);
    });
    updateQuizBetUi();
    const quizBalance = ui.arcadePanel.querySelector("[data-quiz-balance]");
    if (quizBalance) quizBalance.textContent = String(llamitaState.embers);
  }

  function quizBetSelection() {
    const difficulty = ui.quizDifficulty?.value || "Easy";
    const settings = CONFIG.arcade.quiz.difficulties[difficulty];
    if (ui.quizNoBet?.checked && CONFIG.arcade.quiz.allowNoBet) return { valid: true, bet: 0, difficulty, settings, message: "Playing without a bet." };
    const rawBet = Number(ui.quizBetInput?.value);
    if (!Number.isFinite(rawBet)) return { valid: false, bet: 0, difficulty, settings, message: `Minimum bet: ${CONFIG.arcade.quiz.minimumBet} Ember` };
    const bet = Math.floor(rawBet);
    if (bet < CONFIG.arcade.quiz.minimumBet) return { valid: false, bet, difficulty, settings, message: `Minimum bet: ${CONFIG.arcade.quiz.minimumBet} Ember` };
    if (bet > llamitaState.embers) return { valid: false, bet, difficulty, settings, message: "You do not have enough Ember." };
    return { valid: true, bet, difficulty, settings, message: `Maximum available: ${llamitaState.embers} Ember` };
  }

  function updateQuizBetUi() {
    if (!ui.quizBetInput || !ui.quizDifficulty || !ui.quizBet) return;
    const selection = quizBetSelection();
    const noBet = Boolean(ui.quizNoBet?.checked);
    ui.quizBetInput.disabled = noBet;
    ui.quizBetInput.max = String(llamitaState.embers);
    ui.quizBet.textContent = noBet ? "No bet" : `${Math.max(0, Number(ui.quizBetInput.value) || 0)} Ember`;
    const multiplier = ui.arcadePanel.querySelector("[data-quiz-multiplier]");
    if (multiplier) multiplier.textContent = `${selection.difficulty} reward x${selection.settings.multiplier}`;
    if (ui.quizValidation) {
      ui.quizValidation.textContent = selection.message;
      ui.quizValidation.classList.toggle("is-error", !selection.valid);
    }
  }

  function upgradedRenderLlamita() {
    baseRenderLlamita();
    if (!ui.subnav) return;
    renderStatsAndGrowth();
    renderActiveBoosts();
    renderShop();
    renderInventory();
    renderDaily();
    renderRewards();
    renderSavePanel();
    renderArcadeScores();
  }

  function updateSubnavArrows() {
    if (!ui.subnav || !ui.subnavArrows) return;
    const maxScroll = Math.max(0, ui.subnav.scrollWidth - ui.subnav.clientWidth);
    ui.subnavArrows.forEach((button) => {
      button.disabled = button.dataset.subnavScroll === "left"
        ? ui.subnav.scrollLeft <= 8
        : ui.subnav.scrollLeft >= maxScroll - 2;
    });
  }

  function scrollSubnav(direction) {
    if (!ui.subnav) return;
    const amount = Math.max(150, ui.subnav.clientWidth * 0.72) * (direction === "left" ? -1 : 1);
    ui.subnav.scrollBy({ left: amount, behavior: prefersReducedMotion ? "auto" : "smooth" });
  }

  function setActivePanel(panelId) {
    const previousPanel = runtime.panel;
    runtime.panel = panelId;
    if (previousPanel === "arcade" && panelId !== "arcade") stopArcadeGames();
    ui.subnav.querySelectorAll("[data-llamita-panel-target]").forEach((button) => {
      const active = button.dataset.llamitaPanelTarget === panelId;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });
    document.querySelectorAll("[data-llamita-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.llamitaPanel !== panelId;
    });
    if (panelId === "shop") setLlamitaShopOpen(true);
    upgradedRenderLlamita();
    const activeButton = ui.subnav.querySelector(`[data-llamita-panel-target="${panelId}"]`);
    activeButton?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "nearest", inline: "center" });
    window.setTimeout(updateSubnavArrows, prefersReducedMotion ? 0 : 320);
    window.scrollTo({ top: 0, left: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  }

  function setArcadeGame(gameId) {
    runtime.arcadeGame = gameId;
    ui.arcadePanel.querySelectorAll("[data-arcade-game-target]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.arcadeGameTarget === gameId);
    });
    ui.arcadePanel.querySelectorAll("[data-arcade-game]").forEach((panel) => {
      panel.hidden = panel.dataset.arcadeGame !== gameId;
    });
  }

  function panelMarkup(id, kicker, title, description, body, extraClass = "") {
    return `
      <section class="llamita-system-panel ${extraClass}" data-llamita-panel="${id}" hidden>
        <div class="llamita-panel-heading">
          <span class="llamita-panel-kicker">${escapeHtml(kicker)}</span>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(description)}</p>
        </div>
        ${body}
      </section>
    `;
  }

  function buildArcadeMarkup() {
    const categoryOptions = Object.keys(CONFIG.quizQuestions).map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("");
    const difficultyOptions = Object.keys(CONFIG.arcade.quiz.difficulties).map((difficulty) => `<option value="${difficulty}">${difficulty}</option>`).join("");
    const whackLegend = CONFIG.arcade.whack.symbols.map((target) => `<span class="whack-legend-item"><span aria-hidden="true">${target.symbol}</span>${escapeHtml(target.label)}</span>`).join("");
    return `
      <div class="arcade-tabs" role="tablist" aria-label="Glow Arcade games">
        <button class="arcade-tab is-active" type="button" data-arcade-game-target="whack">Whack-a-Glow</button>
        <button class="arcade-tab" type="button" data-arcade-game-target="flappy">Flappy Flame</button>
        <button class="arcade-tab" type="button" data-arcade-game-target="snake">Snake Spark</button>
        <button class="arcade-tab" type="button" data-arcade-game-target="quiz">Quiz Queen</button>
      </div>
      <div class="arcade-panel-shell">
        <section class="arcade-game" data-arcade-game="whack">
          <div class="arcade-game-head"><h4>Whack-a-Glow</h4><p>Hit the good sparks and avoid danger!</p></div>
          <div class="whack-legend" aria-label="Whack-a-Glow symbol rules">${whackLegend}</div>
          <div class="arcade-scoreline"><span>Score: <strong data-whack-score>0</strong></span><span>Time: <strong data-whack-time>${CONFIG.arcade.whack.durationSeconds}</strong></span><span>High: <strong data-high-score="whack">0</strong></span></div>
          <div class="whack-grid" aria-label="Whack-a-Glow board">${Array.from({ length: 9 }, (_, index) => `<button class="whack-hole" type="button" data-whack-hole="${index}" aria-label="Glow spot ${index + 1}"></button>`).join("")}</div>
          <button class="llamita-primary-button" type="button" data-start-whack>Play</button>
          <div class="arcade-result" data-whack-result aria-live="polite"></div>
        </section>
        <section class="arcade-game" data-arcade-game="flappy" hidden>
          <div class="arcade-game-head"><h4>Flappy Flame</h4><p>Tap to fly. Don't touch the obstacles!</p></div>
          <div class="arcade-scoreline"><span>Score: <strong data-flappy-score>0</strong></span><span>High: <strong data-high-score="flappy">0</strong></span></div>
          <canvas class="arcade-canvas flappy-canvas" data-flappy-canvas width="320" height="360" aria-label="Flappy Flame game"></canvas>
          <button class="llamita-primary-button" type="button" data-start-flappy>Play</button>
          <div class="arcade-result" data-flappy-result aria-live="polite"></div>
        </section>
        <section class="arcade-game" data-arcade-game="snake" hidden>
          <div class="arcade-game-head"><h4>Snake Spark</h4><p>Walls wrap around! Avoid yourself, not the walls.</p></div>
          <div class="arcade-scoreline"><span>Orbs: <strong data-snake-score>0</strong></span><span>High: <strong data-high-score="snake">0</strong></span></div>
          <canvas class="arcade-canvas snake-canvas" data-snake-canvas width="320" height="320" aria-label="Snake Spark game"></canvas>
          <div class="snake-controls" aria-label="Snake Spark controls">
            <button type="button" data-snake-direction="up" aria-label="Move up">\u2191</button>
            <button type="button" data-snake-direction="left" aria-label="Move left">\u2190</button>
            <button type="button" data-snake-direction="down" aria-label="Move down">\u2193</button>
            <button type="button" data-snake-direction="right" aria-label="Move right">\u2192</button>
          </div>
          <button class="llamita-primary-button" type="button" data-start-snake>Play</button>
          <div class="arcade-result" data-snake-result aria-live="polite"></div>
        </section>
        <section class="arcade-game" data-arcade-game="quiz" hidden>
          <div class="arcade-game-head"><h4>Quiz Queen</h4><p>Correct answers multiply your Ember.</p></div>
          <div class="arcade-scoreline"><span>Best: <strong data-high-score="quiz">0</strong> / 5</span><span>Balance: <strong data-quiz-balance>0</strong> Ember</span></div>
          <div class="quiz-setup" data-quiz-setup>
            <label class="save-field"><span>Choose your category.</span><select data-quiz-category>${categoryOptions}</select></label>
            <label class="save-field"><span>Choose your difficulty.</span><select data-quiz-difficulty>${difficultyOptions}</select></label>
            <label class="save-field"><span>Enter your Ember bet</span><input type="number" inputmode="numeric" min="${CONFIG.arcade.quiz.minimumBet}" step="1" value="${CONFIG.arcade.quiz.defaultBet}" data-quiz-bet-input /></label>
            <label class="quiz-no-bet"><input type="checkbox" data-quiz-no-bet /><span>Play without bet</span></label>
            <div class="quiz-bet-note"><span>Your bet</span><strong data-quiz-bet>${CONFIG.arcade.quiz.defaultBet} Ember</strong><span data-quiz-multiplier>Easy reward x1.5</span></div>
            <div class="quiz-validation" data-quiz-validation aria-live="polite">Minimum bet: ${CONFIG.arcade.quiz.minimumBet} Ember</div>
            <button class="llamita-primary-button" type="button" data-start-quiz>Start Quiz</button>
          </div>
          <div class="quiz-question" data-quiz-question hidden>
            <div class="arcade-scoreline"><span>Question <strong data-quiz-number>1</strong> / 5</span><span>Correct: <strong data-quiz-correct>0</strong></span></div>
            <strong data-quiz-prompt></strong>
            <div class="quiz-answers" data-quiz-answers></div>
          </div>
          <div class="arcade-result" data-quiz-result aria-live="polite"></div>
        </section>
      </div>
    `;
  }

  function buildUpgradeUi() {
    const view = document.querySelector("#llamitaView");
    const intro = view?.querySelector(".llamita-intro");
    const petPanel = view?.querySelector(".llamita-main");
    if (!view || !intro || !petPanel) return false;
    petPanel.dataset.llamitaPanel = "pet";
    petPanel.classList.add("llamita-pet-panel");
    document.querySelectorAll(".nav-llamita").forEach((logoIcon) => {
      logoIcon.innerHTML = '<span class="mi-llamita-logo-flame" aria-hidden="true">🔥</span>';
      logoIcon.classList.add("mi-llamita-logo-mark");
    });
    const label = petPanel.querySelector('[data-need="hunger"] .llamita-need-head span');
    if (label) label.textContent = "Hunger";
    const loveNeed = petPanel.querySelector('[data-need="love"]');
    if (loveNeed) loveNeed.insertAdjacentHTML("beforeend", '<span class="llamita-love-bonus" id="llamitaLoveBonus" title="Keep Love high to earn small bonus rewards.">Love Bonus · Current bonus: x1.00</span>');

    intro.insertAdjacentHTML("afterend", `
      <div class="llamita-subnav-shell">
        <button class="llamita-subnav-arrow" type="button" data-subnav-scroll="left" aria-label="Scroll tabs left">\u2039</button>
        <nav class="llamita-subnav" id="llamitaSubnav" aria-label="Mi llamita areas">
          ${[
            ["pet", "\u2665", "Pet / Home"],
            ["shop", "\u2666", "Little Glow Shop"],
            ["inventory", "\u25c7", "Inventory"],
            ["arcade", "\u2605", "Glow Arcade"],
            ["daily", "\u2600", "Daily Glow Stamps"],
            ["path", "\u2726", "Reward Path"],
            ["save", "\u2713", "Save / Load"]
          ].map(([id, icon, name], index) => `<button class="llamita-subnav-button ${index === 0 ? "is-active" : ""}" type="button" role="tab" data-llamita-panel-target="${id}" aria-selected="${index === 0}"><span class="llamita-subnav-icon" aria-hidden="true">${icon}</span>${name}</button>`).join("")}
        </nav>
        <button class="llamita-subnav-arrow" type="button" data-subnav-scroll="right" aria-label="Scroll tabs right">\u203a</button>
      </div>
    `);

    const growth = petPanel.querySelector(".llamita-growth");
    if (growth) growth.insertAdjacentHTML("afterend", '<div class="llamita-active-boosts" id="llamitaPetBoosts" aria-label="Active Boosts"></div>');
    const cosmeticLayer = document.createElement("div");
    cosmeticLayer.className = "llamita-cosmetic-layer";
    cosmeticLayer.setAttribute("aria-hidden", "true");
    llamitaHabitat.appendChild(cosmeticLayer);

    view.insertAdjacentHTML("beforeend", panelMarkup("shop", "Care and treasures", "Little Glow Shop", "In-game care items, boosts, XP helpers, and tiny cosmetics.", `
      <div class="shop-sticky-summary" id="shopCurrentStats">
        <span class="shop-stats-title">Current Stats</span>
        <span class="shop-stat"><small>Hunger</small><strong data-shop-stat="hunger">0/100</strong></span>
        <span class="shop-stat"><small>Joy</small><strong data-shop-stat="joy">0/100</strong></span>
        <span class="shop-stat"><small>Rest</small><strong data-shop-stat="rest">0/100</strong></span>
        <span class="shop-stat is-ember"><small>Ember</small><strong data-shop-stat="ember">0</strong></span>
      </div>
      <div class="llamita-upgrade-balance"><span>Your balance</span><strong id="upgradeShopBalance">0 Ember</strong></div>
    `, "llamita-shop-panel"));
    const shopPanel = view.querySelector('[data-llamita-panel="shop"]');
    shopPanel.appendChild(llamitaShop);
    const shopDescription = llamitaShop.querySelector(".llamita-shop-copy span");
    if (shopDescription) shopDescription.textContent = "Care items, boosts, and tiny treasures";
    llamitaShopBody.innerHTML = `
      <div class="llamita-shop-categories" id="llamitaShopCategories">${CONFIG.shopCategories.map((category, index) => `<button class="llamita-shop-category ${index === 0 ? "is-active" : ""}" type="button" data-shop-category="${category.id}">${category.label}</button>`).join("")}</div>
      <div class="llamita-shop-grid-upgrade" id="llamitaShopGridUpgrade"></div>
    `;

    view.insertAdjacentHTML("beforeend", panelMarkup("inventory", "Your tiny collection", "Inventory", "Use consumables, activate one-time boosts, and choose a cosmetic.", `
      <section class="inventory-section"><div class="inventory-section-head"><h4>Active Boosts</h4></div><div class="active-boost-list" id="inventoryBoosts"></div></section>
      <section class="inventory-section"><div class="inventory-section-head"><h4>Permanent Upgrades</h4></div><div class="active-boost-list" id="inventoryUpgrades"></div></section>
      <section class="inventory-section"><div class="inventory-section-head"><h4>Consumables and Boosts</h4></div><div class="inventory-list" id="inventoryList"></div></section>
      <section class="inventory-section"><div class="inventory-section-head"><h4>Cosmetics</h4></div><div class="inventory-list" id="cosmeticsList"></div></section>
      <section class="inventory-section"><div class="inventory-section-head"><h4>Original Keepsakes</h4></div><div class="inventory-list" id="legacyKeepsakes"></div></section>
    `));

    view.insertAdjacentHTML("beforeend", panelMarkup("arcade", "Play and glow", "Glow Arcade", "Four little games can earn Ember, XP, and new high-score bonuses.", buildArcadeMarkup()));

    view.insertAdjacentHTML("beforeend", panelMarkup("daily", "A little hello each day", "Daily Glow Stamps", "One visit per calendar day brings a stamp and a warm reward.", `
      <div class="daily-card">
        <div class="stamp-grid" id="glowStampGrid"></div>
        <div class="daily-reward-note" id="dailyGlowStatus">Collect 7 stamps to unlock a Weekly Glow Bottle.</div>
        <div class="daily-actions">
          <button class="llamita-primary-button" type="button" id="dailyGlowClaim">Collect Daily Glow Stamp</button>
          <button class="llamita-primary-button" type="button" id="weeklyGlowClaim" hidden>Claim Weekly Glow Bottle</button>
        </div>
        <div class="daily-reward-note">Daily reward: +50 Ember and a small XP glow. The Weekly Glow Bottle gives 60 minutes of double XP, slower stat drain, and +200 Ember.</div>
      </div>
    `));

    view.insertAdjacentHTML("beforeend", panelMarkup("path", "Flame Bond Journey", "Reward Path", "Large personal rewards are unlocked only by caring and leveling, never by buying them in the shop.", `
      <div class="reward-path-summary">
        <div class="reward-summary-block"><span>Current Level</span><strong id="rewardCurrentLevel">Level 1</strong></div>
        <div class="reward-summary-block"><span>Next Reward</span><strong id="rewardNextReward">Level 5</strong></div>
      </div>
      <div class="reward-you-are-here">You are here</div>
      <div class="reward-progress-track"><span id="rewardPathProgress"></span></div>
      <p class="daily-reward-note" id="rewardDistance"></p>
      <div class="reward-path-list" id="rewardPathList"></div>
      <p class="daily-reward-note">Send this card to Ren\u00e9 to claim your reward.</p>
    `));

    view.insertAdjacentHTML("beforeend", panelMarkup("save", "Keep the glow safe", "Save / Load", "Your game saves automatically after every important action.", `
      <div class="save-form">
        <div class="save-field"><label for="llamitaPlayerName">Player name or nickname</label><input id="llamitaPlayerName" type="text" maxlength="28" autocomplete="nickname" /></div>
        <div class="save-actions">
          <button class="llamita-primary-button" type="button" id="saveGameButton">Save Game</button>
          <button class="llamita-secondary-button" type="button" id="loadGameButton">Load Game</button>
          <button class="llamita-secondary-button" type="button" id="exportBackupButton">Export Backup</button>
          <button class="llamita-secondary-button" type="button" id="importBackupButton">Import Backup</button>
          <input id="importBackupInput" type="file" accept="application/json,.json" hidden />
        </div>
        <div class="save-status" id="llamitaSaveStatus" aria-live="polite">Your progress is safe.</div>
      </div>
    `));

    document.body.insertAdjacentHTML("beforeend", `
      <div class="llamita-toast" id="llamitaToast" role="status" aria-live="polite"></div>
      <div class="llamita-modal-backdrop" id="llamitaLevelBackdrop" hidden>
        <section class="llamita-level-modal" id="llamitaLevelModal" role="dialog" aria-modal="true" aria-labelledby="levelUpTitle">
          <div class="level-medal level-medal-popup" aria-hidden="true"><span data-level-number>1</span></div>
          <h3 id="levelUpTitle" data-level-title>Level Up!</h3>
          <p data-level-copy>Your little flame grew stronger.</p>
          <ul class="level-up-list" data-level-list></ul>
          <button class="llamita-primary-button" type="button" id="closeLevelUp">Keep glowing</button>
        </section>
      </div>
    `);
    cacheUi();
    bindUpgradeEvents();
    return true;
  }

  function cacheUi() {
    ui.subnav = document.querySelector("#llamitaSubnav");
    ui.subnavArrows = Array.from(document.querySelectorAll("[data-subnav-scroll]"));
    ui.petBoosts = document.querySelector("#llamitaPetBoosts");
    ui.loveBonus = document.querySelector("#llamitaLoveBonus");
    ui.shopStats = document.querySelector("#shopCurrentStats");
    ui.shopBalance = document.querySelector("#upgradeShopBalance");
    ui.shopCategories = document.querySelector("#llamitaShopCategories");
    ui.shopGrid = document.querySelector("#llamitaShopGridUpgrade");
    ui.inventoryBoosts = document.querySelector("#inventoryBoosts");
    ui.inventoryUpgrades = document.querySelector("#inventoryUpgrades");
    ui.inventoryList = document.querySelector("#inventoryList");
    ui.cosmeticsList = document.querySelector("#cosmeticsList");
    ui.legacyList = document.querySelector("#legacyKeepsakes");
    ui.stampGrid = document.querySelector("#glowStampGrid");
    ui.dailyStatus = document.querySelector("#dailyGlowStatus");
    ui.dailyClaim = document.querySelector("#dailyGlowClaim");
    ui.weeklyClaim = document.querySelector("#weeklyGlowClaim");
    ui.currentLevel = document.querySelector("#rewardCurrentLevel");
    ui.nextReward = document.querySelector("#rewardNextReward");
    ui.rewardProgress = document.querySelector("#rewardPathProgress");
    ui.rewardDistance = document.querySelector("#rewardDistance");
    ui.rewardList = document.querySelector("#rewardPathList");
    ui.playerName = document.querySelector("#llamitaPlayerName");
    ui.saveStatus = document.querySelector("#llamitaSaveStatus");
    ui.toast = document.querySelector("#llamitaToast");
    ui.levelBackdrop = document.querySelector("#llamitaLevelBackdrop");
    ui.levelModal = document.querySelector("#llamitaLevelModal");
    ui.arcadePanel = document.querySelector('[data-llamita-panel="arcade"]');
    ui.quizDifficulty = document.querySelector("[data-quiz-difficulty]");
    ui.quizBet = document.querySelector("[data-quiz-bet]");
    ui.quizBetInput = document.querySelector("[data-quiz-bet-input]");
    ui.quizNoBet = document.querySelector("[data-quiz-no-bet]");
    ui.quizValidation = document.querySelector("[data-quiz-validation]");
  }

  function claimDailyStamp() {
    const today = localDateKey();
    if (llamitaState.daily.lastClaimDate === today || llamitaState.daily.weeklyReady) return;
    llamitaState.daily.lastClaimDate = today;
    llamitaState.daily.stamps = Math.min(CONFIG.daily.stampsRequired, llamitaState.daily.stamps + 1);
    llamitaState.daily.totalClaims += 1;
    const embers = awardEmbers(CONFIG.daily.emberReward);
    llamitaState.embers += embers;
    upgradedGrantLlamitaProgress(CONFIG.daily.xpReward, 0);
    if (llamitaState.daily.stamps >= CONFIG.daily.stampsRequired) llamitaState.daily.weeklyReady = true;
    upgradedSaveLlamitaState();
    upgradedRenderLlamita();
    showToast(`Daily Glow Stamp collected! Reward: +${embers} Ember`);
    setLlamitaMessage("You visited your little flame today. That made my whole glow smile.", 8000);
  }

  function claimWeeklyBottle() {
    if (!llamitaState.daily.weeklyReady) return;
    const embers = awardEmbers(CONFIG.daily.weeklyEmberReward);
    llamitaState.embers += embers;
    activateBoost({
      group: "weekly",
      xpMultiplier: CONFIG.daily.weeklyXpMultiplier,
      decayMultiplier: CONFIG.daily.weeklyDecayMultiplier,
      durationMinutes: CONFIG.daily.weeklyDurationMinutes
    }, "Weekly Glow Bottle", "weekly-glow-bottle");
    llamitaState.daily.stamps = 0;
    llamitaState.daily.weeklyReady = false;
    llamitaState.daily.totalWeeks += 1;
    upgradedSaveLlamitaState();
    upgradedRenderLlamita();
    showToast("Weekly reward claimed! Double XP active and stats decrease slower for 60 minutes.");
    setLlamitaMessage("Weekly Glow Bottle unlocked! My glow feels wonderfully radiant.", 9000);
  }

  function wrapCanvasText(context, text, x, y, maxWidth, lineHeight, maxLines = 4) {
    const words = String(text).split(/\s+/);
    const lines = [];
    let line = "";
    words.forEach((word) => {
      const test = line ? `${line} ${word}` : word;
      if (context.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);
    lines.slice(0, maxLines).forEach((entry, index) => context.fillText(entry, x, y + index * lineHeight));
    return y + Math.min(lines.length, maxLines) * lineHeight;
  }

  function drawRewardMedal(context, level, centerX, centerY, radius) {
    context.save();
    context.translate(centerX, centerY);
    const gold = context.createRadialGradient(-radius * 0.35, -radius * 0.42, radius * 0.08, 0, 0, radius * 1.2);
    gold.addColorStop(0, "#fff6b0");
    gold.addColorStop(0.3, "#f6ce58");
    gold.addColorStop(0.7, "#b86b12");
    gold.addColorStop(1, "#6f3906");
    const blue = context.createRadialGradient(-radius * 0.3, -radius * 0.38, radius * 0.08, 0, 0, radius);
    blue.addColorStop(0, "#67d8ff");
    blue.addColorStop(0.34, "#176bc5");
    blue.addColorStop(0.72, "#092e77");
    blue.addColorStop(1, "#03163d");
    [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((angle) => {
      const x = Math.cos(angle) * radius * 1.12;
      const y = Math.sin(angle) * radius * 1.12;
      context.save();
      context.translate(x, y);
      context.rotate(angle + Math.PI / 4);
      context.fillStyle = gold;
      context.fillRect(-radius * 0.18, -radius * 0.18, radius * 0.36, radius * 0.36);
      context.fillStyle = "#53c9ff";
      context.fillRect(-radius * 0.105, -radius * 0.105, radius * 0.21, radius * 0.21);
      context.restore();
    });
    context.fillStyle = gold;
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = blue;
    context.beginPath();
    context.arc(0, 0, radius * 0.78, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(255,255,255,0.56)";
    context.lineWidth = Math.max(2, radius * 0.035);
    context.beginPath();
    context.arc(-radius * 0.08, -radius * 0.08, radius * 0.57, Math.PI * 1.08, Math.PI * 1.72);
    context.stroke();
    context.textAlign = "center";
    context.fillStyle = "#f8d568";
    context.shadowColor = "rgba(0,0,0,0.65)";
    context.shadowBlur = radius * 0.08;
    context.font = `900 ${Math.max(38, radius * 0.72)}px Segoe UI, sans-serif`;
    context.fillText(String(level), 0, radius * 0.24);
    context.shadowBlur = 0;
    context.fillStyle = "#bfeaff";
    context.font = `800 ${Math.max(12, radius * 0.14)}px Segoe UI, sans-serif`;
    context.fillText("LEVEL", 0, -radius * 0.35);
    context.restore();
  }

  function downloadRewardCard(rewardId) {
    const reward = CONFIG.milestoneRewards.find((entry) => entry.id === rewardId);
    if (!reward || !llamitaState.unlockedRewards.includes(reward.id)) return;
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 675;
    const context = canvas.getContext("2d");
    const gradient = context.createLinearGradient(0, 0, 1200, 675);
    gradient.addColorStop(0, "#35171f");
    gradient.addColorStop(0.58, "#6a2e39");
    gradient.addColorStop(1, "#9f4b4e");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 1200, 675);
    context.strokeStyle = "#f3c55b";
    context.lineWidth = 5;
    context.strokeRect(28, 28, 1144, 619);
    context.strokeStyle = "rgba(255,255,255,0.3)";
    context.lineWidth = 2;
    context.strokeRect(42, 42, 1116, 591);
    context.textAlign = "left";
    context.fillStyle = "#f8d56f";
    context.font = "800 34px Segoe UI, sans-serif";
    context.fillText("GOOD MOOD TO GO", 82, 105);
    context.fillStyle = "#fff8e8";
    context.font = "900 64px Segoe UI, sans-serif";
    context.fillText(`LEVEL ${reward.level} REACHED`, 82, 185);
    context.font = "500 28px Segoe UI, sans-serif";
    wrapCanvasText(context, "Your little flame grew stronger because of your care.", 82, 235, 760, 38, 2);
    context.fillStyle = "#ffd978";
    context.font = "700 25px Segoe UI, sans-serif";
    context.fillText("REWARD UNLOCKED", 82, 325);
    context.fillStyle = "#fff";
    context.font = "800 42px Segoe UI, sans-serif";
    const afterReward = wrapCanvasText(context, reward.name, 82, 375, 760, 50, 3);
    context.fillStyle = "#ffe8b0";
    context.font = "700 26px Consolas, monospace";
    context.fillText(`Claim Code: ${llamitaState.rewardClaimCodes[reward.id]}`, 82, Math.max(500, afterReward + 24));
    context.fillStyle = "rgba(255,255,255,0.86)";
    context.font = "500 21px Segoe UI, sans-serif";
    context.fillText(`Unlocked for ${llamitaState.playerName} on ${readableDate(llamitaState.rewardUnlockDates[reward.id])}`, 82, 548);
    context.fillText("Send this card to Ren\u00e9 to claim your reward.", 82, 585);
    context.font = "500 17px Segoe UI, sans-serif";
    context.fillText("This reward is personal and can only be claimed once.", 82, 615);
    drawRewardMedal(context, reward.level, 1010, 280, 105);
    context.save();
    context.textAlign = "center";
    context.strokeStyle = "rgba(248,213,111,0.55)";
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(924, 568);
    context.lineTo(1096, 568);
    context.stroke();
    context.fillStyle = "#fff0bd";
    context.shadowColor = "rgba(255,215,110,0.5)";
    context.shadowBlur = 10;
    context.font = 'italic 700 26px "Segoe Script", "Brush Script MT", cursive';
    context.fillText("by Silituz", 1010, 610);
    context.restore();

    const link = document.createElement("a");
    link.download = `reward-card-level-${reward.level}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    if (!llamitaState.downloadedRewards.includes(reward.id)) llamitaState.downloadedRewards.push(reward.id);
    upgradedSaveLlamitaState();
    upgradedRenderLlamita();
    showToast("Reward Card downloaded. Send this card to Ren\u00e9 to claim your reward.");
  }

  function markRewardClaimed(rewardId) {
    if (!llamitaState.unlockedRewards.includes(rewardId) || llamitaState.claimedRewards.includes(rewardId)) return;
    llamitaState.claimedRewards.push(rewardId);
    upgradedSaveLlamitaState();
    upgradedRenderLlamita();
    showToast("Reward marked as claimed.");
  }

  function exportBackup() {
    upgradedSaveLlamitaState();
    const payload = {
      kind: CONFIG.backupKind,
      version: CONFIG.saveVersion,
      exportedAt: new Date().toISOString(),
      state: llamitaState
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mi-llamita-backup-${localDateKey()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Backup exported. Your progress is safe.");
  }

  function stopArcadeGames() {
    finishWhack(false);
    endFlappy(false);
    endSnake(false);
  }

  function loadGame() {
    stopArcadeGames();
    llamitaState = upgradedLoadLlamitaState();
    upgradedApplyLlamitaTime();
    upgradedSaveLlamitaState();
    runtime.lastSignatures = {};
    upgradedRenderLlamita();
    showToast("Game loaded. Your progress is safe.");
  }

  async function importBackup(file) {
    try {
      const payload = JSON.parse(await file.text());
      if (!payload || payload.kind !== CONFIG.backupKind || !payload.state || typeof payload.state !== "object") throw new Error("invalid");
      if (!Number.isFinite(Number(payload.state.level)) || !Number.isFinite(Number(payload.state.hunger))) throw new Error("invalid");
      stopArcadeGames();
      llamitaState = migrateLlamitaState(payload.state);
      llamitaState.lastUpdated = Date.now();
      upgradedSaveLlamitaState();
      runtime.lastSignatures = {};
      upgradedRenderLlamita();
      showToast("Backup imported successfully!");
      ui.saveStatus.textContent = "Backup imported successfully!";
    } catch {
      showToast("Invalid backup file.");
      ui.saveStatus.textContent = "Invalid backup file.";
    }
  }

  function bindUpgradeEvents() {
    ui.subnav.addEventListener("click", (event) => {
      const button = event.target.closest("[data-llamita-panel-target]");
      if (button) setActivePanel(button.dataset.llamitaPanelTarget);
    });
    ui.subnavArrows.forEach((button) => button.addEventListener("click", () => scrollSubnav(button.dataset.subnavScroll)));
    ui.subnav.addEventListener("scroll", updateSubnavArrows, { passive: true });
    ui.subnav.addEventListener("wheel", (event) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || ui.subnav.scrollWidth <= ui.subnav.clientWidth) return;
      event.preventDefault();
      ui.subnav.scrollLeft += event.deltaY;
    }, { passive: false });
    window.addEventListener("resize", updateSubnavArrows, { passive: true });
    llamitaShopBody.addEventListener("click", (event) => {
      const category = event.target.closest("[data-shop-category]");
      if (category) {
        runtime.shopCategory = category.dataset.shopCategory;
        runtime.lastSignatures.shop = "";
        renderShop();
        return;
      }
      const buy = event.target.closest("[data-buy-item]");
      if (buy) upgradedBuyLlamitaItem(buy.dataset.buyItem);
    });
    document.querySelector('[data-llamita-panel="inventory"]').addEventListener("click", (event) => {
      const use = event.target.closest("[data-use-item]");
      if (use) useInventoryItem(use.dataset.useItem);
      const equip = event.target.closest("[data-equip-cosmetic]");
      if (equip) equipCosmetic(equip.dataset.equipCosmetic);
    });
    ui.dailyClaim.addEventListener("click", claimDailyStamp);
    ui.weeklyClaim.addEventListener("click", claimWeeklyBottle);
    ui.rewardList.addEventListener("click", (event) => {
      const download = event.target.closest("[data-download-reward]");
      if (download) downloadRewardCard(download.dataset.downloadReward);
      const claim = event.target.closest("[data-claim-reward]");
      if (claim) markRewardClaimed(claim.dataset.claimReward);
    });
    document.querySelector("#saveGameButton").addEventListener("click", () => upgradedSaveLlamitaState(true));
    document.querySelector("#loadGameButton").addEventListener("click", loadGame);
    document.querySelector("#exportBackupButton").addEventListener("click", exportBackup);
    document.querySelector("#importBackupButton").addEventListener("click", () => document.querySelector("#importBackupInput").click());
    document.querySelector("#importBackupInput").addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (file) importBackup(file);
      event.target.value = "";
    });
    ui.playerName.addEventListener("change", () => {
      llamitaState.playerName = ui.playerName.value.trim().slice(0, 28) || "Little Sister";
      upgradedSaveLlamitaState();
      runtime.lastSignatures.rewards = "";
      upgradedRenderLlamita();
    });
    document.querySelector("#closeLevelUp").addEventListener("click", closeLevelPopup);
    ui.levelBackdrop.addEventListener("click", (event) => {
      if (event.target === ui.levelBackdrop) closeLevelPopup();
    });
    bindArcadeEvents();
    updateSubnavArrows();
  }

  function registerArcadePlay() {
    const today = localDateKey();
    if (llamitaState.arcade.lastPlayDate !== today) {
      llamitaState.arcade.lastPlayDate = today;
      llamitaState.arcade.playsToday = 0;
    }
    llamitaState.arcade.playsToday += 1;
  }

  function awardArcadeResult(game, score, baseEmbers, baseXp, highScoreBonus, resultElement) {
    const previousHigh = Number(llamitaState.highScores[game]) || 0;
    const isHighScore = score > previousHigh;
    if (isHighScore) llamitaState.highScores[game] = score;
    registerArcadePlay();
    const emberBase = Math.max(0, baseEmbers) + (isHighScore ? highScoreBonus : 0);
    const emberEarned = awardEmbers(emberBase);
    const xpEarned = Math.max(0, baseXp) * xpMultiplier();
    upgradedGrantLlamitaProgress(baseXp, emberBase);
    upgradedSaveLlamitaState();
    runtime.lastSignatures.shop = "";
    runtime.lastSignatures.rewards = "";
    upgradedRenderLlamita();
    const highText = isHighScore ? "New High Score! You broke your record and earned bonus Ember! " : "";
    resultElement.textContent = `${highText}Ember earned: ${emberEarned}. XP earned: ${xpEarned.toFixed(1)}.`;
    showToast(resultElement.textContent);
  }

  function clearWhackBoard() {
    document.querySelectorAll("[data-whack-hole]").forEach((hole) => {
      CONFIG.arcade.whack.symbols.forEach((target) => hole.classList.remove(`is-${target.id}`));
      hole.textContent = "";
      hole.setAttribute("aria-label", `Empty glow spot ${Number(hole.dataset.whackHole) + 1}`);
    });
    runtime.whack.activeIndex = -1;
    runtime.whack.target = null;
  }

  function randomWhackTarget() {
    const totalWeight = CONFIG.arcade.whack.symbols.reduce((sum, target) => sum + Number(target.weight || 0), 0);
    let roll = Math.random() * totalWeight;
    return CONFIG.arcade.whack.symbols.find((target) => {
      roll -= Number(target.weight || 0);
      return roll <= 0;
    }) || CONFIG.arcade.whack.symbols[0];
  }

  function spawnWhackTarget() {
    if (!runtime.whack.running) return;
    clearWhackBoard();
    const holes = Array.from(document.querySelectorAll("[data-whack-hole]"));
    const index = Math.floor(Math.random() * holes.length);
    const target = randomWhackTarget();
    runtime.whack.activeIndex = index;
    runtime.whack.target = target;
    holes[index].classList.add(`is-${target.id}`);
    holes[index].textContent = target.symbol;
    holes[index].setAttribute("aria-label", `${target.id}: ${target.label}`);
  }

  function startWhack() {
    finishWhack(false);
    runtime.whack.running = true;
    runtime.whack.score = 0;
    runtime.whack.endsAt = Date.now() + CONFIG.arcade.whack.durationSeconds * 1000;
    document.querySelector("[data-whack-score]").textContent = "0";
    document.querySelector("[data-whack-result]").textContent = "Hit the good sparks and avoid danger!";
    document.querySelector("[data-start-whack]").disabled = true;
    spawnWhackTarget();
    runtime.whack.spawnTimer = window.setInterval(spawnWhackTarget, 680);
    runtime.whack.roundTimer = window.setInterval(() => {
      const seconds = Math.max(0, Math.ceil((runtime.whack.endsAt - Date.now()) / 1000));
      document.querySelector("[data-whack-time]").textContent = String(seconds);
      if (seconds <= 0) finishWhack(true);
    }, 200);
  }

  function hitWhack(index) {
    if (!runtime.whack.running || Number(index) !== runtime.whack.activeIndex) return;
    const target = runtime.whack.target;
    if (!target) return;
    runtime.whack.score = target.resetScore ? 0 : Math.max(0, runtime.whack.score + Number(target.points || 0));
    document.querySelector("[data-whack-score]").textContent = String(runtime.whack.score);
    document.querySelector("[data-whack-result]").textContent = `${target.symbol} ${target.label}`;
    clearWhackBoard();
  }

  function finishWhack(giveReward = true) {
    window.clearInterval(runtime.whack.spawnTimer);
    window.clearInterval(runtime.whack.roundTimer);
    const wasRunning = runtime.whack.running;
    runtime.whack.running = false;
    clearWhackBoard();
    const startButton = document.querySelector("[data-start-whack]");
    if (startButton) startButton.disabled = false;
    if (!wasRunning || !giveReward) return;
    const score = runtime.whack.score;
    const baseEmbers = Math.min(CONFIG.arcade.whack.maxBaseEmber, Math.max(10, 10 + score * 2));
    const xp = score >= CONFIG.arcade.whack.strongScore ? CONFIG.arcade.whack.strongXp : Math.max(1, Math.floor(score / 3));
    awardArcadeResult("whack", score, baseEmbers, xp, CONFIG.arcade.whack.highScoreBonus, document.querySelector("[data-whack-result]"));
    document.querySelector("[data-whack-time]").textContent = String(CONFIG.arcade.whack.durationSeconds);
  }

  function drawFlappy() {
    const canvas = document.querySelector("[data-flappy-canvas]");
    if (!canvas) return;
    const context = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    const sky = context.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, "#dff5f2");
    sky.addColorStop(1, "#fff1d6");
    context.fillStyle = sky;
    context.fillRect(0, 0, width, height);
    context.fillStyle = "rgba(255,255,255,0.58)";
    context.beginPath();
    context.arc(58, 65, 26, 0, Math.PI * 2);
    context.arc(88, 65, 19, 0, Math.PI * 2);
    context.fill();

    runtime.flappy.obstacles.forEach((obstacle) => {
      context.fillStyle = "#5b997d";
      context.fillRect(obstacle.x, 0, obstacle.width, obstacle.gapY - obstacle.gap / 2);
      context.fillRect(obstacle.x, obstacle.gapY + obstacle.gap / 2, obstacle.width, height);
      context.fillStyle = "#79b997";
      context.fillRect(obstacle.x - 3, obstacle.gapY - obstacle.gap / 2 - 12, obstacle.width + 6, 12);
      context.fillRect(obstacle.x - 3, obstacle.gapY + obstacle.gap / 2, obstacle.width + 6, 12);
    });

    const x = 70;
    const y = runtime.flappy.flameY;
    const spriteWidth = CONFIG.arcade.flappy.spriteWidth;
    const spriteHeight = CONFIG.arcade.flappy.spriteHeight;
    context.save();
    context.translate(x, y);
    context.rotate(Math.max(-0.24, Math.min(0.3, runtime.flappy.velocity / 900)));
    context.shadowColor = "rgba(255, 157, 49, 0.42)";
    context.shadowBlur = 12;
    if (flappySprite.complete && flappySprite.naturalWidth) {
      context.drawImage(flappySprite, -spriteWidth / 2, -spriteHeight / 2, spriteWidth, spriteHeight);
    } else {
      const glow = context.createRadialGradient(0, 0, 2, 0, 0, 18);
      glow.addColorStop(0, "#fff8a8");
      glow.addColorStop(0.45, "#ffb13f");
      glow.addColorStop(1, "#e55347");
      context.fillStyle = glow;
      context.beginPath();
      context.arc(0, 0, 14, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }

  function flapFlame() {
    if (!runtime.flappy.running) return;
    runtime.flappy.velocity = -255;
  }

  function startFlappy() {
    endFlappy(false);
    runtime.flappy.running = true;
    runtime.flappy.lastTime = 0;
    runtime.flappy.flameY = 180;
    runtime.flappy.velocity = 0;
    runtime.flappy.obstacles = [];
    runtime.flappy.spawnClock = 0;
    runtime.flappy.score = 0;
    document.querySelector("[data-flappy-score]").textContent = "0";
    document.querySelector("[data-flappy-result]").textContent = "Tap to fly.";
    document.querySelector("[data-start-flappy]").disabled = true;
    runtime.flappy.frame = window.requestAnimationFrame(updateFlappy);
  }

  function updateFlappy(timestamp) {
    if (!runtime.flappy.running) return;
    if (!runtime.flappy.lastTime) runtime.flappy.lastTime = timestamp;
    const delta = Math.min(0.034, Math.max(0.001, (timestamp - runtime.flappy.lastTime) / 1000));
    runtime.flappy.lastTime = timestamp;
    runtime.flappy.velocity += 610 * delta;
    runtime.flappy.flameY += runtime.flappy.velocity * delta;
    runtime.flappy.spawnClock += delta;
    if (runtime.flappy.spawnClock >= 1.55) {
      runtime.flappy.spawnClock = 0;
      runtime.flappy.obstacles.push({
        x: 330,
        width: 44,
        gap: 112,
        gapY: 92 + Math.random() * 176,
        passed: false
      });
    }
    runtime.flappy.obstacles.forEach((obstacle) => {
      obstacle.x -= 112 * delta;
      if (!obstacle.passed && obstacle.x + obstacle.width < 70) {
        obstacle.passed = true;
        runtime.flappy.score += 1;
        document.querySelector("[data-flappy-score]").textContent = String(runtime.flappy.score);
      }
    });
    runtime.flappy.obstacles = runtime.flappy.obstacles.filter((obstacle) => obstacle.x + obstacle.width > -8);

    const radius = CONFIG.arcade.flappy.hitboxRadius;
    let collision = runtime.flappy.flameY - radius <= 0 || runtime.flappy.flameY + radius >= 360;
    runtime.flappy.obstacles.forEach((obstacle) => {
      const overlapsX = 70 + radius > obstacle.x && 70 - radius < obstacle.x + obstacle.width;
      const outsideGap = runtime.flappy.flameY - radius < obstacle.gapY - obstacle.gap / 2 || runtime.flappy.flameY + radius > obstacle.gapY + obstacle.gap / 2;
      if (overlapsX && outsideGap) collision = true;
    });
    drawFlappy();
    if (collision) {
      endFlappy(true);
      return;
    }
    runtime.flappy.frame = window.requestAnimationFrame(updateFlappy);
  }

  function endFlappy(giveReward = true) {
    const wasRunning = runtime.flappy.running;
    runtime.flappy.running = false;
    window.cancelAnimationFrame(runtime.flappy.frame);
    const startButton = document.querySelector("[data-start-flappy]");
    if (startButton) startButton.disabled = false;
    if (!wasRunning || !giveReward) {
      drawFlappy();
      return;
    }
    const score = runtime.flappy.score;
    const baseEmbers = score >= 25 ? CONFIG.arcade.flappy.score25Ember : score >= 10 ? CONFIG.arcade.flappy.score10Ember : Math.max(5, score * 2);
    const xp = score >= 50 ? CONFIG.arcade.flappy.score50Xp : Math.max(1, Math.floor(score / 4));
    awardArcadeResult("flappy", score, baseEmbers, xp, CONFIG.arcade.flappy.highScoreBonus, document.querySelector("[data-flappy-result]"));
  }

  function randomSnakeFood() {
    const gridSize = CONFIG.arcade.snake.gridSize;
    const occupied = new Set(runtime.snake.body.map((part) => `${part.x}:${part.y}`));
    let food;
    do {
      food = { x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) };
    } while (occupied.has(`${food.x}:${food.y}`));
    return food;
  }

  function drawSnake() {
    const canvas = document.querySelector("[data-snake-canvas]");
    if (!canvas) return;
    const context = canvas.getContext("2d");
    const gridSize = CONFIG.arcade.snake.gridSize;
    const cellSize = canvas.width / gridSize;
    context.fillStyle = "#fff2df";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "rgba(112,76,66,0.06)";
    context.lineWidth = 1;
    for (let index = cellSize; index < canvas.width; index += cellSize) {
      context.beginPath();
      context.moveTo(index, 0);
      context.lineTo(index, canvas.height);
      context.moveTo(0, index);
      context.lineTo(canvas.width, index);
      context.stroke();
    }
    context.fillStyle = "#f5a83d";
    context.beginPath();
    context.arc(runtime.snake.food.x * cellSize + cellSize / 2, runtime.snake.food.y * cellSize + cellSize / 2, cellSize * 0.38, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#ffe46f";
    context.beginPath();
    context.arc(runtime.snake.food.x * cellSize + cellSize * 0.38, runtime.snake.food.y * cellSize + cellSize * 0.38, cellSize * 0.13, 0, Math.PI * 2);
    context.fill();
    runtime.snake.body.forEach((part, index) => {
      context.fillStyle = index === 0 ? "#4d8f58" : index % 2 ? "#72b568" : "#5ca25c";
      context.beginPath();
      context.roundRect(part.x * cellSize + 1, part.y * cellSize + 1, cellSize - 2, cellSize - 2, cellSize * 0.31);
      context.fill();
      if (index === 0) {
        context.fillStyle = "#fff";
        context.beginPath();
        context.arc(part.x * cellSize + cellSize * 0.38, part.y * cellSize + cellSize * 0.38, cellSize * 0.14, 0, Math.PI * 2);
        context.arc(part.x * cellSize + cellSize * 0.69, part.y * cellSize + cellSize * 0.38, cellSize * 0.14, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#203c2c";
        context.beginPath();
        context.arc(part.x * cellSize + cellSize * 0.38, part.y * cellSize + cellSize * 0.38, cellSize * 0.06, 0, Math.PI * 2);
        context.arc(part.x * cellSize + cellSize * 0.69, part.y * cellSize + cellSize * 0.38, cellSize * 0.06, 0, Math.PI * 2);
        context.fill();
      }
    });
  }

  function startSnake() {
    endSnake(false);
    runtime.snake.running = true;
    runtime.snake.body = [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }];
    runtime.snake.direction = { x: 1, y: 0 };
    runtime.snake.nextDirection = { x: 1, y: 0 };
    runtime.snake.food = randomSnakeFood();
    runtime.snake.score = 0;
    document.querySelector("[data-snake-score]").textContent = "0";
    document.querySelector("[data-snake-result]").textContent = "Walls wrap around. Avoid yourself!";
    document.querySelector("[data-start-snake]").disabled = true;
    drawSnake();
    runtime.snake.timer = window.setInterval(stepSnake, CONFIG.arcade.snake.tickMs);
  }

  function setSnakeDirection(x, y) {
    if (!runtime.snake.running) return;
    if (runtime.snake.direction.x + x === 0 && runtime.snake.direction.y + y === 0) return;
    runtime.snake.nextDirection = { x, y };
  }

  function stepSnake() {
    if (!runtime.snake.running) return;
    runtime.snake.direction = { ...runtime.snake.nextDirection };
    const head = runtime.snake.body[0];
    const gridSize = CONFIG.arcade.snake.gridSize;
    const next = {
      x: (head.x + runtime.snake.direction.x + gridSize) % gridSize,
      y: (head.y + runtime.snake.direction.y + gridSize) % gridSize
    };
    const willEat = next.x === runtime.snake.food.x && next.y === runtime.snake.food.y;
    const collisionBody = willEat ? runtime.snake.body : runtime.snake.body.slice(0, -1);
    const self = collisionBody.some((part) => part.x === next.x && part.y === next.y);
    if (self) {
      endSnake(true);
      return;
    }
    runtime.snake.body.unshift(next);
    if (willEat) {
      runtime.snake.score += 1;
      document.querySelector("[data-snake-score]").textContent = String(runtime.snake.score);
      runtime.snake.food = randomSnakeFood();
    } else {
      runtime.snake.body.pop();
    }
    drawSnake();
  }

  function endSnake(giveReward = true) {
    const wasRunning = runtime.snake.running;
    runtime.snake.running = false;
    window.clearInterval(runtime.snake.timer);
    const startButton = document.querySelector("[data-start-snake]");
    if (startButton) startButton.disabled = false;
    if (!wasRunning || !giveReward) {
      drawSnake();
      return;
    }
    const score = runtime.snake.score;
    const baseEmbers = score >= 25 ? CONFIG.arcade.snake.score25Ember : score >= 10 ? CONFIG.arcade.snake.score10Ember : Math.max(5, score * 2);
    const xp = score >= 50 ? CONFIG.arcade.snake.score50Xp : Math.max(1, Math.floor(score / 3));
    awardArcadeResult("snake", score, baseEmbers, xp, CONFIG.arcade.snake.highScoreBonus, document.querySelector("[data-snake-result]"));
  }

  function shuffleQuestions(questions) {
    const result = questions.slice();
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [result[index], result[swap]] = [result[swap], result[index]];
    }
    return result;
  }

  function startQuiz() {
    const category = document.querySelector("[data-quiz-category]").value;
    const selection = quizBetSelection();
    if (!selection.valid) {
      updateQuizBetUi();
      showToast(selection.message);
      return;
    }
    const { difficulty, settings, bet } = selection;
    const questionPool = CONFIG.quizQuestions[category]?.[difficulty] || [];
    if (questionPool.length < CONFIG.arcade.quiz.rounds) {
      showToast("This quiz set is not ready yet.");
      return;
    }
    llamitaState.embers -= bet;
    runtime.quiz = {
      category,
      difficulty,
      bet,
      multiplier: settings.multiplier,
      questions: shuffleQuestions(questionPool).slice(0, CONFIG.arcade.quiz.rounds),
      index: 0,
      correct: 0,
      answered: false
    };
    upgradedSaveLlamitaState();
    document.querySelector("[data-quiz-setup]").hidden = true;
    document.querySelector("[data-quiz-question]").hidden = false;
    document.querySelector("[data-quiz-result]").textContent = "";
    renderQuizQuestion();
    upgradedRenderLlamita();
  }

  function renderQuizQuestion() {
    const session = runtime.quiz;
    if (!session) return;
    const question = session.questions[session.index];
    document.querySelector("[data-quiz-number]").textContent = String(session.index + 1);
    document.querySelector("[data-quiz-correct]").textContent = String(session.correct);
    document.querySelector("[data-quiz-prompt]").textContent = question.question;
    document.querySelector("[data-quiz-answers]").innerHTML = question.answers.map((answer, index) => `<button class="quiz-answer" type="button" data-quiz-answer="${index}">${escapeHtml(answer)}</button>`).join("");
    session.answered = false;
  }

  function answerQuiz(answerIndex) {
    const session = runtime.quiz;
    if (!session || session.answered) return;
    session.answered = true;
    const question = session.questions[session.index];
    const correct = Number(answerIndex) === question.correct;
    if (correct) session.correct += 1;
    document.querySelectorAll("[data-quiz-answer]").forEach((button) => {
      button.disabled = true;
      if (Number(button.dataset.quizAnswer) === question.correct) button.classList.add("is-correct");
      else if (Number(button.dataset.quizAnswer) === Number(answerIndex)) button.classList.add("is-wrong");
    });
    document.querySelector("[data-quiz-correct]").textContent = String(session.correct);
    window.setTimeout(() => {
      session.index += 1;
      if (session.index >= session.questions.length) finishQuiz();
      else renderQuizQuestion();
    }, 650);
  }

  function finishQuiz() {
    const session = runtime.quiz;
    if (!session) return;
    const score = session.correct;
    const previousHigh = llamitaState.highScores.quiz || 0;
    const isHighScore = score > previousHigh;
    if (isHighScore) llamitaState.highScores.quiz = score;
    let payout = 0;
    let message = "Better luck next time.";
    if (session.bet === 0 && score >= 3) {
      const baseReward = Number(CONFIG.arcade.quiz.noBetBaseRewards[score]) || 0;
      payout = awardEmbers(baseReward * session.multiplier);
      message = score === 5 ? "Jackpot!" : "Your bright answer streak earned Ember!";
    } else if (score === 3) {
      payout = session.bet;
      message = "You got your bet back.";
    } else if (score === 4) {
      payout = session.bet + awardEmbers(session.bet * (session.multiplier - 1));
      message = "Correct answers multiplied your Ember!";
    } else if (score === 5) {
      payout = session.bet + awardEmbers(session.bet * (session.multiplier - 1) + CONFIG.arcade.quiz.jackpotBonus);
      message = "Jackpot!";
    }
    const highBonus = isHighScore && score >= 3 ? awardEmbers(100) : 0;
    llamitaState.embers += payout + highBonus;
    const baseXp = score * 2 + (score === 5 ? 5 : 0);
    const earnedXp = baseXp * xpMultiplier();
    registerArcadePlay();
    upgradedGrantLlamitaProgress(baseXp, 0);
    upgradedSaveLlamitaState();
    document.querySelector("[data-quiz-question]").hidden = true;
    document.querySelector("[data-quiz-setup]").hidden = false;
    const highText = isHighScore ? " New High Score! You broke your record and earned bonus Ember!" : "";
    document.querySelector("[data-quiz-result]").textContent = `${message}${highText} Ember earned: ${payout + highBonus}. XP earned: ${earnedXp.toFixed(1)}.`;
    showToast(document.querySelector("[data-quiz-result]").textContent);
    runtime.quiz = null;
    runtime.lastSignatures.shop = "";
    upgradedRenderLlamita();
  }

  function bindArcadeEvents() {
    ui.arcadePanel.addEventListener("click", (event) => {
      const tab = event.target.closest("[data-arcade-game-target]");
      if (tab) {
        stopArcadeGames();
        setArcadeGame(tab.dataset.arcadeGameTarget);
        return;
      }
      const hole = event.target.closest("[data-whack-hole]");
      if (hole) hitWhack(hole.dataset.whackHole);
      if (event.target.closest("[data-start-whack]")) startWhack();
      if (event.target.closest("[data-start-flappy]")) startFlappy();
      if (event.target.closest("[data-start-snake]")) startSnake();
      if (event.target.closest("[data-start-quiz]")) startQuiz();
      const direction = event.target.closest("[data-snake-direction]")?.dataset.snakeDirection;
      if (direction === "up") setSnakeDirection(0, -1);
      if (direction === "down") setSnakeDirection(0, 1);
      if (direction === "left") setSnakeDirection(-1, 0);
      if (direction === "right") setSnakeDirection(1, 0);
      const answer = event.target.closest("[data-quiz-answer]");
      if (answer) answerQuiz(answer.dataset.quizAnswer);
    });
    ui.quizDifficulty.addEventListener("change", updateQuizBetUi);
    ui.quizBetInput.addEventListener("input", updateQuizBetUi);
    ui.quizNoBet.addEventListener("change", updateQuizBetUi);
    document.querySelector("[data-flappy-canvas]").addEventListener("pointerdown", flapFlame);
    document.querySelector("[data-quiz-difficulty]").addEventListener("change", renderArcadeScores);
    const snakeCanvas = document.querySelector("[data-snake-canvas]");
    snakeCanvas.addEventListener("pointerdown", (event) => {
      runtime.snake.touchStart = { x: event.clientX, y: event.clientY };
    });
    snakeCanvas.addEventListener("pointerup", (event) => {
      if (!runtime.snake.touchStart) return;
      const x = event.clientX - runtime.snake.touchStart.x;
      const y = event.clientY - runtime.snake.touchStart.y;
      runtime.snake.touchStart = null;
      if (Math.abs(x) > Math.abs(y) && Math.abs(x) > 10) setSnakeDirection(x > 0 ? 1 : -1, 0);
      else if (Math.abs(y) > 10) setSnakeDirection(0, y > 0 ? 1 : -1);
    });
    document.addEventListener("keydown", (event) => {
      if (runtime.panel !== "arcade") return;
      if (runtime.arcadeGame === "flappy" && runtime.flappy.running && (event.key === " " || event.key === "ArrowUp")) {
        event.preventDefault();
        flapFlame();
      }
      if (runtime.arcadeGame === "snake" && runtime.snake.running) {
        const directions = {
          ArrowUp: [0, -1],
          ArrowDown: [0, 1],
          ArrowLeft: [-1, 0],
          ArrowRight: [1, 0]
        };
        if (directions[event.key]) {
          event.preventDefault();
          setSnakeDirection(...directions[event.key]);
        }
      }
    });
  }

  function installOverrides() {
    loadLlamitaState = upgradedLoadLlamitaState;
    saveLlamitaState = upgradedSaveLlamitaState;
    llamitaLevelXpNeeded = upgradedLevelXpNeeded;
    grantLlamitaProgress = upgradedGrantLlamitaProgress;
    applyLlamitaTime = upgradedApplyLlamitaTime;
    buyLlamitaItem = upgradedBuyLlamitaItem;
    careForLlamita = upgradedCareForLlamita;
    igniteLlamita = upgradedIgniteLlamita;
    renderLlamita = upgradedRenderLlamita;
    llamitaIgnite.removeEventListener("click", baseIgniteLlamita);
    llamitaIgnite.addEventListener("click", upgradedIgniteLlamita);
    showAppView = function upgradedShowAppView(viewId) {
      baseShowAppView(viewId);
      if (viewId === "llamita") window.setTimeout(() => upgradedRenderLlamita(), prefersReducedMotion ? 0 : 280);
    };
  }

  function initializeUpgrade() {
    llamitaState = migrateLlamitaState(llamitaState);
    if (!buildUpgradeUi()) return;
    installOverrides();
    upgradedApplyLlamitaTime();
    upgradedSaveLlamitaState();
    setLlamitaShopOpen(true);
    setActivePanel("pet");
    drawFlappy();
    drawSnake();
    upgradedRenderLlamita();
  }

  initializeUpgrade();
})();
