export const CATALOG_SCHEMA_VERSION = "3.0";

export const CATEGORY_SCHEMA = {
  battery: [
    "cells",
    "voltage_v",
    "capacity_ah",
    "c_rating",
    "weight_g",
    "chemistry",
  ],
  motor: [
    "application",
    "min_cells",
    "max_cells",
    "max_power_w",
    "max_thrust_g",
    "peak_current_a",
    "weight_g",
  ],
  esc: ["min_cells", "max_cells", "continuous_a", "burst_a", "weight_g"],
  propeller: ["diameter_in", "pitch_in", "rotation", "material", "weight_g"],
  servo: ["torque_kgcm", "voltage_min_v", "voltage_max_v", "weight_g"],
  flight_controller: [
    "wing_friendly",
    "multirotor_friendly",
    "robustness_score",
    "weight_g",
  ],
  gnss: ["precision_cm", "update_rate_hz", "rtk", "weight_g"],
  telemetry: ["band_mhz", "throughput_mbps", "range_class_km", "weight_g"],
  antenna: [
    "band_mhz",
    "gain_dbi",
    "polarization",
    "connector_family",
    "weight_g",
  ],
  power_module: [
    "max_cells",
    "continuous_a",
    "measurement_accuracy_pct",
    "weight_g",
  ],
  power_distribution: ["voltage_v", "current_a", "branch_count"],
  dc_dc: ["input_max_v", "output_v", "power_w", "efficiency"],
  bec: ["input_max_v", "output_v", "current_a"],
  wire: [
    "awg",
    "insulation",
    "current_class_a",
    "conductor_material",
    "temperature_max_c",
  ],
  cable: ["cable_type", "conductors", "length_m", "shielded"],
  connector: [
    "connector_family",
    "poles",
    "continuous_a",
    "voltage_rating_v",
    "locking",
  ],
  circuit_protection: ["rating_a", "voltage_rating_v", "protection_type"],
  structural_material: [
    "material_family",
    "thickness_mm",
    "density_kg_m3",
    "elastic_modulus_gpa",
  ],
  structural_profile: [
    "profile_type",
    "material_family",
    "outer_mm",
    "wall_mm",
    "length_m",
    "mass_g",
  ],
  fastener: ["thread_mm", "fastener_type", "material", "strength_class"],
  bearing: ["bearing_type", "bore_mm", "outer_mm", "static_load_n"],
  adhesive: ["adhesive_type", "size_g", "service_temperature_c", "cure_family"],
  remote_id: ["region_profile", "interface", "weight_g", "input_voltage_v"],
  transponder: [
    "surveillance_type",
    "frequency_mhz",
    "interface",
    "weight_g",
    "power_w",
  ],
  gimbal: ["axes", "payload_capacity_kg", "input_voltage_v", "weight_g"],
  payload_interface: [
    "interface_type",
    "voltage_v",
    "power_w",
    "data_rate_mbps",
  ],
  data_storage: [
    "storage_type",
    "capacity_gb",
    "write_speed_mb_s",
    "interface",
  ],
  switching: [
    "switch_type",
    "voltage_rating_v",
    "continuous_a",
    "remote_control",
  ],
  emi_filter: [
    "filter_type",
    "voltage_rating_v",
    "current_a",
    "attenuation_class_db",
  ],
  charger: ["chemistry", "max_cells", "charge_power_w", "channels"],
  test_equipment: [
    "equipment_type",
    "measurement_domain",
    "range_class",
    "calibration_required",
  ],
};

export function auditCatalog(data) {
  const ids = new Set(),
    issues = [],
    categoryQuality = {};
  for (const part of data.parts ?? []) {
    if (!part.id || ids.has(part.id))
      issues.push({
        id: part.id ?? "(sem id)",
        severity: "ERROR",
        issue: "ID ausente ou duplicado",
      });
    ids.add(part.id);
    for (const field of [
      "name",
      "category",
      "system",
      "summary",
      "record_type",
      "validation_status",
      "applicability",
    ])
      if (part[field] == null || part[field] === "")
        issues.push({
          id: part.id,
          severity: "ERROR",
          issue: `campo obrigatório ausente: ${field}`,
        });
    const required = CATEGORY_SCHEMA[part.category] ?? [];
    const missing = required.filter(
      (field) => part[field] == null || part[field] === "",
    );
    const score = required.length
      ? Math.round((100 * (required.length - missing.length)) / required.length)
      : 100;
    const stats = (categoryQuality[part.category] ??= {
      count: 0,
      complete: 0,
      score_sum: 0,
    });
    stats.count++;
    stats.score_sum += score;
    if (!missing.length) stats.complete++;
    if (missing.length)
      issues.push({
        id: part.id,
        severity: part.validation_status === "reference" ? "REVIEW" : "ERROR",
        issue: `especificações ausentes: ${missing.join(", ")}`,
      });
    if (part.validation_status === "reference" && !part.source_url)
      issues.push({
        id: part.id,
        severity: "REVIEW",
        issue: "referência sem URL de fonte",
      });
  }
  const categories = Object.fromEntries(
    Object.entries(categoryQuality).map(([id, s]) => [
      id,
      {
        count: s.count,
        complete: s.complete,
        completeness_pct: Math.round(s.score_sum / s.count),
      },
    ]),
  );
  return {
    schema_version: CATALOG_SCHEMA_VERSION,
    total_parts: data.parts?.length ?? 0,
    error_count: issues.filter((x) => x.severity === "ERROR").length,
    review_count: issues.filter((x) => x.severity === "REVIEW").length,
    categories,
    issues,
  };
}
