const $ = selector => document.querySelector(selector);
const fmt = value => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value ?? 0);

function chartFrame(id, title, xLabel, yLabel) {
  const canvas = $(id), ctx = canvas.getContext("2d"), { width, height } = canvas;
  const plot = { left: 82, right: width - 34, top: 58, bottom: height - 66 };
  ctx.clearRect(0, 0, width, height); ctx.fillStyle = "#090b0d"; ctx.fillRect(0, 0, width, height);
  ctx.font = "600 18px Inter Tight"; ctx.fillStyle = "#e3e6e7"; ctx.fillText(title, plot.left, 30);
  ctx.font = "12px Inter Tight"; ctx.fillStyle = "#7d858b"; ctx.fillText(xLabel, plot.right - 100, height - 18); ctx.fillText(yLabel, 20, 30);
  ctx.strokeStyle = "#252a2f"; ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) { const y = plot.top + i * (plot.bottom - plot.top) / 5; ctx.beginPath(); ctx.moveTo(plot.left, y); ctx.lineTo(plot.right, y); ctx.stroke(); }
  return { canvas, ctx, width, height, plot };
}

function lineChart(id, data, xKey, yKey, title, xLabel, yLabel) {
  const frame = chartFrame(id, title, xLabel, yLabel), { ctx, plot } = frame;
  if (!data?.length) return;
  const xs = data.map(d => Number(d[xKey])), ys = data.map(d => Number(d[yKey]));
  const xmin = Math.min(...xs), xmax = Math.max(...xs), ymin = Math.min(...ys), ymax = Math.max(...ys);
  const px = value => plot.left + (value - xmin) / (xmax - xmin || 1) * (plot.right - plot.left);
  const py = value => plot.bottom - (value - ymin) / (ymax - ymin || 1) * (plot.bottom - plot.top);
  ctx.fillStyle = "rgba(142,31,44,.15)"; ctx.beginPath(); ctx.moveTo(px(xs[0]), plot.bottom);
  data.forEach(d => ctx.lineTo(px(d[xKey]), py(d[yKey]))); ctx.lineTo(px(xs.at(-1)), plot.bottom); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#a72d39"; ctx.lineWidth = 4; ctx.beginPath(); data.forEach((d, i) => i ? ctx.lineTo(px(d[xKey]), py(d[yKey])) : ctx.moveTo(px(d[xKey]), py(d[yKey]))); ctx.stroke();
  ctx.fillStyle = "#e9ebec"; for (const d of data) { ctx.beginPath(); ctx.arc(px(d[xKey]), py(d[yKey]), 4, 0, Math.PI * 2); ctx.fill(); }
  ctx.font = "12px Inter Tight"; ctx.fillStyle = "#858d93";
  for (let i = 0; i <= 5; i++) { const value = ymax - i * (ymax - ymin) / 5; ctx.fillText(fmt(value), 20, plot.top + i * (plot.bottom - plot.top) / 5 + 4); }
  ctx.fillText(fmt(xmin), plot.left, plot.bottom + 24); ctx.fillText(fmt(xmax), plot.right - 28, plot.bottom + 24);
  const peak = data.reduce((best, d) => d[yKey] > best[yKey] ? d : best, data[0]);
  ctx.fillStyle = "#d7dbdd"; ctx.fillText(`máx. ${fmt(peak[yKey])} ${yLabel}`, plot.right - 150, plot.top + 20);
}

function massDonut(id, items, title) {
  const { ctx, width, height } = chartFrame(id, title, "", "kg"), total = items.reduce((s, x) => s + x.value, 0) || 1;
  const cx = width * .34, cy = height * .55, radius = Math.min(width, height) * .25, colors = ["#a72d39", "#626a71", "#30363b"];
  let angle = -Math.PI / 2;
  items.forEach((item, index) => { const next = angle + item.value / total * Math.PI * 2; ctx.beginPath(); ctx.strokeStyle = colors[index]; ctx.lineWidth = radius * .34; ctx.arc(cx, cy, radius, angle, next); ctx.stroke(); angle = next; });
  ctx.textAlign = "center"; ctx.fillStyle = "#f1f2f3"; ctx.font = "500 34px Inter Tight"; ctx.fillText(`${fmt(total)} kg`, cx, cy + 5); ctx.font = "11px Inter Tight"; ctx.fillStyle = "#818a90"; ctx.fillText("MTOW ESTIMADO", cx, cy + 28); ctx.textAlign = "left";
  items.forEach((item, index) => { const y = 130 + index * 62; ctx.fillStyle = colors[index]; ctx.fillRect(width * .66, y, 14, 14); ctx.fillStyle = "#d8dbdd"; ctx.font = "500 14px Inter Tight"; ctx.fillText(item.label, width * .66 + 24, y + 12); ctx.fillStyle = "#858e94"; ctx.font = "12px Inter Tight"; ctx.fillText(`${fmt(item.value)} kg · ${fmt(item.value / total * 100)}%`, width * .66 + 24, y + 34); });
}

