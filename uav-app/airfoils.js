const RE_GRID = [50000, 100000, 200000, 500000, 1000000];
const polar = (values) => RE_GRID.map((reynolds, i) => ({ reynolds, max_cl_cd_2d: values[i] }));

export const AIRFOILS = [
  { id:"SD7032", airfoiltools_id:"sd7032-il", name:"Selig/Donovan SD7032", thickness_pct:10, camber_pct:3.4, role:["general","endurance"], clmax_reference:1.5, clmax_reference_reynolds:null, polar_ncrit9:polar([31.9,56.3,77.9,105.4,125.3]), note:"Baixo Reynolds, geometria relativamente simples e bom desempenho em ampla faixa de CL." },
  { id:"S1223", airfoiltools_id:"s1223-il", name:"Selig S1223", thickness_pct:12.1, camber_pct:8.1, role:["high-lift","slow-flight"], clmax_reference:2.2, clmax_reference_reynolds:150000, polar_ncrit9:polar([33.1,54.5,73.6,98.8,121.4]), note:"Alto CLmax, mas elevada curvatura, momento e complexidade de fabricação." },
  { id:"NACA2412", airfoiltools_id:"naca2412-il", name:"NACA 2412", thickness_pct:12, camber_pct:2, role:["general","training"], polar_ncrit9:polar([32.5,50,66.6,87.3,101.4]), note:"Perfil convencional de referência; desempenho deve ser confirmado no Reynolds real." },
  { id:"MH32", airfoiltools_id:"mh32-il", name:"Martin Hepperle MH 32", thickness_pct:8.7, camber_pct:2.3, role:["endurance","speed"], polar_ncrit9:polar([35.2,53.9,72.3,94.7,109.3]), note:"Perfil fino para eficiência/velocidade; verificar rigidez e volume estrutural." },
  { id:"AG35", airfoiltools_id:"ag35-il", name:"Drela AG35", thickness_pct:8.7, camber_pct:2.3, role:["endurance","low-re"], polar_ncrit9:polar([32.3,50.5,68.5,90.8,105.2]), note:"Perfil de baixo Reynolds; verificar sensibilidade a acabamento e transição." },
  { id:"CLARKY", airfoiltools_id:"clarky-il", name:"Clark Y", thickness_pct:11.7, camber_pct:3.4, role:["general","manufacturing"], polar_ncrit9:polar([29.6,53,73.2,98.7,114.8]), note:"Base inferior favorável à fabricação; não assumir desempenho fora do Reynolds analisado." },
  { id:"E423", airfoiltools_id:"e423-il", name:"Eppler E423", thickness_pct:12.5, camber_pct:9.5, role:["high-lift"], polar_ncrit9:polar([6,12.5,73.7,123.4,156.5]), note:"Alto lift, mas a convergência XFOIL em Reynolds muito baixo exige cautela e ensaio." },
  { id:"NACA0012", airfoiltools_id:"n0012-il", name:"NACA 0012", thickness_pct:12, camber_pct:0, role:["symmetric","tail"], polar_ncrit9:polar([25.7,36.7,47.4,61.7,75.6]), note:"Simétrico; útil como referência e em superfícies de cauda, não como escolha automática de asa eficiente." },
  { id:"MH60", airfoiltools_id:"mh60-il", name:"Martin Hepperle MH 60", thickness_pct:10.1, camber_pct:1.7, role:["reflex","flying-wing"], polar_ncrit9:polar([27.5,45,61.4,82.8,98.3]), note:"Perfil reflexo para asa voadora; estabilidade ainda requer análise de momento e ponto neutro." },
];

const logInterpolate=(points,re)=>{
  const bounded=Math.max(points[0].reynolds,Math.min(points.at(-1).reynolds,re));
  const hi=Math.max(1,points.findIndex(x=>x.reynolds>=bounded)),lo=hi-1,a=points[lo],b=points[hi];
  const t=(Math.log(bounded)-Math.log(a.reynolds))/(Math.log(b.reynolds)-Math.log(a.reynolds));
  return a.max_cl_cd_2d+t*(b.max_cl_cd_2d-a.max_cl_cd_2d);
};

export function airfoilAdvisor({ reynolds, layout, missionType, preferred="Automático" }) {
  let candidates=AIRFOILS.filter(x=>!x.role.includes("tail")&&!x.role.includes("symmetric"));
  if(["Asa voadora","Delta"].includes(layout))candidates=AIRFOILS.filter(x=>x.role.includes("flying-wing"));
  const scored=candidates.map(x=>{
    let score=logInterpolate(x.polar_ncrit9,reynolds);
    if(missionType==="Mapeamento / fotogrametria"&&x.role.includes("endurance"))score+=8;
    if(missionType==="Corredor / linha de transmissão"&&x.role.includes("endurance"))score+=8;
    if(["Busca e salvamento","Inspeção de infraestrutura"].includes(missionType)&&x.role.includes("high-lift"))score+=8;
    if(reynolds<75000&&x.id==="E423")score-=30;
    return{...x,score,max_cl_cd_2d_at_re:Number(logInterpolate(x.polar_ncrit9,reynolds).toFixed(1))};
  }).sort((a,b)=>b.score-a.score);
  const requested=preferred!=="Automático"?scored.find(x=>x.id===preferred):null,
    selected=requested??scored[0],
    preferredStatus=preferred==="Automático"?"AUTO":requested?"HONORED":"OVERRIDDEN_FOR_LAYOUT";
  const domain=reynolds<30000?"OUTSIDE_LOW":reynolds<70000?"CRITICAL_LOW_RE":reynolds<=500000?"SMALL_UAV_LOW_RE":reynolds<=1000000?"AVAILABLE_XFOIL_GRID":"EXTRAPOLATION_PROHIBITED";
  return {selected:{...selected,score:undefined},alternatives:scored.slice(0,5).map(x=>({id:x.id,name:x.name,max_cl_cd_2d_at_re:x.max_cl_cd_2d_at_re,score:Number(x.score.toFixed(1))})),reynolds:Math.round(reynolds),domain,preferred_status:preferredStatus,model:"AirfoilTools XFOIL Ncrit=9, Mach=0; interpolação logarítmica apenas para triagem",warning:"CL/CD 2D não substitui a polar 3D da aeronave. Confirmar transição, rugosidade, momento, stall e dados de túnel/CFD."};
}

export const AIRFOIL_OPTIONS=["Automático",...AIRFOILS.filter(x=>!x.role.includes("tail")&&!x.role.includes("symmetric")).map(x=>x.id)];
