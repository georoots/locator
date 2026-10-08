const assert = require('assert');
const geom = require('./polygon-geometry.js');

function ringOpen(ring) {
    return ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
        ? ring.slice(0, -1) : ring;
}

function run(name, fn) {
    try {
        fn();
        console.log(`✓ ${name}`);
    } catch (err) {
        console.error(`✗ ${name}`);
        throw err;
    }
}

run('dedupes stationary jitter', () => {
    const raw = [
        [36.8, -1.28], [36.800001, -1.280001], [36.800002, -1.280002],
        [36.80005, -1.28005], [36.8001, -1.2801]
    ];
    const out = geom.dedupeConsecutive(raw, 1);
    assert.ok(out.length <= 3);
});

run('cleans concave field without fallback', () => {
    const square = [
        [0, 0], [0, 0.001], [0.001, 0.001], [0.001, 0], [0, 0]
    ];
    const result = geom.cleanTrackToPolygon(square, { minDistanceM: 1, simplifyM: 2 });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.fallbackUsed, false);
    assert.ok(result.ring.length >= 4);
});

run('uses convex fallback for figure-eight', () => {
    const figureEight = [
        [0, 0], [0, 0.001], [0.001, 0.001], [0.001, 0],
        [0.0005, 0.0005], [0.0015, 0.0005], [0.0015, 0.0015], [0.0005, 0.0015], [0, 0]
    ];
    const result = geom.cleanTrackToPolygon(figureEight, { minDistanceM: 1, simplifyM: 2 });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.fallbackUsed, true);
});

run('rejects insufficient points', () => {
    const result = geom.cleanTrackToPolygon([[0, 0], [0, 0.00001]], { minDistanceM: 1 });
    assert.strictEqual(result.ok, false);
});

run('deterministic output', () => {
    const track = [
        [36.821, -1.292], [36.8212, -1.292], [36.8214, -1.2918],
        [36.8216, -1.2916], [36.8214, -1.2914], [36.8212, -1.2916], [36.821, -1.292]
    ];
    const a = geom.cleanTrackToPolygon(track, { minDistanceM: 1, simplifyM: 2 });
    const b = geom.cleanTrackToPolygon(track, { minDistanceM: 1, simplifyM: 2 });
    assert.deepStrictEqual(a.ring, b.ring);
});

run('normalizes closed ring winding', () => {
    const ccw = geom.normalizeExteriorCCW([[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]);
    assert.ok(ccw && ccw.length >= 4);
    assert.strictEqual(ccw[0][0], ccw[ccw.length - 1][0]);
});

run('handles large track', () => {
    const track = [];
    for (let i = 0; i < 500; i++) {
        const angle = (i / 500) * Math.PI * 2;
        track.push([36.82 + Math.cos(angle) * 0.001, -1.29 + Math.sin(angle) * 0.001]);
    }
    track.push(track[0]);
    const result = geom.cleanTrackToPolygon(track, { minDistanceM: 1, simplifyM: 3 });
    assert.strictEqual(result.ok, true);
    assert.ok(ringOpen(result.ring).length >= 3);
});

run('closes open tracks into polygons', () => {
    const open = [
        [36.821, -1.292], [36.8212, -1.292], [36.8214, -1.2918], [36.8212, -1.2916]
    ];
    const result = geom.cleanTrackToPolygon(open, { minDistanceM: 1, simplifyM: 2 });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.ring[0][0], result.ring[result.ring.length - 1][0]);
});

run('rejects collinear/degenerate tracks', () => {
    const line = [[0, 0], [0.001, 0], [0.002, 0], [0.003, 0]];
    const result = geom.cleanTrackToPolygon(line, { minDistanceM: 1, simplifyM: 2 });
    assert.strictEqual(result.ok, false);
});

run('detects bowtie self-intersection', () => {
    const bowtie = [[0, 0], [1, 1], [1, 0], [0, 1]];
    assert.strictEqual(geom.hasSelfIntersection(bowtie), true);
    const validation = geom.validateSimplePolygonRing(geom.closeRing(bowtie));
    assert.strictEqual(validation.ok, false);
    assert.ok(validation.issues.includes('self_intersection'));
});

run('validateSimplePolygonRing accepts simple square', () => {
    const square = [[0, 0], [0, 0.001], [0.001, 0.001], [0.001, 0], [0, 0]];
    const validation = geom.validateSimplePolygonRing(square);
    assert.strictEqual(validation.ok, true);
    assert.ok(validation.ring);
});

console.log('All polygon geometry tests passed.');