export function drawAdvanced(result) {
  const canvas = $("#aircraftCanvas"), ctx = canvas.getContext("2d"), { width, height } = canvas, cx = width / 2, cy = height / 2 + 15, scale = Math.min(width, height) / 440;
  ctx.clearRect(0, 0, width, height); ctx.fillStyle = "#080a0c"; ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#1d2226"; ctx.lineWidth = 1; for (let x = 40; x < width; x += 50) { ctx.beginPath(); ctx.moveTo(x, 45); ctx.lineTo(x, height - 35); ctx.stroke(); } for (let y = 45; y < height; y += 50) { ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(width - 40, y); ctx.stroke(); }
  ctx.strokeStyle = "#c8cdd0"; ctx.fillStyle = "#252a2f"; ctx.lineWidth = 3;
  if (result.architecture === "Multirrotor") {
    const count = result.configuration.rotor_count, radius = 125 * scale, rotor = (count === 2 ? 58 : 34) * scale;
    for (let i = 0; i < count; i++) { const angle = 2 * Math.PI * i / count - Math.PI / 2, px = cx + radius * Math.cos(angle), py = cy + radius * Math.sin(angle); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke(); ctx.beginPath(); ctx.arc(px, py, rotor, 0, Math.PI * 2); ctx.stroke(); if (result.configuration.coaxial) { ctx.strokeStyle = "#a72d39"; ctx.beginPath(); ctx.arc(px, py, rotor - 9 * scale, 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = "#c8cdd0"; } ctx.fillStyle = "#8b9399"; ctx.font = `${12 * scale}px Inter Tight`; ctx.fillText(`M${i + 1}`, px - 10, py + 4); }
    ctx.fillStyle = "#30363b"; ctx.fillRect(cx - 34 * scale, cy - 34 * scale, 68 * scale, 68 * scale);
  } else {
    const layout = result.configuration.wing_layout || result.configuration.family || "Convencional", span = 300 * scale;
    ctx.beginPath();
    if (layout.includes("Delta")) { ctx.moveTo(cx, cy - 130 * scale); ctx.lineTo(cx - span, cy + 115 * scale); ctx.lineTo(cx + span, cy + 115 * scale); }
    else if (layout.includes("Asa voadora")) { ctx.moveTo(cx, cy - 45 * scale); ctx.lineTo(cx - span, cy + 90 * scale); ctx.lineTo(cx - 115 * scale, cy - 52 * scale); ctx.lineTo(cx, cy - 8 * scale); ctx.lineTo(cx + 115 * scale, cy - 52 * scale); ctx.lineTo(cx + span, cy + 90 * scale); }
    else { ctx.moveTo(cx - span, cy); ctx.lineTo(cx - 82 * scale, cy - 62 * scale); ctx.lineTo(cx + span, cy); ctx.lineTo(cx + 82 * scale, cy + 62 * scale); }
    ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#3b4146"; ctx.fillRect(cx - 18 * scale, cy - 140 * scale, 36 * scale, 280 * scale);
    if (layout.includes("Canard")) ctx.fillRect(cx - 105 * scale, cy - 105 * scale, 210 * scale, 15 * scale); else if (layout.includes("Tandem")) ctx.fillRect(cx - 190 * scale, cy - 105 * scale, 380 * scale, 28 * scale); else if (!layout.includes("Asa voadora") && !layout.includes("Delta")) ctx.fillRect(cx - 120 * scale, cy + 105 * scale, 240 * scale, 20 * scale);
    if (layout.includes("Twin-boom")) { ctx.fillRect(cx - 105 * scale, cy - 35 * scale, 12 * scale, 170 * scale); ctx.fillRect(cx + 93 * scale, cy - 35 * scale, 12 * scale, 170 * scale); }
    if (result.architecture.startsWith("VTOL")) { ctx.strokeStyle = "#a72d39"; for (const dx of [-145, 145]) for (const dy of [-52, 52]) { ctx.beginPath(); ctx.arc(cx + dx * scale, cy + dy * scale, 27 * scale, 0, Math.PI * 2); ctx.stroke(); } }
    ctx.strokeStyle = "#a72d39"; ctx.beginPath(); ctx.moveTo(cx, cy - 150 * scale); ctx.lineTo(cx, cy + 150 * scale); ctx.stroke();
  }
  ctx.fillStyle = "#d8dcde"; ctx.font = "600 18px Inter Tight"; ctx.fillText(result.configuration.family, 38, 30); ctx.fillStyle = "#7d868c"; ctx.font = "12px Inter Tight"; ctx.fillText(`MTOW ${fmt(result.mass.mtow_est_kg)} kg · representação paramétrica`, 38, 50);
}

export function drawCharts(result) {
  const analysis = result.analysis_data || {};
  if (result.architecture === "Multirrotor") { lineChart("#chart1", analysis.disk_curve, "diameter_in", "hover_power_w", "Diâmetro de hélice × potência de hover", "diâmetro (in)", "W"); lineChart("#chart2", analysis.endurance_curve, "payload_factor", "endurance_min", "Carga relativa × endurance", "fator de carga", "min"); }
  else { lineChart("#chart1", analysis.drag_polar, "cd", "cl", "Polar de arrasto CD × CL", "CD", "CL"); if (result.architecture.startsWith("VTOL") && analysis.transition_profile) lineChart("#chart2", analysis.transition_profile.map((d, i) => ({ phase: i, power_w: d.power_w })), "phase", "power_w", "Perfil energético da transição", "fase", "W"); else lineChart("#chart2", analysis.power_curve, "speed_mps", "power_w", "Potência requerida × velocidade", "m/s", "W"); }
  massDonut("#massChart", [{ label: "Payload", value: result.mass.payload_kg }, { label: "Bateria", value: result.mass.battery_kg }, { label: "Estrutura e sistemas", value: result.mass.airframe_est_kg ?? Math.max(0, result.mass.mtow_est_kg - result.mass.payload_kg - result.mass.battery_kg) }], "Distribuição estimada de massa");
  lineChart("#airfoilChart", analysis.airfoil_efficiency, "reynolds", "max_cl_cd_2d", "Eficiência 2D máxima × Reynolds", "Reynolds", "CL/CD 2D");
}
