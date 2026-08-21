#!/usr/bin/env python3
"""Generate mathematically accurate Earth-at-night city-light points.

Pipeline:
  1. Real metro lat/lon + population weight → Gaussian clusters on the sphere
  2. Great-circle corridors between hubs → highway/web structure
  3. Land-mask rejection (Natural Earth 50m bit mask from dotted-globe)
  4. Uniform-in-solid-angle sampling (z ~ U[-1,1], θ ~ U[0,2π]) so poles
     are not over-dense
  5. Star field on a far celestial sphere (Fibonacci lattice)

Output: shared/earth-lights.json with unit-sphere xyz + intensity, stars,
and the camera framing that matches the North-America orbital reference.
"""

from __future__ import annotations

import base64
import json
import math
import random
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GLOBE_HTML = ROOT / "scytales/assets/innovation/dotted-globe.html"
OUT = ROOT / "shared/earth-lights.json"

MASK_W, MASK_H, ROW_BYTES = 2048, 1024, 256
R = 1.0
RNG = random.Random(42)

# Major North-American metros: lat, lon, relative light weight (≈ log population)
# Geographically tuned to the orbital reference (Eastern Seaboard, Great Lakes,
# Texas triangle, West Coast hubs, Mexican/Canadian corridors).
METROS = [
    # Eastern megalopolis
    (42.36, -71.06, 9.0),   # Boston
    (41.82, -71.41, 4.0),   # Providence
    (41.77, -72.69, 4.5),   # Hartford
    (40.71, -74.01, 18.0),  # NYC
    (40.74, -74.17, 6.0),   # Newark
    (39.95, -75.17, 8.5),   # Philadelphia
    (39.29, -76.61, 6.5),   # Baltimore
    (38.91, -77.04, 7.5),   # Washington
    (37.54, -77.44, 4.0),   # Richmond
    (36.85, -76.29, 4.5),   # Norfolk
    (35.23, -80.84, 5.5),   # Charlotte
    (33.75, -84.39, 7.0),   # Atlanta
    (32.78, -79.93, 3.5),   # Charleston
    (30.33, -81.66, 4.0),   # Jacksonville
    (25.76, -80.19, 8.0),   # Miami
    (26.12, -80.14, 5.0),   # Fort Lauderdale
    (27.95, -82.46, 5.5),   # Tampa
    (28.54, -81.38, 5.0),   # Orlando
    # Great Lakes / Midwest
    (43.65, -79.38, 9.0),   # Toronto
    (45.50, -73.57, 7.0),   # Montreal
    (45.42, -75.70, 3.5),   # Ottawa
    (42.33, -83.05, 6.5),   # Detroit
    (41.88, -87.63, 12.0),  # Chicago
    (43.04, -87.91, 4.0),   # Milwaukee
    (39.77, -86.16, 4.5),   # Indianapolis
    (39.10, -84.51, 4.0),   # Cincinnati
    (41.50, -81.69, 5.0),   # Cleveland
    (40.44, -79.99, 4.5),   # Pittsburgh
    (42.89, -78.88, 3.5),   # Buffalo
    (44.98, -93.27, 5.0),   # Minneapolis
    (38.63, -90.20, 5.0),   # St Louis
    (39.10, -94.58, 4.5),   # Kansas City
    (41.26, -95.94, 3.5),   # Omaha
    (39.74, -104.99, 5.5),  # Denver
    (35.47, -97.52, 3.5),   # Oklahoma City
    # Texas triangle
    (32.78, -96.80, 9.0),   # Dallas
    (32.76, -97.33, 5.0),   # Fort Worth
    (29.76, -95.37, 10.0),  # Houston
    (30.27, -97.74, 5.5),   # Austin
    (29.42, -98.49, 5.0),   # San Antonio
    # West / Southwest
    (33.45, -112.07, 7.0),  # Phoenix
    (36.17, -115.14, 5.5),  # Las Vegas
    (40.76, -111.89, 3.5),  # Salt Lake
    (35.08, -106.65, 3.0),  # Albuquerque
    (32.72, -117.16, 5.5),  # San Diego
    (34.05, -118.24, 16.0), # Los Angeles
    (33.68, -117.83, 6.0),  # Orange County
    (34.15, -118.45, 5.0),  # San Fernando
    (37.34, -121.89, 5.0),  # San Jose
    (37.77, -122.42, 9.0),  # San Francisco
    (37.87, -122.27, 4.0),  # Oakland
    (38.58, -121.49, 4.0),  # Sacramento
    (45.52, -122.68, 5.0),  # Portland
    (47.61, -122.33, 7.0),  # Seattle
    (49.28, -123.12, 5.5),  # Vancouver
    (51.05, -114.07, 3.5),  # Calgary
    (53.55, -113.49, 3.5),  # Edmonton
    # Mexico / border
    (32.51, -117.04, 4.0),  # Tijuana
    (31.69, -106.42, 3.5),  # Juarez
    (25.69, -100.32, 5.5),  # Monterrey
    (20.67, -103.35, 5.0),  # Guadalajara
    (19.43, -99.13, 14.0),  # Mexico City
    (21.16, -86.85, 2.5),   # Cancun
    # South / Central extras that fill the limb
    (18.47, -66.11, 3.0),   # San Juan
    (23.11, -82.37, 3.5),   # Havana
    (10.48, -66.90, 4.0),   # Caracas (far limb)
    (4.71, -74.07, 5.0),    # Bogota (far limb)
]

