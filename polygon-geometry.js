/**
 * Polygon geometry utilities for GPS path → simple outer polygon cleanup.
 * Works in browser (window.PolygonGeometry) and Node (module.exports).
 */
(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
    } else {
        root.PolygonGeometry = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    const R = 6378137;

    function toRad(d) { return d * Math.PI / 180; }

    function haversineMeters(a, b) {
        if (!a || !b) return Infinity;
        const lat1 = toRad(Number(a[1])), lat2 = toRad(Number(b[1]));
        const dLat = lat2 - lat1;
        const dLng = toRad(Number(b[0]) - Number(a[0]));
        const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
        return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
    }

    function isFiniteCoord(c) {
        return Array.isArray(c) && c.length >= 2 && Number.isFinite(Number(c[0])) && Number.isFinite(Number(c[1]));
    }

    function coordsEqual(a, b) {
        return isFiniteCoord(a) && isFiniteCoord(b) && Number(a[0]) === Number(b[0]) && Number(a[1]) === Number(b[1]);
    }

    function dedupeConsecutive(points, minDistM) {
        const out = [];
        for (const p of points) {
            if (!isFiniteCoord(p)) continue;
            const c = [Number(p[0]), Number(p[1])];
            if (out.length === 0 || haversineMeters(out[out.length - 1], c) >= minDistM) {
                out.push(c);
            }
        }
        return out;
    }

    function perpendicularDistanceM(p, a, b) {
        const ax = a[0], ay = a[1], bx = b[0], by = b[1], px = p[0], py = p[1];
        const dx = bx - ax, dy = by - ay;
        if (dx === 0 && dy === 0) return haversineMeters(p, a);
        const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
        const proj = [ax + t * dx, ay + t * dy];
        return haversineMeters(p, proj);
    }

    function douglasPeucker(points, toleranceM) {
        if (points.length <= 2) return points.slice();
        let maxDist = 0, idx = 0;
        const end = points.length - 1;
        for (let i = 1; i < end; i++) {
            const d = perpendicularDistanceM(points[i], points[0], points[end]);
            if (d > maxDist) { maxDist = d; idx = i; }
        }
        if (maxDist > toleranceM) {
            const left = douglasPeucker(points.slice(0, idx + 1), toleranceM);
            const right = douglasPeucker(points.slice(idx), toleranceM);
            return left.slice(0, -1).concat(right);
        }
        return [points[0], points[end]];
    }

    function segmentsIntersect(p1, p2, p3, p4) {
        const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
        const d1 = cross(p1, p2, p3), d2 = cross(p1, p2, p4);
        const d3 = cross(p3, p4, p1), d4 = cross(p3, p4, p2);
        if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
        return false;
    }

    function getOpenRing(ring) {
        if (!ring || ring.length < 3) return null;
        return coordsEqual(ring[0], ring[ring.length - 1]) ? ring.slice(0, -1) : ring.slice();
    }

    function getRingEdges(openRing) {
        const edges = [];
        for (let i = 0; i < openRing.length; i++) {
            edges.push([openRing[i], openRing[(i + 1) % openRing.length]]);
        }
        return edges;
    }

    function edgesShareEndpoint(edgeA, edgeB) {
        return coordsEqual(edgeA[0], edgeB[0]) || coordsEqual(edgeA[0], edgeB[1])
            || coordsEqual(edgeA[1], edgeB[0]) || coordsEqual(edgeA[1], edgeB[1]);
    }

    function hasSelfIntersection(openRing) {
        const n = openRing.length;
        if (n < 4) return false;
        const edges = getRingEdges(openRing);
        for (let i = 0; i < edges.length; i++) {
            for (let j = i + 1; j < edges.length; j++) {
                if (edgesShareEndpoint(edges[i], edges[j])) continue;
                if (segmentsIntersect(edges[i][0], edges[i][1], edges[j][0], edges[j][1])) return true;
            }
        }
        return false;
    }

    function signedArea2D(points) {
        let sum = 0;
        for (let i = 0; i < points.length - 1; i++) {
            sum += points[i][0] * points[i + 1][1] - points[i + 1][0] * points[i][1];
        }
        return sum / 2;
    }

    function convexHull(points) {
        const pts = points.filter(isFiniteCoord).map(p => [Number(p[0]), Number(p[1])])
            .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        if (pts.length < 3) return pts;
        const lower = [];
        for (const p of pts) {
            while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
            lower.push(p);
        }
        const upper = [];
        for (let i = pts.length - 1; i >= 0; i--) {
            const p = pts[i];
            while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
            upper.push(p);
        }
        upper.pop(); lower.pop();
        return lower.concat(upper);

        function cross(o, a, b) {
            return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
        }
    }

    function closeRing(openRing) {
        if (openRing.length < 3) return null;
        if (coordsEqual(openRing[0], openRing[openRing.length - 1])) return openRing.slice();
        return [...openRing, openRing[0]];
    }

    function normalizeExteriorCCW(ring) {
        if (!ring || ring.length < 4) return null;
        let open = coordsEqual(ring[0], ring[ring.length - 1]) ? ring.slice(0, -1) : ring.slice();
        if (open.length < 3) return null;
        if (signedArea2D(closeRing(open)) < 0) open.reverse();
        return closeRing(open);
    }

    function uniquePointsCount(ring) {
        const open = coordsEqual(ring[0], ring[ring.length - 1]) ? ring.slice(0, -1) : ring.slice();
        const seen = new Set();
        for (const p of open) seen.add(`${p[0].toFixed(7)},${p[1].toFixed(7)}`);
        return seen.size;
    }

    function validateSimplePolygonRing(ring) {
        const openRing = getOpenRing(ring);
        if (!openRing || openRing.length < 3) {
            return { ok: false, openRing: null, issues: ['insufficient_points'] };
        }
        if (uniquePointsCount(closeRing(openRing)) < 3) {
            return { ok: false, openRing, issues: ['degenerate_ring'] };
        }
        if (hasSelfIntersection(openRing)) {
            return { ok: false, openRing, issues: ['self_intersection'] };
        }
        const normalized = normalizeExteriorCCW(openRing);
        if (!normalized) {
            return { ok: false, openRing, issues: ['invalid_ring'] };
        }
        return { ok: true, openRing, ring: normalized, issues: [] };
    }

    /**
     * Convert noisy GPS track to one simple outer polygon ring [[lng,lat],...] closed.
     * @returns {{ ok: boolean, ring: number[][]|null, method: string, fallbackUsed: boolean, warnings: string[] }}
     */
    function cleanTrackToPolygon(rawPoints, options = {}) {
        const minDistM = options.minDistanceM ?? 1;
        const simplifyM = options.simplifyM ?? Math.max(minDistM, 2);
        const warnings = [];

        let pts = dedupeConsecutive(rawPoints.filter(isFiniteCoord), minDistM);
        if (pts.length < 3) {
            return { ok: false, ring: null, method: 'none', fallbackUsed: false, warnings: ['insufficient_points'] };
        }

        const tolerances = [simplifyM, simplifyM * 2, simplifyM * 4, simplifyM * 8];
        for (const tol of tolerances) {
            let simplified = douglasPeucker(pts, tol);
            simplified = dedupeConsecutive(simplified, minDistM * 0.5);
            if (simplified.length < 3) continue;
            let open = simplified.slice();
            if (!coordsEqual(open[0], open[open.length - 1]) && haversineMeters(open[0], open[open.length - 1]) > minDistM) {
                open.push(open[0]);
            }
            open = coordsEqual(open[0], open[open.length - 1]) ? open.slice(0, -1) : open;
            if (open.length < 3) continue;
            if (!hasSelfIntersection(open)) {
                const ring = normalizeExteriorCCW(open);
                if (ring && uniquePointsCount(ring) >= 3 && validateSimplePolygonRing(ring).ok) {
                    return { ok: true, ring, method: tol === simplifyM ? 'simplified' : 'simplified_aggressive', fallbackUsed: false, warnings };
                }
            }
        }

        warnings.push('convex_fallback');
        const hull = convexHull(pts);
        if (hull.length < 3) {
            return { ok: false, ring: null, method: 'convex', fallbackUsed: true, warnings };
        }
        const ring = normalizeExteriorCCW(hull);
        if (!ring || uniquePointsCount(ring) < 3 || !validateSimplePolygonRing(ring).ok) {
            return { ok: false, ring: null, method: 'convex', fallbackUsed: true, warnings };
        }
        return { ok: true, ring, method: 'convex', fallbackUsed: true, warnings };
    }

    return {
        haversineMeters,
        isFiniteCoord,
        dedupeConsecutive,
        douglasPeucker,
        hasSelfIntersection,
        convexHull,
        closeRing,
        getOpenRing,
        normalizeExteriorCCW,
        validateSimplePolygonRing,
        cleanTrackToPolygon
    };
});
