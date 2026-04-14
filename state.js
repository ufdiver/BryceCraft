export const state = {
    // Player resources
    gold: 0,
    lives: 3,
    bombs: 0,
    grenades: 0,
    ammo: 0,
    hasGun: false,
    currentLevel: 1,
    inventory: [],
    invincibleTime: 0,
    invinciblePellets: 0,
    selectedItemIdx: 0,
    inventoryTypes: ['hand', 'gun', 'shovel', 'pickaxe', 'grenade', 'bomb', 'pellet'],
    itemSwingTime: 0,
    isAdmin: false,

    // Game flow
    isMathActive: false,
    lastHit: 0,
    isDead: false,
    isGameStarted: false,
    startRotation: 0,
    currentMentorObj: null,
    isSafeStart: true,
    isFallingOffMap: false,

    // Physics
    isCrouching: false,
    jumpVelocity: 0,
    isFlying: false,
    launchPlate: null,

    // Boat / ferryman
    boatMesh: null,
    boatAngle: 0,
    boatState: 'patrol',
    ferrymanAngle: 0,
    boatRadius: 0,
    isPlayerOnBoat: false,
    atShore: null,
    lastDisembark: 0,

    // World data
    mazeData: [],
    explored: [],
    discoveredItems: [],
    corridorCells: [],
    waterBounds: null,
    skyPortal: null,

    // Scene object lists
    collidables: [],
    interactables: [],
    entities: [],
    enemies: [],
    bullets: [],
    grenadeProjectiles: [],
    lavaPatches: [],
    laserBeams: [],
    clouds: [],

    // Hand mesh parts (populated in game.js)
    handGroup: null,
    fingers: [],

    // Three.js core (set in game.js before use)
    scene: null,
    camera: null,
    renderer: null,
};

export const STAND_HEIGHT = 2.0;
export const CROUCH_HEIGHT = 0.85;
export const GRAVITY = 0.018;
export const JUMP_FORCE = 0.30;
export const GRID_SIZE = 17;
export const CELL = 4;
export const KEY_PRICE = 150;
export const BOMB_PRICE = 75;
export const GUN_PRICE = 200;
export const PELLET_PRICE = 100;
