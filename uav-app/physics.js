export const RHO0 = 1.225;
export const MU0 = 1.81e-5;
export const G = 9.80665;
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export function isaAtmosphere(altitudeM) {
  const h = clamp(Number(altitudeM), 0, 11000);
  const t0 = 288.15,
    lapse = 0.0065,
    p0 = 101325,
    r = 287.05287;
  const t = t0 - lapse * h;
  const p = p0 * (t / t0) ** (G / (r * lapse));
  // Sutherland's law for dry air. Keeping viscosity consistent with ISA
  // temperature avoids increasingly biased Reynolds numbers at altitude.
  const mu = 1.716e-5 * (t / 273.15) ** 1.5 * (273.15 + 110.4) / (t + 110.4);
  return { temperature_k: t, pressure_pa: p, density_kg_m3: p / (r * t), dynamic_viscosity_pa_s: mu };
}
export const isaDensity = (altitudeM) => isaAtmosphere(altitudeM).density_kg_m3;
export const isaDynamicViscosity = (altitudeM) => isaAtmosphere(altitudeM).dynamic_viscosity_pa_s;

export function wingAreaForStall(
  massKg,
  stallMps,
  clmax = 1.4,
  rho = RHO0,
  margin = 1.12,
) {
  return (margin * 2 * massKg * G) / (rho * stallMps ** 2 * clmax);
}

export function wingGeometry(area, aspectRatio, taper = 0.55) {
  const span = Math.sqrt(Math.max(1e-9, aspectRatio * area));
  const root = (2 * area) / (span * (1 + taper));
  const tip = taper * root;
  const mac = ((2 / 3) * root * (1 + taper + taper ** 2)) / (1 + taper);
  return {
    area_m2: area,
    span_m: span,
    mean_chord_m: area / span,
    root_chord_m: root,
    tip_chord_m: tip,
    mac_m: mac,
    taper,
    aspect_ratio: aspectRatio,
  };
}

export const reynolds = (v, chord, rho = RHO0, mu = MU0) =>
  (rho * v * chord) / mu;

export function fixedwingAero(
  massKg,
  geom,
  cruiseMps,
  cd0 = 0.035,
  e = 0.8,
  rho = RHO0,
  mu = MU0,
) {
  const q = 0.5 * rho * cruiseMps ** 2,
    w = massKg * G;
  const cl = w / (q * geom.area_m2),
    k = 1 / (Math.PI * e * geom.aspect_ratio);
  const cd = cd0 + k * cl ** 2,
    drag = q * geom.area_m2 * cd;
  return {
    q_pa: q,
    cl_cruise: cl,
    cd_cruise: cd,
    cd0,
    k,
    drag_n: drag,
    ld: cl / cd,
    re_mac: reynolds(cruiseMps, geom.mac_m, rho, mu),
  };
}

export function fixedwingCharacteristicSpeeds(
  massKg,
  area,
  cd0,
  k,
  rho = RHO0,
) {
  if (Math.min(massKg, area, cd0, k, rho) <= 0)
    throw new Error("Parâmetros aerodinâmicos devem ser positivos.");
  const w = massKg * G,
    clRange = Math.sqrt(cd0 / k),
    clEndurance = Math.sqrt((3 * cd0) / k);
  const speed = (cl) => Math.sqrt((2 * w) / (rho * area * cl));
  return {
    cl_max_ld: clRange,
    cl_min_power: clEndurance,
    speed_max_ld_mps: speed(clRange),
    speed_min_power_mps: speed(clEndurance),
    ld_max: clRange / (cd0 + k * clRange ** 2),
  };
}

export const turnRadius = (v, bankDeg) =>
  v ** 2 / (G * Math.tan((Math.max(1, bankDeg) * Math.PI) / 180));
export function outAndBackRadiusM(trueAirspeedMps, windMps, enduranceSeconds) {
  if (
    trueAirspeedMps <= 0 ||
    enduranceSeconds <= 0 ||
    windMps < 0 ||
    windMps >= trueAirspeedMps
  )
    return 0;
  // Equal outbound and return distances: t = R/(V-w) + R/(V+w).
  return (
    (enduranceSeconds * (trueAirspeedMps ** 2 - windMps ** 2)) /
    (2 * trueAirspeedMps)
  );
}
export const fsplDb = (km, mhz) =>
  km > 0 && mhz > 0 ? 32.44 + 20 * Math.log10(km) + 20 * Math.log10(mhz) : 0;
export function linkMarginDb(
  tx,
  txGain,
  rxGain,
  km,
  mhz,
  sensitivity,
  loss = 4,
) {
  const fspl = fsplDb(km, mhz),
    received = tx + txGain + rxGain - fspl - loss;
  return {
    fspl_db: fspl,
    received_dbm: received,
    margin_db: received - sensitivity,
  };
}
export function fresnelRadiusM(km, mhz, fraction = 0.5) {
  if (km <= 0 || mhz <= 0 || fraction <= 0 || fraction >= 1) return 0;
  const wavelength = 299792458 / (mhz * 1e6),
    total = km * 1000,
    d1 = total * fraction;
  return Math.sqrt((wavelength * d1 * (total - d1)) / total);
}
export function diskLoading(massKg, propIn, rotors) {
  const d = propIn * 0.0254;
  return (massKg * G) / (rotors * Math.PI * (d / 2) ** 2);
}
export function multirotorHoverPower(
  massKg,
  propIn,
  rotors,
  merit = 0.65,
  efficiency = 0.9,
  rho = RHO0,
) {
  if (Math.min(massKg, propIn, rotors, rho) <= 0)
    throw new Error("Parâmetros de hover devem ser positivos.");
  const d = propIn * 0.0254,
    area = rotors * Math.PI * (d / 2) ** 2,
    thrust = massKg * G;
  return (
    thrust ** 1.5 /
    Math.sqrt(2 * rho * area) /
    Math.max(0.25, merit * efficiency)
  );
}

