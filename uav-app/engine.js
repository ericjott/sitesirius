import { PartsCatalog } from "./catalog.js";
import * as p from "./physics.js";
import { airfoilAdvisor } from "./airfoils.js";

export const DEFAULTS = {
  project_name: "Novo Projeto",
  mission_type: "Mapeamento / fotogrametria",
  preferred_architecture: "Automático",
  fixed_wing_layout: "Automático",
  rotor_layout: "Automático",
  vtol_layout: "Lift+cruise",
  payload_mass_kg: 0.5,
  payload_power_w: 8,
  payload_data_mbps: 8,
  target_endurance_min: 60,
  mission_range_km: 20,
  corridor_length_km: 0,
  area_km2: 5,
  cruise_speed_kmh: 70,
  stall_speed_mps: 12,
  altitude_m: 120,
  mission_agl_m: 120,
  max_wind_mps: 8,
  hover_required: false,
  runway_available: false,
  launch_area_m: 20,
  precision_cm: 200,
  redundancy: "Normal",
  max_mtow_kg: 25,
  radio_frequency_mhz: 915,
  reserve_fraction: 0.25,
  preferred_airfoil: "Automático",
  sensor_width_mm: 13.2,
  sensor_height_mm: 8.8,
  image_width_px: 5472,
  image_height_px: 3648,
  focal_length_mm: 8.8,
  exposure_time_ms: 1,
  front_overlap_pct: 80,
  side_overlap_pct: 70,
  tx_power_dbm: 27,
  tx_gain_dbi: 2,
  rx_gain_dbi: 6,
  receiver_sensitivity_dbm: -100,
  link_losses_db: 6,
};
const ROUND = (v, n = 3) => (typeof v === "number" ? Number(v.toFixed(n)) : v);
const rounded = (obj) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, ROUND(v)]));
const PAYLOADS = {
  "Mapeamento / fotogrametria": [
    "Câmera RGB de mapeamento",
    "nadir, trigger e geotag; definir GSD, overlap e motion blur",
  ],
  "Agricultura multispectral": [
    "Câmera multiespectral",
    "bandas calibradas, irradiance sensor e georreferenciamento",
  ],
  "Inspeção de infraestrutura": [
    "RGB/zoom ou térmica",
    "gimbal/LOS estabilizada e baixa latência",
  ],
  "Monitoramento ambiental": [
    "Sensor ambiental / câmera",
    "registro temporal/geográfico e calibração",
  ],
  "Corredor / linha de transmissão": [
    "RGB/zoom ou LiDAR",
    "eficiência em percurso linear; hover apenas quando necessário",
  ],
  "Busca e salvamento": [
    "RGB + térmica",
    "baixa latência, hover e consciência situacional",
  ],
  "Comunicação / relay": [
    "Rádio/relay",
    "cobertura, energia e disponibilidade do enlace",
  ],
  "Pesquisa / plataforma experimental": [
    "Payload experimental",
    "modularidade, logs e interfaces documentadas",
  ],
};
const WING_LAYOUTS = {
  Convencional: {
    ar: 9,
    cd0: 0.038,
    e: 0.8,
    clmax: 1.4,
    tail: "aft-tail",
    stability: "CG inicial 25-30% MAC; margem estática 8-12%",
    note: "Boa faixa de CG e integração previsível.",
  },
  "Twin-boom": {
    ar: 10,
    cd0: 0.04,
    e: 0.8,
    clmax: 1.45,
    tail: "twin-boom aft-tail",
    stability: "CG inicial 25-30% MAC; verificar rigidez torcional dos booms",
    note: "Favorece propulsor traseiro e payload frontal.",
  },
  Canard: {
    ar: 8.5,
    cd0: 0.037,
    e: 0.78,
    clmax: 1.5,
    tail: "foreplane",
    stability:
      "CG à frente do ponto neutro; margem 5-10% e stall do canard antes da asa",
    note: "Menor trim drag potencial, porém faixa de CG e acoplamento mais críticos.",
  },
  "Asa voadora": {
    ar: 11,
    cd0: 0.032,
    e: 0.76,
    clmax: 1.25,
    tail: "tailless/elevons",
    stability: "CG inicial 15-22% MAC; perfil reflex e derivadas obrigatórias",
    note: "Baixo arrasto parasita e volume útil; estabilidade e controle exigem validação específica.",
  },
  Delta: {
    ar: 4,
    cd0: 0.045,
    e: 0.7,
    clmax: 1.35,
    tail: "tailless delta/elevons",
    stability: "CG inicial 18-25% MAC; validar vortex lift e baixa velocidade",
    note: "Compacta e robusta, com maior arrasto induzido em baixa velocidade.",
  },
  Tandem: {
    ar: 8,
    cd0: 0.041,
    e: 0.76,
    clmax: 1.45,
    tail: "tandem lifting surfaces",
    stability:
      "distribuição de carga e decalage entre asas; margem por análise completa",
    note: "Duas superfícies sustentadoras; forte acoplamento longitudinal.",
  },
};
const ROTOR_LAYOUTS = {
  "Tricóptero 3": {
    count: 3,
    efficiency: 0.96,
    redundancy: "baixa",
    control: "servo de yaw",
  },
  "Quad X 4": {
    count: 4,
    efficiency: 1,
    redundancy: "baixa",
    control: "diferencial de torque",
  },
  "Hexa X 6": {
    count: 6,
    efficiency: 0.98,
    redundancy: "média",
    control: "diferencial de torque",
  },
  "Octo X 8": {
    count: 8,
    efficiency: 0.97,
    redundancy: "alta",
    control: "diferencial de torque",
  },
  "Y6 coaxial 6": {
    count: 6,
    efficiency: 0.86,
    redundancy: "média",
    control: "coaxial contrarrotativo",
    coaxial: true,
  },
  "X8 coaxial 8": {
    count: 8,
    efficiency: 0.84,
    redundancy: "alta",
    control: "coaxial contrarrotativo",
    coaxial: true,
  },
  "Coaxial 2": {
    count: 2,
    efficiency: 0.78,
    redundancy: "baixa",
    control: "swashplate/vanes",
    coaxial: true,
  },
};