# Highway / megalopolis corridors (index pairs into METROS) — sampled along
# great-circle chords on the sphere for the “web” structure in the reference.
CORRIDORS = [
    (0, 3), (3, 5), (5, 7), (7, 10), (10, 11),  # Bos–NYC–Philly–DC–Charlotte–Atlanta
    (3, 18), (18, 21), (21, 22), (22, 28),       # NYC–Toronto–Detroit–Chicago–Minneapolis
    (11, 34), (34, 35), (35, 36), (36, 37),     # Atlanta–Dallas–Houston–Austin–SA
    (43, 44), (44, 47), (47, 48), (48, 51),     # SD–LA–SJ–SF–Sacramento
    (51, 52), (52, 53), (53, 54),               # Sac–Portland–Seattle–Vancouver
    (43, 40), (40, 39), (39, 34),               # SD–Phoenix–Vegas–Denver–Dallas path via
    (22, 31), (31, 34),                           # Chicago–StLouis–Dallas
    (7, 22), (3, 22),                             # DC/Chicago, NYC/Chicago trunks
    (58, 59), (59, 60), (60, 61),               # Mexico corridor
]


def load_mask() -> bytes:
    mask_path = ROOT / "shared/earth-land-mask.json"
    if mask_path.exists():
        j = json.loads(mask_path.read_text())
        global MASK_W, MASK_H, ROW_BYTES
        MASK_W, MASK_H, ROW_BYTES = j["width"], j["height"], j["rowBytes"]
        return base64.b64decode(j["data"])
    html = GLOBE_HTML.read_text()
    m = re.search(r'atob\("([A-Za-z0-9+/=]+)"\)', html)
    if not m:
        raise SystemExit("land mask not found")
    return base64.b64decode(m.group(1))


def is_land(mask: bytes, lon: float, lat: float) -> bool:
    x = int((lon + 180.0) / 360.0 * MASK_W) % MASK_W
    y = int((90.0 - lat) / 180.0 * MASK_H)
    if y < 0 or y >= MASK_H:
        return False
    byte = mask[y * ROW_BYTES + (x >> 3)]
    return bool((byte >> (7 - (x & 7))) & 1)


def ll_to_xyz(lat: float, lon: float, r: float = R) -> tuple[float, float, float]:
    φ = math.radians(lat)
    λ = math.radians(lon)
    c = math.cos(φ)
    return (r * c * math.cos(λ), r * math.sin(φ), r * c * math.sin(λ))


def xyz_to_ll(x: float, y: float, z: float) -> tuple[float, float]:
    r = math.sqrt(x * x + y * y + z * z) or 1.0
    lat = math.degrees(math.asin(max(-1.0, min(1.0, y / r))))
    lon = math.degrees(math.atan2(z, x))
    return lat, lon


def gaussian_on_sphere(lat0: float, lon0: float, sigma_deg: float) -> tuple[float, float]:
    """Small-angle Gaussian offset in local ENU, mapped back to lat/lon."""
    dlat = RNG.gauss(0, sigma_deg)
    dlon = RNG.gauss(0, sigma_deg / max(0.2, math.cos(math.radians(lat0))))
    return lat0 + dlat, lon0 + dlon


def slerp_xyz(a: tuple[float, float, float], b: tuple[float, float, float], t: float):
    ax, ay, az = a
    bx, by, bz = b
    dot = max(-1.0, min(1.0, ax * bx + ay * by + az * bz))
    ang = math.acos(dot)
    if ang < 1e-6:
        return a
    s = math.sin(ang)
    wa = math.sin((1 - t) * ang) / s
    wb = math.sin(t * ang) / s
    x, y, z = wa * ax + wb * bx, wa * ay + wb * by, wa * az + wb * bz
    n = math.sqrt(x * x + y * y + z * z) or 1.0
    return x / n, y / n, z / n


def fibonacci_sphere(n: int, r: float = 12.0):
    """Even star lattice on a far sphere (golden-angle spiral)."""
    pts = []
    golden = math.pi * (3 - math.sqrt(5))
    for i in range(n):
        y = 1 - (i / max(1, n - 1)) * 2
        rad = math.sqrt(max(0.0, 1 - y * y))
        θ = golden * i
        x = math.cos(θ) * rad
        z = math.sin(θ) * rad
        # Bias: keep more stars in the upper hemisphere of the frame
        # (space above the limb). Still full sphere coverage.
        bright = 0.25 + 0.75 * RNG.random()
        size = 0.55 + 1.35 * RNG.random() ** 2
        pts.append([x * r, y * r, z * r, round(bright, 4), round(size, 4)])
    return pts