export function multirotorForwardPower(
  hoverElectricalPowerW,
  speedMps,
  flatPlateAreaM2,
  rho = RHO0,
  cruiseInducedFactor = 0.85,
  propulsiveEfficiency = 0.75,
) {
  if (Math.min(hoverElectricalPowerW, flatPlateAreaM2, rho) <= 0 || speedMps < 0)
    throw new Error("Parâmetros de voo horizontal devem ser positivos.");
  if (speedMps === 0) return hoverElectricalPowerW;
  const inducedAndProfile = hoverElectricalPowerW * cruiseInducedFactor;
  const parasitePower = 0.5 * rho * flatPlateAreaM2 * speedMps ** 3 /
    Math.max(0.35, propulsiveEfficiency);
  return inducedAndProfile + parasitePower;
}

// Approximation from the preliminary-design treatment used in the supplied
// UAS design reference. It is a screening load increment, not a certified
// discrete-gust or aeroelastic analysis.
export function gustResponse(
  rho,
  speedMps,
  wingLoadingKgM2,
  aspectRatio,
  gustMps = 5,
  liftCurveSlope = 5.73,
) {
  if (Math.min(rho, speedMps, wingLoadingKgM2, aspectRatio) <= 0 || gustMps < 0)
    throw new Error("Parâmetros de rajada fora do domínio.");
  const finiteWingFactor = aspectRatio / (aspectRatio + 2.4);
  const accelerationMps2 =
    (0.5 * rho * liftCurveSlope) * finiteWingFactor *
    (speedMps / wingLoadingKgM2) * gustMps;
  return {
    gust_velocity_mps: gustMps,
    finite_wing_factor: finiteWingFactor,
    vertical_acceleration_mps2: accelerationMps2,
    delta_load_factor: accelerationMps2 / G,
    positive_load_factor: 1 + accelerationMps2 / G,
  };
}

export function controlSurfaceTorque({
  rho = RHO0,
  speedMps,
  wingAreaM2,
  macM,
  controlAreaFraction = 0.12,
  controlChordFraction = 0.25,
  hingeMomentCoefficient = 0.05,
  servoCount = 2,
  safetyFactor = 2,
}) {
  if (Math.min(rho, speedMps, wingAreaM2, macM, servoCount) <= 0)
    throw new Error("Parâmetros de atuação fora do domínio.");
  const q = 0.5 * rho * speedMps ** 2;
  const totalControlArea = wingAreaM2 * controlAreaFraction;
  const controlChord = macM * controlChordFraction;
  const hingeMomentNm =
    q * (totalControlArea / servoCount) * controlChord *
    hingeMomentCoefficient * safetyFactor;
  return {
    design_speed_mps: speedMps,
    dynamic_pressure_pa: q,
    total_control_area_m2: totalControlArea,
    assumed_hinge_moment_coefficient: hingeMomentCoefficient,
    safety_factor: safetyFactor,
    required_torque_nm_per_servo: hingeMomentNm,
    required_torque_kgcm_per_servo: hingeMomentNm * 10.19716213,
  };
}

export function remoteSensingGeometry({
  aglM,
  sensorWidthMm,
  sensorHeightMm,
  focalLengthMm,
  imageWidthPx,
  imageHeightPx,
  speedMps,
  exposureTimeMs,
  frontOverlapPct,
  sideOverlapPct,
}) {
  if (
    Math.min(
      aglM,
      sensorWidthMm,
      sensorHeightMm,
      focalLengthMm,
      imageWidthPx,
      imageHeightPx,
      speedMps,
      exposureTimeMs,
    ) <= 0
  )
    throw new Error("Parâmetros de fotogrametria devem ser positivos.");
  if (
    frontOverlapPct < 0 || frontOverlapPct >= 100 ||
    sideOverlapPct < 0 || sideOverlapPct >= 100
  )
    throw new Error("Sobreposição deve ficar entre 0 e menos de 100%.");
  const footprintWidthM = (aglM * sensorWidthMm) / focalLengthMm;
  const footprintHeightM = (aglM * sensorHeightMm) / focalLengthMm;
  const gsdWidthCmPx = (footprintWidthM * 100) / imageWidthPx;
  const gsdHeightCmPx = (footprintHeightM * 100) / imageHeightPx;
  const alongTrackSpacingM = footprintHeightM * (1 - frontOverlapPct / 100);
  const lineSpacingM = footprintWidthM * (1 - sideOverlapPct / 100);
  const photoIntervalS = alongTrackSpacingM / speedMps;
  const blurDistanceM = speedMps * exposureTimeMs / 1000;
  const meanGsdM = ((gsdWidthCmPx + gsdHeightCmPx) / 2) / 100;
  return {
    altitude_agl_m: aglM,
    footprint_width_m: footprintWidthM,
    footprint_height_m: footprintHeightM,
    gsd_width_cm_px: gsdWidthCmPx,
    gsd_height_cm_px: gsdHeightCmPx,
    mean_gsd_cm_px: (gsdWidthCmPx + gsdHeightCmPx) / 2,
    line_spacing_m: lineSpacingM,
    along_track_spacing_m: alongTrackSpacingM,
    photo_interval_s: photoIntervalS,
    trigger_rate_hz: 1 / photoIntervalS,
    motion_blur_cm: blurDistanceM * 100,
    motion_blur_px: blurDistanceM / meanGsdM,
    nominal_photos_per_km2:
      1e6 / Math.max(1e-9, lineSpacingM * alongTrackSpacingM),
  };
}
