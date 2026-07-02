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
      (index) => `Feed +${[3, 6, 10, 15, 22][index]} Hunger; Hunger items +${[5, 10, 15, 22, 30][index]}%`
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

    item("sparkle-cookie-i", "Sparkle Cookie I", "food", 90, { hunger: 12, joy: 8 }, 1, { icon: "\u2736", description: "+12 Hunger, +8 Joy" }),
    item("sparkle-cookie-ii", "Sparkle Cookie II", "food", 180, { hunger: 24, joy: 14 }, 2, { icon: "\u2736", description: "+24 Hunger, +14 Joy" }),
    item("sparkle-cookie-iii", "Sparkle Cookie III", "food", 330, { hunger: 40, joy: 24 }, 3, { icon: "\u2736", description: "+40 Hunger, +24 Joy" }),
    item("sparkle-cookie-iv", "Sparkle Cookie IV", "food", 540, { hunger: 58, joy: 36 }, 4, { icon: "\u2736", description: "+58 Hunger, +36 Joy" }),
    item("sparkle-cookie-v", "Sparkle Cookie V", "food", 850, { hunger: 80, joy: 55 }, 5, { icon: "\u2736", description: "+80 Hunger, +55 Joy" }),

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

    item("cozy-taco-i", "Cozy Taco I", "combo", 120, { hunger: 25, joy: 15 }, 1, { icon: "\u25d2", description: "+25 Hunger, +15 Joy" }),
    item("cozy-taco-ii", "Cozy Taco II", "combo", 240, { hunger: 45, joy: 30 }, 2, { icon: "\u25d2", description: "+45 Hunger, +30 Joy" }),
    item("cozy-taco-iii", "Cozy Taco III", "combo", 430, { hunger: 70, joy: 45 }, 3, { icon: "\u25d2", description: "+70 Hunger, +45 Joy" }),
    item("cozy-taco-iv", "Cozy Taco IV", "combo", 680, { hunger: 90, joy: 60, love: 10 }, 4, { icon: "\u25d2", description: "+90 Hunger, +60 Joy, +10 Love" }),
    item("cozy-taco-v", "Cozy Taco V", "combo", 980, { hunger: "max", joy: 85, love: 20 }, 5, { icon: "\u25d2", description: "Full Hunger, +85 Joy, +20 Love" }),

    item("warm-cocoa-i", "Warm Cocoa I", "combo", 110, { joy: 20, energy: 10 }, 1, { icon: "\u25d0", description: "+20 Joy, +10 Rest" }),
    item("warm-cocoa-ii", "Warm Cocoa II", "combo", 230, { joy: 35, energy: 25 }, 2, { icon: "\u25d0", description: "+35 Joy, +25 Rest" }),
    item("warm-cocoa-iii", "Warm Cocoa III", "combo", 420, { joy: 52, energy: 40 }, 3, { icon: "\u25d0", description: "+52 Joy, +40 Rest" }),
    item("warm-cocoa-iv", "Warm Cocoa IV", "combo", 660, { joy: 72, energy: 58, love: 10 }, 4, { icon: "\u25d0", description: "+72 Joy, +58 Rest, +10 Love" }),
    item("warm-cocoa-v", "Warm Cocoa V", "combo", 980, { joy: "max", energy: 82, love: 20 }, 5, { icon: "\u25d0", description: "Full Joy, +82 Rest, +20 Love" }),

    item("special-meal", "Special Meal", "combo", 200, { hunger: "max", joy: "max" }, 0, { icon: "\u2605", description: "Fills Hunger and Joy together" }),
    item("little-feast", "Little Feast", "combo", 650, { hunger: 50, joy: 50 }, 0, { unlockLevel: 10, icon: "\u2737", description: "+50 Hunger and +50 Joy" }),
    item("glow-care-box", "Glow Care Box", "combo", 1200, { hunger: 50, joy: 50, energy: 50 }, 0, { unlockLevel: 20, icon: "\u25c7", description: "+50 Hunger, Joy, and Rest" }),
    item("hearty-toast", "Hearty Glow Toast", "food", 180, { hunger: 45, love: 4 }, 0, { icon: "\u25b0", description: "+45 Hunger and +4 Love" }),
    item("joy-lantern", "Joy Lantern", "joy", 260, { joy: 40, love: 8 }, 0, { unlockLevel: 3, icon: "\u2600", description: "+40 Joy and +8 Love" }),
    item("dream-cloud", "Dream Cloud", "rest", 300, { energy: 48, joy: 8 }, 0, { unlockLevel: 3, icon: "\u263e", description: "+48 Rest and +8 Joy" }),
    item("heart-macaron", "Heart Macaron", "love", 240, { love: 28, joy: 10 }, 0, { unlockLevel: 3, icon: "\u2665", description: "+28 Love and +10 Joy" }),
    item("rose-hug", "Rose Hug", "love", 520, { love: 55, joy: 22 }, 0, { unlockLevel: 8, icon: "\u2764", description: "+55 Love and +22 Joy" }),
    item("study-spark", "Study Spark", "xp", 750, { xp: 45 }, 0, { unlockLevel: 8, icon: "\u2726", description: "One-time +45 XP" }),
    item("cozy-care-basket", "Cozy Care Basket", "combo", 900, { hunger: 40, joy: 40, energy: 40, love: 30 }, 0, { unlockLevel: 12, icon: "\u25c7", description: "+40 Hunger, Joy, Rest and +30 Love" }),
    item("full-care-lantern", "Full Care Lantern", "combo", 1800, { fillAll: true }, 0, { unlockLevel: 18, icon: "\u2600", description: "Fills every care stat completely" }),

    item("emergency-care", "Emergency Care Boost", "boost", 1000, { atLeastMain: 70 }, 0, { unlockLevel: 10, type: "boost", icon: "\u271a", description: "Raises all main stats to at least 70%" }),
    item("full-glow", "Full Glow Boost", "boost", 1500, { fillMain: true }, 0, { unlockLevel: 15, type: "boost", maxOwned: 1, icon: "\u2600", description: "Fills Hunger, Joy, and Rest" }),
    item("ember-blessing", "Ember Blessing", "boost", 2000, { activeBoost: { group: "ember", emberMultiplier: 1.5, durationMinutes: 30 } }, 0, { unlockLevel: 20, type: "boost", icon: "\u2666", description: "+50% Ember rewards for 30 minutes" }),
    item("perfect-care", "Perfect Care Boost", "boost", 2500, { fillAll: true, xp: 25 }, 0, { unlockLevel: 30, type: "boost", icon: "\u2739", description: "Fills every stat and grants +25 XP" }),

    item("xp-spark-i", "XP Spark I", "xp", 500, { activeBoost: { group: "xp", xpMultiplier: 1.1, durationMinutes: 10 } }, 0, { unlockLevel: 5, type: "boost", icon: "\u2726", description: "+10% XP for 10 minutes" }),
    item("xp-spark-ii", "XP Spark II", "xp", 1000, { activeBoost: { group: "xp", xpMultiplier: 1.2, durationMinutes: 15 } }, 0, { unlockLevel: 10, type: "boost", icon: "\u2726", description: "+20% XP for 15 minutes" }),
    item("xp-spark-iii", "XP Spark III", "xp", 1800, { activeBoost: { group: "xp", xpMultiplier: 1.3, durationMinutes: 30 } }, 0, { unlockLevel: 20, type: "boost", icon: "\u2726", description: "+30% XP for 30 minutes" }),
    item("golden-xp-flame", "Golden XP Flame", "xp", 3000, { activeBoost: { group: "xp", xpMultiplier: 1.5, durationMinutes: 30 } }, 0, { unlockLevel: 35, type: "boost", icon: "\u2605", description: "+50% XP for 30 minutes" }),

    item("rose-ribbon", "Rose Ribbon", "cosmetics", 350, {}, 0, { unlockLevel: 5, type: "cosmetic", icon: "\u2665", cosmetic: "rose-ribbon", description: "A soft rose-colored ribbon glow" }),
    item("golden-glasses", "Golden Glasses", "cosmetics", 650, {}, 0, { unlockLevel: 10, type: "cosmetic", icon: "\u25c7", cosmetic: "golden-glasses", description: "A warm golden sparkle for her glasses" }),
    item("starlight-aura", "Starlight Aura", "cosmetics", 900, {}, 0, { unlockLevel: 20, type: "cosmetic", icon: "\u2605", cosmetic: "starlight-aura", description: "Tiny stars drift around her glow" })
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
        ["What does the tempo marking adagio usually mean?", ["Very fast", "Slow", "Loud", "Playful"], 1],
        ["What is the relative minor of C major?", ["A minor", "D minor", "E minor", "G minor"], 0],
        ["Who composed The Four Seasons?", ["Mozart", "Vivaldi", "Chopin", "Debussy"], 1],
        ["An octave spans how many letter-named notes?", ["Five", "Six", "Seven", "Eight"], 3],
        ["What does DAW stand for in music production?", ["Digital Audio Workstation", "Dynamic Acoustic Wave", "Direct Analog Writing", "Digital Artist Wire"], 0]
      ],
      Hard: [
        ["Who composed The Well-Tempered Clavier?", ["J. S. Bach", "Franz Liszt", "Gustav Mahler", "Maurice Ravel"], 0],
        ["Compared with natural minor, which degree is raised in the Dorian mode?", ["Second", "Third", "Sixth", "Seventh"], 2],
        ["Who composed The Rite of Spring?", ["Stravinsky", "Tchaikovsky", "Brahms", "Handel"], 0],
        ["Which major key has one sharp?", ["D major", "G major", "A major", "E major"], 1],
        ["Which note is enharmonic with C-sharp?", ["D-flat", "B-sharp", "E-flat", "C-flat"], 0]
      ]
    },
    "K-Pop": {
      Easy: [
        ["K-Pop is most closely associated with which country?", ["Japan", "South Korea", "Thailand", "China"], 1],
        ["What is BTS's official fandom name?", ["BLINK", "ONCE", "ARMY", "MOA"], 2],
        ["What is BLACKPINK's fandom name?", ["BLINK", "MIDZY", "CARAT", "STAY"], 0],
        ["Which word commonly describes the youngest member of a K-Pop group?", ["Leader", "Maknae", "Main", "Trainee"], 1],
        ["What is a lightstick mainly used for?", ["Cooking", "Concert support", "Dance practice", "Recording"], 1]
      ],
      Medium: [
        ["Which group is widely credited with helping shape modern K-Pop in the early 1990s?", ["Seo Taiji and Boys", "EXO", "TWICE", "IVE"], 0],
        ["What is EXO's official fandom name?", ["EXO-L", "ELF", "Moa", "Buddy"], 0],
        ["What is TWICE's official fandom name?", ["Once", "Blink", "Stay", "Atiny"], 0],
        ["What usually happens before an idol officially debuts?", ["A trainee period", "A world tour", "A film premiere", "A military parade"], 0],
        ["Which group released the song God's Menu?", ["Stray Kids", "SHINee", "MAMAMOO", "aespa"], 0]
      ],
      Hard: [
        ["What was SHINee's debut single?", ["Replay", "Lucifer", "Sherlock", "View"], 0],
        ["What is Red Velvet's official fandom name?", ["ReVeluv", "Neverland", "Insomnia", "Melody"], 0],
        ["Which BTS album includes the song Black Swan?", ["Map of the Soul: 7", "Wings", "BE", "Love Yourself: Her"], 0],
        ["What was the title of BLACKPINK's debut single album?", ["Square One", "Born Pink", "The Album", "Kill This Love"], 0],
        ["Which three units form SEVENTEEN's core unit system?", ["Hip-Hop, Vocal, Performance", "Dance, Rap, Visual", "Blue, Red, Gold", "Main, Lead, Sub"], 0]
      ]
    },
    "Movies & Series": {
      Easy: [
        ["What is a story shown over several episodes called?", ["A series", "A trailer", "A poster", "A soundtrack"], 0],
        ["Who usually guides the actors and creative vision on set?", ["Director", "Viewer", "Critic", "Usher"], 0],
        ["What appears at the end to name the people who made a film?", ["Captions", "Credits", "Spoilers", "Subtitles"], 1],
        ["What is a short preview for a movie called?", ["Finale", "Trailer", "Episode", "Scene"], 1],
        ["Which genre is designed mainly to make people laugh?", ["Horror", "Drama", "Comedy", "Mystery"], 2]
      ],
      Medium: [
        ["Who directed Parasite?", ["Bong Joon-ho", "Park Chan-wook", "Akira Kurosawa", "Ang Lee"], 0],
        ["Wakanda is the home of which Marvel hero?", ["Thor", "Black Panther", "Hawkeye", "Doctor Strange"], 1],
        ["What company is the setting of the US series The Office?", ["Dunder Mifflin", "Waystar Royco", "Los Pollos Hermanos", "Lumon"], 0],
        ["Which studio created Spirited Away?", ["Pixar", "Studio Ghibli", "DreamWorks", "Aardman"], 1],
        ["What subject did Walter White teach in Breaking Bad?", ["Physics", "Chemistry", "History", "Biology"], 1]
      ],
      Hard: [
        ["What is the name of Charles Foster Kane's estate in Citizen Kane?", ["Xanadu", "Rosebud", "Manderley", "Graceland"], 0],
        ["What are the bioengineered beings called in Blade Runner?", ["Replicants", "Synths", "Hosts", "Clones"], 0],
        ["Where was most principal photography for The Lord of the Rings trilogy completed?", ["New Zealand", "Scotland", "Canada", "Iceland"], 0],
        ["Who directed The Godfather?", ["Francis Ford Coppola", "Martin Scorsese", "Sidney Lumet", "Brian De Palma"], 0],
        ["In which language was the series Dark originally produced?", ["Danish", "German", "Dutch", "Swedish"], 1]
      ]
    },
    Animals: {
      Easy: [
        ["Which animal is the largest living mammal?", ["Elephant", "Blue whale", "Giraffe", "Hippopotamus"], 1],
        ["What do bees collect from flowers?", ["Sand", "Nectar", "Salt", "Wool"], 1],
        ["Which animal can change color to blend into its surroundings?", ["Chameleon", "Rabbit", "Penguin", "Horse"], 0],
        ["What is a baby cat called?", ["Pup", "Calf", "Kitten", "Foal"], 2],
        ["Which bird is famous for being unable to fly and living in Antarctica?", ["Eagle", "Penguin", "Sparrow", "Parrot"], 1]
      ],
      Medium: [
        ["How many hearts does an octopus have?", ["One", "Two", "Three", "Four"], 2],
        ["What type of animal is an axolotl?", ["Fish", "Amphibian", "Reptile", "Mammal"], 1],
        ["Which mammals are capable of true sustained flight?", ["Flying squirrels", "Bats", "Sugar gliders", "Colugos"], 1],
        ["What can give some sloths' fur a green tint?", ["Algae", "Copper", "Pollen", "Clay"], 0],
        ["What dance do honeybees use to share a food location?", ["Waggle dance", "Moon dance", "Spiral dance", "Circle jump"], 0]
      ],
      Hard: [
        ["A narwhal's tusk is actually an elongated what?", ["Horn", "Tooth", "Bone", "Claw"], 1],
        ["Which sense helps a platypus locate prey underwater?", ["Electroreception", "Echolocation", "Infrared vision", "Magnetism only"], 0],
        ["Which animal is famous for cube-shaped droppings?", ["Wombat", "Koala", "Capybara", "Badger"], 0],
        ["A mantis shrimp belongs to which crustacean order?", ["Decapoda", "Stomatopoda", "Isopoda", "Amphipoda"], 1],
        ["What is the scientific name of the blue whale?", ["Balaenoptera musculus", "Orcinus orca", "Physeter macrocephalus", "Megaptera novaeangliae"], 0]
      ]
    },
    "Food & Culture": {
      Easy: [
        ["Which grain is traditionally used for risotto?", ["Rice", "Oats", "Corn", "Barley"], 0],
        ["What is hummus mainly made from?", ["Lentils", "Chickpeas", "Potatoes", "Rice"], 1],
        ["Which drink is made by steeping leaves in hot water?", ["Tea", "Soda", "Cider", "Milk"], 0],
        ["What gives sourdough its rise and tang?", ["A starter", "Ice", "Oil", "Cocoa"], 0],
        ["Which utensil is traditionally used for eating many East Asian dishes?", ["Whisk", "Chopsticks", "Ladle", "Tongs"], 1]
      ],
      Medium: [
        ["Miso is traditionally made by fermenting which ingredient?", ["Soybeans", "Potatoes", "Apples", "Almonds"], 0],
        ["What cooks the fish in a classic ceviche preparation?", ["Citrus acid", "Steam", "Smoke", "Hot oil"], 0],
        ["Which process gives kimchi its characteristic tang?", ["Lactic fermentation", "Caramelization", "Distillation", "Freezing"], 0],
        ["Paella is strongly associated with which Spanish region?", ["Valencia", "Galicia", "Navarre", "Asturias"], 0],
        ["Tahini is made primarily from what?", ["Sesame seeds", "Walnuts", "Olives", "Sunflower petals"], 0]
      ],
      Hard: [
        ["The Maillard reaction mainly occurs between amino acids and what?", ["Reducing sugars", "Mineral salts", "Water", "Citric acid"], 0],
        ["What is nixtamalization?", ["Alkaline treatment of maize", "Smoking tea leaves", "Freezing cream", "Drying seaweed"], 0],
        ["What is aquafaba?", ["Legume cooking liquid", "Fermented milk", "Herb oil", "Rice vinegar"], 0],
        ["Which compound is closely associated with the taste of umami?", ["Glutamate", "Sucrose", "Menthol", "Caffeine"], 0],
        ["Which is one of the five classical French mother sauces?", ["Bechamel", "Pesto", "Salsa verde", "Tzatziki"], 0]
      ]
    },
    Mexico: {
      Easy: [
        ["What is the capital of Mexico?", ["Cancun", "Monterrey", "Mexico City", "Guadalajara"], 2],
        ["Which ancient civilization built Chichen Itza?", ["Maya", "Roman", "Viking", "Egyptian"], 0],
        ["What colors appear on the Mexican flag?", ["Blue, white, red", "Green, white, red", "Green, gold, blue", "Red, black, white"], 1],
        ["Which celebration honors loved ones who have died?", ["Day of the Dead", "Carnival", "New Year", "Spring Day"], 0],
        ["Which ingredient forms the base of a traditional corn tortilla?", ["Wheat", "Maize", "Rice", "Oats"], 1]
      ],
      Medium: [
        ["What is Mexico's currency?", ["Peso", "Real", "Sol", "Quetzal"], 0],
        ["Which is Mexico's largest state by area?", ["Chihuahua", "Jalisco", "Oaxaca", "Yucatan"], 0],
        ["Which Mexican painter is known for many self-portraits?", ["Frida Kahlo", "Remedios Varo", "Maria Izquierdo", "Aurora Reyes"], 0],
        ["Mole sauce commonly combines chilies with what?", ["Spices and seeds", "Only water", "Raw lettuce", "Plain milk"], 0],
        ["On which date is Mexican Independence Day celebrated?", ["May 5", "September 16", "November 20", "December 12"], 1]
      ],
      Hard: [
        ["In which modern federal entity is Teotihuacan located?", ["State of Mexico", "Puebla", "Hidalgo", "Morelos"], 0],
        ["The Maya city of Palenque is in which Mexican state?", ["Chiapas", "Sonora", "Nayarit", "Tlaxcala"], 0],
        ["The axolotl is native to the lake system of which place?", ["Xochimilco", "Chapultepec", "Tulum", "Copper Canyon"], 0],
        ["In which year did the Mexican Revolution begin?", ["1810", "1862", "1910", "1938"], 2],
        ["The word chocolate reached Spanish through a word associated with which language?", ["Nahuatl", "Latin", "Quechua", "Basque"], 0]
      ]
    },
    "Personal Fun Facts": {
      Easy: [
        ["What is the name of the cozy shop?", ["Little Glow Shop", "Moon Market", "Spark Store", "Rose Room"], 0],
        ["What currency does the little flame collect?", ["Stars", "Ember", "Pearls", "Petals"], 1],
        ["Which reward can be downloaded and sent to Ren\u00e9?", ["Reward Card", "Glow Berry", "Moon Milk", "Daily Stamp"], 0],
        ["What does Sleep Mode restore?", ["Rest", "Ember", "Claim codes", "Shop prices"], 0],
        ["What unlocks after 7 Daily Glow Stamps?", ["Weekly Glow Bottle", "A cold shower", "A locked shop", "Nothing"], 0]
      ],
      Medium: [
        ["How long does a Weekly Glow Bottle last?", ["10 minutes", "30 minutes", "60 minutes", "One week"], 2],
        ["Which item fills Hunger, Joy, and Rest completely?", ["Full Glow Boost", "Rose Tea I", "Glow Berry I", "Daily Stamp"], 0],
        ["How often does the level-based Ember multiplier improve?", ["Every 5 levels", "Every 10 levels", "Every 25 levels", "Only at Level 100"], 1],
        ["How many games are inside the Glow Arcade?", ["Two", "Three", "Four", "Seven"], 2],
        ["What kind of item can help more than one stat?", ["A combo item", "A claim code", "A badge", "A backup"], 0]
      ],
      Hard: [
        ["What is the legendary Level 100 reward?", ["A custom T-shirt", "A Glow Berry", "A quiz hint", "A daily stamp"], 0],
        ["How often do personal milestone rewards unlock?", ["Every 3 levels", "Every 5 levels", "Every 8 levels", "Every 20 levels"], 1],
        ["What does XP Spark III provide?", ["+30% XP for 30 minutes", "+10% XP for 10 minutes", "Double Ember for one hour", "Full Rest instantly"], 0],
        ["Which word begins every saved reward claim code?", ["FLAME", "EMBER", "GLOW", "SISTER"], 0],
        ["Which file type is used for exported game backups?", ["JSON", "MP3", "PNG", "PDF"], 0]
      ]
    }
  };

  Object.values(quizQuestions).forEach((difficultyGroups) => {
    Object.keys(difficultyGroups).forEach((difficulty) => {
      difficultyGroups[difficulty] = difficultyGroups[difficulty].map(([question, answers, correct]) => ({
        question,
        answers,
        correct,
        difficulty
      }));
    });
  });

  window.LLAMITA_GAME_CONFIG = {
    saveVersion: 4,
    storageKey: "good-mood-mi-llamita-v1",
    backupKind: "mi-llamita-save",
    stats: {
      keys: ["hunger", "joy", "energy", "cleanliness", "love"],
      main: ["hunger", "joy", "energy"],
      baseMax: 100,
      minimum: 0,
      awakeDecayPerMinute: { hunger: 0.32, joy: 0.24, energy: 0.08, cleanliness: 0.15, love: 0.12 },
      sleepingDecayPerMinute: { hunger: 0.03, joy: 0.01, cleanliness: 0.02, love: 0.01 },
      sleepRestPerMinute: 14.4,
      sleepXpPerMinute: 5,
      maxOfflineMinutes: 720
    },
    actions: {
      feed: { stats: { hunger: 18 }, xp: 3, embers: 1 },
      play: { stats: { joy: 12, hunger: -2, energy: -1, cleanliness: -2 }, xp: 4, embers: 2 },
      pet: { stats: { joy: 5, love: 7 }, xp: 2, embers: 1, cooldownMs: 8000, restDrainCooldownMs: 60000 },
      clean: { stats: { cleanliness: 25 }, xp: 3, embers: 1 }
    },
    level: {
      xpBase: 24,
      xpPerLevel: 12,
      maxStatPerLevel: 1,
      milestoneExtraMax: 4,
      emberMultiplierStepLevels: 10,
      emberMultiplierStep: 0.05,
      levelUpEmberBase: 10,
      levelUpEmberPerLevel: 2
    },
    loveBonus: {
      thresholds: [
        { minimumPercent: 100, multiplier: 1.2 },
        { minimumPercent: 80, multiplier: 1.15 },
        { minimumPercent: 60, multiplier: 1.1 },
        { minimumPercent: 40, multiplier: 1.06 },
        { minimumPercent: 20, multiplier: 1.03 },
        { minimumPercent: 0, multiplier: 1 }
      ]
    },
    daily: {
      emberReward: 50,
      xpReward: 5,
      stampsRequired: 7,
      weeklyEmberReward: 200,
      weeklyDurationMinutes: 60,
      weeklyXpMultiplier: 2,
      weeklyDecayMultiplier: 0.4
    },
    arcade: {
      whack: {
        durationSeconds: 18,
        highScoreBonus: 100,
        maxBaseEmber: 30,
        strongScore: 12,
        strongXp: 10,
        symbols: [
          { id: "flame", symbol: "\ud83d\udd25", points: 1, weight: 65, label: "+1 point" },
          { id: "sparkle", symbol: "\u2728", points: 5, weight: 15, label: "Bonus points" },
          { id: "water", symbol: "\ud83d\udca7", points: -1, weight: 15, label: "-1 point" },
          { id: "skull", symbol: "\ud83d\udc80", resetScore: true, weight: 5, label: "Lose all points" }
        ]
      },
      flappy: {
        highScoreBonus: 150,
        score10Ember: 20,
        score25Ember: 50,
        score50Xp: 20,
        spritePath: "assets/flappy-flame-sprite.png",
        spriteWidth: 50,
        spriteHeight: 64,
        hitboxRadius: 12
      },
      snake: { highScoreBonus: 150, score10Ember: 30, score25Ember: 80, score50Xp: 25, gridSize: 20, tickMs: 135, wrapAround: true },
      quiz: {
        rounds: 5,
        jackpotBonus: 100,
        minimumBet: 10,
        defaultBet: 50,
        allowNoBet: true,
        noBetBaseRewards: { 3: 6, 4: 14, 5: 28 },
        difficulties: {
          Easy: { multiplier: 1.5 },
          Medium: { multiplier: 2 },
          Hard: { multiplier: 3 }
        }
      }
    },
    shopCategories: [
      { id: "permanent", label: "Permanent Upgrades" },
      { id: "food", label: "Food" },
      { id: "joy", label: "Joy Items" },
      { id: "love", label: "Love Items" },
      { id: "rest", label: "Rest Items" },
      { id: "combo", label: "Combo Items" },
      { id: "boost", label: "Boosts" },
      { id: "xp", label: "XP Boosts" },
      { id: "cosmetics", label: "Cosmetics" }
    ],
    rewardCards: { layoutVersion: 2 },
    shopItems,
    milestoneRewards,
    quizQuestions,
    creativeDisclaimer: "This reward lets you choose the theme and general idea. I will try to follow your wish as closely as possible, but small differences in style, details, movement, lyrics, sound, or final result may happen because creative tools cannot always create everything exactly as imagined."
  };
})();