def main():
    mask = load_mask()
    lights: list[list[float]] = []

    # --- Metro Gaussians -------------------------------------------------
    for lat0, lon0, weight in METROS:
        n = int(90 + weight * 110)
        # Core tight + halo wider
        for _ in range(n):
            sigma = 0.12 + (0.55 / math.sqrt(weight)) * (0.35 + RNG.random())
            if RNG.random() < 0.35:
                sigma *= 2.4  # suburban halo
            lat, lon = gaussian_on_sphere(lat0, lon0, sigma)
            if lat < -5 or lat > 72 or lon < -170 or lon > -50:
                continue
            if not is_land(mask, lon, lat):
                continue
            x, y, z = ll_to_xyz(lat, lon)
            # Intensity: brighter near metro core
            d = math.hypot(lat - lat0, (lon - lon0) * math.cos(math.radians(lat0)))
            inten = max(0.15, min(1.0, (weight / 18.0) * math.exp(-d * d / (2 * (sigma * 2.2) ** 2))))
            inten *= 0.55 + 0.45 * RNG.random()
            size = 0.7 + inten * 2.4 + RNG.random() * 0.6
            lights.append([round(x, 6), round(y, 6), round(z, 6), round(inten, 4), round(size, 4)])

    # --- Corridors (highway web) ----------------------------------------
    for ia, ib in CORRIDORS:
        a = ll_to_xyz(*METROS[ia][:2])
        b = ll_to_xyz(*METROS[ib][:2])
        segs = 48 + int(METROS[ia][2] + METROS[ib][2])
        for i in range(segs + 1):
            t = i / segs
            # densify near ends (cities) and keep a mid-road trickle
            density = 0.35 + 0.65 * (1 - abs(2 * t - 1))
            samples = 1 + int(3 * density)
            for _ in range(samples):
                tt = min(1.0, max(0.0, t + RNG.gauss(0, 0.01)))
                p = slerp_xyz(a, b, tt)
                # small perpendicular jitter in tangent plane
                # approximate via lat/lon noise
                lat, lon = xyz_to_ll(*p)
                lat += RNG.gauss(0, 0.08)
                lon += RNG.gauss(0, 0.08)
                if not is_land(mask, lon, lat):
                    continue
                x, y, z = ll_to_xyz(lat, lon)
                inten = 0.2 + 0.45 * density * RNG.random()
                size = 0.55 + 1.2 * inten
                lights.append([round(x, 6), round(y, 6), round(z, 6), round(inten, 4), round(size, 4)])

    # --- Sparse continental fill (rural glow) — NA bbox only ------------
    fill = 0
    guard = 0
    while fill < 14000 and guard < 800000:
        guard += 1
        u = RNG.uniform(-1, 1)
        th = RNG.uniform(0, 2 * math.pi)
        lat = math.degrees(math.asin(u))
        lon = math.degrees(th) - 180.0
        # North America window (plus Caribbean / northern SA limb)
        if not (5 <= lat <= 72 and -170 <= lon <= -50):
            continue
        if not is_land(mask, lon, lat):
            continue
        # Prefer mid-latitudes; thin the far north
        if lat > 60 and RNG.random() > 0.25:
            continue
        x, y, z = ll_to_xyz(lat, lon)
        inten = 0.08 + 0.18 * RNG.random()
        size = 0.45 + 0.9 * RNG.random()
        lights.append([round(x, 6), round(y, 6), round(z, 6), round(inten, 4), round(size, 4)])
        fill += 1

        stars = fibonacci_sphere(2200, r=14.0)

    # Camera framing: orbital view of North America — globe sits low in
    # frame, limb curves across, camera south of the continent looking N.
    # ECEF after Y-rotation so lon≈-95° faces camera, slight X tilt.
    data = {
        "version": 1,
        "method": (
            "metro Gaussians on sphere + great-circle corridors + NA land-mask "
            "fill; stars via Fibonacci lattice; 3D unit-sphere xyz"
        ),
        "radius": R,
        "lightCount": len(lights),
        "starCount": len(stars),
        "lights": lights,  # [x,y,z,intensity,size]
        "stars": stars,    # [x,y,z,brightness,size] on far sphere
        "camera": {
            "fov": 32,
            "position": [0.0, 0.55, 2.05],
            "lookAt": [0.0, -0.05, 0.0],
            "globeYaw": 3.05,
            "globePitch": 0.42,
            "globeRoll": -0.08,
            "globeOffsetY": -0.48,
        },
        "atmosphere": {
            "color": [0.35, 0.72, 1.0],
            "inner": 1.002,
            "outer": 1.045,
            "opacity": 0.72,
        },
    }

    OUT.write_text(json.dumps(data, separators=(",", ":")))
    print(f"wrote {OUT}")
    print(f"lights={len(lights)} stars={len(stars)} bytes={OUT.stat().st_size}")


if __name__ == "__main__":
    main()