export class DesignEngine {
  constructor(catalog = new PartsCatalog()) {
    this.catalog = catalog;
  }
  validate(input) {
    const r = { ...DEFAULTS, ...input };
    for (const k of [
      "payload_mass_kg",
      "target_endurance_min",
      "mission_range_km",
      "cruise_speed_kmh",
      "max_mtow_kg",
      "radio_frequency_mhz",
      "stall_speed_mps",
      "mission_agl_m",
      "sensor_width_mm",
      "sensor_height_mm",
      "image_width_px",
      "image_height_px",
      "focal_length_mm",
      "exposure_time_ms",
    ])
      if (!(Number(r[k]) > 0)) throw new Error(`${k} deve ser maior que zero.`);
    for (const k of [
      "payload_power_w",
      "payload_data_mbps",
      "corridor_length_km",
      "area_km2",
      "altitude_m",
      "max_wind_mps",
      "launch_area_m",
      "precision_cm",
      "tx_gain_dbi",
      "rx_gain_dbi",
      "link_losses_db",
    ])
      if (Number(r[k]) < 0) throw new Error(`${k} não pode ser negativo.`);
    if (r.reserve_fraction < 0.1 || r.reserve_fraction > 0.5)
      throw new Error("reserve_fraction deve ficar entre 0,10 e 0,50.");
    if (!Number.isFinite(Number(r.tx_power_dbm)) || r.tx_power_dbm < -20 || r.tx_power_dbm > 50)
      throw new Error("tx_power_dbm deve ficar entre -20 e 50 dBm.");
    if (
      !Number.isFinite(Number(r.receiver_sensitivity_dbm)) ||
      r.receiver_sensitivity_dbm < -150 ||
      r.receiver_sensitivity_dbm > -40
    )
      throw new Error("receiver_sensitivity_dbm deve ficar entre -150 e -40 dBm.");
    if (r.altitude_m > 6000)
      throw new Error("Altitude excede o domínio conceitual de 6000 m.");
    if (r.cruise_speed_kmh > 300)
      throw new Error("Velocidade excede o domínio subsônico de 300 km/h.");
    if (
      r.preferred_architecture !== "Multirrotor" &&
      r.cruise_speed_kmh / 3.6 < r.stall_speed_mps * 1.2
    )
      throw new Error("Cruzeiro deve ser pelo menos 1,20 vezes a velocidade de estol requerida.");
    if (
      r.front_overlap_pct < 0 ||
      r.front_overlap_pct >= 100 ||
      r.side_overlap_pct < 0 ||
      r.side_overlap_pct >= 100
    )
      throw new Error("Sobreposições devem ficar entre 0 e menos de 100%.");
    return r;
  }
  design(input = {}) {
    const r = this.validate(input),
      scores = this.architectureScores(r),
      arch =
        r.preferred_architecture !== "Automático"
          ? r.preferred_architecture
          : Object.keys(scores).reduce((a, b) =>
              scores[a] >= scores[b] ? a : b,
            );
    const d =
      arch === "Asa fixa"
        ? this.fixedWing(r)
        : arch === "Multirrotor"
          ? this.multirotor(r)
          : this.vtolAdvanced(r);
    if (!Number.isFinite(d.mass.mtow_est_kg)) {
      d.mass.iteration_converged = false;
      d.model_domain_exceeded = true;
    }
    Object.assign(d, {
      project_name: r.project_name,
      mission: r,
      architecture_scores: scores,
      architecture: arch,
      payload_recommendation: this.payload(r),
    });
    this.reconcileEngineering(r, d);
    d.bom = d.bom.map((item) => ({
      system:
        item.system ??
        (item.item?.includes("Hélice")
          ? "Propulsão"
          : item.item?.includes("Estrutura")
            ? "Estrutura"
            : "Integração"),
      category:
        item.category ??
        (item.item?.includes("Hélice")
          ? "propeller"
          : item.item?.includes("Estrutura")
            ? "structural_material"
            : "integration_item"),
      ...item,
    }));
    d.communications = this.communications(r);
    d.remote_sensing = this.remoteSensing(r, d);
    d.catalog_compatibility = this.catalogCompatibility(r, d);
    d.reliability = this.reliability(r, arch);
    d.conops = this.conops(r, d);
    d.requirements_matrix = this.requirements(r, d);
    d.engineering_assurance = this.assurance();
    d.source_library = this.sources();
    d.warnings = this.warnings(r, d);
    d.verification = this.verification(r, d);
    d.methodology_notes = this.methodology();
    d.design_confidence =
      "Conceitual / pré-dimensionamento - requer análise, bancada, simulação e ensaio antes de voo.";
    return d;
  }
  architectureScores(r) {
    const s = { "Asa fixa": 50, Multirrotor: 50, "VTOL lift+cruise": 50 };
    if (r.target_endurance_min >= 60) {
      s["Asa fixa"] += 20;
      s["VTOL lift+cruise"] += 12;
      s.Multirrotor -= 18;
    }
    if (r.mission_range_km >= 15 || r.corridor_length_km >= 20) {
      s["Asa fixa"] += 25;
      s["VTOL lift+cruise"] += 18;
      s.Multirrotor -= 22;
    }
    if (r.hover_required) {
      s.Multirrotor += 35;
      s["VTOL lift+cruise"] += 30;
      s["Asa fixa"] -= 45;
    }
    if (!r.runway_available && r.launch_area_m < 30) {
      s.Multirrotor += 18;
      s["VTOL lift+cruise"] += 22;
      s["Asa fixa"] -= 10;
    }
    if (
      [
        "Mapeamento / fotogrametria",
        "Corredor / linha de transmissão",
      ].includes(r.mission_type)
    ) {
      s["Asa fixa"] += 15;
      s["VTOL lift+cruise"] += 10;
    }
    if (
      ["Inspeção de infraestrutura", "Busca e salvamento"].includes(
        r.mission_type,
      )
    ) {
      s.Multirrotor += 18;
      s["VTOL lift+cruise"] += 12;
    }
    if (r.max_wind_mps >= 10) {
      s["Asa fixa"] += 6;
      s["VTOL lift+cruise"] += 4;
    }
    return Object.fromEntries(
      Object.entries(s).map(([k, v]) => [k, p.clamp(v, 0, 100)]),
    );
  }
  wingLayout(r) {
    if (
      r.fixed_wing_layout !== "Automático" &&
      WING_LAYOUTS[r.fixed_wing_layout]
    )
      return r.fixed_wing_layout;
    if (r.runway_available === false && r.launch_area_m < 15)
      return "Asa voadora";
    if (r.mission_type === "Inspeção de infraestrutura") return "Twin-boom";
    if (r.target_endurance_min >= 120) return "Asa voadora";
    return "Convencional";
  }
  rotorLayout(r) {
    if (r.rotor_layout !== "Automático" && ROTOR_LAYOUTS[r.rotor_layout])
      return r.rotor_layout;
    if (r.redundancy === "Alta" && r.payload_mass_kg > 2) return "Octo X 8";
    if (r.redundancy === "Alta" || r.payload_mass_kg > 1.5) return "Hexa X 6";
    return "Quad X 4";
  }
  reconcileEngineering(r, d) {
    const battery = d.electrical?.battery,
      usable = Number(battery?.usable_energy_wh) || 0,
      dispatchable = usable * (1 - r.reserve_fraction);
    let missionPower = 0;
    if (d.architecture === "Asa fixa")
      missionPower =
        d.performance.cruise_electrical_power_w ||
        d.analysis_data?.power_curve?.reduce((best, x) =>
          Math.abs(x.speed_mps - d.performance.cruise_mps) <
          Math.abs(best.speed_mps - d.performance.cruise_mps)
            ? x
            : best,
        )?.power_w ||
        0;
    else if (d.architecture === "Multirrotor")
      missionPower =
        d.performance.forward_flight_power_w ||
        d.performance.hover_power_w ||
        0;
    else
      missionPower =
        d.performance.cruise_electrical_power_w ||
        d.performance.max_electrical_power_w / 2.1 ||
        0;
    const nonCruiseWh = d.performance.non_cruise_energy_wh || 0,
      nonCruiseMinutes = d.performance.non_cruise_duration_min || 0,
      availableMissionWh = Math.max(0, dispatchable - nonCruiseWh),
      achieved = missionPower > 0
        ? nonCruiseMinutes + (availableMissionWh / missionPower) * 60
        : 0;
    d.performance.mission_power_w = ROUND(missionPower);
    d.performance.achieved_endurance_min = ROUND(achieved, 1);
    d.performance.endurance_energy_margin_pct =
      r.target_endurance_min > 0
        ? ROUND((achieved / r.target_endurance_min - 1) * 100, 1)
        : 0;
    if (d.performance.cruise_mps) {
      const rangeEnduranceMin = Math.max(0, achieved - nonCruiseMinutes);
      d.performance.still_air_range_km = ROUND(
        (d.performance.cruise_mps * rangeEnduranceMin * 60) / 1000,
        1,
      );
      d.performance.wind_limited_out_and_back_range_km = ROUND(
        p.outAndBackRadiusM(d.performance.cruise_mps, r.max_wind_mps, rangeEnduranceMin * 60) / 1000,
        1,
      );
    }
    if (d.architecture === "Multirrotor") {
      const empty = Math.max(0, d.mass.mtow_est_kg - r.payload_mass_kg),
        n = d.configuration.rotor_count,
        prop = d.geometry.prop_diameter_in,
        rho = d.performance.air_density_kg_m3;
      d.analysis_data.endurance_curve = [
        0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 1,
      ].map((f) => {
        const mass = empty + r.payload_mass_kg * f,
          hoverPower =
            p.multirotorHoverPower(
              mass,
              prop,
              n,
              0.65 * d.configuration.rotor_efficiency_factor,
              0.9,
              rho,
            ) +
            r.payload_power_w +
            18,
          flatPlateArea = 0.045 * mass ** (2 / 3),
          power = p.multirotorForwardPower(
            hoverPower,
            d.performance.cruise_mps,
            flatPlateArea,
            rho,
          );
        return {
          payload_factor: f,
          endurance_min: ROUND((dispatchable / power) * 60, 1),
        };
      });
    }
    const weight = d.mass.mtow_est_kg * p.G,
      limitN = 3.8,
      ultimateN = 5.7;
    d.structural_precheck = {
      status: "PRELIMINARY",
      limit_load_factor: limitN,
      ultimate_load_factor: ultimateN,
      limit_load_n: ROUND(weight * limitN, 1),
      ultimate_load_n: ROUND(weight * ultimateN, 1),
      root_bending_moment_est_nm: d.geometry?.span_m
        ? ROUND((weight * limitN * d.geometry.span_m) / 8, 1)
        : null,
      note: "Caso global preliminar; não substitui distribuição de cargas, tensões, flambagem, fadiga, vibração, flutter ou ensaio.",
    };
    d.energy_balance = {
      usable_pack_wh: ROUND(usable, 1),
      dispatchable_energy_after_reserve_wh: ROUND(dispatchable, 1),
      reserve_policy_fraction: r.reserve_fraction,
      mission_power_w: ROUND(missionPower, 1),
      non_cruise_allowance_wh: ROUND(nonCruiseWh, 1),
      non_cruise_duration_min: ROUND(nonCruiseMinutes, 1),
      achieved_endurance_min: ROUND(achieved, 1),
      target_endurance_min: r.target_endurance_min,
      status:
        !d.mass.constraint_limited &&
        d.mass.iteration_converged &&
        achieved + 0.05 >= r.target_endurance_min
          ? "PASS"
          : "FAIL",
    };
    const uncertainty = d.architecture === "VTOL lift+cruise" ? [0.75, 1.3] : [0.8, 1.25];
    d.mass.estimate_low_kg = ROUND(d.mass.mtow_est_kg * uncertainty[0], 2);
    d.mass.estimate_high_kg = ROUND(d.mass.mtow_est_kg * uncertainty[1], 2);
    d.mass.model_confidence = "LOW - correlação conceitual não calibrada com histórico de aeronaves Sirius";
    d.propulsion_validation = {
      status: "REQUIRES_TEST",
      motor_propeller_map_available: false,
      note: "Seleção por limites de potência/empuxo, tensão e diâmetro. Fechar RPM, torque, corrente, CT/CP e eficiência com mapa do fabricante ou thrust stand.",
    };
  }
  catalogCompatibility(r, d) {
    const archKey =
      d.architecture === "Asa fixa"
        ? "fixed-wing"
        : d.architecture === "Multirrotor"
          ? "multirotor"
          : "vtol";
    const battery = d.electrical?.battery?.part,
      cells = battery?.cells ?? 6,
      voltage = battery?.voltage_v ?? cells * 3.7;
    const totalPower =
      d.performance.max_electrical_power_w ??
      d.performance.max_power_est_w ??
      d.performance.hover_power_w ??
      300;
    const mainCurrent = totalPower / Math.max(1, voltage),
      rotorCount =
        d.configuration.rotor_count ?? d.configuration.rotor_count_lift ?? 1;
    const branchPower =
      d.architecture === "Asa fixa" ? totalPower : totalPower / rotorCount;
    const selectedIds = new Set(
      [
        ...Object.values(d.selected_components ?? {}),
        battery,
        ...(d.bom ?? []).map((x) => (x.part_id ? { id: x.part_id } : null)),
      ]
        .filter(Boolean)
        .map((x) => x.id),
    );
    const assess = (x) => {
      const reasons = [];
      if (x.applicability?.length && !x.applicability.includes(archKey))
        reasons.push("arquitetura incompatível");
      if (x.category === "battery" && x.cells != null && x.cells !== cells)
        reasons.push(`tensão ${x.cells}S diferente do barramento ${cells}S`);
      if (x.category === "motor") {
        const allowed =
          archKey === "fixed-wing"
            ? ["fixed-wing", "both"]
            : archKey === "multirotor"
              ? ["multirotor", "both"]
              : ["fixed-wing", "multirotor", "both"];
        if (!allowed.includes(x.application))
          reasons.push("aplicação do motor incompatível");
        if ((x.min_cells ?? 0) > cells || (x.max_cells ?? Infinity) < cells)
          reasons.push("faixa de células incompatível");
        if (
          archKey === "fixed-wing" &&
          (x.max_power_w ?? 0) < branchPower * 1.1
        )
          reasons.push("potência insuficiente");
        if (
          archKey === "multirotor" &&
          (x.max_thrust_g ?? 0) <
            (d.performance.required_max_thrust_per_motor_g ??
              d.performance.lift_thrust_per_motor_g ??
              Infinity)
        )
          reasons.push("empuxo insuficiente");
        if (archKey === "vtol") {
          const liftOk =
            ["multirotor", "both"].includes(x.application) &&
            (x.max_thrust_g ?? 0) >=
              (d.performance.lift_thrust_per_motor_g ?? Infinity);
          const cruiseOk =
            ["fixed-wing", "both"].includes(x.application) &&
            (x.max_power_w ?? 0) >=
              (d.performance.cruise_electrical_power_w ?? Infinity) * 1.1;
          if (!liftOk && !cruiseOk)
            reasons.push(
              "não atende ao motor de sustentação nem ao de cruzeiro",
            );
        }
      }
      if (
        x.category === "esc" &&
        ((x.min_cells ?? 0) > cells ||
          (x.max_cells ?? Infinity) < cells ||
          (x.continuous_a ?? 0) < (branchPower / voltage) * 1.2)
      )
        reasons.push("tensão ou corrente insuficiente");
      if (x.category === "propeller") {
        const targets = [
          d.geometry.prop_diameter_in,
          d.geometry.cruise_prop_diameter_in,
        ].filter((v) => v != null);
        if (
          targets.length &&
          !targets.some((target) => Math.abs((x.diameter_in ?? -99) - target) <= 1)
        )
          reasons.push("diâmetro fora da configuração");
      }
      if (
        x.category === "servo" &&
        archKey === "multirotor" &&
        !String(d.configuration.yaw_control ?? "").includes("servo")
      )
        reasons.push("atuador não requerido pela configuração");
      if (x.category === "gnss" && r.precision_cm <= 20 && !x.rtk)
        reasons.push("precisão solicitada requer RTK");
      if (
        x.category === "telemetry" &&
        ((x.band_mhz != null &&
          Math.abs(x.band_mhz - r.radio_frequency_mhz) > 70) ||
          (x.range_class_km != null && x.range_class_km < r.mission_range_km))
      )
        reasons.push("banda ou alcance incompatível");
      if (
        x.category === "antenna" &&
        x.band_mhz != null &&
        Math.abs(x.band_mhz - r.radio_frequency_mhz) > 70
      )
        reasons.push("banda incompatível");
      if (
        x.category === "power_module" &&
        ((x.max_cells ?? Infinity) < cells ||
          (x.continuous_a ?? Infinity) < mainCurrent * 1.2)
      )
        reasons.push("capacidade elétrica insuficiente");
      if (
        x.category === "power_distribution" &&
        ((x.voltage_v ?? Infinity) < cells * 4.2 ||
          (x.current_a ?? Infinity) < mainCurrent * 1.2)
      )
        reasons.push("barramento insuficiente");
      if (
        x.category === "dc_dc" &&
        ((x.input_max_v ?? Infinity) < cells * 4.2 ||
          (x.power_w ?? Infinity) < Math.max(30, r.payload_power_w * 1.25))
      )
        reasons.push("entrada ou potência insuficiente");
      if (
        x.category === "wire" &&
        (x.current_class_a ?? Infinity) < mainCurrent * 1.25
      )
        reasons.push("ampacidade insuficiente");
      if (
        x.category === "connector" &&
        (x.continuous_a ?? Infinity) < mainCurrent * 1.25
      )
        reasons.push("corrente insuficiente");
      if (
        x.category === "switching" &&
        ((x.voltage_rating_v ?? 0) < cells * 4.2 ||
          (x.continuous_a ?? 0) < mainCurrent * 1.2)
      )
        reasons.push("tensão ou corrente de seccionamento insuficiente");
      if (
        x.category === "emi_filter" &&
        ((x.voltage_rating_v ?? 0) < cells * 4.2 ||
          (x.current_a ?? 0) < Math.min(mainCurrent * 1.2, 60))
      )
        reasons.push("classe elétrica do filtro insuficiente");
      if (
        x.category === "payload_interface" &&
        ((x.power_w ?? 0) < Math.max(10, r.payload_power_w * 1.25) ||
          (x.data_rate_mbps ?? 0) < r.payload_data_mbps)
      )
        reasons.push("potência ou taxa de dados insuficiente");
      if (
        x.category === "data_storage" &&
        (x.write_speed_mb_s ?? 0) * 8 < r.payload_data_mbps * 1.5
      )
        reasons.push("escrita sustentada insuficiente");
      if (
        x.category === "gimbal" &&
        (x.payload_capacity_kg ?? 0) < r.payload_mass_kg
      )
        reasons.push("capacidade de payload insuficiente");
      if (
        x.category === "charger" &&
        ((x.max_cells ?? 0) < cells ||
          (battery?.chemistry && x.chemistry !== battery.chemistry))
      )
        reasons.push("química ou número de células incompatível");
      if (
        ["landing_system", "recovery_system"].includes(x.category) &&
        (x.max_mtow_kg ?? Infinity) < d.mass.mtow_est_kg
      )
        reasons.push("MTOW acima da classe do item");
      return {
        id: x.id,
        status: reasons.length
          ? "INCOMPATIBLE"
          : selectedIds.has(x.id)
            ? "SELECTED"
            : "COMPATIBLE",
        reasons,
      };
    };
    const items = this.catalog.parts.map(assess),
      counts = items.reduce(
        (a, x) => ((a[x.status] = (a[x.status] ?? 0) + 1), a),
        {},
      );
    return {
      architecture_key: archKey,
      bus_cells: cells,
      bus_voltage_v: ROUND(voltage, 1),
      main_current_est_a: ROUND(mainCurrent, 1),
      selected_ids: [...selectedIds],
      compatible_ids: items
        .filter((x) => x.status !== "INCOMPATIBLE")
        .map((x) => x.id),
      counts,
      items,
    };
  }
  choose(category, predicate, metric) {
    const list = this.catalog.byCategory(category).filter(predicate);
    return list.length
      ? list.sort(
          (a, b) =>
            ((a.validation_status === "template") -
              (b.validation_status === "template")) *
              100000 +
            metric(a) -
            metric(b),
        )[0]
      : null;
  }
  fc(arch, high) {
    const compatible = (x) =>
      arch === "Multirrotor" ? x.multirotor_friendly : x.wing_friendly;
    return this.choose(
      "flight_controller",
      compatible,
      (x) =>
        high
          ? -(x.robustness_score ?? 0) + (x.weight_g ?? 999) / 10000
          : (x.weight_g ?? 999),
    );
  }
  gnss(cm) {
    return this.choose(
      "gnss",
      (x) => (x.precision_cm ?? (x.rtk ? 2 : 200)) <= cm,
      (x) =>
        Math.max(0, cm - (x.precision_cm ?? (x.rtk ? 2 : 200))) / 1000 +
        (x.weight_g ?? 999),
    );
  }
  battery(energy, power, cells) {
    const bats = this.catalog
      .byCategory("battery")
      .filter((x) => x.cells === cells);
    let best = null,
      bestScore = Infinity;
    for (const b of bats.length ? bats : this.catalog.byCategory("battery")) {
      const e = b.voltage_v * b.capacity_ah,
        imax = b.capacity_ah * (b.c_rating ?? 10),
        n = Math.max(
          1,
          Math.ceil(energy / (e * 0.8)),
          Math.ceil(power / b.voltage_v / (imax * 0.6)),
        ),
        mass = (n * (b.weight_g ?? 0)) / 1000,
        c = {
          part: b,
          parallel_packs: n,
          total_energy_wh: ROUND(e * n, 1),
          usable_energy_wh: ROUND(e * n * 0.8, 1),
          total_mass_kg: ROUND(mass),
          required_energy_wh: ROUND(energy, 1),
          capacity_derating: 0.8,
          current_derating: 0.6,
        },
        score = mass + (b.validation_status === "template" ? 0.25 : 0);
      if (score < bestScore) {
        best = c;
        bestScore = score;
      }
    }
    return best ?? { part: null, required_energy_wh: energy };
  }
  motorFixed(power, b) {
    const c = b?.part?.cells ?? 6;
    return this.choose(
      "motor",
      (m) =>
        ["fixed-wing", "both"].includes(m.application) &&
        m.max_power_w >= power * 1.1 &&
        m.min_cells <= c &&
        m.max_cells >= c,
      (m) => m.max_power_w - power,
    );
  }
  motorRotor(thrust, b) {
    const c = b?.part?.cells ?? 6;
    return this.choose(
      "motor",
      (m) =>
        ["multirotor", "both"].includes(m.application) &&
        m.max_thrust_g >= thrust &&
        m.min_cells <= c &&
        m.max_cells >= c,
      (m) => m.max_thrust_g - thrust,
    );
  }
  esc(m, b) {
    if (!m) return null;
    const c = b?.part?.cells ?? 6,
      need = (m.peak_current_a ?? m.max_power_w / (3.7 * c)) * 1.2;
    return this.choose(
      "esc",
      (e) => e.continuous_a >= need && e.min_cells <= c && e.max_cells >= c,
      (e) => e.continuous_a,
    );
  }
  servo(requiredTorqueKgCm) {
    return this.choose(
      "servo",
      (s) => s.torque_kgcm >= requiredTorqueKgCm,
      (s) => (s.torque_kgcm - requiredTorqueKgCm) * 10 + (s.weight_g ?? 999),
    );
  }
  propeller(diameterIn, pitchIn = 6, application = "both") {
    const allowed = application === "both" ? ["fixed-wing", "multirotor", "vtol"] : [application];
    return this.choose(
      "propeller",
      (x) =>
        (!x.applicability?.length || allowed.some((a) => x.applicability.includes(a))) &&
        Math.abs((x.diameter_in ?? -999) - diameterIn) <= 1,
      (x) =>
        Math.abs((x.diameter_in ?? 999) - diameterIn) * 100 +
        Math.abs((x.pitch_in ?? pitchIn) - pitchIn),
    );
  }
  bom(part, qty, reason) {
    return {
      system: part.system ?? "Integração",
      category: part.category,
      item: part.name,
      qty,
      spec: part.summary ?? "",
      part_id: part.id,
      reason,
      source_url: part.source_url ?? "",
      availability_note: part.availability_note ?? "verificar estoque/preço",
    };
  }
  baseBom(fc, gnss, r, context = {}) {
    const b = [];
    const archKey = context.archKey ?? "fixed-wing";
    const cells = context.battery?.part?.cells ?? 6;
    const voltage = context.battery?.part?.voltage_v ?? cells * 3.7;
    const mainCurrent = (context.maxPowerW ?? 300) / Math.max(1, voltage);
    if (fc) b.push(this.bom(fc, 1, "Aviônicos / autopilot"));
    if (gnss) b.push(this.bom(gnss, 1, "Navegação / GNSS principal"));
    if (r.redundancy === "Alta" && gnss)
      b.push(this.bom(gnss, 1, "Navegação / GNSS redundante"));
    const fitsArchitecture = (x) =>
      !x.applicability?.length || x.applicability.includes(archKey);
    const pick = (category, predicate = () => true, metric = () => 0) => {
      const candidates = this.catalog
        .byCategory(category)
        .filter((x) => fitsArchitecture(x) && predicate(x));
      return candidates.sort(
        (a, z) =>
          metric(a) -
          metric(z) +
          ((a.validation_status === "template") -
            (z.validation_status === "template")) *
            0.01,
      )[0];
    };
    const addSupport = (category, qty, reason, predicate, metric) => {
      const part = pick(category, predicate, metric);
      if (part) b.push(this.bom(part, qty, reason));
    };
    addSupport(
      "telemetry",
      2,
      "Comunicação / par ar-solo C2",
      (x) =>
        (x.range_class_km == null || x.range_class_km >= r.mission_range_km) &&
        (x.throughput_mbps == null || x.throughput_mbps >= 0.12) &&
        (x.band_mhz == null ||
          Math.abs(x.band_mhz - r.radio_frequency_mhz) <= 70),
      (x) =>
        Math.abs(
          (x.band_mhz ?? r.radio_frequency_mhz) - r.radio_frequency_mhz,
        ) +
        Math.max(
          0,
          r.mission_range_km - (x.range_class_km ?? r.mission_range_km),
        ) *
          100,
    );
    if (r.payload_data_mbps > 0)
      addSupport(
        "telemetry",
        2,
        "Comunicação / enlace dedicado de payload",
        (x) =>
          (x.range_class_km == null || x.range_class_km >= r.mission_range_km) &&
          (x.throughput_mbps ?? 0) >= r.payload_data_mbps &&
          (x.band_mhz == null || Math.abs(x.band_mhz - r.radio_frequency_mhz) <= 70),
        (x) =>
          Math.abs((x.band_mhz ?? r.radio_frequency_mhz) - r.radio_frequency_mhz) * 100 +
          Math.max(0, (x.throughput_mbps ?? 0) - r.payload_data_mbps) +
          Math.max(0, (x.range_class_km ?? r.mission_range_km) - r.mission_range_km) / 10,
      );
    addSupport(
      "antenna",
      2,
      "Comunicação / diversidade e enlace",
      (x) =>
        x.band_mhz == null ||
        Math.abs(x.band_mhz - r.radio_frequency_mhz) <= 70,
      (x) =>
        Math.abs((x.band_mhz ?? r.radio_frequency_mhz) - r.radio_frequency_mhz),
    );
    addSupport(
      "power_module",
      1,
      "Energia / medição principal",
      (x) =>
        (x.max_cells ?? Infinity) >= cells &&
        (x.continuous_a ?? Infinity) >= mainCurrent * 1.2,
      (x) => (x.continuous_a ?? mainCurrent * 10) - mainCurrent,
    );
    addSupport(
      "power_distribution",
      1,
      "Energia / distribuição por ramal",
      (x) =>
        (x.voltage_v ?? Infinity) >= cells * 4.2 &&
        (x.current_a ?? Infinity) >= mainCurrent * 1.2,
      (x) => (x.current_a ?? mainCurrent * 10) - mainCurrent,
    );
    addSupport(
      "dc_dc",
      2,
      "Energia / alimentação segregada de aviônicos e payload",
      (x) =>
        (x.input_max_v ?? Infinity) >= cells * 4.2 &&
        (x.output_v ?? 5) === 5 &&
        (x.power_w ?? Infinity) >= Math.max(30, r.payload_power_w * 1.25),
      (x) => (x.power_w ?? 999) - Math.max(30, r.payload_power_w * 1.25),
    );
    addSupport(
      "circuit_protection",
      3,
      "Energia / proteção coordenada por ramal",
      (x) => (x.rating_a ?? Infinity) >= Math.max(2, mainCurrent * 1.15),
      (x) => (x.rating_a ?? 999) - mainCurrent,
    );
    addSupport(
      "wire",
      1,
      "Integração elétrica / dimensionar metragem e bitola",
      (x) => (x.current_class_a ?? Infinity) >= mainCurrent * 1.25,
      (x) => (x.current_class_a ?? 999) - mainCurrent,
    );
    addSupport(
      "cable",
      1,
      "Integração elétrica / dados e sinais",
      (x) =>
        archKey !== "fixed-wing" ||
        x.cable_type !== "servo PWM" ||
        (x.length_m ?? 0) >= 0.3,
      (x) =>
        x.cable_type === "CAN twisted pair"
          ? 0
          : x.cable_type === "UART shielded"
            ? 1
            : 2,
    );
    addSupport(
      "connector",
      1,
      "Integração elétrica / definir famílias e quantidades",
      (x) => (x.continuous_a ?? Infinity) >= mainCurrent * 1.25,
      (x) => (x.continuous_a ?? 999) - mainCurrent,
    );
    addSupport(
      "switching",
      1,
      "Energia / seccionamento e armamento",
      (x) =>
        (x.voltage_rating_v ?? 0) >= cells * 4.2 &&
        (x.continuous_a ?? 0) >= mainCurrent * 1.2,
      (x) => (x.continuous_a ?? 999) - mainCurrent,
    );
    addSupport(
      "emi_filter",
      1,
      "EMC / filtro a confirmar por ensaio",
      (x) =>
        (x.voltage_rating_v ?? 0) >= cells * 4.2 &&
        (x.current_a ?? 0) >= Math.min(mainCurrent * 1.2, 60),
      (x) => (x.current_a ?? 999) - Math.min(mainCurrent, 60),
    );
    addSupport(
      "payload_interface",
      1,
      "Payload / interface elétrica e de dados",
      (x) =>
        (x.power_w ?? 0) >= Math.max(10, r.payload_power_w * 1.25) &&
        (x.data_rate_mbps ?? 0) >= r.payload_data_mbps,
      (x) =>
        (x.power_w ?? 999) -
        r.payload_power_w +
        ((x.data_rate_mbps ?? 999) - r.payload_data_mbps) / 100,
    );
    if (r.payload_data_mbps > 0)
      addSupport(
        "data_storage",
        1,
        "Dados / armazenamento embarcado",
        (x) => (x.write_speed_mb_s ?? 0) * 8 >= r.payload_data_mbps * 1.5,
        (x) => x.capacity_gb ?? 9999,
      );
    addSupport(
      "charger",
      1,
      "Segmento de solo / carga compatível com o pack",
      (x) =>
        (x.max_cells ?? 0) >= cells &&
        (!context.battery?.part?.chemistry ||
          x.chemistry === context.battery.part.chemistry),
      (x) => (x.max_cells ?? 99) - cells + (x.charge_power_w ?? 999) / 10000,
    );
    addSupport(
      "harness_accessory",
      1,
      "Integração elétrica / proteção e alívio de tensão",
    );
    addSupport(
      "vibration_isolator",
      4,
      "Integração mecânica / isolamento de aviônicos",
    );
    addSupport("enclosure", 1, "Aviônicos / proteção ambiental e EMI");
    addSupport("safety_equipment", 1, "Operações / segurança e checklist");
    return b;
  }
  fixedWing(r) {
    const layoutName = this.wingLayout(r),
      layout = WING_LAYOUTS[layoutName],
      atmosphere = p.isaAtmosphere(r.altitude_m),
      rho = atmosphere.density_kg_m3,
      mu = atmosphere.dynamic_viscosity_pa_s,
      vcr = r.cruise_speed_kmh / 3.6,
      vs = r.stall_speed_mps,
      missionAr =
        r.target_endurance_min >= 90
          ? 2
          : [
                "Mapeamento / fotogrametria",
                "Corredor / linha de transmissão",
              ].includes(r.mission_type)
            ? 1
            : 0,
      ar = layout.ar + missionAr,
      fc = this.fc("Asa fixa", r.redundancy === "Alta"),
      gnss = this.gnss(r.precision_cm),
      fixed =
        r.payload_mass_kg +
        0.18 +
        ((fc?.weight_g ?? 30) + (gnss?.weight_g ?? 45)) / 1000;
    let mtow = Math.max(2.2, fixed / 0.25),
      bat,
      geom,
      aero,
      power,
      converged = false;
    for (let i = 0; i < 30; i++) {
      geom = p.wingGeometry(
        p.wingAreaForStall(mtow, vs, layout.clmax, rho),
        ar,
      );
      aero = p.fixedwingAero(mtow, geom, vcr, layout.cd0, layout.e, rho, mu);
      const cruise = (aero.drag_n * vcr) / 0.7 + r.payload_power_w + 18;
      power = Math.max(cruise * 2.1, mtow * 180);
      bat = this.battery(
        ((cruise * r.target_endurance_min) / 60) / (1 - r.reserve_fraction),
        power,
        power > 1800 ? 12 : 6,
      );
      const next =
        fixed +
        bat.total_mass_kg +
        0.52 * geom.area_m2 ** 0.72 +
        0.1 * geom.span_m +
        0.2 +
        0.0002 * power +
        0.12 +
        0.18;
      if (Math.abs(next - mtow) < 0.02) {
        mtow = next;
        converged = true;
        break;
      }
      mtow = 0.55 * mtow + 0.45 * next;
    }
    geom = p.wingGeometry(p.wingAreaForStall(mtow, vs, layout.clmax, rho), ar);
    aero = p.fixedwingAero(mtow, geom, vcr, layout.cd0, layout.e, rho, mu);
    power = Math.max(
      ((aero.drag_n * vcr) / 0.7 + r.payload_power_w + 18) * 2.1,
      mtow * 180,
    );
    const chars = p.fixedwingCharacteristicSpeeds(
        mtow,
        geom.area_m2,
        aero.cd0,
        aero.k,
        rho,
      ),
      motor = this.motorFixed(power, bat),
      esc = this.esc(motor, bat),
      servoCount = layoutName === "Asa voadora" ? 2 : 4,
      actuation = p.controlSurfaceTorque({
        rho,
        speedMps: Math.max(vcr * 1.5, vs * 1.8),
        wingAreaM2: geom.area_m2,
        macM: geom.mac_m,
        servoCount,
      }),
      servo = this.servo(Math.max(1.5, actuation.required_torque_kgcm_per_servo)),
      propTarget = power < 600 ? 12 : power < 1200 ? 15 : power < 2500 ? 20 : 28,
      propeller = this.propeller(propTarget, 6, "fixed-wing"),
      fus = p.clamp(0.52 * geom.span_m, 4.2 * geom.mac_m, 1.8),
      arm = Math.max(2.4 * geom.mac_m, 0.42 * fus),
      airfoil = airfoilAdvisor({
        reynolds: aero.re_mac,
        layout: layoutName,
        missionType: r.mission_type,
        preferred: r.preferred_airfoil,
      }),
      gust = p.gustResponse(
        rho,
        vcr,
        (mtow / geom.area_m2),
        geom.aspect_ratio,
      ),
      bom = this.baseBom(fc, gnss, r, {
        archKey: "fixed-wing",
        battery: bat,
        maxPowerW: power,
      });
    if (motor) bom.push(this.bom(motor, 1, "motor de cruzeiro"));
    if (esc) bom.push(this.bom(esc, 1, "ESC com margem"));
    if (propeller) bom.push(this.bom(propeller, 1, "hélice de cruzeiro; validar mapa motor-hélice em bancada"));
    if (servo)
      bom.push(
        this.bom(
          servo,
          servoCount,
          "superfícies de controle",
        ),
      );
    if (bat.part)
      bom.push(this.bom(bat.part, bat.parallel_packs, "bateria de propulsão"));
    bom.push({
      item: `Estrutura ${layoutName}`,
      qty: 1,
      spec: `S≈${geom.area_m2.toFixed(2)} m²; b≈${geom.span_m.toFixed(2)} m; AR=${ar}`,
      status: "validar cargas, rigidez e flutter",
    });
    const polar = Array.from({ length: 13 }, (_, i) => {
        const cl = ROUND(i * 0.15, 2),
          cd = ROUND(aero.cd0 + aero.k * cl * cl, 4);
        return { cl, cd, ld: cd ? ROUND(cl / cd, 2) : 0 };
      }),
      power_curve = Array.from({ length: 15 }, (_, i) => {
        const speed = Math.max(
            vs * 1.02,
            vs * 0.85 + (i * (vcr * 1.8 - vs * 0.85)) / 14,
          ),
          q = 0.5 * rho * speed * speed,
          cl = (mtow * p.G) / (q * geom.area_m2),
          cd = aero.cd0 + aero.k * cl * cl,
          drag = q * geom.area_m2 * cd;
        return {
          speed_mps: ROUND(speed, 2),
          power_w: ROUND((drag * speed) / 0.7 + r.payload_power_w + 18),
        };
      });
    return {
      configuration: {
        family: `Asa fixa - ${layoutName}`,
        wing_layout: layoutName,
        tail_arrangement: layout.tail,
        layout_guidance: layout.note,
        propulsion: "elétrica brushless",
        airfoil_selected: `${airfoil.selected.id} · ${airfoil.selected.name}`,
        airfoil_source: `https://airfoiltools.com/airfoil/details?airfoil=${airfoil.selected.airfoiltools_id}`,
        airfoil_thickness_pct: airfoil.selected.thickness_pct,
        airfoil_camber_pct: airfoil.selected.camber_pct,
        airfoil_2d_max_cl_cd_at_re: airfoil.selected.max_cl_cd_2d_at_re,
        airfoil_model_status: airfoil.domain,
        airfoil_guidance: airfoil.warning,
      },
      mass: {
        mtow_est_kg: ROUND(mtow, 2),
        payload_kg: r.payload_mass_kg,
        battery_kg: bat.total_mass_kg,
        airframe_est_kg: ROUND(
          Math.max(0, mtow - r.payload_mass_kg - bat.total_mass_kg),
          2,
        ),
        iteration_converged: converged,
        constraint_limited: mtow > r.max_mtow_kg,
      },
      geometry: {
        ...rounded(geom),
        fuselage_length_m: ROUND(fus, 2),
        tail_arm_m: ROUND(arm, 2),
        prop_diameter_in: propTarget,
        horizontal_tail_area_m2: ["Asa voadora", "Delta", "Canard", "Tandem"].includes(layoutName)
          ? null
          : ROUND((0.5 * geom.area_m2 * geom.mac_m) / arm),
        foreplane_area_initial_m2: layoutName === "Canard" ? ROUND(0.18 * geom.area_m2) : null,
        forward_wing_area_initial_m2: layoutName === "Tandem" ? ROUND(0.45 * geom.area_m2) : null,
        aft_wing_area_initial_m2: layoutName === "Tandem" ? ROUND(0.55 * geom.area_m2) : null,
        vertical_tail_area_m2: ROUND(
          ((layoutName === "Delta" ? 0.03 : 0.045) *
            geom.area_m2 *
            geom.span_m) /
            arm,
        ),
        stability_guidance: layout.stability,
        static_margin_target: ["Asa voadora", "Delta"].includes(layoutName)
          ? "derivar por análise de estabilidade"
          : "8-12% MAC",
      },
      performance: {
        ...rounded(aero),
        ...rounded(chars),
        air_density_kg_m3: ROUND(rho, 4),
        air_dynamic_viscosity_pa_s: Number(mu.toExponential(5)),
        air_temperature_k: ROUND(atmosphere.temperature_k, 2),
        wing_loading_n_m2: ROUND((mtow * p.G) / geom.area_m2, 1),
        stall_speed_mps: ROUND(vs, 2),
        cruise_mps: ROUND(vcr, 2),
        stall_margin_ratio: ROUND(vcr / vs, 2),
        still_air_range_km: ROUND(
          (vcr * r.target_endurance_min * 60) / 1000,
          1,
        ),
        wind_limited_out_and_back_range_km: ROUND(
          (Math.max(0, vcr - r.max_wind_mps) * r.target_endurance_min * 60) /
            2000,
          1,
        ),
        turn_radius_30deg_m: ROUND(p.turnRadius(vcr, 30), 1),
        max_electrical_power_w: ROUND(power),
        gust_5mps_delta_load_factor: ROUND(gust.delta_load_factor, 2),
        gust_5mps_positive_load_factor: ROUND(gust.positive_load_factor, 2),
        required_servo_torque_kgcm: ROUND(Math.max(1.5, actuation.required_torque_kgcm_per_servo), 2),
      },
      airfoil_analysis: airfoil,
      control_surface_analysis: rounded(actuation),
      gust_analysis: rounded(gust),
      analysis_data: { drag_polar: polar, power_curve, airfoil_efficiency: airfoil.selected.polar_ncrit9 },
      electrical: { battery: bat, reserve_fraction: r.reserve_fraction },
      selected_components: { flight_controller: fc, gnss, motor, esc, propeller, servo },
      bom,
    };
  }
  multirotor(r) {
    const layoutName = this.rotorLayout(r),
      layout = ROTOR_LAYOUTS[layoutName],
      n = layout.count,
      tw = n <= 4 ? 2 : 1.8,
      rho = p.isaDensity(r.altitude_m),
      cruiseMps = r.cruise_speed_kmh / 3.6;
    let mtow = Math.max(1.8, (r.payload_mass_kg + 0.45) / 0.28),
      prop = 15,
      bat,
      hover,
      forward,
      flatPlateArea,
      converged = false,
      constraintLimited = false,
      closureResidualKg = 0;
    for (let i = 0; i < 30; i++) {
      prop = mtow < 2 ? 12 : mtow < 4 ? 15 : mtow < 8 ? 20 : 28;
      hover =
        p.multirotorHoverPower(
          mtow,
          prop,
          n,
          0.65 * layout.efficiency,
          0.9,
          rho,
        ) +
        r.payload_power_w +
        18;
      flatPlateArea = 0.045 * mtow ** (2 / 3);
      forward = p.multirotorForwardPower(hover, cruiseMps, flatPlateArea, rho);
      bat = this.battery(
        ((forward * r.target_endurance_min) / 60) / (1 - r.reserve_fraction),
        Math.max(hover * 2, forward * 1.6),
        Math.max(hover * 2, forward * 1.6) < 3500 ? 6 : 12,
      );
      const next =
        r.payload_mass_kg +
        bat.total_mass_kg +
        0.16 * mtow +
        0.25 +
        0.045 * mtow * n +
        0.35;
      closureResidualKg = next - mtow;
      if (!Number.isFinite(next) || next > r.max_mtow_kg) {
        mtow = r.max_mtow_kg;
        constraintLimited = true;
        break;
      }
      if (Math.abs(next - mtow) < 0.02) {
        mtow = next;
        converged = true;
        break;
      }
      mtow = 0.55 * mtow + 0.45 * next;
    }
    hover =
      p.multirotorHoverPower(
        mtow,
        prop,
        n,
        0.65 * layout.efficiency,
        0.9,
        rho,
      ) +
      r.payload_power_w +
      18;
    flatPlateArea = 0.045 * mtow ** (2 / 3);
    forward = p.multirotorForwardPower(hover, cruiseMps, flatPlateArea, rho);
    bat = this.battery(
      ((forward * r.target_endurance_min) / 60) / (1 - r.reserve_fraction),
      Math.max(hover * 2, forward * 1.6),
      Math.max(hover * 2, forward * 1.6) < 3500 ? 6 : 12,
    );
    const thrust = (mtow * 1000 * tw) / n,
      motor = this.motorRotor(thrust, bat),
      esc = this.esc(motor, bat),
      propeller = this.propeller(prop, prop >= 20 ? 6 : 4, "multirotor"),
      fc = this.fc("Multirrotor", r.redundancy === "Alta"),
      gnss = this.gnss(r.precision_cm),
      bom = this.baseBom(fc, gnss, r, {
        archKey: "multirotor",
        battery: bat,
        maxPowerW: Math.max(hover * 2, forward * 1.6),
      });
    if (motor) bom.push(this.bom(motor, n, "motores de sustentação"));
    if (esc) bom.push(this.bom(esc, n, "ESCs individuais"));
    if (propeller) bom.push(this.bom(propeller, n, "hélices CW/CCW; validar conjunto em thrust stand"));
    if (bat.part) bom.push(this.bom(bat.part, bat.parallel_packs, "bateria"));
    const endurance_curve = [0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 1].map(
        (load) => ({
          payload_factor: load,
          endurance_min: ROUND(r.target_endurance_min / load ** 1.5, 1),
        }),
      ),
      disk_curve = [10, 12, 15, 18, 20, 22, 24, 26, 28, 30].map((d) => ({
        diameter_in: d,
        disk_loading_n_m2: ROUND(p.diskLoading(mtow, d, n), 1),
        hover_power_w: ROUND(
          p.multirotorHoverPower(
            mtow,
            d,
            n,
            0.65 * layout.efficiency,
            0.9,
            rho,
          ) +
            r.payload_power_w +
            18,
        ),
      }));
    return {
      configuration: {
        family: layoutName,
        rotor_layout: layoutName,
        rotor_count: n,
        coaxial: Boolean(layout.coaxial),
        rotor_efficiency_factor: layout.efficiency,
        redundancy_class: layout.redundancy,
        yaw_control: layout.control,
        propulsion: "elétrica brushless",
      },
      mass: {
        mtow_est_kg: ROUND(mtow, 2),
        payload_kg: r.payload_mass_kg,
        battery_kg: bat.total_mass_kg,
        airframe_est_kg: ROUND(
          Math.max(0, mtow - r.payload_mass_kg - bat.total_mass_kg),
          2,
        ),
        iteration_converged: converged,
        constraint_limited: constraintLimited,
        mass_closure_residual_kg: ROUND(closureResidualKg, 2),
      },
      geometry: {
        prop_diameter_in: prop,
        wheelbase_est_m: ROUND(prop * 0.0254 * 1.55, 2),
        cg_guidance: "CG no centro geométrico e próximo ao plano de empuxo",
      },
      performance: {
        air_density_kg_m3: ROUND(rho, 4),
        cruise_mps: ROUND(cruiseMps, 2),
        disk_loading_n_m2: ROUND(p.diskLoading(mtow, prop, n), 1),
        hover_power_w: ROUND(hover),
        forward_flight_power_w: ROUND(forward),
        forward_flight_flat_plate_area_m2: ROUND(flatPlateArea, 3),
        forward_power_model: "hover equivalente x 0,85 + potência parasita; triagem conservadora, requer ensaio",
        hover_power_loading_w_kg: ROUND(hover / mtow, 1),
        max_power_est_w: ROUND(Math.max(hover * 2, forward * 1.6)),
        required_max_thrust_per_motor_g: ROUND(thrust),
        thrust_to_weight_target: tw,
        nominal_hover_throttle_fraction: ROUND(1 / tw, 2),
      },
      analysis_data: { disk_curve, endurance_curve },
      electrical: { battery: bat, reserve_fraction: r.reserve_fraction },
      selected_components: { flight_controller: fc, gnss, motor, esc, propeller },
      bom,
    };
  }
  vtol(r) {
    const seed = this.fixedWing({ ...r, preferred_architecture: "Asa fixa" }),
      atmosphere = p.isaAtmosphere(r.altitude_m),
      rho = atmosphere.density_kg_m3,
      mu = atmosphere.dynamic_viscosity_pa_s,
      phase = {
        "Lift+cruise": { hoverFactor: 1, mechanismMassKgPerRotor: 0.02, transitionMin: 0.7, transitionFactor: 1.05 },
        "Tilt-rotor": { hoverFactor: 1.1, mechanismMassKgPerRotor: 0.12, transitionMin: 1.2, transitionFactor: 1.22 },
        "Tilt-wing": { hoverFactor: 1.14, mechanismMassKgPerRotor: 0.09, transitionMin: 1.5, transitionFactor: 1.28 },
      }[r.vtol_layout] ?? { hoverFactor: 1, mechanismMassKgPerRotor: 0.02, transitionMin: 0.7, transitionFactor: 1.05 },
      hoverMinutes = 3,
      n =
        r.vtol_layout === "Tilt-rotor"
          ? 2
          : r.vtol_layout === "Tilt-wing"
            ? 4
            : r.redundancy === "Alta"
              ? 6
              : 4;
    let mtow = seed.mass.mtow_est_kg * 1.3,
      bat,
      geom,
      aero,
      hover,
      cruise,
      power,
      transitionPower,
      nonCruiseEnergy,
      prop,
      converged = false;
    for (let i = 0; i < 30; i++) {
      prop =
        r.vtol_layout === "Tilt-rotor"
          ? mtow < 8
            ? 28
            : 32
          : mtow < 8
            ? 20
            : 28;
      hover =
        p.multirotorHoverPower(mtow, prop, n, 0.65, 0.9, rho) * phase.hoverFactor +
        r.payload_power_w +
        20;
      geom = p.wingGeometry(
        p.wingAreaForStall(mtow, seed.performance.stall_speed_mps, 1.4, rho),
        seed.geometry.aspect_ratio,
        seed.geometry.taper,
      );
      aero = p.fixedwingAero(
        mtow,
        geom,
        seed.performance.cruise_mps,
        seed.performance.cd0,
        0.8,
        rho,
        mu,
      );
      cruise =
        (aero.drag_n * seed.performance.cruise_mps) / 0.7 +
        r.payload_power_w +
        20;
      transitionPower = Math.max(hover, cruise * 1.35) * phase.transitionFactor;
      nonCruiseEnergy = (hover * hoverMinutes + transitionPower * phase.transitionMin) / 60;
      const cruiseMinutes = Math.max(0, r.target_endurance_min - hoverMinutes - phase.transitionMin),
        energy = (cruise * cruiseMinutes / 60 + nonCruiseEnergy) /
          (1 - r.reserve_fraction);
      power = Math.max(hover * 1.8, transitionPower, cruise * 2.1, mtow * 180);
      bat = this.battery(energy, power, power > 2500 ? 12 : 6);
      const next =
        r.payload_mass_kg +
        0.45 +
        bat.total_mass_kg +
        0.055 * mtow * n +
        0.1 * n +
        phase.mechanismMassKgPerRotor * n +
        0.52 * geom.area_m2 ** 0.72 +
        0.13 * geom.span_m +
        0.32 +
        0.0002 * cruise * 2.1 +
        0.12;
      if (Math.abs(next - mtow) < 0.03) {
        mtow = next;
        converged = true;
        break;
      }
      mtow = 0.55 * mtow + 0.45 * next;
    }
    const lift = (mtow * 1000 * 1.8) / n,
      lm = this.motorRotor(lift, bat),
      le = this.esc(lm, bat),
      cm = this.motorFixed(cruise * 2.1, bat),
      ce = this.esc(cm, bat),
      liftPropeller = this.propeller(prop, prop >= 20 ? 6 : 4, "vtol"),
      cruisePropTarget = cruise < 700 ? 12 : cruise < 1500 ? 15 : 20,
      cruisePropeller = this.propeller(cruisePropTarget, 6, "vtol"),
      fc = this.fc("Asa fixa", r.redundancy === "Alta"),
      gnss = this.gnss(r.precision_cm),
      bom = this.baseBom(fc, gnss, r, {
        archKey: "vtol",
        battery: bat,
        maxPowerW: power,
      });
    for (const [part, qty, reason] of [
      [lm, n, "lift motors"],
      [le, n, "lift ESCs"],
      [cm, 1, "cruise motor"],
      [ce, 1, "cruise ESC"],
      [liftPropeller, n, "lift propellers CW/CCW; thrust stand"],
      [cruisePropeller, 1, "cruise propeller; motor-propeller map"],
    ])
      if (part) bom.push(this.bom(part, qty, reason));
    if (bat.part)
      bom.push(this.bom(bat.part, bat.parallel_packs, "bateria lift+cruise"));
    return {
      configuration: {
        family: "VTOL híbrido lift+cruise",
        rotor_count_lift: n,
        transition: "validar em SIL/HIL e expansão progressiva",
      },
      mass: {
        mtow_est_kg: ROUND(mtow, 2),
        payload_kg: r.payload_mass_kg,
        battery_kg: bat.total_mass_kg,
        airframe_est_kg: ROUND(
          Math.max(0, mtow - r.payload_mass_kg - bat.total_mass_kg),
          2,
        ),
        iteration_converged: converged,
        constraint_limited: mtow > r.max_mtow_kg,
      },
      geometry: {
        ...rounded(geom),
        prop_diameter_in: prop,
        cruise_prop_diameter_in: cruisePropTarget,
        cg_initial_percent_mac: "25-30% MAC",
        static_margin_target: "8-12% MAC",
      },
      performance: {
        ...rounded(aero),
        air_density_kg_m3: ROUND(rho, 4),
        air_dynamic_viscosity_pa_s: Number(mu.toExponential(5)),
        air_temperature_k: ROUND(atmosphere.temperature_k, 2),
        cruise_mps: seed.performance.cruise_mps,
        stall_speed_mps: seed.performance.stall_speed_mps,
        still_air_range_km: seed.performance.still_air_range_km,
        wind_limited_out_and_back_range_km:
          seed.performance.wind_limited_out_and_back_range_km,
        hover_power_w: ROUND(hover),
        cruise_electrical_power_w: ROUND(cruise),
        transition_power_w: ROUND(transitionPower),
        vtol_energy_model_hover_min: hoverMinutes,
        transition_duration_min: phase.transitionMin,
        non_cruise_duration_min: ROUND(hoverMinutes + phase.transitionMin, 1),
        non_cruise_energy_wh: ROUND(nonCruiseEnergy, 2),
        transition_efficiency_factor: ROUND(1 / phase.transitionFactor, 3),
        mechanism_mass_allowance_kg: ROUND(phase.mechanismMassKgPerRotor * n, 3),
        lift_thrust_per_motor_g: ROUND(lift),
        max_electrical_power_w: ROUND(power),
      },
      electrical: { battery: bat, reserve_fraction: r.reserve_fraction },
      selected_components: {
        flight_controller: fc,
        gnss,
        lift_motor: lm,
        lift_esc: le,
        cruise_motor: cm,
        cruise_esc: ce,
        lift_propeller: liftPropeller,
        cruise_propeller: cruisePropeller,
      },
      bom,
    };
  }
  vtolAdvanced(r) {
    const layout = r.vtol_layout || "Lift+cruise",
      base = this.vtol({ ...r, vtol_layout: layout }),
      seed = this.fixedWing(r);
    base.configuration = {
      ...base.configuration,
      family: `VTOL ${layout}`,
      vtol_layout: layout,
      wing_layout: seed.configuration.wing_layout,
      airfoil_selected: seed.configuration.airfoil_selected,
      airfoil_source: seed.configuration.airfoil_source,
      airfoil_thickness_pct: seed.configuration.airfoil_thickness_pct,
      airfoil_camber_pct: seed.configuration.airfoil_camber_pct,
      airfoil_2d_max_cl_cd_at_re: seed.configuration.airfoil_2d_max_cl_cd_at_re,
      airfoil_model_status: seed.configuration.airfoil_model_status,
      airfoil_guidance: seed.configuration.airfoil_guidance,
      rotor_count_lift: base.configuration.rotor_count_lift,
      transition_efficiency_factor: base.performance.transition_efficiency_factor,
      transition:
        "SIL/HIL, abort logic, corredor de velocidade/altura e expansão progressiva",
    };
    base.analysis_data = {
      ...seed.analysis_data,
      transition_profile: [
        { phase: "Hover", power_w: base.performance.hover_power_w },
        {
          phase: "Aceleração",
          power_w: ROUND(base.performance.hover_power_w * 1.12),
        },
        {
          phase: "Transição",
          power_w: base.performance.transition_power_w,
        },
        {
          phase: "Cruzeiro",
          power_w: base.performance.cruise_electrical_power_w,
        },
        { phase: "Pouso", power_w: base.performance.hover_power_w },
      ],
    };
    base.airfoil_analysis = seed.airfoil_analysis;
    base.control_surface_analysis = seed.control_surface_analysis;
    base.gust_analysis = seed.gust_analysis;
    base.performance.gust_5mps_delta_load_factor = seed.performance.gust_5mps_delta_load_factor;
    base.performance.gust_5mps_positive_load_factor = seed.performance.gust_5mps_positive_load_factor;
    base.performance.required_servo_torque_kgcm = seed.performance.required_servo_torque_kgcm;
    return base;
  }
  payload(r) {
    const x = PAYLOADS[r.mission_type] ?? [
      "Payload definido pela missão",
      "dimensionar massa, potência, FOV e dados",
    ];
    return {
      type: x[0],
      integration_guidance: x[1],
      mass_kg_input: r.payload_mass_kg,
      power_w_input: r.payload_power_w,
      data_mbps_input: r.payload_data_mbps,
    };
  }
  communications(r) {
    const distance = Math.max(1, r.mission_range_km),
      link = p.linkMarginDb(
        r.tx_power_dbm,
        r.tx_gain_dbi,
        r.rx_gain_dbi,
        distance,
        r.radio_frequency_mhz,
        r.receiver_sensitivity_dbm,
        r.link_losses_db,
      ),
      fr = p.fresnelRadiusM(distance, r.radio_frequency_mhz);
    return {
      frequency_mhz_input: r.radio_frequency_mhz,
      distance_km: distance,
      assumptions: {
        tx_power_dbm: r.tx_power_dbm,
        tx_gain_dbi: r.tx_gain_dbi,
        rx_gain_dbi: r.rx_gain_dbi,
        receiver_sensitivity_dbm: r.receiver_sensitivity_dbm,
        aggregate_losses_db: r.link_losses_db,
      },
      illustrative_link_budget: rounded(link),
      first_fresnel_midpoint_radius_m: ROUND(fr, 2),
      recommended_60pct_fresnel_clearance_m: ROUND(0.6 * fr, 2),
      traffic_classes: {
        "C2/telemetria": {
          priority: 1,
          estimated_mbps: 0.12,
          latency: "baixa",
        },
        payload: {
          priority: 2,
          estimated_mbps: r.payload_data_mbps,
          latency: "depende da missão",
        },
      },
      required_payload_data_mbps: r.payload_data_mbps,
      catalog_telemetry_is_not_payload_link: true,
      note: "Link ilustrativo; validar antenas, polarização, Fresnel, terreno, interferência, latência, disponibilidade e regras locais.",
    };
  }
  remoteSensing(r, d) {
    if (
      ![
        "Mapeamento / fotogrametria",
        "Agricultura multispectral",
        "Monitoramento ambiental",
        "Corredor / linha de transmissão",
      ].includes(r.mission_type)
    )
      return { applicable: false, note: "Ferramenta não aplicada a esta missão." };
    const geometry = p.remoteSensingGeometry({
      aglM: r.mission_agl_m,
      sensorWidthMm: r.sensor_width_mm,
      sensorHeightMm: r.sensor_height_mm,
      focalLengthMm: r.focal_length_mm,
      imageWidthPx: r.image_width_px,
      imageHeightPx: r.image_height_px,
      speedMps: d.performance.cruise_mps ?? Math.max(2, r.cruise_speed_kmh / 3.6),
      exposureTimeMs: r.exposure_time_ms,
      frontOverlapPct: r.front_overlap_pct,
      sideOverlapPct: r.side_overlap_pct,
    });
    return {
      applicable: true,
      model_status: "PLANEJAMENTO GEOMÉTRICO PRELIMINAR",
      ...rounded(geometry),
      front_overlap_pct: r.front_overlap_pct,
      side_overlap_pct: r.side_overlap_pct,
      area_input_km2: r.area_km2,
      estimated_photos_for_area:
        r.area_km2 > 0
          ? Math.ceil(geometry.nominal_photos_per_km2 * r.area_km2)
          : null,
      note: "Geometria nadir em terreno plano; confirmar relevo, orientação do sensor, aceleração, curvas, trigger, time sync, calibração e tolerâncias.",
    };
  }
  reliability(r, arch) {
    const list = [
      [
        "HZ-01",
        "Perda de GNSS",
        "degrada navegação/RTL",
        4,
        2,
        "EKF/INS, health checks e contingência",
        "SIL/HIL + degradação controlada",
      ],
      [
        "HZ-02",
        "Perda de C2",
        "perda de supervisão",
        4,
        2,
        "loss-link mode por CONOPS",
        "teste de loss-link",
      ],
      [
        "HZ-03",
        "Falha de alimentação",
        "perda total ou parcial",
        5,
        2,
        "margens, monitoramento e alimentação segregada",
        "carga máxima, brownout e térmica",
      ],
      [
        "HZ-04",
        "Erro de CG/configuração",
        "instabilidade",
        5,
        2,
        "mass statement e checklist",
        "pesagem, momentos e inspeção",
      ],
    ];
    if (arch === "VTOL lift+cruise")
      list.push([
        "HZ-06",
        "Falha na transição",
        "perda de velocidade/altitude",
        5,
        3,
        "abort logic e envelope progressivo",
        "matriz de transição",
      ]);
    const fmea_seed = list.map(
      ([
        id,
        failure,
        effect,
        severity,
        likelihood,
        mitigation,
        verification,
      ]) => {
        const score = severity * likelihood;
        return {
          id,
          failure,
          effect,
          severity,
          likelihood,
          initial_risk_score: score,
          risk_class: score >= 15 ? "ALTO" : score >= 8 ? "MÉDIO" : "BAIXO",
          mitigation,
          verification,
        };
      },
    );
    return {
      fmea_seed,
      risk_scale: "Severidade 1-5 x probabilidade qualitativa 1-5.",
      test_sequence: [
        "component test",
        "subsystem bench",
        "integrated ground test",
        "SIL/HIL",
        "low-risk flight",
        "envelope expansion",
        "mission validation",
      ],
    };
  }
  conops(r, d) {
    const phases = [
      "planejamento e autorização",
      "inspeção/pré-voo",
      "energização e health checks",
      "decolagem",
      "subida",
      "trânsito",
      "execução do payload",
      "retorno",
      "aproximação e pouso",
      "pós-voo",
    ];
    if (d.architecture === "VTOL lift+cruise")
      phases.splice(5, 0, "transição hover-cruzeiro");
    return {
      mission_objective: r.mission_type,
      operating_environment: {
        altitude_m_input: r.altitude_m,
        wind_mps_input: r.max_wind_mps,
        range_km_input: r.mission_range_km,
      },
      phases,
      contingencies: [
        "loss-link",
        "GNSS degradado",
        "bateria baixa",
        "vento acima do limite",
        "falha de payload",
        "pouso indisponível",
      ],
      abort_policy: "Definir limiares mensuráveis e ações por fase.",
      human_factors:
        "Definir papéis, checklist, handover e autoridade de abortagem.",
    };
  }
  requirements(r, d) {
    const margin = d.communications.illustrative_link_budget.margin_db,
      range = d.performance.wind_limited_out_and_back_range_km;
    const items = [
      {
        id: "REQ-MSN-001",
        requirement: `Executar missão ${r.mission_type}`,
        value: "CONOPS definido",
        verification: "análise + demonstração",
        status: "OPEN",
      },
      {
        id: "REQ-MASS-001",
        requirement: "MTOW dentro do limite",
        value: `${d.mass.mtow_est_kg} <= ${r.max_mtow_kg} kg`,
        verification: "análise + pesagem",
        status:
          d.mass.mtow_est_kg <= r.max_mtow_kg &&
          d.mass.iteration_converged &&
          !d.mass.constraint_limited
            ? "PASS"
            : "FAIL",
      },
      {
        id: "REQ-END-001",
        requirement: "Endurance com reserva",
        value: `meta ${r.target_endurance_min} min; calculada ${d.performance.achieved_endurance_min} min; reserva ${Math.round(r.reserve_fraction * 100)}%`,
        verification: "perfil de descarga + voo",
        status: d.energy_balance.status === "PASS" ? "ANALYSIS" : "FAIL",
      },
      {
        id: "REQ-RNG-001",
        requirement: "Raio e retorno",
        value: `${r.mission_range_km} km`,
        verification: "análise com vento + voo",
        status:
          range == null
            ? "ANALYSIS"
            : range >= r.mission_range_km
              ? "ANALYSIS"
              : "FAIL",
      },
      {
        id: "REQ-C2-001",
        requirement: "Manter C2",
        value: `margem ${margin} dB`,
        verification: "survey RF + teste",
        status: margin >= 10 ? "ANALYSIS" : "FAIL",
      },
      {
        id: "REQ-PAY-001",
        requirement: "Integrar payload",
        value: `${r.payload_mass_kg} kg / ${r.payload_power_w} W / ${r.payload_data_mbps} Mbps`,
        verification: "ICD + bancada + produto",
        status: "OPEN",
      },
      {
        id: "REQ-SAF-001",
        requirement: "Contingências seguras",
        value: "hazard log + abortagem",
        verification: "review + SIL/HIL",
        status: "OPEN",
      },
    ];
    if (d.airfoil_analysis)
      items.push({
        id: "REQ-AERO-001",
        requirement: "Validar perfil no Reynolds de missão",
        value: `${d.airfoil_analysis.selected.id} @ Re ${d.airfoil_analysis.reynolds}`,
        verification: "XFOIL/CFD correlacionado + dados experimentais + polar 3D",
        status: "ANALYSIS",
      });
    if (d.remote_sensing?.applicable)
      items.push({
        id: "REQ-RS-001",
        requirement: "Atender geometria e qualidade do imageamento",
        value: `GSD ${d.remote_sensing.mean_gsd_cm_px} cm/px; blur ${d.remote_sensing.motion_blur_px} px`,
        verification: "calibração + plano de voo + produto georreferenciado",
        status: d.remote_sensing.motion_blur_px <= 1 ? "ANALYSIS" : "FAIL",
      });
    return {
      schema: "requirement -> value -> verification -> status",
      items,
      pass_count: items.filter((x) => x.status === "PASS").length,
      fail_count: items.filter((x) => x.status === "FAIL").length,
      open_count: items.filter((x) => ["OPEN", "ANALYSIS"].includes(x.status))
        .length,
    };
  }
  assurance() {
    const open = (...required_evidence) => ({
      status: "OPEN",
      required_evidence,
    });
    return {
      flight_envelope: open(
        "V-n/casos de carga",
        "velocidade, vento, stall e recuperação",
        "temperatura/altitude",
      ),
      stability_and_control: open(
        "derivadas ou identificação",
        "margens estática/dinâmica",
        "autoridade e saturação",
      ),
      structures: open(
        "cargas e fator de segurança",
        "fadiga, vibração e flutter",
        "ensaio de prova",
      ),
      propulsion_energy: open(
        "mapa motor-hélice-ESC",
        "thrust stand",
        "descarga, térmica e envelhecimento",
      ),
      payload_remote_sensing: open(
        "sensor/lente e GSD",
        "FOV, overlap e motion blur",
        "calibração, trigger e time sync",
      ),
      communications: open(
        "antenas e polarização",
        "Fresnel/terreno/interferência",
        "latência, throughput e disponibilidade",
      ),
      autonomy_cooperation: {
        status: "NOT CLAIMED",
        required_evidence: [
          "incerteza",
          "deconfliction",
          "fallback seguro",
          "supervisão humana",
        ],
      },
      verification_validation: open(
        "matriz de conformidade",
        "SIL/HIL",
        "test cards",
        "configuração, anomalias e regressão",
      ),
      maturity_note:
        "Não calcula CFD, derivadas, flutter, taxas de falha ou certificação sem evidência.",
    };
  }
  sources() {
    return [
      [
        "SRC-01",
        "Advanced UAV Aerodynamics, Flight Stability and Control",
        "aerodinâmica, estabilidade, controle e flight test",
      ],
      [
        "SRC-02",
        "Introduction to UAV Systems",
        "arquitetura UAS, performance, C2, confiabilidade e testes",
      ],
      [
        "SRC-03",
        "UAV Cooperative Decision and Control",
        "path planning, incerteza e coordenação",
      ],
      [
        "SRC-04",
        "UAV Networks and Communications",
        "redes, throughput, latência e segurança",
      ],
      [
        "SRC-05",
        "UAV or Drones for Remote Sensing Applications",
        "sensores, GSD, calibração e produto",
      ],
      [
        "SRC-06",
        "Unmanned Aerial Vehicles Program Plan",
        "programa, interoperabilidade e aquisição",
      ],
      [
        "SRC-07",
        "UAV Roadmap 2000-2025",
        "maturidade, autonomia e confiabilidade",
      ],
      [
        "SRC-08",
        "Unmanned Air Systems: UAV Design, Development and Deployment",
        "design, estruturas, reliability e deployment",
      ],
      [
        "SRC-09",
        "AirfoilTools",
        "geometria de perfis e polares XFOIL 2D para triagem",
        "https://airfoiltools.com/",
      ],
      [
        "SRC-10",
        "MIT XFOIL",
        "método de análise e projeto de perfis subsônicos isolados",
        "https://web.mit.edu/drela/OldFiles/Public/web/xfoil/",
      ],
      [
        "SRC-11",
        "UIUC Airfoil Data Site",
        "coordenadas e dados experimentais de baixo Reynolds",
        "https://m-selig.ae.illinois.edu/ads/coord_database.html",
      ],
    ].map(([id, title, coverage, source_url = ""]) => ({
      id,
      title,
      coverage,
      source_url,
      use: "requisito, cálculo ou gate de assurance",
    }));
  }
  warnings(r, d) {
    const w = [];
    if (d.mass.mtow_est_kg > r.max_mtow_kg)
      w.push("MTOW conceitual excede o limite informado.");
    if (!d.mass.iteration_converged)
      w.push("A iteração de massa não convergiu.");
    if (d.mass.constraint_limited)
      w.push(
        "Não existe fechamento de massa dentro do MTOW máximo informado para esta meta; o resultado está mostrado no limite de massa e não é uma solução viável.",
      );
    if (d.energy_balance?.status === "FAIL")
      w.push(
        "A energia utilizável do pack selecionado não atende à autonomia solicitada com a reserva informada.",
      );
    const missing = Object.entries(d.selected_components)
      .filter(([, v]) => v == null)
      .map(([k]) => k);
    if (missing.length)
      w.push(`Catálogo sem componente compatível para: ${missing.join(", ")}.`);
    const templates = Object.entries(d.selected_components)
      .filter(([, v]) => v?.validation_status === "template")
      .map(([k]) => k);
    if (templates.length)
      w.push(
        `Seleção preliminar por classe de engenharia em: ${templates.join(", ")}; substituir por SKU e datasheet antes da revisão.`,
      );
    if (d.electrical?.battery?.part?.validation_status === "template")
      w.push(
        "Bateria selecionada é uma classe paramétrica; validar pack, células, BMS, descarga, térmica e segurança.",
      );
    if (d.communications.illustrative_link_budget.margin_db < 10)
      w.push("Margem de enlace ilustrativa abaixo de 10 dB.");
    if (
      d.performance.wind_limited_out_and_back_range_km != null &&
      d.performance.wind_limited_out_and_back_range_km < r.mission_range_km
    )
      w.push("Alcance conservador com vento não atende ao raio solicitado.");
    if (
      r.payload_data_mbps > 0 &&
      !d.bom.some((x) => x.reason === "Comunicação / enlace dedicado de payload")
    )
      w.push("Catálogo sem enlace dedicado que atenda simultaneamente throughput e alcance do payload.");
    if (
      [
        "Mapeamento / fotogrametria",
        "Agricultura multispectral",
        "Corredor / linha de transmissão",
      ].includes(r.mission_type)
    )
      {
        if (d.remote_sensing?.motion_blur_px > 1)
          w.push("Motion blur geométrico excede 1 pixel; reduzir exposição ou velocidade.");
        if (d.remote_sensing?.photo_interval_s < 0.5)
          w.push("Intervalo de disparo abaixo de 0,5 s; confirmar buffer, trigger e escrita sustentada.");
        w.push("GSD/overlap são preliminares; validar sensor, lente, relevo, calibração, orientação e georreferenciamento.");
      }
    if (d.airfoil_analysis?.domain === "CRITICAL_LOW_RE" || d.airfoil_analysis?.domain === "OUTSIDE_LOW")
      w.push("Reynolds em faixa crítica de separação laminar; perfil e acabamento exigem dados experimentais no Reynolds real.");
    if ((d.gust_analysis?.positive_load_factor ?? 0) > d.structural_precheck.limit_load_factor)
      w.push("Triagem de rajada de 5 m/s supera o fator de carga limite preliminar; revisar velocidade, wing loading e estrutura.");
    w.push(
      "Não fabricar ou voar sem validar propulsão, massa, CG, estrutura, térmica, controle e compatibilidade elétrica.",
    );
    return w;
  }
  verification(r, d) {
    const selected = Object.values(d.selected_components),
      complete = selected.length && selected.every(Boolean),
      hasTemplate =
        selected.some((x) => x?.validation_status === "template") ||
        d.electrical?.battery?.part?.validation_status === "template",
      checks = [
        { id: "inputs", status: "PASS", detail: "Entradas dentro do domínio." },
        {
          id: "mass_closure",
          status: d.mass.iteration_converged ? "PASS" : "FAIL",
          detail: "Fechamento iterativo de massa.",
        },
        {
          id: "catalog_match",
          status: !complete ? "FAIL" : hasTemplate ? "ANALYSIS" : "PASS",
          detail: !complete
            ? "Sem correspondência compatível."
            : hasTemplate
              ? "Compatibilidade paramétrica; selecionar SKU e validar datasheet."
              : "Correspondência por referência identificada.",
        },
        {
          id: "mtow_limit",
          status:
            d.mass.mtow_est_kg <= r.max_mtow_kg &&
            d.mass.iteration_converged &&
            !d.mass.constraint_limited
              ? "PASS"
              : "FAIL",
          detail: "MTOW dentro do limite.",
        },
        {
          id: "energy_reserve",
          status: d.energy_balance.status,
          detail: `Energia despachável após reserva de ${Math.round(r.reserve_fraction * 100)}%.`,
        },
        ...(d.airfoil_analysis
          ? [{
              id: "airfoil_reynolds",
              status: "ANALYSIS",
              detail: "Triagem 2D concluída; polar 3D, rugosidade, momento e stall permanecem abertos.",
            }]
          : []),
        {
          id: "engineering_release",
          status: "OPEN",
          detail: "Estrutura, propulsão, térmica, CG, controle e EMC.",
        },
        {
          id: "requirements_traceability",
          status: "OPEN",
          detail: "Fechar requisitos com evidência.",
        },
        {
          id: "flight_envelope",
          status: "OPEN",
          detail: "Envelope, dinâmica, controle, flutter e cargas.",
        },
      ];
    return {
      overall_status: checks.some((x) => x.status === "FAIL")
        ? "REVIEW REQUIRED"
        : "CONCEPT FEASIBLE - NOT RELEASED",
      failed_checks: checks.filter((x) => x.status === "FAIL").length,
      checks,
      model_level: "Class I conceptual sizing",
      release_authority: "Nenhuma; requer responsável técnico e V&V.",
    };
  }
  methodology() {
    return [
      "UAS tratado como air vehicle + GCS + payload + data link + suporte.",
      "Arquitetura selecionada por missão e trade-offs.",
      "Asa dimensionada por stall, AR, Reynolds e polar.",
      "Velocidade de estol é requisito independente; CLmax de projeto permanece conservador e separado do perfil 2D.",
      "Dados AirfoilTools/XFOIL são usados apenas para triagem 2D no Reynolds; não substituem a polar 3D da aeronave.",
      "Multirrotor por momentum theory no hover; voo horizontal adiciona arrasto parasita sobre uma área plana equivalente declarada.",
      "VTOL integra hover, transição e cruzeiro no balanço energético e aplica penalidades distintas de mecanismo/potência por arquitetura.",
      "Atmosfera ISA fornece densidade, temperatura e viscosidade por Sutherland para o Reynolds local.",
      "Reserva energética é a fração da energia utilizável que deve permanecer ao fim da missão.",
      "Payload integrado por massa, potência, dados, FOV e produto.",
      "Fotogrametria usa geometria nadir preliminar de GSD, footprint, overlap, trigger e motion blur.",
      "Heurísticas de massa, margens, AR e CD0/e permanecem não calibradas; o resultado publica uma faixa de incerteza, não somente um valor pontual.",
      "Motor e hélice são pré-selecionados por limites do catálogo; o conjunto permanece REQUIRES_TEST até existir mapa RPM/torque/corrente/CT/CP ou ensaio em thrust stand.",
    ];
  }
}
