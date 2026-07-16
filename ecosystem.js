(function () {
  "use strict";

  const canvas = document.getElementById("world");
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    document.getElementById("live-mark").textContent = "[ NO CANVAS ]";
    return;
  }

  // Simulation configuration and ASCII artwork.
  const FULL_CIRCLE_RADIANS = Math.PI * 2;
  const SIMULATION_STEP_SECONDS = 1 / 30;
  const SPECIES_ORDER = ["deer", "fish", "alligator", "snake", "tiger"];
  const SIMULATION_SPEEDS = [1, 2, 4];
  const SPECIES_CONFIG = {
    deer: {
      hueDegrees: 34,
      saturationPercent: 72,
      habitat: "land",
      foodType: "berry",
      fleesPredators: true,
      baseSpeed: 43,
      baseSenseRadius: 105,
      baseDisplaySize: 13,
      baseSteeringForce: 72,
      metabolicEnergyCostPerSecond: 0.82,
      movementEnergyCostPerSecond: 0.96,
      maxEnergy: 120,
      foodEnergyGain: 24,
      reproductionThreshold: 91,
      reproductionEnergyCost: 38,
      offspringEnergy: 43,
      reproductionRatePerSecond: 0.11,
      minimumReproductionAgeSeconds: 9,
      reproductionCooldownSeconds: 10,
      targetPopulation: 44,
      maximumPopulation: 54,
      initialPopulation: 36,
      reseedPopulation: 10,
    },
    fish: {
      hueDegrees: 188,
      saturationPercent: 92,
      habitat: "lake",
      foodType: "plankton",
      fleesPredators: true,
      baseSpeed: 38,
      baseSenseRadius: 92,
      baseDisplaySize: 11,
      baseSteeringForce: 63,
      metabolicEnergyCostPerSecond: 0.62,
      movementEnergyCostPerSecond: 0.72,
      maxEnergy: 105,
      foodEnergyGain: 10,
      reproductionThreshold: 79,
      reproductionEnergyCost: 30,
      offspringEnergy: 35,
      reproductionRatePerSecond: 0.07,
      minimumReproductionAgeSeconds: 7,
      reproductionCooldownSeconds: 10,
      targetPopulation: 68,
      maximumPopulation: 86,
      initialPopulation: 57,
      reseedPopulation: 14,
    },
    alligator: {
      hueDegrees: 112,
      saturationPercent: 70,
      habitat: "lake",
      preySpecies: ["fish"],
      huntingHungerThreshold: 0.22,
      huntingEnergyCeilingRatio: 0.8,
      catchRadiusScale: 0.5,
      catchRadiusPadding: 12,
      minimumHabitatDepth: 38,
      baseSpeed: 41,
      baseSenseRadius: 165,
      baseDisplaySize: 30,
      baseSteeringForce: 70,
      metabolicEnergyCostPerSecond: 0.72,
      movementEnergyCostPerSecond: 0.82,
      maxEnergy: 180,
      reproductionThreshold: 145,
      reproductionEnergyCost: 68,
      offspringEnergy: 75,
      reproductionRatePerSecond: 0.014,
      minimumReproductionAgeSeconds: 24,
      reproductionCooldownSeconds: 42,
      targetPopulation: 2.2,
      maximumPopulation: 3,
      initialPopulation: 1,
      reseedPopulation: 1,
    },
    snake: {
      hueDegrees: 42,
      saturationPercent: 92,
      habitat: "land",
      preySpecies: ["deer"],
      fleesPredators: true,
      huntingHungerThreshold: 0.3,
      huntingEnergyCeilingRatio: 0.7,
      catchRadiusScale: 0.44,
      catchRadiusPadding: 4,
      baseSpeed: 45,
      baseSenseRadius: 125,
      baseDisplaySize: 16,
      baseSteeringForce: 64,
      metabolicEnergyCostPerSecond: 1.1,
      movementEnergyCostPerSecond: 1.05,
      maxEnergy: 135,
      reproductionThreshold: 105,
      reproductionEnergyCost: 44,
      offspringEnergy: 50,
      reproductionRatePerSecond: 0.035,
      minimumReproductionAgeSeconds: 16,
      reproductionCooldownSeconds: 22,
      targetPopulation: 9,
      maximumPopulation: 13,
      initialPopulation: 7,
      reseedPopulation: 3,
    },
    tiger: {
      hueDegrees: 26,
      saturationPercent: 96,
      habitat: "land",
      preySpecies: ["deer", "snake", "fish"],
      huntingHungerThreshold: 0.24,
      huntingEnergyCeilingRatio: 0.76,
      catchRadiusScale: 0.52,
      catchRadiusPadding: 11,
      spawnNearShore: true,
      baseSpeed: 39,
      baseSenseRadius: 175,
      baseDisplaySize: 26,
      baseSteeringForce: 59,
      metabolicEnergyCostPerSecond: 1.02,
      movementEnergyCostPerSecond: 1.08,
      maxEnergy: 175,
      reproductionThreshold: 160,
      reproductionEnergyCost: 70,
      offspringEnergy: 76,
      reproductionRatePerSecond: 0.004,
      minimumReproductionAgeSeconds: 35,
      reproductionCooldownSeconds: 55,
      targetPopulation: 1.2,
      maximumPopulation: 2,
      initialPopulation: 1,
      reseedPopulation: 1,
    },
  };

  const SPECIES_ART = {
    deer: {
      fontScale: 0.38,
      minFontSize: 4.8,
      lineHeightScale: 0.9,
      mirrorHorizontally: true,
      artFacing: "left",
      frames: [
        [
          " ,_)/",
          "   (-'",
          " .-'\\ ",
          '  "\'\\\'"""""\'),',
          "     )/---,( ",
          "    / \\  / |",
        ],
      ],
    },
    fish: {
      fontScale: 0.58,
      lineHeightScale: 1,
      framesByFacing: {
        right: [["><(((('>"], [">~(((('>"]],
        left: [["<'))))><"], ["<'))))~<"]],
      },
    },
    alligator: {
      fontScale: 0.12,
      minFontSize: 3,
      lineHeightScale: 0.92,
      mirrorHorizontally: true,
      artFacing: "left",
      frames: [
        [
          "              _  _",
          "             / \\/ \\-._   _.-'^'^^'^^'^^\"^^'-.",
          "    .OO.----'\\o/\\o/   `-'                /^  ^^-._",
          "   (    `                 \\             |    _    ^^-._",
          "    VvvvvvvVvv`___...)_/  /_/_/_/_/_/_/_/\\  (__________^^-.",
          "    `^^^^^^^^`       /  /                >  >        _`)  )",
          "                     (((`                (((`        `'--'^",
        ],
      ],
    },
    snake: {
      fontScale: 0.46,
      lineHeightScale: 1,
      framesByFacing: {
        right: [["~\\__~__:>"], ["__~\\__~:>"]],
        left: [["<:~__~/~"], ["<:__~/~__"]],
      },
    },
    tiger: {
      fontScale: 0.15,
      minFontSize: 3.2,
      lineHeightScale: 0.92,
      mirrorHorizontally: true,
      artFacing: "left",
      frames: [
        [
          "                      __,,,,_",
          "       _ __..-;''`--/'/ /.',-`-.",
          "   (`/' ` |  \\ \\ \\\\ / / / / .-'/`,_",
          "  /'`\\ \\   |  \\ | \\| // // / -.,/_,'-,",
          " /<7' ;  \\ \\  | ; ||/ /| | \\/    |`-/,/-.,_,/')",
          "/  _.-, `,-\\,__|  _-| / \\ \\/|_/  |    '-/.;.\\'",
          "`-`  f/ ;      / __/ \\__ `/ |__/ |",
          "     `-'      |  -| =|\\_  \\  |-' |",
          "           __/   /_..-' `  ),'  //",
          "          ((__.-'((___..-'' \\__.'",
        ],
      ],
    },
  };

  const HABITAT_STRUCTURE_ART = {
    land: [
      {
        name: "kapok",
        radius: 27,
        fontSize: 7,
        color: "rgba(84, 205, 113, 0.46)",
        sprite: [
          "    .^^.    ",
          " .(^^^^^^). ",
          "(^^^^^^^^^^)",
          "  '^^||^^'  ",
          "     ||     ",
          "    _||_    ",
        ],
      },
      {
        name: "canopy",
        radius: 28,
        fontSize: 7,
        color: "rgba(95, 221, 126, 0.43)",
        sprite: [
          "   .&&&&.   ",
          " .&&&&&&&&. ",
          "&&&&&&&&&&&",
          "  \\\\||||//  ",
          "    ||||    ",
        ],
      },
      {
        name: "palm",
        radius: 25,
        fontSize: 7,
        color: "rgba(111, 221, 128, 0.43)",
        sprite: [
          "  __\\|/__  ",
          "--==(*)==--",
          "    /|\\    ",
          "     |     ",
          "    / \\    ",
        ],
      },
      {
        name: "fern",
        radius: 15,
        fontSize: 7,
        color: "rgba(81, 188, 109, 0.40)",
        sprite: [" \\  |  / ", "  \\ | /  ", "---\\|/---", "   /|\\   "],
      },
      {
        name: "bush",
        radius: 16,
        fontSize: 7,
        color: "rgba(73, 173, 101, 0.39)",
        sprite: ["  .***.  ", ".*******.", "{***:***}"],
      },
      {
        name: "rock",
        radius: 16,
        fontSize: 7,
        color: "rgba(128, 161, 137, 0.36)",
        sprite: ["   ____   ", " _/ .. \\_ ", "/__//____\\"],
      },
      {
        name: "fallen_log",
        radius: 22,
        fontSize: 7,
        color: "rgba(161, 135, 77, 0.41)",
        sprite: [" __========__ ", "(_()_()_()_)"],
      },
      {
        name: "shrine",
        radius: 21,
        fontSize: 7,
        color: "rgba(145, 190, 151, 0.40)",
        sprite: [
          "    /\\    ",
          "  _/==\\_  ",
          " |  ::  | ",
          " |  []  | ",
          "_|______|_",
        ],
      },
    ],
    lake: [
      {
        name: "reeds",
        radius: 16,
        fontSize: 7,
        color: "rgba(91, 191, 152, 0.39)",
        sprite: ["  |  /| | ", " /| | |/| ", " ||/| ||| ", "~~~~~~~~~~"],
      },
      {
        name: "lilies",
        radius: 17,
        fontSize: 7,
        color: "rgba(84, 204, 205, 0.39)",
        sprite: ["   .-.   ", "~-(   )-~", "   '-'   "],
      },
      {
        name: "lake_rock",
        radius: 16,
        fontSize: 7,
        color: "rgba(105, 159, 171, 0.34)",
        sprite: ["    __    ", " __/..\\__ ", "~~/____\\~~"],
      },
      {
        name: "driftwood",
        radius: 22,
        fontSize: 7,
        color: "rgba(121, 157, 142, 0.36)",
        sprite: ["~~~~__===/==__~~~~", "   (_()_()_)   "],
      },
      {
        name: "cattails",
        radius: 16,
        fontSize: 7,
        color: "rgba(110, 184, 143, 0.38)",
        sprite: [" !  ! | ! ", " |  | ! | ", " |/ | |/| ", "~~~~~~~~~"],
      },
    ],
  };

  const FOOD_RENDER_STYLES = {
    berry: {
      glyphs: ["*", "o", "%"],
      font: "700 10px Menlo, Consolas, monospace",
      colorChannels: "255, 120, 117",
      minimumOpacity: 0.54,
      freshnessOpacity: 0.38,
      shadowColor: "rgba(255, 100, 100, 0.55)",
      shadowBlur: 4,
    },
    plankton: {
      glyphs: [".", ",", "'"],
      font: "8px Menlo, Consolas, monospace",
      colorChannels: "105, 229, 255",
      minimumOpacity: 0.38,
      freshnessOpacity: 0.43,
      shadowColor: "rgba(105, 229, 255, 0.45)",
      shadowBlur: 3,
    },
  };

  // Mutable world state.
  let worldWidth = 0;
  let worldHeight = 0;
  let worldSpatialScale = 1;
  let pixelRatio = 1;
  let backgroundCanvas = null;
  let animals = [];
  let foodResources = [];
  let habitatStructures = [];
  let habitatStructuresByHabitat = { land: [], lake: [] };
  let lake = null;
  let visualEchoes = [];
  const extinctionStates = {};
  let resourceSpawnBudget = { berry: 0, plankton: 0 };
  let nextEntityId = 1;
  let simulationTime = 0;
  let maxGeneration = 0;
  let isPaused = false;
  let simulationSpeedIndex = 0;
  let simulationAccumulator = 0;
  let lastFrameTimestamp = performance.now();
  let lastTelemetryUpdate = 0;
  let framesPerSecond = 60;
  let terrainSeed = Math.floor(Math.random() * 0x7fffffff);

  // Math helpers and reusable spatial indexes.
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function vectorLength(x, y) {
    return Math.sqrt(x * x + y * y);
  }

  function limitVectorMagnitude(x, y, maximumMagnitude) {
    const magnitude = vectorLength(x, y);
    if (magnitude > maximumMagnitude && magnitude > 0) {
      const ratio = maximumMagnitude / magnitude;
      return { x: x * ratio, y: y * ratio };
    }
    return { x: x, y: y };
  }

  function zeroPad(value, digits) {
    return String(value).padStart(digits, "0");
  }

  function createSeededRandom(seed) {
    return function () {
      let state = (seed += 0x6d2b79f5);
      state = Math.imul(state ^ (state >>> 15), state | 1);
      state ^= state + Math.imul(state ^ (state >>> 7), state | 61);
      return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
    };
  }

  class SpatialHash {
    constructor(cellSize) {
      this.cellSize = cellSize;
      this.cells = new Map();
    }

    clear() {
      this.cells.clear();
    }

    getCellKey(cellX, cellY) {
      return cellX * 65536 + cellY;
    }

    insert(entity) {
      const cellX = Math.floor(entity.x / this.cellSize);
      const cellY = Math.floor(entity.y / this.cellSize);
      const cellKey = this.getCellKey(cellX, cellY);
      let cell = this.cells.get(cellKey);
      if (!cell) {
        cell = [];
        this.cells.set(cellKey, cell);
      }
      cell.push(entity);
    }

    query(x, y, radius, results) {
      results.length = 0;
      const minimumCellX = Math.floor((x - radius) / this.cellSize);
      const maximumCellX = Math.floor((x + radius) / this.cellSize);
      const minimumCellY = Math.floor((y - radius) / this.cellSize);
      const maximumCellY = Math.floor((y + radius) / this.cellSize);
      for (let cellY = minimumCellY; cellY <= maximumCellY; cellY += 1) {
        for (let cellX = minimumCellX; cellX <= maximumCellX; cellX += 1) {
          const cell = this.cells.get(this.getCellKey(cellX, cellY));
          if (cell) {
            for (
              let entityIndex = 0;
              entityIndex < cell.length;
              entityIndex += 1
            ) {
              results.push(cell[entityIndex]);
            }
          }
        }
      }
      return results;
    }
  }

  const animalSpatialHash = new SpatialHash(76);
  const foodSpatialHash = new SpatialHash(62);
  const nearbyAnimals = [];
  const nearbyFoodResources = [];
  const spriteWidthCache = new Map();

  // Terrain generation and habitat geometry.
  function createLake(
    randomSource,
    centerXRatio,
    centerYRatio,
    radiusXRatio,
    radiusYRatio,
  ) {
    const generatedLake = {
      centerXRatio: centerXRatio,
      centerYRatio: centerYRatio,
      radiusXRatio: radiusXRatio,
      radiusYRatio: radiusYRatio,
      primaryWaveAmplitude: 0.055 + randomSource() * 0.045,
      secondaryWaveAmplitude: 0.025 + randomSource() * 0.032,
      primaryWaveFrequency: 3 + Math.floor(randomSource() * 3),
      secondaryWaveFrequency: 6 + Math.floor(randomSource() * 4),
      primaryWavePhase: randomSource() * FULL_CIRCLE_RADIANS,
      secondaryWavePhase: randomSource() * FULL_CIRCLE_RADIANS,
    };
    updateLakePixelGeometry(generatedLake);
    return generatedLake;
  }

  function updateLakePixelGeometry(generatedLake) {
    generatedLake.centerX = generatedLake.centerXRatio * worldWidth;
    generatedLake.centerY = generatedLake.centerYRatio * worldHeight;
    generatedLake.radiusX = Math.max(
      24,
      generatedLake.radiusXRatio * worldWidth,
    );
    generatedLake.radiusY = Math.max(
      24,
      generatedLake.radiusYRatio * worldHeight,
    );
    generatedLake.minimumRadius = Math.min(
      generatedLake.radiusX,
      generatedLake.radiusY,
    );
  }

  function generateLake() {
    const lakeRandom = createSeededRandom(terrainSeed ^ 0x51a7e);

    // Keep one substantial lake with enough open water for fish and alligators.
    lake = createLake(
      lakeRandom,
      0.62 + lakeRandom() * 0.08,
      0.42 + lakeRandom() * 0.16,
      0.22 + lakeRandom() * 0.055,
      0.27 + lakeRandom() * 0.075,
    );
  }

  function calculateSignedShoreDistance(x, y) {
    if (!lake) {
      return -Infinity;
    }

    const normalizedX = (x - lake.centerX) / lake.radiusX;
    const normalizedY = (y - lake.centerY) / lake.radiusY;
    const angle = Math.atan2(normalizedY, normalizedX);
    const radialDistance = Math.sqrt(
      normalizedX * normalizedX + normalizedY * normalizedY,
    );
    const irregularEdge =
      1 +
      lake.primaryWaveAmplitude *
        Math.sin(angle * lake.primaryWaveFrequency + lake.primaryWavePhase) +
      lake.secondaryWaveAmplitude *
        Math.sin(angle * lake.secondaryWaveFrequency + lake.secondaryWavePhase);
    return (irregularEdge - radialDistance) * lake.minimumRadius;
  }

  function isInsideLake(x, y) {
    return calculateSignedShoreDistance(x, y) > 0;
  }

  function calculateInwardShoreNormal(x, y) {
    const gradientSampleDistance = 2.5;
    const gradientX =
      calculateSignedShoreDistance(x + gradientSampleDistance, y) -
      calculateSignedShoreDistance(x - gradientSampleDistance, y);
    const gradientY =
      calculateSignedShoreDistance(x, y + gradientSampleDistance) -
      calculateSignedShoreDistance(x, y - gradientSampleDistance);
    const magnitude = vectorLength(gradientX, gradientY);
    if (magnitude > 0.0001) {
      return { x: gradientX / magnitude, y: gradientY / magnitude };
    }

    const fallbackX = lake.centerX - x;
    const fallbackY = lake.centerY - y;
    const fallbackLength = Math.max(0.001, vectorLength(fallbackX, fallbackY));
    return {
      x: fallbackX / fallbackLength,
      y: fallbackY / fallbackLength,
    };
  }

  function pointClearOfStructures(x, y, padding, habitat) {
    const candidateStructures = habitatStructuresByHabitat[habitat];
    for (let i = 0; i < candidateStructures.length; i += 1) {
      const habitatStructure = candidateStructures[i];
      const dx = x - habitatStructure.x;
      const dy = y - habitatStructure.y;
      const minimumDistance = habitatStructure.radius + padding;
      if (dx * dx + dy * dy < minimumDistance * minimumDistance) {
        return false;
      }
    }
    return true;
  }

  function generateStructures() {
    habitatStructures = [];
    habitatStructuresByHabitat = { land: [], lake: [] };
    const terrainRandom = createSeededRandom(terrainSeed ^ 0x3f19b);
    const worldArea = worldWidth * worldHeight;
    const structureTargets = {
      land: clamp(Math.floor(worldArea / 18000), 12, 40),
      lake: clamp(Math.floor(worldArea / 46000), 5, 18),
    };
    const habitats = ["land", "lake"];

    for (
      let habitatIndex = 0;
      habitatIndex < habitats.length;
      habitatIndex += 1
    ) {
      const habitat = habitats[habitatIndex];
      const structureLibrary = HABITAT_STRUCTURE_ART[habitat];
      let placementAttempts = 0;
      let placedStructureCount = 0;
      while (
        placedStructureCount < structureTargets[habitat] &&
        placementAttempts < structureTargets[habitat] * 100
      ) {
        placementAttempts += 1;
        let structureTypeIndex;
        if (habitat === "land" && terrainRandom() < 0.62) {
          structureTypeIndex = Math.floor(terrainRandom() * 3);
        } else if (habitat === "land") {
          structureTypeIndex =
            3 + Math.floor(terrainRandom() * (structureLibrary.length - 3));
        } else {
          structureTypeIndex = Math.floor(
            terrainRandom() * structureLibrary.length,
          );
        }
        const structureDefinition = structureLibrary[structureTypeIndex];
        const placementMargin = structureDefinition.radius + 7;
        const x =
          placementMargin +
          terrainRandom() * Math.max(1, worldWidth - placementMargin * 2);
        const y =
          placementMargin +
          terrainRandom() * Math.max(1, worldHeight - placementMargin * 2);
        const shoreDistance = calculateSignedShoreDistance(x, y);

        if (
          (habitat === "land" &&
            shoreDistance >= -(structureDefinition.radius + 6)) ||
          (habitat === "lake" &&
            shoreDistance <= structureDefinition.radius + 4)
        ) {
          continue;
        }

        if (
          !pointClearOfStructures(x, y, structureDefinition.radius + 6, habitat)
        ) {
          continue;
        }

        const generatedStructure = {
          name: structureDefinition.name,
          habitat: habitat,
          x: x,
          y: y,
          radius: structureDefinition.radius,
          fontSize: structureDefinition.fontSize,
          color: structureDefinition.color,
          sprite: structureDefinition.sprite,
        };
        habitatStructures.push(generatedStructure);
        habitatStructuresByHabitat[habitat].push(generatedStructure);
        placedStructureCount += 1;
      }
    }
  }

  function findHabitatPoint(habitat, requireNearShore, minimumDepthFromShore) {
    const worldEdgeMargin = 18;
    let candidatePoint = { x: worldEdgeMargin, y: worldEdgeMargin };
    const requiredLakeDepth =
      minimumDepthFromShore == null ? 4 : minimumDepthFromShore;
    for (let attempt = 0; attempt < 240; attempt += 1) {
      const x = randomBetween(
        worldEdgeMargin,
        Math.max(worldEdgeMargin + 1, worldWidth - worldEdgeMargin),
      );
      const y = randomBetween(
        worldEdgeMargin,
        Math.max(worldEdgeMargin + 1, worldHeight - worldEdgeMargin),
      );
      const shoreDistance = calculateSignedShoreDistance(x, y);
      candidatePoint = { x: x, y: y };

      const correctHabitat =
        habitat === "lake"
          ? shoreDistance > requiredLakeDepth
          : shoreDistance < -4;
      const correctShoreBand =
        !requireNearShore ||
        (habitat === "land" && shoreDistance < -7 && shoreDistance > -82);

      if (
        correctHabitat &&
        correctShoreBand &&
        pointClearOfStructures(x, y, requireNearShore ? 20 : 11, habitat)
      ) {
        return candidatePoint;
      }
    }
    return candidatePoint;
  }

  // Entity creation and neighborhood queries.
  function createRandomGenome() {
    return {
      speedMultiplier: randomBetween(0.84, 1.16),
      senseMultiplier: randomBetween(0.84, 1.16),
      sizeMultiplier: randomBetween(0.84, 1.16),
    };
  }

  function mutateGenomeMultiplier(value) {
    const averagedNoise =
      (Math.random() + Math.random() + Math.random()) / 3 - 0.5;
    const mutationRange = Math.random() < 0.08 ? 0.3 : 0.16;
    return clamp(value * (1 + averagedNoise * mutationRange), 0.72, 1.32);
  }

  function createMutatedGenome(parentGenome) {
    return {
      speedMultiplier: mutateGenomeMultiplier(parentGenome.speedMultiplier),
      senseMultiplier: mutateGenomeMultiplier(parentGenome.senseMultiplier),
      sizeMultiplier: mutateGenomeMultiplier(parentGenome.sizeMultiplier),
    };
  }

  function updateDerivedTraits(animal) {
    const speciesConfig = SPECIES_CONFIG[animal.species];
    const spatialScale = worldSpatialScale;
    const displayScale = 0.72 + spatialScale * 0.28;
    animal.spatialScale = spatialScale;
    animal.maxSpeed =
      speciesConfig.baseSpeed * animal.genome.speedMultiplier * spatialScale;
    animal.senseRadius =
      speciesConfig.baseSenseRadius *
      animal.genome.senseMultiplier *
      spatialScale;
    animal.displaySize =
      speciesConfig.baseDisplaySize *
      animal.genome.sizeMultiplier *
      displayScale;
    animal.maxForce =
      speciesConfig.baseSteeringForce *
      (1.08 - 0.11 * animal.genome.sizeMultiplier) *
      spatialScale;
    animal.maxEnergy = speciesConfig.maxEnergy;
  }

  function createAnimal(species, x, y, genome, generation, energy) {
    const speciesConfig = SPECIES_CONFIG[species];
    const angle = randomBetween(0, FULL_CIRCLE_RADIANS);
    const animal = {
      id: nextEntityId++,
      species: species,
      x: x,
      y: y,
      velocityX: 0,
      velocityY: 0,
      headingRadians: angle,
      energy:
        energy == null
          ? speciesConfig.maxEnergy * randomBetween(0.58, 0.88)
          : energy,
      genome: genome || createRandomGenome(),
      generation: generation || 0,
      ageSeconds: randomBetween(
        0,
        speciesConfig.minimumReproductionAgeSeconds * 0.5,
      ),
      reproductionCooldownSeconds: randomBetween(
        0,
        speciesConfig.reproductionCooldownSeconds * 0.65,
      ),
      wanderOffsetRadians: randomBetween(-0.35, 0.35),
      isDead: false,
    };
    updateDerivedTraits(animal);
    const launchSpeed = animal.maxSpeed * randomBetween(0.22, 0.52);
    animal.velocityX = Math.cos(angle) * launchSpeed;
    animal.velocityY = Math.sin(angle) * launchSpeed;
    return animal;
  }

  function spawnAnimals(species, numberToSpawn, generation) {
    const speciesConfig = SPECIES_CONFIG[species];
    for (let i = 0; i < numberToSpawn; i += 1) {
      const spawnPoint = findHabitatPoint(
        speciesConfig.habitat,
        Boolean(speciesConfig.spawnNearShore),
        speciesConfig.minimumHabitatDepth,
      );
      animals.push(
        createAnimal(
          species,
          spawnPoint.x,
          spawnPoint.y,
          null,
          generation || 0,
        ),
      );
    }
  }

  function createFoodResource(resourceType) {
    const habitat = resourceType === "berry" ? "land" : "lake";
    const spawnPoint = findHabitatPoint(habitat, false);
    return {
      id: nextEntityId++,
      type: resourceType,
      x: spawnPoint.x,
      y: spawnPoint.y,
      ageSeconds: 0,
      glyphVariantIndex: Math.floor(randomBetween(0, 3)),
      lifetimeSeconds:
        resourceType === "berry"
          ? randomBetween(70, 105)
          : randomBetween(45, 82),
      isDead: false,
    };
  }

  function spawnFoodResources(resourceType, numberToSpawn) {
    for (let i = 0; i < numberToSpawn; i += 1) {
      foodResources.push(createFoodResource(resourceType));
    }
  }

  function rebuildAnimalSpatialIndex() {
    animalSpatialHash.clear();
    for (let i = 0; i < animals.length; i += 1) {
      if (!animals[i].isDead) {
        animalSpatialHash.insert(animals[i]);
      }
    }
  }

  function rebuildFoodSpatialIndex() {
    foodSpatialHash.clear();
    for (let j = 0; j < foodResources.length; j += 1) {
      if (!foodResources[j].isDead) {
        foodSpatialHash.insert(foodResources[j]);
      }
    }
  }

  function rebuildSpatialIndexes() {
    rebuildAnimalSpatialIndex();
    rebuildFoodSpatialIndex();
  }

  function countPopulations() {
    const populationCounts = {
      deer: 0,
      fish: 0,
      alligator: 0,
      snake: 0,
      tiger: 0,
    };
    for (let i = 0; i < animals.length; i += 1) {
      if (!animals[i].isDead) {
        populationCounts[animals[i].species] += 1;
      }
    }
    return populationCounts;
  }

  function countFoodResources() {
    const foodCounts = { berry: 0, plankton: 0 };
    for (let i = 0; i < foodResources.length; i += 1) {
      if (!foodResources[i].isDead) {
        foodCounts[foodResources[i].type] += 1;
      }
    }
    return foodCounts;
  }

  function findNearestFood(animal, foodType, radius) {
    foodSpatialHash.query(animal.x, animal.y, radius, nearbyFoodResources);
    let nearestFoodResource = null;
    let nearestDistanceSquared = radius * radius;
    for (let i = 0; i < nearbyFoodResources.length; i += 1) {
      const foodResource = nearbyFoodResources[i];
      if (foodResource.isDead || foodResource.type !== foodType) {
        continue;
      }
      const dx = foodResource.x - animal.x;
      const dy = foodResource.y - animal.y;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared < nearestDistanceSquared) {
        nearestDistanceSquared = distanceSquared;
        nearestFoodResource = foodResource;
      }
    }
    return nearestFoodResource;
  }

  function isPredatorOf(predatorSpecies, preySpecies) {
    const preySpeciesList = SPECIES_CONFIG[predatorSpecies].preySpecies;
    return Boolean(
      preySpeciesList && preySpeciesList.indexOf(preySpecies) >= 0,
    );
  }

  function findNearestPredator(animal, radius) {
    animalSpatialHash.query(animal.x, animal.y, radius, nearbyAnimals);
    let nearestPredator = null;
    let nearestDistanceSquared = radius * radius;
    for (let i = 0; i < nearbyAnimals.length; i += 1) {
      const predatorCandidate = nearbyAnimals[i];
      if (
        predatorCandidate === animal ||
        predatorCandidate.isDead ||
        !isPredatorOf(predatorCandidate.species, animal.species)
      ) {
        continue;
      }
      const dx = predatorCandidate.x - animal.x;
      const dy = predatorCandidate.y - animal.y;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared < nearestDistanceSquared) {
        nearestDistanceSquared = distanceSquared;
        nearestPredator = predatorCandidate;
      }
    }
    return nearestPredator;
  }

  function findNearestPrey(animal, radius) {
    animalSpatialHash.query(animal.x, animal.y, radius, nearbyAnimals);
    let nearestPrey = null;
    let bestWeightedDistance = Infinity;
    const maximumDistanceSquared = radius * radius;
    for (let i = 0; i < nearbyAnimals.length; i += 1) {
      const preyCandidate = nearbyAnimals[i];
      if (
        preyCandidate === animal ||
        preyCandidate.isDead ||
        !isPredatorOf(animal.species, preyCandidate.species)
      ) {
        continue;
      }

      if (
        animal.species === "tiger" &&
        preyCandidate.species === "fish" &&
        calculateSignedShoreDistance(preyCandidate.x, preyCandidate.y) > 52
      ) {
        continue;
      }

      const dx = preyCandidate.x - animal.x;
      const dy = preyCandidate.y - animal.y;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared > maximumDistanceSquared) {
        continue;
      }

      let preyPreferenceWeight = 1;
      if (animal.species === "tiger") {
        preyPreferenceWeight =
          preyCandidate.species === "snake"
            ? 0.83
            : preyCandidate.species === "fish"
              ? 1.13
              : 1;
      }
      const weightedDistance = distanceSquared * preyPreferenceWeight;
      if (weightedDistance < bestWeightedDistance) {
        bestWeightedDistance = weightedDistance;
        nearestPrey = preyCandidate;
      }
    }
    return nearestPrey;
  }

  // Movement and behavior.
  function calculateTargetSteering(
    animal,
    targetX,
    targetY,
    shouldFlee,
    forceMultiplier,
  ) {
    let dx = targetX - animal.x;
    let dy = targetY - animal.y;
    if (shouldFlee) {
      dx = -dx;
      dy = -dy;
    }
    const distance = vectorLength(dx, dy);
    if (distance < 0.0001) {
      return { x: 0, y: 0 };
    }

    const desiredX = (dx / distance) * animal.maxSpeed;
    const desiredY = (dy / distance) * animal.maxSpeed;
    const steerX = desiredX - animal.velocityX;
    const steerY = desiredY - animal.velocityY;
    return limitVectorMagnitude(
      steerX,
      steerY,
      animal.maxForce * (forceMultiplier || 1),
    );
  }

  function calculateWanderSteering(animal, deltaSeconds) {
    animal.wanderOffsetRadians +=
      randomBetween(-0.55, 0.55) * Math.sqrt(deltaSeconds);
    animal.wanderOffsetRadians *= 0.988;
    animal.wanderOffsetRadians = clamp(animal.wanderOffsetRadians, -0.92, 0.92);
    const baseHeading =
      vectorLength(animal.velocityX, animal.velocityY) > 0.5
        ? Math.atan2(animal.velocityY, animal.velocityX)
        : animal.headingRadians;
    const angle = baseHeading + animal.wanderOffsetRadians;
    const desiredX = Math.cos(angle) * animal.maxSpeed * 0.62;
    const desiredY = Math.sin(angle) * animal.maxSpeed * 0.62;
    return limitVectorMagnitude(
      desiredX - animal.velocityX,
      desiredY - animal.velocityY,
      animal.maxForce * 0.52,
    );
  }

  function calculateSeparationSteering(animal) {
    const radius = animal.displaySize * 1.35 + 9;
    const radiusSquared = radius * radius;
    animalSpatialHash.query(animal.x, animal.y, radius, nearbyAnimals);
    let awayX = 0;
    let awayY = 0;
    let neighborCount = 0;
    for (let i = 0; i < nearbyAnimals.length; i += 1) {
      const neighbor = nearbyAnimals[i];
      if (
        neighbor === animal ||
        neighbor.isDead ||
        neighbor.species !== animal.species
      ) {
        continue;
      }
      const dx = animal.x - neighbor.x;
      const dy = animal.y - neighbor.y;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared > 0.01 && distanceSquared < radiusSquared) {
        awayX += dx / distanceSquared;
        awayY += dy / distanceSquared;
        neighborCount += 1;
      }
    }
    if (!neighborCount) {
      return { x: 0, y: 0 };
    }
    const magnitude = vectorLength(awayX, awayY);
    if (!magnitude) {
      return { x: 0, y: 0 };
    }
    const desiredX = (awayX / magnitude) * animal.maxSpeed * 0.48;
    const desiredY = (awayY / magnitude) * animal.maxSpeed * 0.48;
    return limitVectorMagnitude(
      desiredX - animal.velocityX,
      desiredY - animal.velocityY,
      animal.maxForce * 0.42,
    );
  }

  function calculateObstacleSteering(animal) {
    const speed = vectorLength(animal.velocityX, animal.velocityY);
    const directionX =
      speed > 0.5 ? animal.velocityX / speed : Math.cos(animal.headingRadians);
    const directionY =
      speed > 0.5 ? animal.velocityY / speed : Math.sin(animal.headingRadians);
    const lookAheadDistance = 10 + animal.displaySize * 0.55 + speed * 0.32;
    const probeX = animal.x + directionX * lookAheadDistance;
    const probeY = animal.y + directionY * lookAheadDistance;
    let forceX = 0;
    let forceY = 0;
    const habitat = SPECIES_CONFIG[animal.species].habitat;

    const structuresInHabitat = habitatStructuresByHabitat[habitat];
    for (let i = 0; i < structuresInHabitat.length; i += 1) {
      const habitatStructure = structuresInHabitat[i];
      let dx = probeX - habitatStructure.x;
      let dy = probeY - habitatStructure.y;
      let distance = vectorLength(dx, dy);
      const clearance =
        habitatStructure.radius + animal.displaySize * 0.32 + 12;
      if (distance >= clearance) {
        continue;
      }
      if (distance < 0.001) {
        dx = -directionY;
        dy = directionX;
        distance = 1;
      }
      const avoidanceStrength = 1 - distance / clearance;
      forceX += (dx / distance) * animal.maxForce * (0.45 + avoidanceStrength);
      forceY += (dy / distance) * animal.maxForce * (0.45 + avoidanceStrength);
    }
    return limitVectorMagnitude(forceX, forceY, animal.maxForce * 0.92);
  }

  function calculateBoundarySteering(animal) {
    let forceX = 0;
    let forceY = 0;
    const boundaryMargin = 48;
    const shoreDistance = calculateSignedShoreDistance(animal.x, animal.y);
    const habitat = SPECIES_CONFIG[animal.species].habitat;

    if (animal.x < boundaryMargin) {
      forceX += animal.maxForce * (1 - animal.x / boundaryMargin);
    } else if (animal.x > worldWidth - boundaryMargin) {
      forceX -=
        animal.maxForce * (1 - (worldWidth - animal.x) / boundaryMargin);
    }
    if (animal.y < boundaryMargin) {
      forceY += animal.maxForce * (1 - animal.y / boundaryMargin);
    } else if (animal.y > worldHeight - boundaryMargin) {
      forceY -=
        animal.maxForce * (1 - (worldHeight - animal.y) / boundaryMargin);
    }

    if (habitat === "land" && shoreDistance > -58) {
      const normal = calculateInwardShoreNormal(animal.x, animal.y);
      const landPressure =
        animal.maxForce * clamp((shoreDistance + 58) / 58, 0, 1.15);
      forceX -= normal.x * landPressure;
      forceY -= normal.y * landPressure;
    } else if (habitat === "lake" && shoreDistance < 58) {
      const normal = calculateInwardShoreNormal(animal.x, animal.y);
      const waterPressure =
        animal.maxForce * clamp((58 - shoreDistance) / 58, 0, 1.15);
      forceX += normal.x * waterPressure;
      forceY += normal.y * waterPressure;
    }
    return { x: forceX, y: forceY };
  }

  function calculateSteering(animal, deltaSeconds) {
    const speciesConfig = SPECIES_CONFIG[animal.species];
    const energyRatio = animal.energy / animal.maxEnergy;
    const hungerRatio = 1 - energyRatio;
    let primaryForce = null;
    let primaryForceWeight = 1;

    if (speciesConfig.fleesPredators) {
      const nearestPredator = findNearestPredator(
        animal,
        animal.senseRadius * 1.12,
      );
      if (nearestPredator) {
        const predatorDistance = vectorLength(
          nearestPredator.x - animal.x,
          nearestPredator.y - animal.y,
        );
        const dangerRatio =
          1 - clamp(predatorDistance / (animal.senseRadius * 1.12), 0, 1);
        primaryForce = calculateTargetSteering(
          animal,
          nearestPredator.x,
          nearestPredator.y,
          true,
          1,
        );
        primaryForceWeight = 1.25 + dangerRatio * 1.15;
      }
    }

    if (!primaryForce && speciesConfig.foodType) {
      if (hungerRatio > 0.16) {
        const foodSenseRadius = animal.senseRadius * (1 + hungerRatio * 0.28);
        const nearestFoodResource = findNearestFood(
          animal,
          speciesConfig.foodType,
          foodSenseRadius,
        );
        if (nearestFoodResource) {
          primaryForce = calculateTargetSteering(
            animal,
            nearestFoodResource.x,
            nearestFoodResource.y,
            false,
            0.86,
          );
          primaryForceWeight = 1;
        }
      }
    }

    if (!primaryForce && speciesConfig.preySpecies) {
      const huntingHungerThreshold =
        speciesConfig.huntingHungerThreshold + (1 - animal.spatialScale) * 0.12;
      if (hungerRatio > huntingHungerThreshold) {
        const preySenseRadius = animal.senseRadius * (1 + hungerRatio * 0.24);
        const nearestPrey = findNearestPrey(animal, preySenseRadius);
        if (nearestPrey) {
          primaryForce = calculateTargetSteering(
            animal,
            nearestPrey.x,
            nearestPrey.y,
            false,
            0.94,
          );
          primaryForceWeight = 1.08;
        }
      }
    }

    if (!primaryForce) {
      primaryForce = calculateWanderSteering(animal, deltaSeconds);
      primaryForceWeight = 0.74;
    }

    const separationForce = calculateSeparationSteering(animal);
    const boundaryForce = calculateBoundarySteering(animal);
    const obstacleForce = calculateObstacleSteering(animal);
    const combinedForceX =
      primaryForce.x * primaryForceWeight +
      separationForce.x * 0.42 +
      boundaryForce.x * 1.18 +
      obstacleForce.x * 1.12;
    const combinedForceY =
      primaryForce.y * primaryForceWeight +
      separationForce.y * 0.42 +
      boundaryForce.y * 1.18 +
      obstacleForce.y * 1.12;
    return limitVectorMagnitude(
      combinedForceX,
      combinedForceY,
      animal.maxForce,
    );
  }

  function constrainToWaterHabitat(animal, habitat) {
    for (
      let correctionAttempt = 0;
      correctionAttempt < 3;
      correctionAttempt += 1
    ) {
      const shoreDistance = calculateSignedShoreDistance(animal.x, animal.y);
      const outsideHabitat =
        habitat === "land" ? shoreDistance >= -2 : shoreDistance <= 2;
      if (!outsideHabitat) {
        return;
      }
      const normal = calculateInwardShoreNormal(animal.x, animal.y);
      if (habitat === "land") {
        const landCorrection = shoreDistance + 3;
        animal.x -= normal.x * landCorrection;
        animal.y -= normal.y * landCorrection;
        const waterwardSpeed =
          animal.velocityX * normal.x + animal.velocityY * normal.y;
        if (waterwardSpeed > 0) {
          animal.velocityX -= waterwardSpeed * normal.x * 1.45;
          animal.velocityY -= waterwardSpeed * normal.y * 1.45;
        }
      } else {
        const lakeCorrection = 3 - shoreDistance;
        animal.x += normal.x * lakeCorrection;
        animal.y += normal.y * lakeCorrection;
        const landwardSpeed =
          animal.velocityX * normal.x + animal.velocityY * normal.y;
        if (landwardSpeed < 0) {
          animal.velocityX -= landwardSpeed * normal.x * 1.45;
          animal.velocityY -= landwardSpeed * normal.y * 1.45;
        }
      }
    }
  }

  function keepInHabitat(animal) {
    const worldEdgePadding = 4;
    if (animal.x < worldEdgePadding) {
      animal.x = worldEdgePadding;
      animal.velocityX = Math.abs(animal.velocityX) * 0.55;
    } else if (animal.x > worldWidth - worldEdgePadding) {
      animal.x = worldWidth - worldEdgePadding;
      animal.velocityX = -Math.abs(animal.velocityX) * 0.55;
    }
    if (animal.y < worldEdgePadding) {
      animal.y = worldEdgePadding;
      animal.velocityY = Math.abs(animal.velocityY) * 0.55;
    } else if (animal.y > worldHeight - worldEdgePadding) {
      animal.y = worldHeight - worldEdgePadding;
      animal.velocityY = -Math.abs(animal.velocityY) * 0.55;
    }

    const habitat = SPECIES_CONFIG[animal.species].habitat;
    constrainToWaterHabitat(animal, habitat);

    const structuresInHabitat = habitatStructuresByHabitat[habitat];
    for (let i = 0; i < structuresInHabitat.length; i += 1) {
      const habitatStructure = structuresInHabitat[i];
      let dx = animal.x - habitatStructure.x;
      let dy = animal.y - habitatStructure.y;
      let distance = vectorLength(dx, dy);
      const minimumDistance =
        habitatStructure.radius + animal.displaySize * 0.22;
      if (distance >= minimumDistance) {
        continue;
      }
      if (distance < 0.001) {
        dx = Math.cos(animal.headingRadians + Math.PI / 2);
        dy = Math.sin(animal.headingRadians + Math.PI / 2);
        distance = 1;
      }
      const normalX = dx / distance;
      const normalY = dy / distance;
      animal.x = habitatStructure.x + normalX * minimumDistance;
      animal.y = habitatStructure.y + normalY * minimumDistance;
      const inwardSpeed =
        animal.velocityX * normalX + animal.velocityY * normalY;
      if (inwardSpeed < 0) {
        animal.velocityX -= inwardSpeed * normalX * 1.45;
        animal.velocityY -= inwardSpeed * normalY * 1.45;
      }
    }
    constrainToWaterHabitat(animal, habitat);
    animal.x = clamp(animal.x, worldEdgePadding, worldWidth - worldEdgePadding);
    animal.y = clamp(
      animal.y,
      worldEdgePadding,
      worldHeight - worldEdgePadding,
    );
  }

  // Simulation updates.
  function addVisualEcho(animal, glyph) {
    if (visualEchoes.length >= 80) {
      visualEchoes.shift();
    }
    visualEchoes.push({
      x: animal.x,
      y: animal.y,
      glyph: glyph || "+",
      hueDegrees: SPECIES_CONFIG[animal.species].hueDegrees,
      remainingLifeRatio: 1,
    });
  }

  function updateAnimal(animal, deltaSeconds) {
    if (animal.isDead) {
      return;
    }
    const steering = calculateSteering(animal, deltaSeconds);
    animal.velocityX += steering.x * deltaSeconds;
    animal.velocityY += steering.y * deltaSeconds;

    let speed = vectorLength(animal.velocityX, animal.velocityY);
    if (speed > animal.maxSpeed) {
      const speedRatio = animal.maxSpeed / speed;
      animal.velocityX *= speedRatio;
      animal.velocityY *= speedRatio;
      speed = animal.maxSpeed;
    }

    animal.x += animal.velocityX * deltaSeconds;
    animal.y += animal.velocityY * deltaSeconds;
    keepInHabitat(animal);

    if (speed > 0.5) {
      animal.headingRadians = Math.atan2(animal.velocityY, animal.velocityX);
    }
    animal.ageSeconds += deltaSeconds;
    animal.reproductionCooldownSeconds = Math.max(
      0,
      animal.reproductionCooldownSeconds - deltaSeconds,
    );

    const speciesConfig = SPECIES_CONFIG[animal.species];
    const movementEffortRatio = clamp(speed / animal.maxSpeed, 0, 1);
    const bodyMetabolismFactor = 0.58 + 0.42 * animal.genome.sizeMultiplier;
    const movementEnergyUsePerSecond =
      speciesConfig.movementEnergyCostPerSecond *
      movementEffortRatio *
      movementEffortRatio *
      (0.65 + 0.35 * animal.genome.speedMultiplier) *
      Math.pow(animal.genome.sizeMultiplier, 1.25);
    let energyUsePerSecond =
      speciesConfig.metabolicEnergyCostPerSecond * bodyMetabolismFactor +
      movementEnergyUsePerSecond;
    if (speciesConfig.preySpecies) {
      energyUsePerSecond *= 0.58 + animal.spatialScale * 0.42;
    }
    animal.energy -= energyUsePerSecond * deltaSeconds;

    if (animal.energy <= 0) {
      animal.energy = 0;
      animal.isDead = true;
      addVisualEcho(animal, "+");
    }
  }

  function resolveForaging(animal) {
    const speciesConfig = SPECIES_CONFIG[animal.species];
    if (animal.isDead || !speciesConfig.foodType) {
      return;
    }
    if (animal.energy > animal.maxEnergy * 0.96) {
      return;
    }
    const catchRadius = animal.displaySize * 0.48 + 5 * animal.spatialScale;
    foodSpatialHash.query(animal.x, animal.y, catchRadius, nearbyFoodResources);
    let selectedFoodResource = null;
    let nearestDistanceSquared = catchRadius * catchRadius;
    for (let i = 0; i < nearbyFoodResources.length; i += 1) {
      const foodResource = nearbyFoodResources[i];
      if (foodResource.isDead || foodResource.type !== speciesConfig.foodType) {
        continue;
      }
      const dx = foodResource.x - animal.x;
      const dy = foodResource.y - animal.y;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared < nearestDistanceSquared) {
        selectedFoodResource = foodResource;
        nearestDistanceSquared = distanceSquared;
      }
    }
    if (selectedFoodResource) {
      selectedFoodResource.isDead = true;
      animal.energy = Math.min(
        animal.maxEnergy,
        animal.energy + speciesConfig.foodEnergyGain,
      );
    }
  }

  function calculatePreyEnergy(predatorSpecies, prey) {
    if (predatorSpecies === "snake") {
      return 62 * prey.genome.sizeMultiplier;
    }
    if (predatorSpecies === "alligator") {
      return 38 * prey.genome.sizeMultiplier;
    }
    if (prey.species === "snake") {
      return 58 * prey.genome.sizeMultiplier;
    }
    if (prey.species === "fish") {
      return 23 * prey.genome.sizeMultiplier;
    }
    return 46 * prey.genome.sizeMultiplier;
  }

  function resolveHunting(animal) {
    const speciesConfig = SPECIES_CONFIG[animal.species];
    if (animal.isDead || !speciesConfig.preySpecies) {
      return;
    }
    const huntingEnergyCeilingRatio =
      speciesConfig.huntingEnergyCeilingRatio -
      (1 - animal.spatialScale) * 0.12;
    if (animal.energy > animal.maxEnergy * huntingEnergyCeilingRatio) {
      return;
    }
    const catchRadius =
      animal.displaySize * speciesConfig.catchRadiusScale +
      speciesConfig.catchRadiusPadding * animal.spatialScale;
    animalSpatialHash.query(animal.x, animal.y, catchRadius, nearbyAnimals);
    let caughtPrey = null;
    let nearestDistanceSquared = catchRadius * catchRadius;
    const tigerCanReachShore =
      animal.species !== "tiger" ||
      calculateSignedShoreDistance(animal.x, animal.y) >= -45;
    for (let i = 0; i < nearbyAnimals.length; i += 1) {
      const preyCandidate = nearbyAnimals[i];
      if (
        preyCandidate === animal ||
        preyCandidate.isDead ||
        !isPredatorOf(animal.species, preyCandidate.species)
      ) {
        continue;
      }
      if (
        animal.species === "tiger" &&
        preyCandidate.species === "fish" &&
        (calculateSignedShoreDistance(preyCandidate.x, preyCandidate.y) > 52 ||
          !tigerCanReachShore)
      ) {
        continue;
      }
      const dx = preyCandidate.x - animal.x;
      const dy = preyCandidate.y - animal.y;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared < nearestDistanceSquared) {
        caughtPrey = preyCandidate;
        nearestDistanceSquared = distanceSquared;
      }
    }
    if (caughtPrey) {
      caughtPrey.isDead = true;
      addVisualEcho(caughtPrey, "x");
      animal.energy = Math.min(
        animal.maxEnergy,
        animal.energy + calculatePreyEnergy(animal.species, caughtPrey),
      );
    }
  }

  function reproduceAnimals(populations, deltaSeconds) {
    const newbornAnimals = [];
    for (let i = 0; i < animals.length; i += 1) {
      const parent = animals[i];
      if (parent.isDead) {
        continue;
      }
      const speciesConfig = SPECIES_CONFIG[parent.species];
      if (
        parent.energy <= speciesConfig.reproductionThreshold ||
        parent.ageSeconds < speciesConfig.minimumReproductionAgeSeconds ||
        parent.reproductionCooldownSeconds > 0 ||
        populations[parent.species] >= speciesConfig.maximumPopulation
      ) {
        continue;
      }

      const populationCapacityRatio = Math.max(
        0,
        1 - populations[parent.species] / speciesConfig.targetPopulation,
      );
      const smallWorldReproductionBoost =
        parent.species === "deer" ? 1 + (1 - parent.spatialScale) * 0.65 : 1;
      if (
        Math.random() >=
        speciesConfig.reproductionRatePerSecond *
          populationCapacityRatio *
          smallWorldReproductionBoost *
          deltaSeconds
      ) {
        continue;
      }

      parent.energy -= speciesConfig.reproductionEnergyCost;
      parent.reproductionCooldownSeconds =
        speciesConfig.reproductionCooldownSeconds;
      const angle = randomBetween(0, FULL_CIRCLE_RADIANS);
      const offspringDistance = parent.displaySize + 4;
      const offspringX = parent.x + Math.cos(angle) * offspringDistance;
      const offspringY = parent.y + Math.sin(angle) * offspringDistance;
      const offspringGeneration = parent.generation + 1;
      const offspring = createAnimal(
        parent.species,
        offspringX,
        offspringY,
        createMutatedGenome(parent.genome),
        offspringGeneration,
        speciesConfig.offspringEnergy,
      );
      offspring.ageSeconds = 0;
      offspring.reproductionCooldownSeconds =
        speciesConfig.reproductionCooldownSeconds * randomBetween(0.72, 1.1);
      keepInHabitat(offspring);
      newbornAnimals.push(offspring);
      populations[parent.species] += 1;
      maxGeneration = Math.max(maxGeneration, offspringGeneration);
    }

    if (newbornAnimals.length) {
      Array.prototype.push.apply(animals, newbornAnimals);
    }
  }

  function updateFoodResources(deltaSeconds, populations) {
    const foodCounts = { berry: 0, plankton: 0 };
    for (let i = 0; i < foodResources.length; i += 1) {
      const foodResource = foodResources[i];
      if (foodResource.isDead) {
        continue;
      }

      foodResource.ageSeconds += deltaSeconds;
      if (foodResource.ageSeconds > foodResource.lifetimeSeconds) {
        foodResource.isDead = true;
      } else {
        foodCounts[foodResource.type] += 1;
      }
    }

    const berryPopulationTarget = Math.min(112, 60 + populations.deer * 0.68);
    const planktonPopulationTarget = Math.min(
      190,
      104 + populations.fish * 0.78,
    );
    const berrySpawnRate = 0.65 + populations.deer * 0.055;
    const planktonSpawnRate = 1.8 + populations.fish * 0.075;

    resourceSpawnBudget.berry += berrySpawnRate * deltaSeconds;
    resourceSpawnBudget.plankton += planktonSpawnRate * deltaSeconds;

    while (resourceSpawnBudget.berry >= 1) {
      resourceSpawnBudget.berry -= 1;
      if (foodCounts.berry < berryPopulationTarget) {
        foodResources.push(createFoodResource("berry"));
        foodCounts.berry += 1;
      }
    }
    while (resourceSpawnBudget.plankton >= 1) {
      resourceSpawnBudget.plankton -= 1;
      if (foodCounts.plankton < planktonPopulationTarget) {
        foodResources.push(createFoodResource("plankton"));
        foodCounts.plankton += 1;
      }
    }
  }

  function handleExtinctions(populations, deltaSeconds) {
    for (let i = 0; i < SPECIES_ORDER.length; i += 1) {
      const species = SPECIES_ORDER[i];
      const extinctionState = extinctionStates[species];
      if (populations[species] > 0) {
        extinctionState.isActive = false;
        extinctionState.secondsUntilReseed = 0;
        continue;
      }

      if (!extinctionState.isActive) {
        extinctionState.isActive = true;
        extinctionState.secondsUntilReseed = 6;
      } else {
        extinctionState.secondsUntilReseed -= deltaSeconds;
        if (extinctionState.secondsUntilReseed <= 0) {
          const reseedGeneration = maxGeneration + 1;
          spawnAnimals(
            species,
            SPECIES_CONFIG[species].reseedPopulation,
            reseedGeneration,
          );
          maxGeneration = reseedGeneration;
          extinctionState.isActive = false;
        }
      }
    }
  }

  function updateVisualEchoes(deltaSeconds) {
    let activeEchoCount = 0;
    for (let i = 0; i < visualEchoes.length; i += 1) {
      const visualEcho = visualEchoes[i];
      visualEcho.remainingLifeRatio -= deltaSeconds / 0.85;
      if (visualEcho.remainingLifeRatio > 0) {
        visualEchoes[activeEchoCount] = visualEcho;
        activeEchoCount += 1;
      }
    }
    visualEchoes.length = activeEchoCount;
  }

  function removeDeadEntities() {
    let livingAnimalCount = 0;
    for (let animalIndex = 0; animalIndex < animals.length; animalIndex += 1) {
      if (!animals[animalIndex].isDead) {
        animals[livingAnimalCount] = animals[animalIndex];
        livingAnimalCount += 1;
      }
    }
    animals.length = livingAnimalCount;

    let activeFoodCount = 0;
    for (let foodIndex = 0; foodIndex < foodResources.length; foodIndex += 1) {
      if (!foodResources[foodIndex].isDead) {
        foodResources[activeFoodCount] = foodResources[foodIndex];
        activeFoodCount += 1;
      }
    }
    foodResources.length = activeFoodCount;
  }

  function simulateStep(deltaSeconds) {
    simulationTime += deltaSeconds;
    rebuildSpatialIndexes();

    for (let i = 0; i < animals.length; i += 1) {
      updateAnimal(animals[i], deltaSeconds);
    }

    rebuildAnimalSpatialIndex();
    for (let j = 0; j < animals.length; j += 1) {
      resolveForaging(animals[j]);
      resolveHunting(animals[j]);
    }

    const populations = countPopulations();
    reproduceAnimals(populations, deltaSeconds);
    updateFoodResources(deltaSeconds, populations);
    updateVisualEchoes(deltaSeconds);
    removeDeadEntities();
    handleExtinctions(populations, deltaSeconds);
  }

  // Canvas rendering.
  function getGenomeColor(animal) {
    const speciesConfig = SPECIES_CONFIG[animal.species];
    const energyRatio = clamp(animal.energy / animal.maxEnergy, 0, 1);
    const lightness =
      59 + (animal.genome.speedMultiplier - 1) * 28 + energyRatio * 13;
    return (
      "hsl(" +
      speciesConfig.hueDegrees +
      " " +
      speciesConfig.saturationPercent +
      "% " +
      clamp(lightness, 48, 80) +
      "%)"
    );
  }

  function drawAnimalSprite(animal) {
    const spriteModel = SPECIES_ART[animal.species];
    const isLargePredator =
      animal.species === "alligator" || animal.species === "tiger";
    const energyRatio = clamp(animal.energy / animal.maxEnergy, 0, 1);
    const movementRatio = clamp(
      vectorLength(animal.velocityX, animal.velocityY) / animal.maxSpeed,
      0,
      1,
    );
    const facing = Math.cos(animal.headingRadians) >= 0 ? "right" : "left";
    const animationFrames = spriteModel.mirrorHorizontally
      ? spriteModel.frames
      : spriteModel.framesByFacing[facing];
    const frameIndex =
      Math.floor(
        simulationTime * (1.7 + movementRatio * 3.1) + animal.id * 0.37,
      ) % animationFrames.length;
    const spriteLines = animationFrames[frameIndex];
    const fontSize = Math.max(
      spriteModel.minFontSize || 5.2,
      animal.displaySize * spriteModel.fontScale,
    );
    const spriteLineHeight = fontSize * spriteModel.lineHeightScale;
    const tilt =
      clamp(animal.velocityY / animal.maxSpeed, -1, 1) *
      (isLargePredator ? 0.045 : 0.11);
    const color = getGenomeColor(animal);

    context.save();
    context.translate(animal.x, animal.y);
    context.rotate(tilt);
    if (spriteModel.mirrorHorizontally && facing !== spriteModel.artFacing) {
      context.scale(-1, 1);
    }
    context.font =
      (isLargePredator ? "700 " : "600 ") +
      fontSize.toFixed(1) +
      "px Menlo, Consolas, monospace";
    context.fillStyle = color;
    context.globalAlpha = 0.52 + energyRatio * 0.48;
    context.shadowColor = color;
    context.shadowBlur =
      animal.species === "tiger" ? 9 : animal.species === "alligator" ? 8 : 5;
    const widthCacheKey =
      animal.species + "|" + facing + "|" + frameIndex + "|" + context.font;
    let spriteWidth = spriteWidthCache.get(widthCacheKey);
    if (spriteWidth == null) {
      let widestLine = spriteLines[0];
      for (let lineIndex = 1; lineIndex < spriteLines.length; lineIndex += 1) {
        if (spriteLines[lineIndex].length > widestLine.length) {
          widestLine = spriteLines[lineIndex];
        }
      }
      spriteWidth = context.measureText(widestLine).width;
      spriteWidthCache.set(widthCacheKey, spriteWidth);
    }
    context.textAlign = "left";
    for (
      let spriteLineIndex = 0;
      spriteLineIndex < spriteLines.length;
      spriteLineIndex += 1
    ) {
      context.fillText(
        spriteLines[spriteLineIndex],
        -spriteWidth / 2,
        (spriteLineIndex - (spriteLines.length - 1) / 2) * spriteLineHeight,
      );
    }
    context.restore();
  }

  function drawFoodResources(resourceType) {
    const renderStyle = FOOD_RENDER_STYLES[resourceType];
    context.font = renderStyle.font;
    context.shadowColor = renderStyle.shadowColor;
    context.shadowBlur = renderStyle.shadowBlur;

    for (let i = 0; i < foodResources.length; i += 1) {
      const foodResource = foodResources[i];
      if (foodResource.type !== resourceType) {
        continue;
      }

      const freshnessRatio =
        1 - foodResource.ageSeconds / foodResource.lifetimeSeconds;
      const opacity =
        renderStyle.minimumOpacity +
        freshnessRatio * renderStyle.freshnessOpacity;
      context.fillStyle =
        "rgba(" + renderStyle.colorChannels + ", " + opacity + ")";
      context.fillText(
        renderStyle.glyphs[
          foodResource.glyphVariantIndex % renderStyle.glyphs.length
        ],
        foodResource.x,
        foodResource.y,
      );
    }
  }

  function renderWorld() {
    if (!worldWidth || !worldHeight || !backgroundCanvas) {
      return;
    }
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, worldWidth, worldHeight);
    context.drawImage(
      backgroundCanvas,
      0,
      0,
      backgroundCanvas.width,
      backgroundCanvas.height,
      0,
      0,
      worldWidth,
      worldHeight,
    );

    context.textAlign = "center";
    context.textBaseline = "middle";

    drawFoodResources("berry");
    drawFoodResources("plankton");

    context.font = "12px Menlo, Consolas, monospace";
    context.shadowColor = "transparent";
    context.shadowBlur = 0;
    for (
      let visualEchoIndex = 0;
      visualEchoIndex < visualEchoes.length;
      visualEchoIndex += 1
    ) {
      const visualEcho = visualEchoes[visualEchoIndex];
      context.fillStyle =
        "hsla(" +
        visualEcho.hueDegrees +
        " 90% 70% / " +
        visualEcho.remainingLifeRatio +
        ")";
      context.fillText(visualEcho.glyph, visualEcho.x, visualEcho.y);
    }

    for (let animalIndex = 0; animalIndex < animals.length; animalIndex += 1) {
      drawAnimalSprite(animals[animalIndex]);
    }

    context.globalAlpha = 1;
    context.shadowBlur = 0;
  }

  function renderBackgroundCache() {
    backgroundCanvas = document.createElement("canvas");
    backgroundCanvas.width = Math.max(1, Math.floor(worldWidth * pixelRatio));
    backgroundCanvas.height = Math.max(1, Math.floor(worldHeight * pixelRatio));
    const backgroundContext = backgroundCanvas.getContext("2d", {
      alpha: false,
    });
    if (!backgroundContext) {
      return;
    }
    backgroundContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    backgroundContext.fillStyle = "#000000";
    backgroundContext.fillRect(0, 0, worldWidth, worldHeight);

    const decorRandomSource = createSeededRandom(
      terrainSeed ^
        (Math.floor(worldWidth) * 31 + Math.floor(worldHeight) * 17),
    );
    backgroundContext.textAlign = "center";
    backgroundContext.textBaseline = "middle";

    const textureCellSize = worldWidth < 700 ? 18 : 21;
    for (let gridY = 8; gridY < worldHeight; gridY += textureCellSize) {
      for (let gridX = 8; gridX < worldWidth; gridX += textureCellSize) {
        const textureX = gridX + (decorRandomSource() - 0.5) * 5;
        const textureY = gridY + (decorRandomSource() - 0.5) * 4;
        const textureVariant = decorRandomSource();
        let textureGlyph;
        const signedShoreDistance = calculateSignedShoreDistance(
          textureX,
          textureY,
        );

        if (Math.abs(signedShoreDistance) < 13) {
          textureGlyph =
            textureVariant < 0.32
              ? ":"
              : textureVariant < 0.58
                ? ";"
                : textureVariant < 0.78
                  ? "_"
                  : ",";
          backgroundContext.font =
            8 +
            Math.floor(decorRandomSource() * 3) +
            "px Menlo, Consolas, monospace";
          backgroundContext.fillStyle =
            signedShoreDistance > 0
              ? "rgba(111, 221, 218, 0.26)"
              : "rgba(179, 224, 139, 0.23)";
        } else if (signedShoreDistance > 0) {
          textureGlyph =
            textureVariant < 0.24
              ? "~~"
              : textureVariant < 0.47
                ? "~"
                : textureVariant < 0.66
                  ? "-"
                  : textureVariant < 0.84
                    ? "."
                    : "'";
          backgroundContext.font =
            8 +
            Math.floor(decorRandomSource() * 3) +
            "px Menlo, Consolas, monospace";
          backgroundContext.fillStyle =
            textureVariant < 0.47
              ? "rgba(83, 202, 224, 0.19)"
              : "rgba(68, 151, 172, 0.09)";
        } else {
          textureGlyph =
            textureVariant < 0.06
              ? "v"
              : textureVariant < 0.13
                ? "^"
                : textureVariant < 0.23
                  ? "|"
                  : textureVariant < 0.48
                    ? "'"
                    : textureVariant < 0.72
                      ? ","
                      : ".";
          backgroundContext.fillStyle =
            textureVariant < 0.13
              ? "rgba(94, 211, 121, 0.16)"
              : "rgba(73, 161, 96, 0.075)";
          backgroundContext.font =
            9 +
            Math.floor(decorRandomSource() * 4) +
            "px Menlo, Consolas, monospace";
        }
        backgroundContext.fillText(textureGlyph, textureX, textureY);
      }
    }

    backgroundContext.font = "7px Menlo, Consolas, monospace";
    backgroundContext.fillStyle = "rgba(132, 224, 194, 0.24)";
    for (let edgeY = 5; edgeY < worldHeight; edgeY += 9) {
      for (let edgeX = 5; edgeX < worldWidth; edgeX += 9) {
        const edgeDistance = calculateSignedShoreDistance(edgeX, edgeY);
        if (Math.abs(edgeDistance) < 4.5) {
          backgroundContext.fillText(
            edgeDistance > 0 ? "~" : ":",
            edgeX,
            edgeY,
          );
        }
      }
    }

    const depthSortedStructures = habitatStructures
      .slice()
      .sort(function (firstStructure, secondStructure) {
        return firstStructure.y - secondStructure.y;
      });
    for (
      let structureIndex = 0;
      structureIndex < depthSortedStructures.length;
      structureIndex += 1
    ) {
      const habitatStructure = depthSortedStructures[structureIndex];
      const spriteLineHeight = habitatStructure.fontSize * 1.08;
      backgroundContext.font =
        habitatStructure.fontSize + "px Menlo, Consolas, monospace";
      backgroundContext.fillStyle = habitatStructure.color;
      backgroundContext.shadowColor =
        habitatStructure.habitat === "lake"
          ? "rgba(86, 218, 235, 0.22)"
          : "rgba(83, 235, 126, 0.2)";
      backgroundContext.shadowBlur = 3;
      for (
        let spriteLineIndex = 0;
        spriteLineIndex < habitatStructure.sprite.length;
        spriteLineIndex += 1
      ) {
        backgroundContext.fillText(
          habitatStructure.sprite[spriteLineIndex],
          habitatStructure.x,
          habitatStructure.y +
            (spriteLineIndex - (habitatStructure.sprite.length - 1) / 2) *
              spriteLineHeight,
        );
      }
    }
    backgroundContext.shadowBlur = 0;
  }

  // Viewport, telemetry, and controls.
  function resizeCanvasToContainer() {
    const containerBounds = canvas.parentElement.getBoundingClientRect();
    const measuredWidth = Math.max(1, Math.floor(containerBounds.width));
    const measuredHeight = Math.max(1, Math.floor(containerBounds.height));
    const measuredPixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    if (
      measuredWidth === worldWidth &&
      measuredHeight === worldHeight &&
      measuredPixelRatio === pixelRatio
    ) {
      return null;
    }

    const previousSize = { width: worldWidth, height: worldHeight };
    worldWidth = measuredWidth;
    worldHeight = measuredHeight;
    pixelRatio = measuredPixelRatio;
    worldSpatialScale = clamp(
      Math.sqrt((worldWidth * worldHeight) / (1100 * 670)),
      0.48,
      1,
    );
    canvas.width = Math.floor(worldWidth * pixelRatio);
    canvas.height = Math.floor(worldHeight * pixelRatio);
    canvas.style.width = worldWidth + "px";
    canvas.style.height = worldHeight + "px";
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    return previousSize;
  }

  function resizeWorld() {
    const previousSize = resizeCanvasToContainer();
    if (!previousSize) {
      return;
    }

    generateLake();
    generateStructures();

    if (previousSize.width && previousSize.height) {
      const scaleX = worldWidth / previousSize.width;
      const scaleY = worldHeight / previousSize.height;
      animals.forEach(function (animal) {
        animal.x *= scaleX;
        animal.y *= scaleY;
        updateDerivedTraits(animal);
        keepInHabitat(animal);
      });
      foodResources.forEach(function (foodResource) {
        foodResource.x *= scaleX;
        foodResource.y *= scaleY;
        const habitat = foodResource.type === "berry" ? "land" : "lake";
        if (
          (habitat === "land" &&
            isInsideLake(foodResource.x, foodResource.y)) ||
          (habitat === "lake" &&
            !isInsideLake(foodResource.x, foodResource.y)) ||
          !pointClearOfStructures(foodResource.x, foodResource.y, 5, habitat)
        ) {
          const point = findHabitatPoint(habitat, false);
          foodResource.x = point.x;
          foodResource.y = point.y;
        }
      });
    }

    renderBackgroundCache();
    renderWorld();
  }

  function formatElapsedTime(seconds) {
    const totalSeconds = Math.max(0, Math.floor(seconds));
    return (
      zeroPad(Math.floor(totalSeconds / 60), 2) +
      ":" +
      zeroPad(totalSeconds % 60, 2)
    );
  }

  function resetWorld() {
    animals = [];
    foodResources = [];
    visualEchoes = [];
    resourceSpawnBudget = { berry: 0, plankton: 0 };
    simulationTime = 0;
    maxGeneration = 0;
    simulationAccumulator = 0;
    nextEntityId = 1;
    terrainSeed = Math.floor(Math.random() * 0x7fffffff);
    generateLake();
    generateStructures();
    renderBackgroundCache();
    SPECIES_ORDER.forEach(function (species) {
      extinctionStates[species] = { isActive: false, secondsUntilReseed: 0 };
      spawnAnimals(species, SPECIES_CONFIG[species].initialPopulation, 0);
    });
    spawnFoodResources("berry", 76);
    spawnFoodResources("plankton", 136);
    rebuildSpatialIndexes();
    updateTelemetry();
    renderWorld();
  }

  function setTextContent(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = text;
    }
  }

  function updateTelemetry() {
    setTextContent("stat-time", formatElapsedTime(simulationTime));
    setTextContent("stat-generation", zeroPad(maxGeneration, 3));
    setTextContent("stat-population", zeroPad(animals.length, 3));
    setTextContent("stat-fps", zeroPad(Math.round(framesPerSecond), 2));
    document.getElementById("live-mark").textContent = isPaused
      ? "[ HOLD ]"
      : "[ RUNNING ]";
  }

  function setPaused(nextPausedState) {
    isPaused = nextPausedState;
    document.getElementById("paused-overlay").hidden = !isPaused;
    const button = document.getElementById("pause-button");
    button.textContent = isPaused ? "SPACE : RESUME" : "SPACE : PAUSE";
    button.setAttribute("aria-pressed", String(isPaused));
    updateTelemetry();
  }

  function cycleSpeed() {
    simulationSpeedIndex =
      (simulationSpeedIndex + 1) % SIMULATION_SPEEDS.length;
    document.getElementById("speed-button").textContent =
      "S : " + SIMULATION_SPEEDS[simulationSpeedIndex] + "×";
  }

  function togglePaused() {
    setPaused(!isPaused);
  }

  function handleKeyboardShortcut(event) {
    const targetTagName = event.target && event.target.tagName;
    const targetIsInteractive =
      targetTagName === "BUTTON" ||
      targetTagName === "INPUT" ||
      targetTagName === "SELECT" ||
      targetTagName === "TEXTAREA" ||
      (event.target && event.target.isContentEditable);
    if (event.repeat || targetIsInteractive) {
      return;
    }

    if (event.code === "Space") {
      event.preventDefault();
      togglePaused();
    } else if (event.key.toLowerCase() === "s") {
      cycleSpeed();
    } else if (event.key.toLowerCase() === "r") {
      resetWorld();
    }
  }

  function handleVisibilityChange() {
    lastFrameTimestamp = performance.now();
    simulationAccumulator = 0;
  }

  function animationFrame(now) {
    const elapsedSeconds = Math.min(
      0.08,
      Math.max(0, (now - lastFrameTimestamp) / 1000),
    );
    let completedSimulationSteps = 0;
    lastFrameTimestamp = now;
    if (elapsedSeconds > 0) {
      const instantaneousFps = 1 / elapsedSeconds;
      framesPerSecond += (instantaneousFps - framesPerSecond) * 0.08;
    }

    if (!isPaused) {
      simulationAccumulator +=
        elapsedSeconds * SIMULATION_SPEEDS[simulationSpeedIndex];
      while (
        simulationAccumulator >= SIMULATION_STEP_SECONDS &&
        completedSimulationSteps < 10
      ) {
        simulateStep(SIMULATION_STEP_SECONDS);
        simulationAccumulator -= SIMULATION_STEP_SECONDS;
        completedSimulationSteps += 1;
      }
      if (completedSimulationSteps === 10) {
        simulationAccumulator = 0;
      }
    }

    if (completedSimulationSteps > 0) {
      renderWorld();
    }
    if (now - lastTelemetryUpdate > 350) {
      updateTelemetry();
      lastTelemetryUpdate = now;
    }
    requestAnimationFrame(animationFrame);
  }

  document
    .getElementById("pause-button")
    .addEventListener("click", togglePaused);
  document.getElementById("speed-button").addEventListener("click", cycleSpeed);
  document.getElementById("reset-button").addEventListener("click", resetWorld);
  window.addEventListener("keydown", handleKeyboardShortcut);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  window.ECO_DEBUG = {
    advance: function (seconds) {
      const simulationStepCount = Math.max(
        0,
        Math.floor(seconds / SIMULATION_STEP_SECONDS),
      );
      for (let i = 0; i < simulationStepCount; i += 1) {
        simulateStep(SIMULATION_STEP_SECONDS);
      }
      updateTelemetry();
      renderWorld();
      return this.snapshot();
    },
    snapshot: function () {
      return {
        time: simulationTime,
        populations: countPopulations(),
        foodResources: countFoodResources(),
        maxGeneration: maxGeneration,
        animals: animals.length,
        habitatStructures: habitatStructures.length,
        lake: Boolean(lake),
      };
    },
    reset: resetWorld,
  };

  resizeCanvasToContainer();
  resetWorld();

  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(resizeWorld).observe(canvas.parentElement);
  } else {
    window.addEventListener("resize", resizeWorld);
  }

  requestAnimationFrame(animationFrame);
})();
