import * as THREE from 'three';

export function createHumanNPC(difficulty = 1) {
    const colors = [0x44ff44, 0xffff44, 0xff4444]; // Green, Yellow, Red
    const diffColor = colors[difficulty - 1];
    const g = new THREE.Group();

    const skin = new THREE.MeshStandardMaterial({ color: 0xdbac82 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: diffColor });
    const pantMat = new THREE.MeshStandardMaterial({ color: 0x303f9f }); // Classic blue pants

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), skin);
    head.position.y = 1.65;

    // Body/Torso
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.3), shirtMat);
    body.position.y = 1.05;

    // Arms
    const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), skin);
    lArm.position.set(-0.4, 1.05, 0);
    const rArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), skin);
    rArm.position.set(0.4, 1.05, 0);

    // Legs
    const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.7, 0.25), pantMat);
    lLeg.position.set(-0.15, 0.35, 0);
    const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.7, 0.25), pantMat);
    rLeg.position.set(0.15, 0.35, 0);

    g.add(head, body, lArm, rArm, lLeg, rLeg);
    Object.assign(g.userData, { head, lArm, rArm, lLeg, rLeg });

    const hitBox = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.5, 1.2), new THREE.MeshBasicMaterial({ visible: false }));
    hitBox.position.y = 1.25;
    hitBox.userData = g.userData;
    hitBox.userData.root = g;
    g.add(hitBox);
    return g;
}

export function createFerryman() {
    const g = new THREE.Group();
    const skin = new THREE.MeshStandardMaterial({ color: 0xdbac82 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0x795548 }); // Brown/Ferryman theme
    const pantMat = new THREE.MeshStandardMaterial({ color: 0x212121 });
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x3e2723 });

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), skin); head.position.y = 1.65;
    const hat = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.1, 0.65), hatMat); hat.position.y = 1.95;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.3), shirtMat); body.position.y = 1.05;
    const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), skin); lArm.position.set(-0.4, 1.05, 0);
    const rArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), skin); rArm.position.set(0.4, 1.05, 0);
    const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.7, 0.25), pantMat); lLeg.position.set(-0.15, 0.35, 0);
    const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.7, 0.25), pantMat); rLeg.position.set(0.15, 0.35, 0);

    g.add(head, hat, body, lArm, rArm, lLeg, rLeg);
    Object.assign(g.userData, { head, lArm, rArm, lLeg, rLeg, hat });

    const hitBox = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.5, 1.2), new THREE.MeshBasicMaterial({ visible: false }));
    hitBox.position.y = 1.25;
    hitBox.userData = g.userData;
    hitBox.userData.root = g;
    g.add(hitBox);
    return g;
}

export function createFoxNPC(difficulty = 1) {
    const colors = [0x44ff44, 0xffff44, 0xff4444];
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: colors[difficulty - 1] });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x3e2723 }); // Nose/Eyes/Tail tip

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.8), mat);
    body.position.y = 0.4;

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), mat);
    head.position.set(0, 0.65, 0.4);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), mat);
    snout.position.set(0, 0.6, 0.7);

    // Tail
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.5), mat);
    tail.position.set(0, 0.5, -0.55);
    tail.rotation.x = -0.3;

    // Legs (4)
    const legSize = 0.15;
    for (let x = -0.1; x <= 0.1; x += 0.2) {
        for (let z = -0.25; z <= 0.25; z += 0.5) {
            const l = new THREE.Mesh(new THREE.BoxGeometry(legSize, 0.3, legSize), mat);
            l.position.set(x, 0.15, z);
            g.add(l);
        }
    }

    g.add(body, head, snout, tail);
    Object.assign(g.userData, { head, tail, snout });

    const hitBox = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3.0, 1.8), new THREE.MeshBasicMaterial({ visible: false }));
    hitBox.position.y = 1.0;
    hitBox.userData = g.userData;
    hitBox.userData.root = g;
    g.add(hitBox);
    return g;
}

export function createSlimeEnemy() {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, transparent: true, opacity: 0.9 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1b5e20 });

    // Creeper Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.3), mat);
    body.position.y = 0.75;

    // Creeper Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), mat);
    head.position.y = 1.5;

    // Creeper Legs (4)
    const legs = [];
    const legSize = 0.25;
    for (let x = -0.15; x <= 0.15; x += 0.3) {
        for (let z = -0.15; z <= 0.15; z += 0.3) {
            const l = new THREE.Mesh(new THREE.BoxGeometry(legSize, 0.3, legSize), darkMat);
            l.position.set(x, 0.15, z);
            g.add(l);
            legs.push(l);
        }
    }

    g.add(body, head);
    g.userData = { type: 'enemy', legs, body, head };
    body.userData = { type: 'enemy' };
    head.userData = { type: 'enemy' };
    return g;
}

export function createTree() {
    const group = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.5, 8), trunkMat);
    trunk.position.y = 0.75;
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(1, 2, 8), leavesMat);
    leaves.position.y = 2.2;
    group.add(trunk, leaves);
    return group;
}

export function createGhostEnemy() {
    const g = new THREE.Group();
    const ghostMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.8, 8), ghostMat);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), ghostMat);
    head.position.y = 0.4;
    body.position.y = 0;
    const bodyGroup = new THREE.Group();
    bodyGroup.add(body, head);
    bodyGroup.userData = { type: 'enemy' };
    g.add(bodyGroup);
    g.position.y = 1.6;
    return g;
}

export function createBoat() {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
    const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x3e2723 });

    // Much Wider Hull segments
    for (let i = 0; i < 5; i++) {
        const s = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 4.5 - (Math.abs(i - 2) * 1.0)), woodMat);
        s.position.set(i - 2, 0, 0);
        group.add(s);
    }

    // Prow and Stern
    const prow = new THREE.Mesh(new THREE.ConeGeometry(2.0, 1.2, 4), woodMat);
    prow.rotation.z = -Math.PI / 2; prow.position.set(2.8, 0.2, 0); prow.scale.set(1, 1, 0.8);
    const stern = new THREE.Mesh(new THREE.ConeGeometry(2.0, 1.0, 4), woodMat);
    stern.rotation.z = Math.PI / 2; stern.position.set(-2.6, 0.1, 0); stern.scale.set(1, 1, 0.8);
    group.add(prow, stern);

    // Floor (Walkable)
    const floor = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 3.5), woodMat);
    floor.position.y = 0.3;
    group.add(floor);

    // Mast
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.5, 8), darkWoodMat);
    mast.position.y = 1.7;
    const cross = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3, 8), darkWoodMat);
    cross.rotation.z = Math.PI / 2; cross.position.y = 2.8;
    group.add(mast, cross);

    group.position.y = 0.2;
    return group;
}
