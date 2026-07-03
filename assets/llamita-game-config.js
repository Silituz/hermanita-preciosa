(function () {
  "use strict";

  const tierUnlocks = [1, 5, 10, 20, 35];

  function item(id, name, category, price, effects, tier, extra) {
    return {
      id,
      name,
      category,
      price,
      effects,
      tier,
      unlockLevel: tier ? tierUnlocks[tier - 1] : 1,
      type: "consumable",
      icon: "\u2726",
      ...extra
    };
  }

  const romanTiers = ["I", "II", "III", "IV", "V"];
  const permanentPrices = {
    normal: [500, 1200, 2500, 5000, 9000],
    xp: [1000, 2500, 5000, 9000, 15000],
    ember: [1200, 3000, 6000, 10000, 18000]
  };

  function permanentFamily(family, baseName, prices, icon, effectFactory, descriptionFactory) {
    return romanTiers.map((roman, index) => item(
      `${family}-${roman.toLowerCase()}`,
      `${baseName} ${roman}`,
      "permanent",
      prices[index],
      {},
      index + 1,
      {
        type: "permanent",
        upgradeFamily: family,
        permanentEffect: effectFactory(index),
        icon,
        description: descriptionFactory(index)
      }
    ));
  }

  const shopItems = [
    ...permanentFamily(
      "glow-berry",
      "Glow Berry",
      permanentPrices.normal,
      "\u25cf",
      (index) => ({ action: "feed", stat: "hunger", actionBonus: [3, 6, 10, 15, 22][index], itemStat: "hunger", itemMultiplier: [1.05, 1.1, 1.15, 1.22, 1.3][index] }),
      (index) => `Feed +${[3, 6, 10, 15, 22][index]} Hungry; Hungry items +${[5, 10, 15, 22, 30][index]}%`
    ),
    ...permanentFamily(
      "happy-spark",
      "Happy Spark",
      permanentPrices.normal,
      "\u2600",
      (index) => ({ action: "play", stat: "joy", actionBonus: [2, 4, 7, 10, 15][index], itemStat: "joy", itemMultiplier: [1.05, 1.1, 1.15, 1.22, 1.3][index] }),
      (index) => `Play +${[2, 4, 7, 10, 15][index]} Joy; Joy items +${[5, 10, 15, 22, 30][index]}%`
    ),
    ...permanentFamily(
      "moon-pillow",
      "Moon Pillow",
      permanentPrices.normal,
      "\u263e",
      (index) => ({ itemStat: "energy", itemMultiplier: [1.05, 1.1, 1.15, 1.22, 1.3][index], sleepRestMultiplier: [1.05, 1.1, 1.15, 1.2, 1.25][index] }),
      (index) => `Sleep +${[5, 10, 15, 20, 25][index]}% faster; Rest items +${[5, 10, 15, 22, 30][index]}%`
    ),
    ...permanentFamily(
      "heart-ember",
      "Heart Ember",
      permanentPrices.normal,
      "\u2665",
      (index) => ({ action: "pet", stat: "love", actionBonus: [1, 2, 4, 6, 9][index], loveDecayMultiplier: [0.95, 0.9, 0.84, 0.77, 0.7][index] }),
      (index) => `Pet +${[1, 2, 4, 6, 9][index]} Love; Love fades ${[5, 10, 16, 23, 30][index]}% slower`
    ),
    ...permanentFamily(
      "learning-flame",
      "Learning Flame",
      permanentPrices.xp,
      "\u2726",
      (index) => ({ xpMultiplier: [1.03, 1.06, 1.1, 1.15, 1.22][index] }),
      (index) => `Permanent +${[3, 6, 10, 15, 22][index]}% XP gain`
    ),
    ...permanentFamily(
      "ember-magnet",
      "Ember Magnet",
      permanentPrices.ember,
      "\u2666",
      (index) => ({ emberMultiplier: [1.02, 1.04, 1.07, 1.1, 1.15][index] }),
      (index) => `Permanent +${[2, 4, 7, 10, 15][index]}% Ember rewards`
    ),

    item("sparkle-cookie-i", "Sparkle Cookie I", "food", 90, { hunger: 12, joy: 8 }, 1, { icon: "\u2736", description: "+12 Hungry, +8 Joy" }),
    item("sparkle-cookie-ii", "Sparkle Cookie II", "food", 180, { hunger: 24, joy: 14 }, 2, { icon: "\u2736", description: "+24 Hungry, +14 Joy" }),
    item("sparkle-cookie-iii", "Sparkle Cookie III", "food", 330, { hunger: 40, joy: 24 }, 3, { icon: "\u2736", description: "+40 Hungry, +24 Joy" }),
    item("sparkle-cookie-iv", "Sparkle Cookie IV", "food", 540, { hunger: 58, joy: 36 }, 4, { icon: "\u2736", description: "+58 Hungry, +36 Joy" }),
    item("sparkle-cookie-v", "Sparkle Cookie V", "food", 850, { hunger: 80, joy: 55 }, 5, { icon: "\u2736", description: "+80 Hungry, +55 Joy" }),

    item("rose-tea-i", "Rose Tea I", "joy", 90, { joy: 15, love: 5 }, 1, { icon: "\u2665", description: "+15 Joy, +5 Love" }),
    item("rose-tea-ii", "Rose Tea II", "joy", 180, { joy: 28, love: 10 }, 2, { icon: "\u2665", description: "+28 Joy, +10 Love" }),
    item("rose-tea-iii", "Rose Tea III", "joy", 340, { joy: 45, love: 16 }, 3, { icon: "\u2665", description: "+45 Joy, +16 Love" }),
    item("rose-tea-iv", "Rose Tea IV", "joy", 560, { joy: 65, love: 24 }, 4, { icon: "\u2665", description: "+65 Joy, +24 Love" }),
    item("rose-tea-v", "Rose Tea V", "joy", 880, { joy: 90, love: 36 }, 5, { icon: "\u2665", description: "+90 Joy, +36 Love" }),

    item("moon-milk-i", "Sleepy Moon Milk I", "rest", 100, { energy: 18, joy: 5 }, 1, { icon: "\u263e", description: "+18 Rest, +5 Joy" }),
    item("moon-milk-ii", "Sleepy Moon Milk II", "rest", 200, { energy: 34, joy: 8 }, 2, { icon: "\u263e", description: "+34 Rest, +8 Joy" }),
    item("moon-milk-iii", "Sleepy Moon Milk III", "rest", 380, { energy: 52, joy: 12 }, 3, { icon: "\u263e", description: "+52 Rest, +12 Joy" }),
    item("moon-milk-iv", "Sleepy Moon Milk IV", "rest", 620, { energy: 72, joy: 18 }, 4, { icon: "\u263e", description: "+72 Rest, +18 Joy" }),
    item("moon-milk-v", "Sleepy Moon Milk V", "rest", 960, { energy: 100, joy: 28 }, 5, { icon: "\u263e", description: "+100 Rest, +28 Joy" }),

    item("sparkle-bath-i", "Sparkle Bath I", "clean", 85, { cleanliness: 18 }, 1, { icon: "\u2727", description: "+18 Clean" }),
    item("sparkle-bath-ii", "Sparkle Bath II", "clean", 170, { cleanliness: 34 }, 2, { icon: "\u2727", description: "+34 Clean" }),
    item("sparkle-bath-iii", "Sparkle Bath III", "clean", 320, { cleanliness: 52, joy: 5 }, 3, { icon: "\u2727", description: "+52 Clean, +5 Joy" }),
    item("sparkle-bath-iv", "Sparkle Bath IV", "clean", 520, { cleanliness: 74, joy: 10 }, 4, { icon: "\u2727", description: "+74 Clean, +10 Joy" }),
    item("sparkle-bath-v", "Sparkle Bath V", "clean", 820, { cleanliness: "max", joy: 18 }, 5, { icon: "\u2727", description: "Full Clean, +18 Joy" }),

    item("cozy-taco-i", "Cozy Taco I", "combo", 120, { hunger: 25, joy: 15 }, 1, { icon: "\u25d2", description: "+25 Hungry, +15 Joy" }),
    item("cozy-taco-ii", "Cozy Taco II", "combo", 240, { hunger: 45, joy: 30 }, 2, { icon: "\u25d2", description: "+45 Hungry, +30 Joy" }),
    item("cozy-taco-iii", "Cozy Taco III", "combo", 430, { hunger: 70, joy: 45 }, 3, { icon: "\u25d2", description: "+70 Hungry, +45 Joy" }),
    item("cozy-taco-iv", "Cozy Taco IV", "combo", 680, { hunger: 90, joy: 60, love: 10 }, 4, { icon: "\u25d2", description: "+90 Hungry, +60 Joy, +10 Love" }),
    item("cozy-taco-v", "Cozy Taco V", "combo", 980, { hunger: "max", joy: 85, love: 20 }, 5, { icon: "\u25d2", description: "Full Hungry, +85 Joy, +20 Love" }),

    item("warm-cocoa-i", "Warm Cocoa I", "combo", 110, { joy: 20, energy: 10 }, 1, { icon: "\u25d0", description: "+20 Joy, +10 Rest" }),
    item("warm-cocoa-ii", "Warm Cocoa II", "combo", 230, { joy: 35, energy: 25 }, 2, { icon: "\u25d0", description: "+35 Joy, +25 Rest" }),
    item("warm-cocoa-iii", "Warm Cocoa III", "combo", 420, { joy: 52, energy: 40 }, 3, { icon: "\u25d0", description: "+52 Joy, +40 Rest" }),
    item("warm-cocoa-iv", "Warm Cocoa IV", "combo", 660, { joy: 72, energy: 58, love: 10 }, 4, { icon: "\u25d0", description: "+72 Joy, +58 Rest, +10 Love" }),
    item("warm-cocoa-v", "Warm Cocoa V", "combo", 980, { joy: "max", energy: 82, love: 20 }, 5, { icon: "\u25d0", description: "Full Joy, +82 Rest, +20 Love" }),

    item("special-meal", "Special Meal", "combo", 200, { hunger: "max", joy: "max" }, 0, { icon: "\u2605", description: "Fills Hungry and Joy together" }),
    item("little-feast", "Little Feast", "combo", 650, { hunger: 50, joy: 50 }, 0, { unlockLevel: 10, icon: "\u2737", description: "+50 Hungry and +50 Joy" }),
    item("glow-care-box", "Glow Care Box", "combo", 1200, { hunger: 50, joy: 50, energy: 50 }, 0, { unlockLevel: 20, icon: "\u25c7", description: "+50 Hungry, Joy, and Rest" }),
    item("hearty-toast", "Hearty Glow Toast", "food", 180, { hunger: 45, love: 4 }, 0, { icon: "\u25b0", description: "+45 Hungry and +4 Love" }),
    item("joy-lantern", "Joy Lantern", "joy", 260, { joy: 40, love: 8 }, 0, { unlockLevel: 3, icon: "\u2600", description: "+40 Joy and +8 Love" }),
    item("dream-cloud", "Dream Cloud", "rest", 300, { energy: 48, joy: 8 }, 0, { unlockLevel: 3, icon: "\u263e", description: "+48 Rest and +8 Joy" }),
    item("heart-macaron", "Heart Macaron", "love", 240, { love: 28, joy: 10 }, 0, { unlockLevel: 3, icon: "\u2665", description: "+28 Love and +10 Joy" }),
    item("rose-hug", "Rose Hug", "love", 520, { love: 55, joy: 22 }, 0, { unlockLevel: 8, icon: "\u2764", description: "+55 Love and +22 Joy" }),
    item("study-spark", "Study Spark", "xp", 750, { xp: 45 }, 0, { unlockLevel: 8, icon: "\u2726", description: "One-time +45 XP" }),
    item("cozy-care-basket", "Cozy Care Basket", "combo", 900, { hunger: 40, joy: 40, energy: 40, love: 30 }, 0, { unlockLevel: 12, icon: "\u25c7", description: "+40 Hungry, Joy, Rest and +30 Love" }),
    item("full-care-lantern", "Full Care Lantern", "combo", 1800, { fillAll: true }, 0, { unlockLevel: 18, icon: "\u2600", description: "Fills every care stat completely" }),

    item("emergency-care", "Emergency Care Boost", "boost", 1000, { atLeastMain: 70 }, 0, { unlockLevel: 10, type: "boost", icon: "\u271a", description: "Raises all main stats to at least 70%" }),
    item("full-glow", "Full Glow Boost", "boost", 1500, { fillMain: true }, 0, { unlockLevel: 15, type: "boost", maxOwned: 1, icon: "\u2600", description: "Fills Hungry, Joy, and Rest" }),
    item("ember-blessing", "Ember Blessing", "boost", 2000, { activeBoost: { group: "ember", emberMultiplier: 1.5, durationMinutes: 30 } }, 0, { unlockLevel: 20, type: "boost", icon: "\u2666", description: "+50% Ember rewards for 30 minutes" }),
    item("perfect-care", "Perfect Care Boost", "boost", 2500, { fillAll: true, xp: 25 }, 0, { unlockLevel: 30, type: "boost", icon: "\u2739", description: "Fills every stat and grants +25 XP" }),

    item("xp-spark-i", "XP Spark I", "xp", 500, { activeBoost: { group: "xp", xpMultiplier: 1.1, durationMinutes: 10 } }, 0, { unlockLevel: 5, type: "boost", icon: "\u2726", description: "+10% XP for 10 minutes" }),
    item("xp-spark-ii", "XP Spark II", "xp", 1000, { activeBoost: { group: "xp", xpMultiplier: 1.2, durationMinutes: 15 } }, 0, { unlockLevel: 10, type: "boost", icon: "\u2726", description: "+20% XP for 15 minutes" }),
    item("xp-spark-iii", "XP Spark III", "xp", 1800, { activeBoost: { group: "xp", xpMultiplier: 1.3, durationMinutes: 30 } }, 0, { unlockLevel: 20, type: "boost", icon: "\u2726", description: "+30% XP for 30 minutes" }),
    item("golden-xp-flame", "Golden XP Flame", "xp", 3000, { activeBoost: { group: "xp", xpMultiplier: 1.5, durationMinutes: 30 } }, 0, { unlockLevel: 35, type: "boost", icon: "\u2605", description: "+50% XP for 30 minutes" }),

    item("rose-ribbon", "Rose Ribbon", "cosmetics", 350, {}, 0, { unlockLevel: 5, type: "cosmetic", icon: "\u2665", cosmetic: "rose-ribbon", cosmeticBonus: { emberMultiplier: 1.03 }, description: "An animated rose ribbon glow; +3% Ember while equipped" }),
    item("golden-glasses", "Golden Glasses", "cosmetics", 650, {}, 0, { unlockLevel: 10, type: "cosmetic", icon: "\u25c7", cosmetic: "golden-glasses", cosmeticBonus: { emberMultiplier: 1.03 }, description: "Animated golden sparkles; +3% Ember while equipped" }),
    item("starlight-aura", "Starlight Aura", "cosmetics", 900, {}, 0, { unlockLevel: 20, type: "cosmetic", icon: "\u2605", cosmetic: "starlight-aura", cosmeticBonus: { emberMultiplier: 1.03 }, description: "Animated drifting stars; +3% Ember while equipped" })
  ];

  const milestoneRewards = [
    [5, "First Reward Card + Little Quote", false],
    [10, "Special Picture", true],
    [15, "Ask One Question - Ren\u00e9 will answer honestly", false],
    [20, "Exclusive Sticker", true],
    [25, "15-Second Custom Video", true],
    [30, "New Special Picture", true],
    [35, "Custom Song of Her Choice", true],
    [40, "Small Picture / Sticker Pack", true],
    [45, "Small Comic", true],
    [50, "1 Month Discord Subscription", false],
    [55, "Two More Questions Answered", false],
    [60, "Wallpaper Set of Her Choice", true],
    [65, "Mini Story Scene with Her and the Tamagotchi", true],
    [70, "Custom Song of Her Choice", true],
    [75, "Second 15-Second Special Video", true],
    [80, "Personal Digital Collectible Card Set", true],
    [85, "Accessory of Her Choice", false],
    [90, "Large Picture Pack of Her Choice", true],
    [95, "Legendary Choice Reward", true],
    [100, "T-Shirt with Print of Her Choice", true]
  ].map(([level, name, creative]) => ({ id: `level-${level}`, level, name, creative }));

  const quizQuestions = {
    "General Knowledge": {
      Easy: [
        ["Which planet is known as the Red Planet?", ["Mars", "Venus", "Saturn", "Mercury"], 0],
        ["How many colors are traditionally named in a rainbow?", ["Five", "Six", "Seven", "Eight"], 2],
        ["Which ocean is the largest?", ["Atlantic", "Indian", "Arctic", "Pacific"], 3],
        ["What is the capital of Italy?", ["Madrid", "Rome", "Lisbon", "Athens"], 1],
        ["How many sides does a hexagon have?", ["Five", "Six", "Seven", "Eight"], 1]
      ],
      Medium: [
        ["Which chemical symbol represents gold?", ["Ag", "Au", "Gd", "Go"], 1],
        ["How many bones are in a typical adult human body?", ["186", "196", "206", "216"], 2],
        ["Who painted The Starry Night?", ["Claude Monet", "Vincent van Gogh", "Pablo Picasso", "Edvard Munch"], 1],
        ["On which continent is the Sahara Desert?", ["Asia", "Africa", "Australia", "South America"], 1],
        ["What is the decimal value of binary 1010?", ["8", "9", "10", "12"], 2]
      ],
      Hard: [
        ["What is the chemical symbol for tungsten?", ["T", "Tu", "W", "Tg"], 2],
        ["Transylvania is a historical region of which country?", ["Romania", "Hungary", "Slovakia", "Serbia"], 0],
        ["Which trench contains the deepest known point in the ocean?", ["Tonga Trench", "Java Trench", "Mariana Trench", "Puerto Rico Trench"], 2],
        ["The famous ancient library was located in which Egyptian city?", ["Memphis", "Alexandria", "Luxor", "Giza"], 1],
        ["What is the SI base unit of luminous intensity?", ["Lumen", "Lux", "Candela", "Watt"], 2]
      ]
    },
    Music: {
      Easy: [
        ["Which symbol raises a note by one semitone?", ["Flat", "Sharp", "Rest", "Clef"], 1],
        ["How many keys does a standard modern piano usually have?", ["76", "80", "88", "96"], 2],
        ["Which family does the violin belong to?", ["Strings", "Brass", "Woodwind", "Percussion"], 0],
        ["What does a musical rest represent?", ["A louder note", "Silence", "A key change", "A repeat"], 1],
        ["Which voice type is usually the highest?", ["Bass", "Baritone", "Tenor", "Soprano"], 3]
      ],
      Medium: [
        ["What doeç^5¶‰žËkºwµçx°”ˆ°€‰ÑÑ…„ˆ°€‰…”Ñ¡”MÕ¸‰t°€Át°(€€€€€€€l‰]¡¥ Í½¹œµ…É­•I•Y•±Ù•ÐÌ½™™¥¥…°‘•‰ÕÐüˆ°l‰!…ÁÁ¥¹•ÍÌˆ°€‰AÍå¡¼ˆ°€‰	…	½äˆ°€‰IÕÍÍ¥…¸I½Õ±•ÑÑ”‰t°€Át(€€€€€t(€€€ô°(€€€€‰5½Ù¥•Ì€˜M•É¥•Ìˆèì(€€€€€…Íäèl(€€€€€€€l‰]¡…Ð¥ÌÑ¡”ÝÉ¥ÑÑ•¸Ñ•áÐ™½È„™¥±´…±±•üˆ°l‰ÍÉ••¹Á±…äˆ°€‰Ñ¥­•Ðˆ°€‰É•Ù¥•Üˆ°€‰Á½ÍÑ•È‰t°€Át°(€€€€€€€l‰]¡…Ð‘½•Ì„Í•ÅÕ•°ÕÍÕ…±±ä‘¼üˆ°l‰½¹Ñ¥¹Õ•Ì…¸•…É±¥•ÈÍÑ½Éäˆ°€‰…¹•±Ì„ÁÉ•µ¥•É”ˆ°€‰I•µ½Ù•Ì…±°…Ñ½ÉÌˆ°€‰M¡½ÉÑ•¹ÌÑ¡”É•‘¥ÑÌ‰t°€Át°(€€€€€€€l‰]¡…ÐÉ•…Ñ•ÌÑ¡”¥±±ÕÍ¥½¸½˜µ½Ù•µ•¹Ð¥¸…¹¥µ…Ñ¥½¸üˆ°l‰I…Á¥‘±äÍ¡½Ý¸™É…µ•Ìˆ°€‰=¹±ä„Í½Õ¹‘ÑÉ…¬ˆ°€‰Í¥¹±”Á¡½Ñ½É…Á ˆ°€‰ÍÑ…”ÕÉÑ…¥¸‰t°€Át(€€€€€t°(€€€€€5•‘¥Õ´èl(€€€€€€€l‰]¡¼‘¥É•Ñ•Q¥Ñ…¹¥Œüˆ°l‰)…µ•Ì…µ•É½¸ˆ°€‰MÑ•Ù•¸MÁ¥•±‰•Éœˆ°€‰I¥‘±•äM½ÑÐˆ°€‰A•Ñ•È)…­Í½¸‰t°€Át°(€€€€€€€l‰]¡…Ð¥ÌÑ¡”™¥ÉÍÐ¹…µ”½˜Ñ¡”µ…¥¸¡•É¼¥¸Q¡”5…ÑÉ¥àüˆ°l‰9•¼ˆ°€‰5½ÉÁ¡•ÕÌˆ°€‰åÁ¡•Èˆ°€‰Mµ¥Ñ ‰t°€Át°(€€€€€€€l‰!½Ý…ÉÑÌ¥ÌÑ¡”Í¡½½°¥¸Ý¡¥ ÍÑ½ÉäÝ½É±üˆ°l‰!…ÉÉäA½ÑÑ•Èˆ°€‰MÑ…È]…ÉÌˆ°€‰Q¡”!Õ¹•È…µ•Ìˆ°€‰Õ¹”‰t°€Át(€€€€€t°(€€€€€!…Éèl(€€€€€€€l‰]¡¼‘¥É•Ñ•I…Í¡½µ½¸üˆ°l‰­¥É„-ÕÉ½Í…Ý„ˆ°€‰e…ÍÕ©¥É¼=éÔˆ°€‰!…å…¼5¥å…é…­¤ˆ°€‰	½¹œ)½½¸µ¡¼‰t°€Át°(€€€€€€€l‰]¡…Ð¥ÌÑ¡”½µÁÕÑ•È…±±•¥¸€ÈÀÀÄèMÁ…”=‘åÍÍ•äüˆ°l‰!0€äÀÀÀˆ°€‰HÈµÈˆ°€‰M­å¹•Ðˆ°€‰••ÀQ¡½Õ¡Ð‰t°€Át°(€€€€€€€l‰]¡¼‘¥É•Ñ•A…¸Ì1…‰åÉ¥¹Ñ üˆ°l‰Õ¥±±•Éµ¼‘•°Q½É¼ˆ°€‰±™½¹Í¼Õ…É½¸ˆ°€‰A•‘É¼±µ½‘½Ù…Èˆ°€‰±•©…¹‘É¼¸%¹…ÉÉ¥ÑÔ‰t°€Át(€€€€€t(€€€ô°(€€€¹¥µ…±Ìèì(€€€€€…Íäèl(€€€€€€€l‰%Ì„‘½±Á¡¥¸„™¥Í ½È„µ…µµ…°üˆ°l‰¥Í ˆ°€‰5…µµ…°ˆ°€‰I•ÁÑ¥±”ˆ°€‰µÁ¡¥‰¥…¸‰t°€Åt°(€€€€€€€l‰!½Üµ…¹ä±•Ì‘½•Ì„ÍÁ¥‘•È¡…Ù”üˆ°l‰M¥àˆ°€‰¥¡Ðˆ°€‰Q•¸ˆ°€‰QÝ•±Ù”‰t°€Åt°(€€€€€€€l‰]¡…Ð¥Ì„É½ÕÀ½˜±¥½¹Ì…±±•üˆ°l‰ÁÉ¥‘”ˆ°€‰Í¡½½°ˆ°€‰½±½¹äˆ°€‰™±½¬‰t°€Át(€€€€€t°(€€€€€5•‘¥Õ´èl(€€€€€€€l‰]¡…ÐÑåÁ”½˜µ…µµ…°¥Ì„­…¹…É½¼üˆ°l‰5…ÉÍÕÁ¥…°ˆ°€‰AÉ¥µ…Ñ”ˆ°€‰I½‘•¹Ðˆ°€‰•Ñ…•…¸‰t°€Át°(€€€€€€€l‰]¡¥ …¹¥µ…°¥ÌÑ¡”™…ÍÑ•ÍÐ½¸±…¹üˆ°l‰¡••Ñ… ˆ°€‰1¥½¸ˆ°€‰=ÍÑÉ¥ ˆ°€‰É•å¡½Õ¹‰t°€Át°(€€€€€€€l‰]¡¥ ½É…¸¡•±ÁÌµ½ÍÐ‰¥É‘Ì­••ÀÑ¡•¥È‰½‘ä±¥¡Ð™½È™±¥¡Ðüˆ°l‰!½±±½Ü‰½¹•Ìˆ°€‰!•…ÙäÑ••Ñ ˆ°€‰Q¡¥¬Í¡•±°ˆ°€‰M½±¥¡½É¹Ì‰t°€Át(€€€€€t°(€€€€€!…Éèl(€€€€€€€l‰]¡¥ ¥ÌÑ¡”±…É•ÍÐ±¥Ù¥¹œÁ•¹Õ¥¸ÍÁ•¥•Ìüˆ°l‰µÁ•É½ÈÁ•¹Õ¥¸ˆ°€‰-¥¹œÁ•¹Õ¥¸ˆ°€‰•¹Ñ½¼Á•¹Õ¥¸ˆ°€‰‘•±¥”Á•¹Õ¥¸‰t°€Át°(€€€€€€€l‰Q…É‘¥É…‘•Ì‰•±½¹œÑ¼Ý¡¥ Á¡å±Õ´üˆ°l‰Q…É‘¥É…‘„ˆ°€‰¹¹•±¥‘„ˆ°€‰5½±±ÕÍ„ˆ°€‰¹¥‘…É¥„‰t°€Át°(€€€€€€€l‰]¡¥ …¹¥µ…°¥ÌÑ¡”±½Í•ÍÐ±¥Ù¥¹œÉ•±…Ñ¥Ù”½˜Ñ¡”¥É…™™”üˆ°l‰=­…Á¤ˆ°€‰i•‰É„ˆ°€‰…µ•°ˆ°€‰5½½Í”‰t°€Át(€€€€€t(€€€ô°(€€€€‰½½€˜Õ±ÑÕÉ”ˆèì(€€€€€…Íäèl(€€€€€€€l‰]¡…Ð¥ÌÑ¡”µ…¥¸¥¹É•‘¥•¹Ð¥¸Õ……µ½±”üˆ°l‰Ù½…‘¼ˆ°€‰A½Ñ…Ñ¼ˆ°€‰ÕÕµ‰•Èˆ°€‰A•„‰t°€Át°(€€€€€€€l‰]¡¥ É…¥¸¥Ì•ÍÍ•¹Ñ¥…°Ñ¼µ½ÍÐÍÕÍ¡¤üˆ°l‰I¥”ˆ°€‰]¡•…Ðˆ°€‰=…ÑÌˆ°€‰Iå”‰t°€Át°(€€€€€€€l‰5½éé…É•±±„¥ÌÑÉ…‘¥Ñ¥½¹…±±ä…ÍÍ½¥…Ñ•Ý¥Ñ Ý¡¥ ½Õ¹ÑÉäüˆ°l‰%Ñ…±äˆ°€‰5•á¥¼ˆ°€‰%¹‘¥„ˆ°€‰9½ÉÝ…ä‰t°€Át(€€€€€t°(€€€€€5•‘¥Õ´èl(€€€€€€€l‰Q½™Ô¥Ìµ…¥¹±äµ…‘”™É½´Ý¡…Ðüˆ°l‰M½å‰•…¹Ìˆ°€‰I¥”™±½ÕÈˆ°€‰A½Ñ…Ñ½•Ìˆ°€‰±µ½¹‘Ì‰t°€Át°(€€€€€€€l‰Qé…Ñé¥­¤ÑÉ…‘¥Ñ¥½¹…±±ä½µ‰¥¹•Ìå½ÕÉÐÝ¥Ñ Ý¡…Ðüˆ°l‰ÕÕµ‰•Èˆ°€‰AÕµÁ­¥¸ˆ°€‰½É¸ˆ°€‰ÁÁ±”‰t°€Át°(€€€€€€€l‰QÉ…‘¥Ñ¥½¹…°½ÕÍ½ÕÌ¥Ì½µµ½¹±äµ…‘”™É½´Ý¡…Ðüˆ°l‰M•µ½±¥¹„ˆ°€‰	Õ­Ý¡•…Ðˆ°€‰A½Ñ…Ñ¼ÍÑ…É ˆ°€‰É½Õ¹‰•…¹Ì‰t°€Át(€€€€€t°(€€€€€!…Éèl(€€€€€€€l‰M…™™É½¸½µ•Ì™É½´Ý¡¥ Á…ÉÐ½˜„É½ÕÌ™±½Ý•Èüˆ°l‰MÑ¥µ…Ìˆ°€‰I½½ÑÌˆ°€‰1•…Ù•Ìˆ°€‰A•Ñ…±Ì½¹±ä‰t°€Át°(€€€€€€€l‰±…ÍÍ¥ŒÉ½Õà½µ‰¥¹•Ì™±½ÕÈÝ¥Ñ Ý¡…Ðüˆ°l‰…Ðˆ°€‰Y¥¹•…Èˆ°€‰ÉÕ¥Ð©Õ¥”ˆ°€‰M…±ÐÝ…Ñ•È‰t°€Át°(€€€€€€€l‰]¡…Ð‘½•Ì½¹™¥ÐÑÉ…‘¥Ñ¥½¹…±±ä‘•ÍÉ¥‰”üˆ°l‰M±½Ü½½­¥¹œ¥¸™…Ðˆ°€‰±…Í ™É••é¥¹œˆ°€‰ÉäÉ½…ÍÑ¥¹œÝ¥Ñ¡½ÕÐ½¥°ˆ°€‰I…Ü™•Éµ•¹Ñ…Ñ¥½¸‰t°€Át(€€€€€t(€€€ô°(€€€5•á¥¼èì(€€€€€…Íäèl(€€€€€€€l‰]¡…Ð…¹¥µ…°…ÁÁ•…ÉÌ½¸5•á¥¼Ì½…Ð½˜…ÉµÌüˆ°l‰¸•…±”ˆ°€‰©…Õ…Èˆ°€‰Ý¡…±”ˆ°€‰¡½ÉÍ”‰t°€Át°(€€€€€€€l‰]¡¥ ‰½‘ä½˜Ý…Ñ•È±¥•Ì•…ÍÐ½˜5•á¥¼üˆ°l‰Õ±˜½˜5•á¥¼ˆ°€‰I•M•„ˆ°€‰	…±Ñ¥ŒM•„ˆ°€‰É…‰¥…¸M•„‰t°€Át°(€€€€€€€l‰5…É¥…¡¤µÕÍ¥Œ¥ÌÍÑÉ½¹±ä…ÍÍ½¥…Ñ•Ý¥Ñ Ý¡¥ 5•á¥…¸ÍÑ…Ñ”üˆ°l‰)…±¥Í¼ˆ°€‰M½¹½É„ˆ°€‰Q…‰…Í¼ˆ°€‰…µÁ•¡”‰t°€Át(€€€€€t°(€€€€€5•‘¥Õ´èl(€€€€€€€l‰!½Üµ…¹ä™•‘•É…°•¹Ñ¥Ñ¥•Ì‘½•Ì5•á¥¼¡…Ù”üˆ°lˆÈÐˆ°€ˆÌÀˆ°€ˆÌÈˆ°€ˆÌØ‰t°€Ét°(€€€€€€€l‰Q¡”	…ÑÑ±”½˜AÕ•‰±„¥ÌÉ•µ•µ‰•É•½¸Ý¡¥ ‘…Ñ”üˆ°l‰5…ä€Ôˆ°€‰M•ÁÑ•µ‰•È€ÄØˆ°€‰9½Ù•µ‰•È€Èˆ°€‰••µ‰•È€ÄÈ‰t°€Át°(€€€€€€€l‰Q•ÅÕ¥±„¥ÌÑÉ…‘¥Ñ¥½¹…±±äÁÉ½‘Õ•™É½´Ý¡¥ Á±…¹Ðüˆ°l‰	±Õ”……Ù”ˆ°€‰MÕ…È…¹”ˆ°€‰……¼ˆ°€‰5…¥é”‰t°€Át(€€€€€t°(€€€€€!…Éèl(€€€€€€€l‰5•á¥¼Ì€ÄäÄÜ½¹ÍÑ¥ÑÕÑ¥½¸Ý…ÌÁÉ½µÕ±…Ñ•¥¸Ý¡¥ ¥Ñäüˆ°l‰EÕ•É•Ñ…É¼ˆ°€‰5•É¥‘„ˆ°€‰Q¥©Õ…¹„ˆ°€‰=…á…„‰t°€Át°(€€€€€€€l‰A½Á½…Ñ•Á•Ñ°¥ÌÝ¡…ÐÑåÁ”½˜¹…ÑÕÉ…°™•…ÑÕÉ”üˆ°l‰Y½±…¹¼ˆ°€‰I¥Ù•Èˆ°€‰…Ù”ˆ°€‰•Í•ÉÐ‰t°€Át°(€€€€€€€l‰Q¡”5…å„¥Ñä½˜Uáµ…°¥Ì¥¸Ý¡¥ ÍÑ…Ñ”üˆ°l‰eÕ…Ñ…¸ˆ°€‰¡¥¡Õ…¡Õ„ˆ°€‰Õ•ÉÉ•É¼ˆ°€‰M¥¹…±½„‰t°€Át(€€€€€t(€€€ô°(€€€€‰A•ÉÍ½¹…°Õ¸…ÑÌˆèì(€€€€€…Íäèl(€€€€€€€l‰]¡¥ ÍÉ••¸¹½ÜÍ¡½ÝÌÑ¡”ÕÉÉ•¹Ð1•Ù•°µ½ÍÐ±•…É±äüˆ°l‰A•Ð€¼!½µ”ˆ°€‰M…Ù”€¼1½…ˆ°€‰]•…Ñ¡•Èˆ°€‰5ÕÍ¥Œ‰t°€Át°(€€€€€€€l‰]¡¥ …É”ÍÑ…Ð¡…Ì¥ÑÌ½Ý¸¹•ÜÍ¡½À…Ñ•½Éäüˆ°l‰±•…¸ˆ°€‰±…¥´½‘”ˆ°€‰1•Ù•°ˆ°€‰!¥ M½É”‰t°€Át°(€€€€€€€l‰]¡…Ð…ÁÁ•…ÉÌ‰•Í¥‘”Ñ¡”MÑÉ½¹œ±…µ”Ñ¥Ñ±”üˆ°l‰ÕÉÉ•¹Ðµ‰•Èˆ°€‰Ý•…Ñ¡•ÈÝ…É¹¥¹œˆ°€‰±…¥´½‘”ˆ°€‰ÅÕ¥è…¹ÍÝ•È‰t°€Át(€€€€€t°(€€€€€5•‘¥Õ´èl(€€€€€€€l‰]¡…Ð‰½¹ÕÌ‘½•Ì…¸•ÅÕ¥ÁÁ•…¹¥µ…Ñ•…•ÍÍ½Éä¥Ù”üˆ°lˆ¬Ì”µ‰•Èˆ°€ˆ¬ÔÀ”I•ÍÐˆ°€‰½Õ‰±”1•Ù•°ˆ°€‰É•”ÅÕ¥è‰•ÑÌ‰t°€Át°(€€€€€€€l‰!½Ü½™Ñ•¸…¸½¹”…Ñ•½Éä…¹‘¥™™¥Õ±Ñä‰”Á±…å•¥¸EÕ¥èEÕ••¸üˆ°l‰=¹”Á•È‘…äˆ°€‰=¹”Á•ÈÝ••¬ˆ°€‰]¥Ñ¡½ÕÐ„±¥µ¥Ðˆ°€‰=¹±ä½¹”•Ù•È‰t°€Át°(€€€€€€€l‰]¡¥ ™½ÕÈÍÑ…ÑÌ‰Õ¥±Ñ¡”…É”I•Ý…ÉµÕ±Ñ¥Á±¥•Èüˆ°l‰!Õ¹Éä°)½ä°I•ÍÐ°±•…¸ˆ°€‰1½Ù”°a@°1•Ù•°°µ‰•Èˆ°€‰5ÕÍ¥Œ°]•…Ñ¡•È°Õ•°°Q¥µ”ˆ°€‰M½É”°	•Ð°EÕ¥è°MÑ…µÀ‰t°€Át(€€€€€t°(€€€€€!…Éèl(€€€€€€€l‰]¡…Ð‘•Ñ•Éµ¥¹•ÌÑ¡”‘…¥±äEÕ¥èEÕ••¸µ‰•È±¥µ¥Ðüˆ°l‰ÕÉÉ•¹Ð1•Ù•°ˆ°€‰ÕÉÉ•¹ÐI•ÍÐˆ°€‰9Õµ‰•È½˜Í¡½À¥Ñ•µÌˆ°€‰Ñ¥Ù”µÕÍ¥Œ‰t°€Át°(€€€€€€€l‰]¡…Ð¥ÌÑ¡”µ…á¥µÕ´…É”I•Ý…ÉµÕ±Ñ¥Á±¥•ÈÝ¡•¸…±°™½ÕÈ…É”ÍÑ…ÑÌ…É”™Õ±°üˆ°l‰àÄ¸ÈÔˆ°€‰àÄ¸ÀÔˆ°€‰àÈ¸ÀÀˆ°€‰àÌ¸ÀÀ‰t°€Át°(€€€€€€€l‰]¡…Ð¥ÌÉ•ÅÕ¥É•™½ÈÑ¡”‘…¹•Èµ™É•”]¡…¬µ„µ±½Ü‰½¹ÕÌüˆ°l‰Ð±•…ÍÐ€Ô¡¥ÑÌ…¹¹¼Ý…Ñ•È½ÈÍ­Õ±°ˆ°€‰=¹±ä½¹”Í­Õ±°ˆ°€‰Í½É”½˜•á…Ñ±äé•É¼ˆ°€‰Q¡É•”Ý…Ñ•È‘É½ÁÌ‰t°€Át(€€€€€t(€€€ô(€ôì((€=‰©•Ð¹•¹ÑÉ¥•Ì¡•áÑÉ…EÕ¥éEÕ•ÍÑ¥½¹Ì¤¹™½É…  ¡m…Ñ•½Éä°‘¥™™¥Õ±ÑåÉ½ÕÁÍt¤€ôøì(€€€=‰©•Ð¹•¹ÑÉ¥•Ì¡‘¥™™¥Õ±ÑåÉ½ÕÁÌ¤¹™½É…  ¡m‘¥™™¥Õ±Ñä°ÅÕ•ÍÑ¥½¹Ít¤€ôøì(€€€€€ÅÕ¥éEÕ•ÍÑ¥½¹Ím…Ñ•½Éåum‘¥™™¥Õ±Ñåt¹ÁÕÍ  ¸¸¹ÅÕ•ÍÑ¥½¹Ì¤ì(€€€ô¤ì(€ô¤ì((€=‰©•Ð¹Ù…±Õ•Ì¡ÅÕ¥éEÕ•ÍÑ¥½¹Ì¤¹™½É…  ¡‘¥™™¥Õ±ÑåÉ½ÕÁÌ¤€ôøì(€€€=‰©•Ð¹­•åÌ¡‘¥™™¥Õ±ÑåÉ½ÕÁÌ¤¹™½É…  ¡‘¥™™¥Õ±Ñä¤€ôøì(€€€€€‘¥™™¥Õ±ÑåÉ½ÕÁÍm‘¥™™¥Õ±Ñåt€ô‘¥™™¥Õ±ÑåÉ½ÕÁÍm‘¥™™¥Õ±Ñåt¹µ…À ¡mÅÕ•ÍÑ¥½¸°…¹ÍÝ•ÉÌ°½ÉÉ•Ñt¤€ôø€¡ì(€€€€€€€ÅÕ•ÍÑ¥½¸°(€€€€€€€…¹ÍÝ•ÉÌ°(€€€€€€€½ÉÉ•Ð°(€€€€€€€‘¥™™¥Õ±Ñä(€€€€€ô¤¤ì(€€€ô¤ì(€ô¤ì((€Ý¥¹‘½Ü¹115%Q}5}=9%€ôì(€€€Í…Ù•Y•ÉÍ¥½¸è€à°(€€€ÍÑ½É…•-•äè€‰½½µµ½½µµ¤µ±±…µ¥Ñ„µØÄˆ°(€€€‰…­ÕÁ-¥¹è€‰µ¤µ±±…µ¥Ñ„µÍ…Ù”ˆ°(€€€ÕÉÉ•¹äèì(€€€€€¹…µ”è€‰µ‰•Èˆ°(€€€€€¥½¹A…Ñ è€‰…ÍÍ•ÑÌ½µ‰•È¹Á¹œˆ(€€€ô°(€€€ÍÑ…ÑÌèì(€€€€€­•åÌèl‰¡Õ¹•Èˆ°€‰©½äˆ°€‰•¹•Éäˆ°€‰±•…¹±¥¹•ÍÌˆ°€‰±½Ù”‰t°(€€€€€µ…¥¸èl‰¡Õ¹•Èˆ°€‰©½äˆ°€‰•¹•Éä‰t°(€€€€€‰…Í•5…àè€ÄÀÀ°(€€€€€µ¥¹¥µÕ´è€À°(€€€€€…Ý…­••…åA•É5¥¹ÕÑ”èì¡Õ¹•Èè€À¸ÌÈ°©½äè€À¸ÈÐ°•¹•Éäè€À¸Àà°±•…¹±¥¹•ÍÌè€À¸ÄÔ°±½Ù”è€À¸ÄÈô°(€€€€€Í±••Á¥¹•…åA•É5¥¹ÕÑ”èì¡Õ¹•Èè€À¸ÀÌ°©½äè€À¸ÀÄ°±•…¹±¥¹•ÍÌè€À¸ÀÈ°±½Ù”è€À¸ÀÄô°(€€€€€Í±••ÁI•ÍÑA•É5¥¹ÕÑ”è€ÌÀ°(€€€€€Í±••ÁaÁA•É5¥¹ÕÑ”è€Ô°(€€€€€µ…á=™™±¥¹•5¥¹ÕÑ•Ìè€ÜÈÀ(€€€ô°(€€€…É•	½¹ÕÌèì(€€€€€ÍÑ…Ñ-•åÌèl‰¡Õ¹•Èˆ°€‰©½äˆ°€‰•¹•Éäˆ°€‰±•…¹±¥¹•ÍÌ‰t°(€€€€€µ…á¥µÕµ5Õ±Ñ¥Á±¥•Èè€Ä¸ÈÔ(€€€ô°(€€€…Ñ¥½¹Ìèì(€€€€€™••èìÍÑ…ÑÌèì¡Õ¹•Èè€Äàô°áÀè€Ì°•µ‰•ÉÌè€Äô°(€€€€€Á±…äèìÍÑ…ÑÌèì©½äè€ÄÈ°¡Õ¹•Èè€´È°•¹•Éäè€´Ä°±•…¹±¥¹•ÍÌè€´Èô°áÀè€Ð°•µ‰•ÉÌè€Èô°(€€€€€Á•ÐèìÍÑ…ÑÌèì©½äè€Ô°±½Ù”è€Üô°áÀè€È°•µ‰•ÉÌè€Ä°½½±‘½Ý¹5Ìè€àÀÀÀ°É•ÍÑÉ…¥¹½½±‘½Ý¹5Ìè€ØÀÀÀÀô°(€€€€€±•…¸èìÍÑ…ÑÌèì±•…¹±¥¹•ÍÌè€ÈÔô°áÀè€Ì°•µ‰•ÉÌè€Äô(€€€ô°(€€€±•Ù•°èì(€€€€€áÁ	…Í”è€ÈÐ°(€€€€€áÁA•É1•Ù•°è€ÄÈ°(€€€€€µ…áMÑ…ÑA•É1•Ù•°è€Ä°(€€€€€µ¥±•ÍÑ½¹•áÑÉ…5…àè€Ð°(€€€€€•µ‰•É5Õ±Ñ¥Á±¥•ÉMÑ•Á1•Ù•±Ìè€ÄÀ°(€€€€€•µ‰•É5Õ±Ñ¥Á±¥•ÉMÑ•Àè€À¸ÀÔ°(€€€€€±•Ù•±UÁµ‰•É	…Í”è€ÄÀ°(€€€€€±•Ù•±UÁµ‰•ÉA•É1•Ù•°è€È(€€€ô°(€€€±½Ù•	½¹ÕÌèì(€€€€€Ñ¡É•Í¡½±‘Ìèl(€€€€€€€ìµ¥¹¥µÕµA•É•¹Ðè€ÄÀÀ°µÕ±Ñ¥Á±¥•Èè€Ä¸Èô°(€€€€€€€ìµ¥¹¥µÕµA•É•¹Ðè€àÀ°µÕ±Ñ¥Á±¥•Èè€Ä¸ÄÔô°(€€€€€€€ìµ¥¹¥µÕµA•É•¹Ðè€ØÀ°µÕ±Ñ¥Á±¥•Èè€Ä¸Äô°(€€€€€€€ìµ¥¹¥µÕµA•É•¹Ðè€ÐÀ°µÕ±Ñ¥Á±¥•Èè€Ä¸ÀØô°(€€€€€€€ìµ¥¹¥µÕµA•É•¹Ðè€ÈÀ°µÕ±Ñ¥Á±¥•Èè€Ä¸ÀÌô°(€€€€€€€ìµ¥¹¥µÕµA•É•¹Ðè€À°µÕ±Ñ¥Á±¥•Èè€Äô(€€€€€t(€€€ô°(€€€‘…¥±äèì(€€€€€•µ‰•ÉI•Ý…Éè€ÔÀ°(€€€€€áÁI•Ý…Éè€Ô°(€€€€€ÍÑ…µÁÍI•ÅÕ¥É•è€Ü°(€€€€€Ý••­±åµ‰•ÉI•Ý…Éè€ÈÀÀ°(€€€€€Ý••­±åÕÉ…Ñ¥½¹5¥¹ÕÑ•Ìè€ØÀ°(€€€€€Ý••­±åaÁ5Õ±Ñ¥Á±¥•Èè€È°(€€€€€Ý••­±å•…å5Õ±Ñ¥Á±¥•Èè€À¸Ð(€€€ô°(€€€‘…¥±å…É•5¥ÍÍ¥½¹Ìèì(€€€€€½Õ¹Ðè€Ì°(€€€€€Í•±•Ñ¥½¹Y•ÉÍ¥½¸è€È°(€€€€€‘…¥±å¥™™¥Õ±Ñ¥•Ìèl‰…Íäˆ°€‰5•‘¥Õ´ˆ°€‰!…É‰t°(€€€€€µ¥ÍÍ¥½¹Ìèl(€€€€€€€ì¥è€‰½éäµ‰É•…­™…ÍÐˆ°‘¥™™¥Õ±Ñäè€‰…Íäˆ°…Ñ¥½¹Ìèl‰™••‰t°Ñ…É•Ðè€È°¥½¸è€‰qÔÈØØÔˆ°Ñ¥Ñ±”è€‰½éä	É•…­™…ÍÐˆ°‘•ÍÉ¥ÁÑ¥½¸è€‰••å½ÕÈ±¥ÑÑ±”™±…µ”ÑÝ¥”¸ˆ°•µ‰•ÉI•Ý…Éè€ÐÀ°áÁI•Ý…Éè€Ôô°(€€€€€€€ì¥è€‰¡…ÁÁäµÁ±…åÑ¥µ”ˆ°‘¥™™¥Õ±Ñäè€‰…Íäˆ°…Ñ¥½¹Ìèl‰Á±…ä‰t°Ñ…É•Ðè€È°¥½¸è€‰qÔÈØÀÔˆ°Ñ¥Ñ±”è€‰!…ÁÁäA±…åÑ¥µ”ˆ°‘•ÍÉ¥ÁÑ¥½¸è€‰A±…äÑ½•Ñ¡•ÈÑÝ¥”¸ˆ°•µ‰•ÉI•Ý…Éè€ÔÀ°áÁI•Ý…Éè€Üô°(€€€€€€€ì¥è€‰±¥ÑÑ±”µÕ‘‘±•Ìˆ°‘¥™™¥Õ±Ñäè€‰…Íäˆ°…Ñ¥½¹Ìèl‰Á•Ð‰t°Ñ…É•Ðè€Ì°¥½¸è€‰qÔÈØØÄˆ°Ñ¥Ñ±”è€‰1¥ÑÑ±”Õ‘‘±•Ìˆ°‘•ÍÉ¥ÁÑ¥½¸è€‰¥Ù”Ñ¡É•”•¹Ñ±”Á•ÑÌ¸ˆ°•µ‰•ÉI•Ý…Éè€ÐÔ°áÁI•Ý…Éè€Øô°(€€€€€€€ì¥è€‰ÍÁ…É­±”µ‰…Ñ ˆ°‘¥™™¥Õ±Ñäè€‰…Íäˆ°…Ñ¥½¹Ìèl‰±•…¸‰t°Ñ…É•Ðè€Ä°¥½¸è€‰qÔÈÜÈØˆ°Ñ¥Ñ±”è€‰MÁ…É­±”	…Ñ ˆ°‘•ÍÉ¥ÁÑ¥½¸è€‰!•±Àå½ÕÈ±¥ÑÑ±”™±…µ”•Ð±•…¸¸ˆ°•µ‰•ÉI•Ý…Éè€ÌÔ°áÁI•Ý…Éè€Ôô°(€€€€€€€ì¥è€‰ÍÝ••Ðµ‘É•…µÌˆ°‘¥™™¥Õ±Ñäè€‰…Íäˆ°…Ñ¥½¹Ìèl‰Í±••À‰t°Ñ…É•Ðè€Ä°¥½¸è€‰qÔÈØÍ”ˆ°Ñ¥Ñ±”è€‰MÝ••ÐÉ•…µÌˆ°‘•ÍÉ¥ÁÑ¥½¸è€‰MÑ…ÉÐM±••À5½‘”½¹”¸ˆ°•µ‰•ÉI•Ý…Éè€ÌÔ°áÁI•Ý…Éè€Ôô°((€€€€€€€ì¥è€‰Ý…É´µ™•…ÍÐˆ°‘¥™™¥Õ±Ñäè€‰5•‘¥Õ´ˆ°…Ñ¥½¹Ìèl‰™••‰t°Ñ…É•Ðè€Ð°¥½¸è€‰qÔÈØØÔˆ°Ñ¥Ñ±”è€‰]…É´1¥ÑÑ±”•…ÍÐˆ°‘•ÍÉ¥ÁÑ¥½¸è€‰••å½ÕÈ±¥ÑÑ±”™±…µ”™½ÕÈÑ¥µ•Ì¸ˆ°•µ‰•ÉI•Ý…Éè€ØÔ°áÁI•Ý…Éè€äô°(€€€€€€€ì¥è€‰Á±…å™Õ°µ…™Ñ•É¹½½¸ˆ°‘¥™™¥Õ±Ñäè€‰5•‘¥Õ´ˆ°…Ñ¥½¹Ìèl‰Á±…ä‰t°Ñ…É•Ðè€Ð°¥½¸è€‰qÔÈØÀÔˆ°Ñ¥Ñ±”è€‰A±…å™Õ°™Ñ•É¹½½¸ˆ°‘•ÍÉ¥ÁÑ¥½¸è€‰A±…äÑ½•Ñ¡•È™½ÕÈÑ¥µ•Ì¸ˆ°•µ‰•ÉI•Ý…Éè€ÜÔ°áÁI•Ý…Éè€ÄÀô°(€€€€€€€ì¥è€‰Õ‘‘±”µ±½Õˆ°‘¥™™¥Õ±Ñäè€‰5•‘¥Õ´ˆ°…Ñ¥½¹Ìèl‰Á•Ð‰t°Ñ…É•Ðè€Ø°¥½¸è€‰qÔÈØØÄˆ°Ñ¥Ñ±”è€‰Õ‘‘±”±½Õˆ°‘•ÍÉ¥ÁÑ¥½¸è€‰¥Ù”Í¥à•¹Ñ±”Á•ÑÌ¸ˆ°•µ‰•ÉI•Ý…Éè€ÜÀ°áÁI•Ý…Éè€äô°(€€€€€€€ì¥è€‰‘½Õ‰±”µÍÁ…É­±”ˆ°‘¥™™¥Õ±Ñäè€‰5•‘¥Õ´ˆ°…Ñ¥½¹Ìèl‰±•…¸‰t°Ñ…É•Ðè€È°¥½¸è€‰qÔÈÜÈØˆ°Ñ¥Ñ±”è€‰½Õ‰±”MÁ…É­±”ˆ°‘•ÍÉ¥ÁÑ¥½¸è€‰!•±Àå½ÕÈ±¥ÑÑ±”™±…µ”•Ð±•…¸ÑÝ¥”¸ˆ°•µ‰•ÉI•Ý…Éè€ØÀ°áÁI•Ý…Éè€àô°(€€€€€€€ì¥è€‰±½Ù¥¹œµÉ½ÕÑ¥¹”ˆ°‘¥™™¥Õ±Ñäè€‰5•‘¥Õ´ˆ°…Ñ¥½¹Ìèl‰™••ˆ°€‰Á±…äˆ°€‰Á•Ðˆ°€‰±•…¸‰t°Ñ…É•Ðè€Ø°¥½¸è€‰qÔÈØÀÀˆ°Ñ¥Ñ±”è€‰1½Ù¥¹œI½ÕÑ¥¹”ˆ°‘•ÍÉ¥ÁÑ¥½¸è€‰½µÁ±•Ñ”Í¥à…Ý…­”…É”…Ñ¥½¹Ì¸ˆ°•µ‰•ÉI•Ý…Éè€àÀ°áÁI•Ý…Éè€ÄÀô°((€€€€€€€ì¥è€‰É…¹µ™•…ÍÐˆ°‘¥™™¥Õ±Ñäè€‰!…Éˆ°…Ñ¥½¹Ìèl‰™••‰t°Ñ…É•Ðè€Ü°¥½¸è€‰qÔÈØØÔˆ°Ñ¥Ñ±”è€‰É…¹±½Ü•…ÍÐˆ°‘•ÍÉ¥ÁÑ¥½¸è€‰••å½ÕÈ±¥ÑÑ±”™±…µ”Í•Ù•¸Ñ¥µ•Ì¸ˆ°•µ‰•ÉI•Ý…Éè€ÄÄÔ°áÁI•Ý…Éè€ÄÔô°(€€€€€€€ì¥è€‰©½äµµ…É…Ñ¡½¸ˆ°‘¥™™¥Õ±Ñäè€‰!…Éˆ°…Ñ¥½¹Ìèl‰Á±…ä‰t°Ñ…É•Ðè€Ø°¥½¸è€‰qÔÈØÀÔˆ°Ñ¥Ñ±”è€‰)½ä5…É…Ñ¡½¸ˆ°‘•ÍÉ¥ÁÑ¥½¸è€‰A±…äÑ½•Ñ¡•ÈÍ¥àÑ¥µ•Ì¸ˆ°•µ‰•ÉI•Ý…Éè€ÄÈÔ°áÁI•Ý…Éè€ÄÜô°(€€€€€€€ì¥è€‰¡•…ÉÑ™Õ°µ‘…äˆ°‘¥™™¥Õ±Ñäè€‰!…Éˆ°…Ñ¥½¹Ìèl‰Á•Ð‰t°Ñ…É•Ðè€ÄÀ°¥½¸è€‰qÔÈØØÄˆ°Ñ¥Ñ±”è€‰!•…ÉÑ™Õ°…äˆ°‘•ÍÉ¥ÁÑ¥½¸è€‰¥Ù”Ñ•¸•¹Ñ±”Á•ÑÌ¸ˆ°•µ‰•ÉI•Ý…Éè€ÄÈÀ°áÁI•Ý…Éè€ÄØô°(€€€€€€€ì¥è€‰É…‘¥…¹Ðµ±•…¸ˆ°‘¥™™¥Õ±Ñäè€‰!…Éˆ°…Ñ¥½¹Ìèl‰±•…¸‰t°Ñ…É•Ðè€Ð°¥½¸è€‰qÔÈÜÈØˆ°Ñ¥Ñ±”è€‰I…‘¥…¹Ð…¹±•…¸ˆ°‘•ÍÉ¥ÁÑ¥½¸è€‰!•±Àå½ÕÈ±¥ÑÑ±”™±…µ”•Ð±•…¸™½ÕÈÑ¥µ•Ì¸ˆ°•µ‰•ÉI•Ý…Éè€ÄÀÔ°áÁI•Ý…Éè€ÄÐô°(€€€€€€€ì¥è€‰…É”µµ…É…Ñ¡½¸ˆ°‘¥™™¥Õ±Ñäè€‰!…Éˆ°…Ñ¥½¹Ìèl‰™••ˆ°€‰Á±…äˆ°€‰Á•Ðˆ°€‰±•…¸‰t°Ñ…É•Ðè€ÄÈ°¥½¸è€‰qÔÈØÀÀˆ°Ñ¥Ñ±”è€‰Q¥¹ä…É”5…É…Ñ¡½¸ˆ°‘•ÍÉ¥ÁÑ¥½¸è€‰½µÁ±•Ñ”ÑÝ•±Ù”…Ý…­”…É”…Ñ¥½¹Ì¸ˆ°•µ‰•ÉI•Ý…Éè€ÄÌÔ°áÁI•Ý…Éè€Äàô(€€€€€t(€€€ô°(€€€…É…‘”èì(€€€€€Á±…å)½åI•Ý…Éè€Ø°(€€€€€…É•I•™ÕÍ…°èì(€€€€€€€Ñ¡É•Í¡½±‘A•É•¹Ðè€ÈÔ°(€€€€€€€¡…¹”è€À¸ÔÔ(€€€€€ô°(€€€€€Ý¡…¬èì(€€€€€€€‘ÕÉ…Ñ¥½¹M•½¹‘Ìè€Äà°(€€€€€€€¡¥¡M½É•	½¹ÕÌè€ÄÀÀ°(€€€€€€€µ…á	…Í•µ‰•Èè€ÌÀ°(€€€€€€€ÍÑÉ½¹M½É”è€ÄÈ°(€€€€€€€ÍÑÉ½¹aÀè€ÄÀ°(€€€€€€€±•…¹I½Õ¹‘µ‰•É	½¹ÕÌè€ÜÔ°(€€€€€€€±•…¹I½Õ¹‘aÁ	½¹ÕÌè€ÄÀ°(€€€€€€€±•…¹I½Õ¹‘5¥¹¥µÕµ!¥ÑÌè€Ô°(€€€€€€€Íåµ‰½±Ìèl(€€€€€€€€€ì¥è€‰™±…µ”ˆ°Íåµ‰½°è€‰qÕàÍ‘qÕ‘ÈÔˆ°Á½¥¹ÑÌè€Ä°Ý•¥¡Ðè€ØÔ°±…‰•°è€ˆ¬ÄÁ½¥¹Ðˆô°(€€€€€€€€€ì¥è€‰ÍÁ…É­±”ˆ°Íåµ‰½°è€‰qÔÈÜÈàˆ°Á½¥¹ÑÌè€Ô°Ý•¥¡Ðè€ÄÔ°±…‰•°è€‰	½¹ÕÌÁ½¥¹ÑÌˆô°(€€€€€€€€€ì¥è€‰Ý…Ñ•Èˆ°Íåµ‰½°è€‰qÕàÍ‘qÕ‘„Üˆ°Á½¥¹ÑÌè€´Ä°Ý•¥¡Ðè€ÄÔ°±…‰•°è€ˆ´ÄÁ½¥¹Ðˆô°(€€€€€€€€€ì¥è€‰Í­Õ±°ˆ°Íåµ‰½°è€‰qÕàÍ‘qÕ‘ŒàÀˆ°É•Í•ÑM½É”èÑÉÕ”°Ý•¥¡Ðè€Ô°±…‰•°è€‰1½Í”…±°Á½¥¹ÑÌˆô(€€€€€€€t(€€€€€ô°(€€€€€™±…ÁÁäèì(€€€€€€€¡¥¡M½É•	½¹ÕÌè€ÄÔÀ°(€€€€€€€Í½É”ÄÁµ‰•Èè€ÈÀ°(€€€€€€€Í½É”ÈÕµ‰•Èè€ÔÀ°(€€€€€€€Í½É”ÔÁaÀè€ÈÀ°(€€€€€€€ÍÁÉ¥Ñ•A…Ñ è€‰…ÍÍ•ÑÌ½™±…ÁÁäµ™±…µ”µÍÁÉ¥Ñ”¹Á¹œˆ°(€€€€€€€ÍÁÉ¥Ñ•]¥‘Ñ è€ÔÀ°(€€€€€€€ÍÁÉ¥Ñ•!•¥¡Ðè€ØÐ°(€€€€€€€¡¥Ñ‰½áI…‘¥ÕÌè€ÄÈ(€€€€€ô°(€€€€€Í¹…­”èì¡¥¡M½É•	½¹ÕÌè€ÄÔÀ°Í½É”ÄÁµ‰•Èè€ÌÀ°Í½É”ÈÕµ‰•Èè€àÀ°Í½É”ÔÁaÀè€ÈÔ°É¥‘M¥é”è€ÈÀ°Ñ¥­5Ìè€ÄÌÔ°ÝÉ…ÁÉ½Õ¹èÑÉÕ”ô°(€€€€€ÅÕ¥èèì(€€€€€€€É½Õ¹‘Ìè€Ô°(€€€€€€€©…­Á½Ñ	½¹ÕÌè€ÄÀÀ°(€€€€€€€Á•É™•Ñ	½¹ÕÌè€ÄÔÀ°(€€€€€€€Á•É™•ÑaÁ	½¹ÕÌè€ÄÔ°(€€€€€€€¡¥¡M½É•	½¹ÕÌè€ÄÀÀ°(€€€€€€€µ¥¹¥µÕµ	•Ðè€ÄÀ°(€€€€€€€‘•™…Õ±Ñ	•Ðè€ÔÀ°(€€€€€€€…±±½Ý9½	•ÐèÑÉÕ”°(€€€€€€€¹½	•Ñ	…Í•I•Ý…É‘Ìèì€Ìè€Ø°€Ðè€ÄÐ°€Ôè€Èàô°(€€€€€€€ÁÉ½É•ÍÍ¥½¸èì(€€€€€€€€€‰…Í•I•Ý…É‘	…Í¥Ìè€ÄÀÀÀ°(€€€€€€€€€Õ¹±¥µ¥Ñ•‘I•Ý…É‘	…Í¥Ìè€ÄÈÀÀÀ°(€€€€€€€€€Ñ¥•ÉÌèl(€€€€€€€€€€€ìµ…á1•Ù•°è€Ô°‘…¥±å9•Ñ…Àè€ÄÀÀÀô°(€€€€€€€€€€€ìµ…á1•Ù•°è€ÄÀ°‘…¥±å9•Ñ…Àè€ÈÀÀÀô°(€€€€€€€€€€€ìµ…á1•Ù•°è€ÈÀ°‘…¥±å9•Ñ…Àè€ÌÀÀÀô°(€€€€€€€€€€€ìµ…á1•Ù•°è€ÌÀ°‘…¥±å9•Ñ…Àè€ÐÀÀÀô°(€€€€€€€€€€€ìµ…á1•Ù•°è€ÐÀ°‘…¥±å9•Ñ…Àè€ÔÀÀÀô°(€€€€€€€€€€€ìµ…á1•Ù•°è€ÔÀ°‘…¥±å9•Ñ…Àè€ØÀÀÀô°(€€€€€€€€€€€ìµ…á1•Ù•°è€ØÀ°‘…¥±å9•Ñ…Àè€ÜÀÀÀô°(€€€€€€€€€€€ìµ…á1•Ù•°è€ÜÀ°‘…¥±å9•Ñ…Àè€àÀÀÀô°(€€€€€€€€€€€ìµ…á1•Ù•°è€àÀ°‘…¥±å9•Ñ…Àè€äÀÀÀô°(€€€€€€€€€€€ìµ…á1•Ù•°è€ää°‘…¥±å9•Ñ…Àè€ÄÀÀÀÀô°(€€€€€€€€€€€ìµ…á1•Ù•°è¹Õ±°°‘…¥±å9•Ñ…Àè¹Õ±°ô(€€€€€€€€€t(€€€€€€€ô°(€€€€€€€‘¥™™¥Õ±Ñ¥•Ìèì(€€€€€€€€€…ÍäèìµÕ±Ñ¥Á±¥•Èè€Ä¸Ô°‰•ÑM¡…É”è€À¸ÀÔ°‰½¹ÕÍM…±”è€À¸ÌÔô°(€€€€€€€€€5•‘¥Õ´èìµÕ±Ñ¥Á±¥•Èè€È°‰•ÑM¡…É”è€À¸Ä°‰½¹ÕÍM…±”è€À¸ØÔô°(€€€€€€€€€!…ÉèìµÕ±Ñ¥Á±¥•Èè€Ì°‰•ÑM¡…É”è€À¸È°‰½¹ÕÍM…±”è€Äô(€€€€€€€ô(€€€€€ô(€€€ô°(€€€Í¡½Á…Ñ•½É¥•Ìèl(€€€€€ì¥è€‰Á•Éµ…¹•¹Ðˆ°±…‰•°è€‰A•Éµ…¹•¹ÐUÁÉ…‘•Ìˆô°(€€€€€ì¥è€‰™½½ˆ°±…‰•°è€‰½½ˆô°(€€€€€ì¥è€‰©½äˆ°±…‰•°è€‰)½ä%Ñ•µÌˆô°(€€€€€ì¥è€‰±½Ù”ˆ°±…‰•°è€‰1½Ù”%Ñ•µÌˆô°(€€€€€ì¥è€‰É•ÍÐˆ°±…‰•°è€‰I•ÍÐ%Ñ•µÌˆô°(€€€€€ì¥è€‰±•…¸ˆ°±…‰•°è€‰±•…¸%Ñ•µÌˆô°(€€€€€ì¥è€‰½µ‰¼ˆ°±…‰•°è€‰½µ‰¼%Ñ•µÌˆô°(€€€€€ì¥è€‰‰½½ÍÐˆ°±…‰•°è€‰	½½ÍÑÌˆô°(€€€€€ì¥è€‰áÀˆ°±…‰•°è€‰a@	½½ÍÑÌˆô°(€€€€€ì¥è€‰½Íµ•Ñ¥Ìˆ°±…‰•°è€‰•ÍÍ½É¥•Ìˆô(€€€t°(€€€É•Ý…É‘…É‘Ìèì±…å½ÕÑY•ÉÍ¥½¸è€Èô°(€€€Í¡½Á%Ñ•µÌ°(€€€µ¥±•ÍÑ½¹•I•Ý…É‘Ì°(€€€ÅÕ¥éEÕ•ÍÑ¥½¹Ì°(€€€É•…Ñ¥Ù•¥Í±…¥µ•Èè€‰Q¡¥ÌÉ•Ý…É±•ÑÌå½Ô¡½½Í”Ñ¡”Ñ¡•µ”…¹•¹•É…°¥‘•„¸$Ý¥±°ÑÉäÑ¼™½±±½Üå½ÕÈÝ¥Í …Ì±½Í•±ä…ÌÁ½ÍÍ¥‰±”°‰ÕÐÍµ…±°‘¥™™•É•¹•Ì¥¸ÍÑå±”°‘•Ñ…¥±Ì°µ½Ù•µ•¹Ð°±åÉ¥Ì°Í½Õ¹°½È™¥¹…°É•ÍÕ±Ðµ…ä¡…ÁÁ•¸‰•…ÕÍ”É•…Ñ¥Ù”Ñ½½±Ì…¹¹½Ð…±Ý…åÌÉ•…Ñ”•Ù•ÉåÑ¡¥¹œ•á…Ñ±ä…Ì¥µ…¥¹•¸ˆ(€ôì)ô¤ ¤ì(