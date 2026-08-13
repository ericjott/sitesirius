import { drawAdvanced, drawCharts } from "./charts.js";
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
let result = null,
  catalog = [],
  catalogMeta = {},
  catalogFit = new Map();
const fields = [
  ["project_name", "Nome do projeto", "text"],
  [
    "mission_type",
    "Tipo de missão",
    "select",
    [
      "Mapeamento / fotogrametria",
      "Agricultura multispectral",
      "Inspeção de infraestrutura",
      "Monitoramento ambiental",
      "Corredor / linha de transmissão",
      "Busca e salvamento",
      "Comunicação / relay",
      "Pesquisa / plataforma experimental",
    ],
  ],
  [
    "preferred_architecture",
    "Arquitetura principal",
    "select",
    ["Automático", "Asa fixa", "Multirrotor", "VTOL lift+cruise"],
  ],
  [
    "fixed_wing_layout",
    "Configuração da asa",
    "select",
    [
      "Automático",
      "Convencional",
      "Twin-boom",
      "Canard",
      "Asa voadora",
      "Delta",
      "Tandem",
    ],
  ],
  [
    "rotor_layout",
    "Configuração dos rotores",
    "select",
    [
      "Automático",
      "Tricóptero 3",
      "Quad X 4",
      "Hexa X 6",
      "Octo X 8",
      "Y6 coaxial 6",
      "X8 coaxial 8",
      "Coaxial 2",
    ],
  ],
  [
    "vtol_layout",
    "Configuração VTOL",
    "select",
    ["Lift+cruise", "Tilt-rotor", "Tilt-wing"],
  ],
  ["payload_mass_kg", "Massa do payload (kg)", "number"],
  ["payload_power_w", "Potência do payload (W)", "number"],
  ["payload_data_mbps", "Dados do payload (Mbps)", "number"],
  ["target_endurance_min", "Endurance desejada (min)", "number"],
  ["mission_range_km", "Raio / distância do link (km)", "number"],
  ["corridor_length_km", "Comprimento do corredor (km)", "number"],
  ["area_km2", "Área da missão (km²)", "number"],
  ["cruise_speed_kmh", "Velocidade de cruzeiro (km/h)", "number"],
  ["stall_speed_mps", "Velocidade de estol requerida (m/s)", "number"],
  ["altitude_m", "Altitude para atmosfera ISA (m)", "number"],
  ["mission_agl_m", "Altura da missão AGL (m)", "number"],
  ["max_wind_mps", "Vento máximo (m/s)", "number"],
  ["hover_required", "Precisa pairar?", "checkbox"],
  ["runway_available", "Há pista disponível?", "checkbox"],
  ["launch_area_m", "Área livre para lançamento (m)", "number"],
  ["precision_cm", "Precisão de posicionamento (cm)", "number"],
  ["redundancy", "Redundância", "select", ["Normal", "Alta"]],
  ["max_mtow_kg", "MTOW máximo (kg)", "number"],
  ["radio_frequency_mhz", "Frequência RF para cálculo (MHz)", "number"],
  ["reserve_fraction", "Reserva energética (fração)", "number"],
  [
    "preferred_airfoil",
    "Perfil aerodinâmico",
    "select",
    ["Automático", "SD7032", "S1223", "NACA2412", "MH32", "AG35", "CLARKY", "E423", "MH60"],
  ],
  ["sensor_width_mm", "Sensor · largura (mm)", "number"],
  ["sensor_height_mm", "Sensor · altura (mm)", "number"],
  ["image_width_px", "Imagem · largura (px)", "number"],
  ["image_height_px", "Imagem · altura (px)", "number"],
  ["focal_length_mm", "Distância focal (mm)", "number"],
  ["exposure_time_ms", "Tempo de exposição (ms)", "number"],
  ["front_overlap_pct", "Sobreposição longitudinal (%)", "number"],
  ["side_overlap_pct", "Sobreposição lateral (%)", "number"],
  ["tx_power_dbm", "Potência TX (dBm)", "number"],
  ["tx_gain_dbi", "Ganho antena TX (dBi)", "number"],
  ["rx_gain_dbi", "Ganho antena RX (dBi)", "number"],
  ["receiver_sensitivity_dbm", "Sensibilidade RX (dBm)", "number"],
  ["link_losses_db", "Perdas agregadas do enlace (dB)", "number"],
];
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const LABELS = {
  family: "Família",
  wing_layout: "Configuração de asa",
  tail_arrangement: "Arranjo de cauda",
  layout_guidance: "Diretriz da configuração",
  propulsion: "Propulsão",
  airfoil_selected: "Perfil selecionado",
  airfoil_source: "Fonte do perfil",
  airfoil_thickness_pct: "Espessura do perfil (%)",
  airfoil_camber_pct: "Curvatura do perfil (%)",
  airfoil_2d_max_cl_cd_at_re: "Máx. CL/CD 2D no Reynolds",
  airfoil_model_status: "Domínio do Reynolds",
  airfoil_guidance: "Limite do modelo aerodinâmico",
  area_m2: "Área alar (m²)",
  span_m: "Envergadura (m)",
  mean_chord_m: "Corda média (m)",
  root_chord_m: "Corda de raiz (m)",
  tip_chord_m: "Corda de ponta (m)",
  mac_m: "Corda média aerodinâmica (m)",
  taper: "Afilamento",
  aspect_ratio: "Alongamento",
  fuselage_length_m: "Comprimento da fuselagem (m)",
  tail_arm_m: "Braço de cauda (m)",
  prop_diameter_in: "Diâmetro da hélice (pol.)",
  cruise_prop_diameter_in: "Hélice de cruzeiro (pol.)",
  horizontal_tail_area_m2: "Área da cauda horizontal (m²)",
  foreplane_area_initial_m2: "Área inicial do canard (m²)",
  forward_wing_area_initial_m2: "Área inicial da asa dianteira (m²)",
  aft_wing_area_initial_m2: "Área inicial da asa traseira (m²)",
  vertical_tail_area_m2: "Área da cauda vertical (m²)",
  stability_guidance: "Diretriz de estabilidade",
  static_margin_target: "Margem estática alvo",
  structural_status: "Status estrutural",
  structural_limit_load_n: "Carga limite estrutural (N)",
  structural_ultimate_load_n: "Carga última estrutural (N)",
  root_bending_moment_est_nm: "Momento estimado na raiz (N·m)",
  selected: "Selecionado",
  reynolds: "Número de Reynolds",
  domain: "Domínio",
  preferred_status: "Status da preferência",
  max_cl_cd_2d_at_re: "Máx. CL/CD 2D no Reynolds",
  thickness_pct: "Espessura (%)",
  camber_pct: "Curvatura (%)",
  model: "Modelo",
  warning: "Limitação",
  reserve_fraction: "Reserva energética",
  q_pa: "Pressão dinâmica q (Pa)",
  cl_cruise: "CL no cruzeiro",
  cd_cruise: "CD no cruzeiro",
  cd0: "CD0 parasita",
  k: "Coeficiente de arrasto induzido",
  drag_n: "Arrasto no cruzeiro (N)",
  ld: "L/D no cruzeiro",
  re_mac: "Reynolds na MAC",
  cl_max_ld: "CL de máximo L/D",
  cl_min_power: "CL de potência mínima",
  speed_max_ld_mps: "Velocidade de máximo L/D (m/s)",
  speed_min_power_mps: "Velocidade de potência mínima (m/s)",
  ld_max: "L/D máximo",
  air_density_kg_m3: "Densidade do ar (kg/m³)",
  air_dynamic_viscosity_pa_s: "Viscosidade dinâmica do ar (Pa·s)",
  air_temperature_k: "Temperatura ISA (K)",
  wing_loading_n_m2: "Carga alar (N/m²)",
  stall_speed_mps: "Velocidade de estol (m/s)",
  cruise_mps: "Velocidade de cruzeiro (m/s)",
  stall_margin_ratio: "Razão cruzeiro/estol",
  still_air_range_km: "Alcance sem vento (km)",
  wind_limited_out_and_back_range_km: "Raio ida e volta com vento (km)",
  turn_radius_30deg_m: "Raio de curva a 30° (m)",
  max_electrical_power_w: "Potência elétrica máxima (W)",
  forward_flight_power_w: "Potência estimada em voo horizontal (W)",
  forward_flight_flat_plate_area_m2: "Área plana equivalente estimada (m²)",
  forward_power_model: "Modelo de potência horizontal",
  transition_power_w: "Potência de transição (W)",
  transition_duration_min: "Duração de transição considerada (min)",
  transition_efficiency_factor: "Eficiência relativa de transição",
  mechanism_mass_allowance_kg: "Massa reservada ao mecanismo (kg)",
  non_cruise_duration_min: "Duração fora do cruzeiro (min)",
  non_cruise_energy_wh: "Energia fora do cruzeiro (Wh)",
  gust_5mps_delta_load_factor: "Incremento de carga por rajada de 5 m/s",
  gust_5mps_positive_load_factor: "Fator de carga com rajada de 5 m/s",
  required_servo_torque_kgcm: "Torque requerido por servo (kg·cm)",
  battery_part: "Bateria selecionada",
  parallel_packs: "Packs em paralelo",
  usable_energy_wh: "Energia utilizável (Wh)",
  dispatchable_energy_after_reserve_wh: "Energia despachável após reserva (Wh)",
  usable_pack_wh: "Energia utilizável do pack (Wh)",
  reserve_policy_fraction: "Política de reserva",
  mission_power_w: "Potência de missão (W)",
  hover_allowance_wh: "Energia reservada para hover (Wh)",
  non_cruise_allowance_wh: "Energia reservada para hover/transição (Wh)",
  achieved_endurance_min: "Autonomia calculada (min)",
  target_endurance_min: "Autonomia requerida (min)",
  endurance_energy_margin_pct: "Margem de autonomia (%)",
  model_status: "Status do modelo",
  altitude_agl_m: "Altura AGL (m)",
  footprint_width_m: "Largura da faixa (m)",
  footprint_height_m: "Comprimento da imagem no solo (m)",
  gsd_width_cm_px: "GSD transversal (cm/px)",
  gsd_height_cm_px: "GSD longitudinal (cm/px)",
  mean_gsd_cm_px: "GSD médio (cm/px)",
  line_spacing_m: "Espaçamento entre faixas (m)",
  along_track_spacing_m: "Espaçamento longitudinal (m)",
  photo_interval_s: "Intervalo entre fotos (s)",
  trigger_rate_hz: "Taxa de disparo (Hz)",
  motion_blur_cm: "Arrasto da imagem (cm)",
  motion_blur_px: "Motion blur (px)",
  nominal_photos_per_km2: "Fotos nominais por km²",
  front_overlap_pct: "Sobreposição longitudinal (%)",
  side_overlap_pct: "Sobreposição lateral (%)",
  area_input_km2: "Área informada (km²)",
  estimated_photos_for_area: "Fotos estimadas para a área",
  note: "Observação",
  applicable: "Aplicável",
  status: "Status",
};
const label = (k) =>
  LABELS[k] ?? k.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
const fmt = (v) =>
  typeof v === "number"
    ? new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(v)
    : typeof v === "boolean"
      ? v
        ? "Sim"
        : "Não"
      : String(v ?? "—");
const FIELD_HELP = {
  project_name:"Identificação usada no relatório e no nome do arquivo JSON exportado.", mission_type:"Define o perfil operacional e ativa os parâmetros aplicáveis à missão.", preferred_architecture:"Permite deixar o sistema comparar as arquiteturas ou restringir a análise a uma configuração.", fixed_wing_layout:"Arranjo aerodinâmico da asa e da empenagem usado no pré-dimensionamento geométrico.", rotor_layout:"Quantidade e disposição dos rotores; afeta empuxo, potência, redundância e massa.", vtol_layout:"Mecanismo adotado para combinar decolagem vertical e voo de cruzeiro.", payload_mass_kg:"Massa total da carga útil transportada, incluindo suportes e acessórios dedicados.", payload_power_w:"Potência elétrica contínua consumida pela carga útil durante a missão.", payload_data_mbps:"Taxa de dados produzida pelo payload, usada para avaliar armazenamento e enlace.", target_endurance_min:"Tempo total de voo requerido, já considerando as fases previstas da missão.", mission_range_km:"Maior distância operacional até a estação, usada nos cálculos de alcance e enlace RF.", corridor_length_km:"Extensão linear total a ser inspecionada em missões de corredor.", area_km2:"Área de cobertura planejada para estimar linhas, imagens e duração da aquisição.", cruise_speed_kmh:"Velocidade nominal no trecho principal; influencia arrasto, potência e produtividade.", stall_speed_mps:"Velocidade máxima de estol aceitável, usada para limitar carga e área alar.", altitude_m:"Altitude em relação ao nível do mar usada no modelo atmosférico ISA.", mission_agl_m:"Altura de operação acima do terreno, usada na resolução e faixa do sensoriamento.", max_wind_mps:"Maior vento operacional considerado para alcance, controle e retorno seguro.", hover_required:"Indica se a missão exige voo pairado sustentado, influenciando a seleção da arquitetura.", runway_available:"Informa se há pista adequada para lançamento e recuperação da aeronave.", launch_area_m:"Dimensão linear aproximada da área disponível para decolagem ou lançamento.", precision_cm:"Precisão de posicionamento requerida; orienta GNSS, RTK e requisitos de navegação.", redundancy:"Nível de tolerância a falhas desejado para propulsão, energia, navegação e comunicação.", max_mtow_kg:"Limite máximo permitido para a massa total de decolagem do conceito.", radio_frequency_mhz:"Frequência central usada no cálculo preliminar de propagação do enlace.", reserve_fraction:"Parcela da energia que não deve ser consumida na missão normal. Exemplo: 0,20 equivale a 20%.", preferred_airfoil:"Perfil aerodinâmico preferido; em Automático o sistema seleciona conforme Reynolds e missão.", sensor_width_mm:"Largura física da área ativa do sensor de imagem.", sensor_height_mm:"Altura física da área ativa do sensor de imagem.", image_width_px:"Resolução horizontal da imagem produzida pelo sensor.", image_height_px:"Resolução vertical da imagem produzida pelo sensor.", focal_length_mm:"Distância focal da lente, determinante para campo de visão e GSD.", exposure_time_ms:"Tempo do obturador, usado para estimar o arrasto de imagem durante o voo.", front_overlap_pct:"Sobreposição entre imagens consecutivas na direção do voo.", side_overlap_pct:"Sobreposição entre faixas de voo adjacentes.", tx_power_dbm:"Potência entregue pelo transmissor ao sistema de antena, expressa em dBm.", tx_gain_dbi:"Ganho da antena transmissora em relação a uma antena isotrópica.", rx_gain_dbi:"Ganho da antena receptora usado no orçamento do enlace.", receiver_sensitivity_dbm:"Menor nível de sinal que o receptor consegue demodular na taxa prevista.", link_losses_db:"Soma das perdas adicionais em cabos, conectores, polarização, instalação e margem ambiental."
};
const RESULT_HELP_BY_KEY = {
  family:"Família de aeronave adotada pelo motor de arquitetura. Define quais modelos de sustentação, propulsão, energia e geometria serão aplicados.",
  wing_layout:"Arranjo planform e estrutural selecionado para a asa. A configuração altera estabilidade, volume interno, arrasto e integração da propulsão.",
  tail_arrangement:"Configuração preliminar das superfícies de cauda responsáveis por estabilidade e controle longitudinal e direcional.",
  layout_guidance:"Orientação de integração gerada para o arranjo escolhido. Deve ser confirmada por estabilidade, controle, estrutura e ensaios.",
  propulsion:"Arquitetura propulsiva usada nos cálculos de potência, energia e compatibilidade dos componentes.",
  airfoil_selected:"Perfil aerodinâmico selecionado para a faixa de Reynolds prevista. A escolha ainda exige análise viscosa e validação tridimensional.",
  airfoil_source:"Origem dos dados geométricos ou aerodinâmicos utilizados para caracterizar o perfil.",
  airfoil_thickness_pct:"Espessura máxima do perfil dividida pela corda. Influencia volume estrutural, arrasto, rigidez e comportamento de estol.",
  airfoil_camber_pct:"Curvatura máxima relativa do perfil. Afeta sustentação em ângulo nulo, momento de arfagem e eficiência.",
  airfoil_2d_max_cl_cd_at_re:"Maior razão sustentação/arrasto obtida na polar bidimensional para o Reynolds calculado. Não inclui efeitos da asa finita.",
  airfoil_model_status:"Indica se o número de Reynolds está dentro da faixa de aplicação dos dados do perfil ou se há extrapolação.",
  airfoil_guidance:"Limitações e verificações recomendadas antes de consolidar o perfil no projeto aerodinâmico.",
  area_m2:"Área alar de referência estimada a partir de massa, velocidade de estol, densidade e sustentação máxima adotada.",
  span_m:"Envergadura resultante da área alar e do alongamento. Impacta eficiência induzida, estrutura e manobrabilidade.",
  mean_chord_m:"Corda geométrica média usada como referência inicial de dimensões e Reynolds.",
  root_chord_m:"Corda calculada na raiz da asa, região normalmente submetida aos maiores esforços de flexão.",
  tip_chord_m:"Corda calculada na ponta da asa. Em conjunto com a raiz, define o afilamento e a distribuição de sustentação.",
  mac_m:"Corda média aerodinâmica usada como referência para centro de gravidade, margem estática e momentos.",
  taper:"Razão entre corda de ponta e corda de raiz. Influencia distribuição de carga, eficiência e tendência de estol.",
  aspect_ratio:"Quadrado da envergadura dividido pela área alar. Valores maiores reduzem arrasto induzido, mas elevam exigência estrutural.",
  fuselage_length_m:"Comprimento conceitual da fuselagem estimado para acomodação, estabilidade e integração dos subsistemas.",
  tail_arm_m:"Distância entre a referência aerodinâmica da asa e a cauda. Determina a alavanca disponível para estabilidade e controle.",
  prop_diameter_in:"Diâmetro preliminar da hélice associado ao regime de empuxo e potência previsto.",
  cruise_prop_diameter_in:"Diâmetro preliminar da hélice de cruzeiro, sujeito à validação com mapa motor–hélice e limites de ponta.",
  horizontal_tail_area_m2:"Área inicial da empenagem horizontal estimada por coeficiente de volume de cauda.",
  foreplane_area_initial_m2:"Área conceitual do canard. Exige fechamento de estabilidade longitudinal, incidências e estol coordenado.",
  forward_wing_area_initial_m2:"Parcela inicial de área atribuída à asa dianteira em uma configuração tandem.",
  aft_wing_area_initial_m2:"Parcela inicial de área atribuída à asa traseira em uma configuração tandem.",
  vertical_tail_area_m2:"Área inicial da superfície vertical para estabilidade direcional e autoridade de guinada.",
  stability_guidance:"Critérios de estabilidade e controle que precisam ser fechados após a geometria conceitual.",
  static_margin_target:"Faixa alvo entre centro de gravidade e ponto neutro, expressa como fração da corda média aerodinâmica.",
  structural_status:"Resultado da triagem estrutural preliminar baseada nas cargas e margens assumidas. Não equivale a dimensionamento estrutural final.",
  structural_limit_load_n:"Carga máxima prevista em operação antes da aplicação do fator de segurança estrutural.",
  structural_ultimate_load_n:"Carga limite multiplicada pelo fator de segurança adotado para o pré-dimensionamento.",
  root_bending_moment_est_nm:"Momento fletor estimado na raiz da asa; referência inicial para longarina, união e distribuição estrutural.",
  selected:"Perfil escolhido pelo algoritmo para o ponto de projeto e as preferências informadas.",
  reynolds:"Número adimensional que relaciona inércia e viscosidade do escoamento. Determina o regime aerodinâmico do perfil.",
  domain:"Classificação da faixa de Reynolds usada para indicar validade, interpolação ou extrapolação do modelo.",
  preferred_status:"Mostra se a preferência de perfil informada foi aceita ou substituída por incompatibilidade técnica.",
  max_cl_cd_2d_at_re:"Eficiência máxima da polar bidimensional no Reynolds estimado. Serve para comparação, não como L/D final da aeronave.",
  thickness_pct:"Espessura relativa máxima do perfil em porcentagem da corda.",
  camber_pct:"Curvatura relativa máxima do perfil em porcentagem da corda.",
  model:"Método ou base de dados usada na avaliação aerodinâmica do perfil.",
  warning:"Restrição de validade ou evidência ainda necessária para utilizar este resultado com segurança.",
  q_pa:"Pressão dinâmica calculada por ½ρV². É a base para forças aerodinâmicas no ponto de cruzeiro.",
  cl_cruise:"Coeficiente de sustentação necessário para equilibrar o peso na condição de cruzeiro analisada.",
  cd_cruise:"Coeficiente de arrasto total estimado no cruzeiro, combinando parcelas parasita e induzida.",
  cd0:"Coeficiente de arrasto parasita adotado para fuselagem, superfícies, interferências e componentes expostos.",
  k:"Fator da polar de arrasto induzido, derivado de alongamento e eficiência de Oswald.",
  drag_n:"Força de arrasto prevista no cruzeiro. Determina o empuxo mínimo necessário em voo nivelado.",
  ld:"Razão sustentação/arrasto no ponto de cruzeiro. Mede a eficiência aerodinâmica da configuração nessa condição.",
  re_mac:"Número de Reynolds calculado usando velocidade, atmosfera e corda média aerodinâmica.",
  cl_max_ld:"Coeficiente de sustentação correspondente ao ponto estimado de maior eficiência L/D.",
  cl_min_power:"Coeficiente de sustentação correspondente à menor potência aerodinâmica requerida.",
  speed_max_ld_mps:"Velocidade associada ao maior L/D, relevante para alcance aerodinâmico em asa fixa.",
  speed_min_power_mps:"Velocidade associada à potência mínima, relevante para maximizar permanência em voo.",
  ld_max:"Maior razão sustentação/arrasto prevista pela polar conceitual da aeronave.",
  air_density_kg_m3:"Densidade do ar calculada pelo modelo ISA na altitude informada.",
  air_dynamic_viscosity_pa_s:"Viscosidade dinâmica do ar estimada pela atmosfera ISA e usada no cálculo de Reynolds.",
  air_temperature_k:"Temperatura padrão ISA calculada para a altitude de operação, expressa em kelvin.",
  wing_loading_n_m2:"Peso dividido pela área alar. Afeta estol, rajada, manobra, decolagem e eficiência.",
  stall_speed_mps:"Velocidade mínima teórica antes do estol para peso, área, densidade e CL máximo considerados.",
  cruise_mps:"Velocidade de cruzeiro convertida para metros por segundo e usada nos modelos aerodinâmicos.",
  stall_margin_ratio:"Razão entre velocidade de cruzeiro e velocidade de estol. Indica a separação operacional entre os dois regimes.",
  still_air_range_km:"Distância estimada em ar calmo com a energia despachável e o consumo de cruzeiro.",
  wind_limited_out_and_back_range_km:"Raio de ida e volta limitado pelo vento informado, considerando velocidades no solo diferentes nos dois trechos.",
  turn_radius_30deg_m:"Raio de curva coordenada estimado para inclinação lateral de 30 graus na velocidade de cruzeiro.",
  max_electrical_power_w:"Maior demanda elétrica prevista para dimensionar bateria, distribuição, cabos e proteção.",
  mission_power_w:"Potência elétrica média usada no balanço energético da missão.",
  gust_5mps_delta_load_factor:"Incremento estimado do fator de carga causado por uma rajada vertical discreta de 5 m/s.",
  gust_5mps_positive_load_factor:"Fator de carga positivo total após adicionar a resposta estimada à rajada de 5 m/s.",
  required_servo_torque_kgcm:"Torque mínimo preliminar por atuador, derivado das cargas aerodinâmicas e margens adotadas.",
  reserve_fraction:"Fração da capacidade utilizável mantida como reserva e indisponível ao planejamento nominal.",
  battery_part:"Bateria ou classe de bateria selecionada para fechar tensão, energia, corrente e massa.",
  parallel_packs:"Quantidade de packs em paralelo necessária para atender energia e capacidade de corrente.",
  usable_energy_wh:"Energia efetivamente utilizável após profundidade de descarga e limitações do conjunto.",
  usable_pack_wh:"Energia utilizável do conjunto instalado antes da retirada da reserva operacional.",
  dispatchable_energy_after_reserve_wh:"Energia disponível para executar a missão depois de preservar a reserva definida.",
  reserve_policy_fraction:"Reserva energética aplicada pelo motor ao planejamento nominal.",
  non_cruise_allowance_wh:"Energia separada para decolagem, pouso, hover, transição e outras fases fora do cruzeiro.",
  non_cruise_duration_min:"Tempo total assumido para fases de voo que não utilizam o consumo nominal de cruzeiro.",
  achieved_endurance_min:"Autonomia que o balanço energético consegue entregar com a bateria, potência e reserva calculadas.",
  target_endurance_min:"Autonomia solicitada nos requisitos e usada como meta para o fechamento energético.",
  endurance_energy_margin_pct:"Diferença percentual entre autonomia calculada e requerida. Valor negativo indica insuficiência energética.",
  status:"Estado consolidado do cálculo ou gate associado; deve ser interpretado junto às margens e pendências.",
  applicable:"Indica se o módulo de sensoriamento remoto é pertinente ao tipo de missão selecionado.",
  model_status:"Estado de validade do modelo para os parâmetros e faixas usados no cálculo.",
  altitude_agl_m:"Altura do sensor acima do terreno utilizada para calcular campo de visão e GSD.",
  footprint_width_m:"Largura do terreno coberta por uma imagem na altura e óptica informadas.",
  footprint_height_m:"Comprimento do terreno coberto por uma imagem na direção longitudinal.",
  gsd_width_cm_px:"Dimensão de terreno representada por pixel no eixo transversal.",
  gsd_height_cm_px:"Dimensão de terreno representada por pixel no eixo longitudinal.",
  mean_gsd_cm_px:"Resolução média no solo, calculada a partir dos dois eixos da imagem.",
  line_spacing_m:"Distância entre linhas de voo adjacentes após aplicar a sobreposição lateral.",
  along_track_spacing_m:"Distância entre exposições consecutivas após aplicar a sobreposição longitudinal.",
  photo_interval_s:"Intervalo máximo entre disparos para manter a sobreposição na velocidade informada.",
  trigger_rate_hz:"Frequência mínima de captura requerida da câmera, equivalente ao inverso do intervalo entre fotos.",
  motion_blur_cm:"Deslocamento da projeção no terreno durante o tempo de exposição.",
  motion_blur_px:"Arrasto estimado convertido em pixels; permite comparar borramento e resolução espacial.",
  nominal_photos_per_km2:"Quantidade teórica de imagens por quilômetro quadrado, sem manobras e áreas de segurança.",
  front_overlap_pct:"Sobreposição efetiva usada no sentido do voo para reconstrução e cobertura contínua.",
  side_overlap_pct:"Sobreposição efetiva entre faixas adjacentes para reconstrução e tolerância de navegação.",
  area_input_km2:"Área de missão usada para estimar o volume nominal de imagens.",
  estimated_photos_for_area:"Quantidade preliminar de fotografias para cobrir a área com as sobreposições definidas.",
  note:"Observação técnica sobre premissas, limites ou aplicação do resultado apresentado.",
  rotor_layout:"Arranjo geométrico dos rotores adotado no cálculo de sustentação, controle e distribuição de empuxo.",
  rotor_count:"Número total de rotores considerado no rateio de empuxo, potência, falhas e componentes.",
  coaxial:"Indica a existência de pares coaxiais. Essa solução reduz área ocupada, mas introduz perdas de eficiência entre rotores.",
  rotor_efficiency_factor:"Fator aplicado para representar perdas do arranjo de rotores, inclusive interferência aerodinâmica e instalação.",
  redundancy_class:"Classificação conceitual da tolerância a falhas associada ao número e ao arranjo dos rotores.",
  yaw_control:"Método previsto para gerar momento de guinada e controlar a rotação em torno do eixo vertical.",
  wheelbase_est_m:"Distância conceitual entre eixos de rotores opostos, usada para estimar envelope físico e autoridade de controle.",
  cg_guidance:"Orientação para posicionamento e verificação do centro de gravidade conforme a arquitetura escolhida.",
  disk_loading_n_m2:"Peso dividido pela área total dos discos dos rotores. Valores altos elevam velocidade induzida, potência e ruído.",
  hover_power_w:"Potência elétrica estimada para manter voo pairado na massa calculada e nas condições atmosféricas informadas.",
  forward_flight_power_w:"Potência prevista em deslocamento horizontal, incluindo sustentação e arrasto parasita equivalente.",
  forward_flight_flat_plate_area_m2:"Área plana equivalente usada para representar o arrasto do veículo em voo horizontal.",
  forward_power_model:"Modelo empregado para estimar a potência em voo horizontal da arquitetura rotativa.",
  hover_power_loading_w_kg:"Potência de hover por unidade de massa. Permite comparar eficiência propulsiva entre configurações.",
  max_power_est_w:"Demanda elétrica máxima preliminar usada para dimensionar bateria, ESCs, distribuição e proteção.",
  required_max_thrust_per_motor_g:"Empuxo máximo mínimo por motor, incluindo a razão empuxo/peso e o rateio entre rotores.",
  thrust_to_weight_target:"Razão alvo entre empuxo máximo instalado e peso da aeronave para controle e margem de manobra.",
  nominal_hover_throttle_fraction:"Fração estimada do comando disponível necessária para pairar na massa calculada.",
  rotor_count_lift:"Quantidade de rotores dedicada à sustentação vertical na arquitetura VTOL.",
  transition:"Descrição do mecanismo e da fase que transfere a sustentação do modo vertical para o cruzeiro.",
  vtol_layout:"Configuração VTOL utilizada para integrar decolagem vertical, transição e voo horizontal.",
  transition_efficiency_factor:"Redução de eficiência aplicada durante a transição para representar operação fora do ponto ótimo.",
  cg_initial_percent_mac:"Posição inicial estimada do centro de gravidade como porcentagem da corda média aerodinâmica.",
  cruise_electrical_power_w:"Potência elétrica prevista para o sistema propulsivo durante o cruzeiro.",
  transition_power_w:"Potência elétrica estimada durante a conversão entre voo vertical e horizontal.",
  vtol_energy_model_hover_min:"Tempo equivalente de hover adotado para reservar energia às fases verticais.",
  transition_duration_min:"Duração total assumida para as transições de saída e entrada do cruzeiro.",
  non_cruise_energy_wh:"Energia destinada às fases verticais, transições, manobras e demais segmentos fora do cruzeiro.",
  mechanism_mass_allowance_kg:"Reserva de massa para atuadores, reforços, articulações e mecanismos específicos da conversão VTOL.",
  lift_thrust_per_motor_g:"Empuxo requerido de cada motor de sustentação para atender peso e margem vertical.",
  faixa_de_massa_conceitual_kg:"Intervalo de massa associado à incerteza do modelo conceitual. Deve orientar margens e análises de sensibilidade.",
  confianca_do_modelo_de_massa:"Classificação da confiabilidade da estimativa conforme maturidade, referências e fechamento das parcelas.",
  validacao_do_conjunto_propulsivo:"Estado da evidência disponível para a combinação motor, hélice, ESC e tensão selecionada.",
  limite_do_modelo_propulsivo:"Restrição que impede tratar a estimativa propulsiva como desempenho confirmado sem datasheet e ensaio em bancada."
};
const RESULT_HELP = {
  "ARQUITETURA RECOMENDADA":"Arquitetura com maior pontuação no trade study. A seleção pondera missão, autonomia, payload, vento, necessidade de hover, pista e restrições informadas.",
  "STATUS DA ANÁLISE":"Conclusão consolidada dos gates de coerência, margem e rastreabilidade. Um conceito viável ainda não está liberado para fabricação ou voo.",
  "ASA FIXA":"Pontuação relativa da arquitetura de asa fixa frente aos requisitos da missão; valores maiores indicam melhor adequação comparativa.",
  "MULTIRROTOR":"Pontuação relativa da arquitetura multirrotor, considerando hover, área de operação, autonomia, alcance e payload.",
  "VTOL LIFT+CRUISE":"Pontuação relativa da arquitetura híbrida que combina rotores de sustentação e propulsão de cruzeiro.",
  "MTOW":"Massa máxima de decolagem estimada pelo fechamento iterativo de estrutura, propulsão, bateria, aviônicos, payload e margens.",
  "BATERIA":"Massa do sistema de armazenamento de energia necessária para atender potência, autonomia, corrente e reserva.",
  "POTÊNCIA DE MISSÃO":"Potência elétrica média prevista na fase dominante da missão e usada no balanço energético.",
  "VOO HORIZONTAL":"Potência elétrica estimada para sustentar o multirrotor em deslocamento horizontal na condição informada.",
  "AUTONOMIA CALCULADA":"Tempo de voo obtido com energia utilizável, reserva, consumos de missão e parcelas fora do cruzeiro.",
  "LISTA DE MATERIAIS POR SUBSISTEMA":"BOM preliminar derivada da arquitetura e dos resultados de dimensionamento. Quantidades e especificações precisam ser fechadas com integração, fornecedores e ensaios.",
  "ENGENHARIA, RISCOS E VERIFICAÇÃO":"Painel de maturidade que reúne gates automáticos, pendências, riscos, requisitos e evidências necessárias para a próxima revisão de engenharia.",
  "CONFIGURAÇÃO & GEOMETRIA":"Consolida arquitetura, dimensões aerodinâmicas, pré-verificação estrutural e limites de integração do conceito.",
  "VISTA SUPERIOR CONCEITUAL":"Representação paramétrica para leitura de proporções e arranjo. Não contém detalhamento construtivo nem tolerâncias.",
  "CURVA AERODINÂMICA / PROPULSIVA":"Relaciona velocidade, potência e comportamento aerodinâmico para identificar regiões eficientes e limitações do conceito.",
  "ENERGIA E DESEMPENHO":"Apresenta a distribuição do orçamento energético e a capacidade de cumprir autonomia e fases operacionais.",
  "DISTRIBUIÇÃO DE MASSA":"Mostra a participação estimada de cada grupo no MTOW e ajuda a identificar os maiores direcionadores de massa.",
  "PERFIL & REYNOLDS":"Verifica a adequação preliminar do perfil à escala e ao regime viscoso calculado para a aeronave.",
  "POLAR 2D DE TRIAGEM · XFOIL NCRIT 9":"Polar bidimensional de referência para comparar sustentação e arrasto. Não representa diretamente a asa tridimensional instalada.",
  "DESEMPENHO":"Reúne indicadores aerodinâmicos, velocidades, alcance, potência, rajada, manobra e margens operacionais.",
  "SISTEMA ELÉTRICO":"Resume seleção de bateria, energia utilizável, reserva, potência e fechamento da autonomia.",
  "PLANEJAMENTO DE SENSORIAMENTO REMOTO":"Converte sensor, lente, altura, velocidade e sobreposição em GSD, faixa, intervalo de disparo e volume de imagens.",
  "STATUS GLOBAL":"Síntese dos gates de engenharia. Deve ser lida com as falhas, pendências e limites do modelo.",
  "FALHAS":"Número de gates automáticos fora dos critérios estabelecidos para o conceito atual.",
  "REQUISITOS ABERTOS":"Requisitos ainda sem evidência suficiente, cálculo conclusivo, ensaio ou decisão de engenharia.",
  "ITENS DISTINTOS":"Quantidade de tipos de item diferentes previstos na lista preliminar de materiais.",
  "UNIDADES PREVISTAS":"Soma das quantidades de todas as linhas da BOM, incluindo componentes repetidos.",
  "SUBSISTEMAS":"Número de grupos funcionais cobertos pela BOM, como propulsão, energia, estrutura e controle.",
  "VINCULADOS AO CATÁLOGO":"Relação entre linhas da BOM associadas a uma referência técnica e o total de linhas geradas.",
  "BUSCAR NO BOM":"Filtra a lista calculada por componente, especificação, código, aplicação ou justificativa técnica.",
  "ITENS EXIBIDOS":"Quantidade de linhas da BOM que permanecem visíveis após aplicar busca e filtro de subsistema.",
  "GATES DE VERIFICAÇÃO":"Testes automáticos de integridade das entradas, fechamento de massa e energia, limites e rastreabilidade.",
  "ALERTAS E PENDÊNCIAS":"Hipóteses frágeis, extrapolações e atividades que exigem análise, datasheet, simulação ou ensaio.",
  "HAZARD LOG / FMEA":"Registro inicial de modos de falha, efeitos, criticidade, mitigação e método de verificação recomendado.",
  "MATRIZ DE REQUISITOS":"Rastreia requisitos operacionais e técnicos até valores, métodos de verificação e estado de atendimento.",
  "ASSURANCE MULTIDISCIPLINAR":"Lista as evidências necessárias por disciplina para elevar a maturidade e sustentar uma revisão formal.",
  "SUBSISTEMA":"Grupo funcional ao qual o item da BOM pertence.", "ITEM / MODELO":"Componente, referência ou classe de engenharia prevista para a função.", "QTD.":"Quantidade preliminar necessária na configuração calculada.", "ESPECIFICAÇÃO":"Parâmetro mínimo ou característica usada para dimensionar e selecionar o item.", "APLICAÇÃO / VALIDAÇÃO":"Justificativa de uso e verificação ainda exigida antes da seleção definitiva.",
  "ID":"Identificador único usado para rastrear o requisito ou gate.", "REQUISITO":"Condição técnica ou operacional derivada das entradas da missão.", "VALOR":"Meta, limite ou condição associada ao requisito.", "VERIFICAÇÃO":"Método previsto para demonstrar atendimento, como análise, inspeção, teste ou ensaio.", "STATUS":"Estado atual de atendimento ou maturidade da evidência."
};
function helpButton(text) {
  return `<span class="help-tip" tabindex="0" role="button" title="${esc(text)}" aria-label="Ajuda: ${esc(text)}"><span aria-hidden="true">?</span><span class="help-popover" role="tooltip">${esc(text)}</span></span>`;
}
function resultHelp(key, title = key) {
  const clean = String(title ?? key ?? "").replace(/\s+/g," ").trim();
  return RESULT_HELP_BY_KEY[key] ?? RESULT_HELP[clean.toUpperCase()] ?? `Valor técnico de ${clean.toLowerCase()} obtido no pré-dimensionamento. Revise as hipóteses, unidades, margens e evidências associadas antes de consolidar o projeto.`;
}
function decorateResultHelp() {
  ["configuration","bom","assurance"].forEach((id) => {
    document.querySelectorAll(`#${id} h2,#${id} h3,#${id} #status,#${id} .metric>span,#${id} .score>span,#${id} .kv>span,#${id} .summary-strip span,#${id} .bom-summary span,#${id} .bom-toolbar label>span,#${id} .bom-count>span,#${id} th,#${id} .gate b,#${id} .risk h4,#${id} .assurance h4`).forEach((el) => {
      if (el.querySelector(":scope > .help-tip")) return;
      const title = el.textContent.trim();
      const key = el.id === "architecture" ? "architecture_result" : el.id === "status" ? "analysis_status" : title;
      const text = key === "architecture_result" ? RESULT_HELP["ARQUITETURA RECOMENDADA"] : key === "analysis_status" ? RESULT_HELP["STATUS DA ANÁLISE"] : el.matches(".gate b") ? "Gate de verificação identificado no motor de análise. O detalhe abaixo informa o critério avaliado e a condição encontrada." : el.matches(".risk h4") ? "Modo de falha considerado no hazard log preliminar. Analise o efeito, a criticidade, a mitigação e a evidência de verificação associada." : el.matches(".assurance h4") ? "Disciplina de engenharia avaliada quanto às evidências mínimas necessárias para elevar a maturidade do conceito." : resultHelp(key, title);
      el.insertAdjacentHTML("beforeend", helpButton(text));
    });
  });
}
function fieldHtml([key, name, type, options], value) {
  const help = helpButton(FIELD_HELP[key] ?? `Informe ${name.toLowerCase()} para compor os cálculos e verificações do conceito.`);
  if (type === "checkbox")
    return `<div class="field" data-field="${key}"><label>${name}${help}</label><div class="check"><input id="${key}" name="${key}" type="checkbox" ${value ? "checked" : ""}><span>${value ? "Sim" : "Não"}</span></div></div>`;
  if (type === "select")
    return `<div class="field" data-field="${key}"><label for="${key}">${name}${help}</label><select id="${key}" name="${key}">${options.map((x) => `<option ${x === value ? "selected" : ""}>${x}</option>`).join("")}</select></div>`;
  return `<div class="field" data-field="${key}"><label for="${key}">${name}${help}</label><input id="${key}" name="${key}" type="${type}" value="${esc(value)}" ${type === "number" ? 'step="any"' : ""}></div>`;
}
function setFieldAccess(key, enabled) {
  const wrap = document.querySelector(`[data-field="${key}"]`),
    control = document.getElementById(key);
  if (!wrap || !control) return;
  wrap.classList.toggle("context-hidden", !enabled);
  control.disabled = !enabled;
  wrap.setAttribute("aria-hidden", String(!enabled));
}
function updateFieldAccess() {
  const arch = $("#preferred_architecture")?.value,
    mission = $("#mission_type")?.value,
    specific = arch && arch !== "Automático";
  setFieldAccess(
    "fixed_wing_layout",
    !specific || arch === "Asa fixa" || arch === "VTOL lift+cruise",
  );
  setFieldAccess("rotor_layout", !specific || arch === "Multirrotor");
  setFieldAccess("vtol_layout", !specific || arch === "VTOL lift+cruise");
  setFieldAccess("runway_available", !specific || arch === "Asa fixa");
  setFieldAccess("stall_speed_mps", !specific || arch !== "Multirrotor");
  setFieldAccess("preferred_airfoil", !specific || arch !== "Multirrotor");
  setFieldAccess(
    "corridor_length_km",
    mission === "Corredor / linha de transmissão",
  );
  setFieldAccess(
    "area_km2",
    [
      "Mapeamento / fotogrametria",
      "Agricultura multispectral",
      "Monitoramento ambiental",
    ].includes(mission),
  );
  const remoteSensing = [
    "Mapeamento / fotogrametria",
    "Agricultura multispectral",
    "Monitoramento ambiental",
    "Corredor / linha de transmissão",
  ].includes(mission);
  for (const key of [
    "mission_agl_m",
    "sensor_width_mm",
    "sensor_height_mm",
    "image_width_px",
    "image_height_px",
    "focal_length_mm",
    "exposure_time_ms",
    "front_overlap_pct",
    "side_overlap_pct",
  ]) setFieldAccess(key, remoteSensing);
  const visible = $$(".field:not(.context-hidden)").length;
  $("#contextStatus").textContent =
    `${visible} parâmetros aplicáveis · opções incompatíveis foram removidas desta configuração.`;
}
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  setTimeout(() => $("#toast").classList.remove("show"), 3000);
}
function switchTab(id) {
  $$(".tabs button").forEach((b) =>
    b.classList.toggle("active", b.dataset.tab === id),
  );
  $$(".panel").forEach((p) => p.classList.toggle("active", p.id === id));
  scrollTo({
    top: document.querySelector(".tabs").offsetTop - 78,
    behavior: "smooth",
  });
}
function formData() {
  const out = {};
  for (const [k, , type] of fields) {
    const el = $(`#${k}`);
    out[k] =
      type === "checkbox"
        ? el.checked
        : type === "number"
          ? Number(el.value)
          : el.value;
  }
  return out;
}
function kv(obj) {
  return Object.entries(obj ?? {})
    .filter(([, v]) => v == null || typeof v !== "object")
    .map(
      ([k, v]) =>
        `<div class="kv"><span>${esc(label(k))}${helpButton(resultHelp(k, label(k)))}</span><b>${esc(fmt(v))}</b></div>`,
    )
    .join("");
}
function renderBomGrouped(r) {
  const bom = r.bom ?? [],
    systems = [...new Set(bom.map((x) => x.system ?? "Integração"))].sort(
      (a, b) => a.localeCompare(b, "pt-BR"),
    ),
    units = bom.reduce((sum, x) => sum + (Number(x.qty) || 0), 0),
    linked = bom.filter((x) => x.part_id).length;
  $("#bomSummary").innerHTML =
    `<div><strong>${bom.length}</strong><span>ITENS DISTINTOS</span></div><div><strong>${units}</strong><span>UNIDADES PREVISTAS</span></div><div><strong>${systems.length}</strong><span>SUBSISTEMAS</span></div><div><strong>${linked}/${bom.length}</strong><span>VINCULADOS AO CATÁLOGO</span></div>`;
  $("#bomSystem").innerHTML =
    '<option value="">TODOS OS SUBSISTEMAS</option>' +
    systems.map((system) => `<option value="${esc(system)}">${esc(system)} · ${bom.filter((x) => (x.system ?? "Integração") === system).length}</option>`).join("");
  $("#bomSearch").disabled = false;
  $("#bomSystem").disabled = false;
  filterBom();
  decorateResultHelp();
}
function filterBom() {
  if (!result) return;
  const q = $("#bomSearch").value.toLocaleLowerCase("pt-BR").trim(),
    system = $("#bomSystem").value,
    filtered = (result.bom ?? []).filter((x) => {
      const itemSystem = x.system ?? "Integração";
      return (!system || itemSystem === system) && (!q || `${itemSystem} ${x.category ?? ""} ${x.item ?? ""} ${x.part_id ?? ""} ${x.spec ?? ""} ${x.reason ?? x.status ?? ""}`.toLocaleLowerCase("pt-BR").includes(q));
    }),
    groups = new Map();
  for (const item of filtered) {
    const key = item.system ?? "Integração";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  $("#bomCount").textContent = filtered.length;
  $("#bomBody").innerHTML = filtered.length
    ? [...groups.entries()].map(([group, items]) =>
        `<tr class="bom-group"><td colspan="5"><span>${esc(group)}</span><small>${items.length} ${items.length === 1 ? "item" : "itens"}</small></td></tr>` +
        items.map((x) => `<tr><td><span class="system-pill">${esc(group)}</span><small>${esc(label(x.category ?? ""))}</small></td><td><b>${esc(x.item)}</b>${x.part_id ? `<small class="part-id">${esc(x.part_id)}</small>` : '<small class="part-id pending">SKU a definir</small>'}</td><td><strong class="qty-badge">${esc(x.qty)}</strong></td><td>${esc(x.spec ?? "")}</td><td>${esc(x.reason ?? x.status ?? "")}</td></tr>`).join("")
      ).join("")
    : '<tr><td colspan="5" class="bom-empty"><strong>Nenhum item encontrado</strong><span>Ajuste a busca ou o filtro de subsistema.</span></td></tr>';
}
async function analyze() {
  try {
    const response = await fetch("/api/uav-design", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData()),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    result = data;
    render(data);
    renderBomGrouped(data);
    drawAdvanced(data);
    drawCharts(data);
    $("#downloadJson").disabled = false;
    switchTab("configuration");
    toast("Análise concluída. Revise os gráficos e gates de engenharia.");
  } catch (e) {
    toast(e.message);
  }
}
function render(r) {
  catalogFit = new Map(
    (r.catalog_compatibility?.items ?? []).map((x) => [x.id, x]),
  );
  $("#architecture").textContent =
    `${r.architecture} · MTOW ≈ ${fmt(r.mass.mtow_est_kg)} kg`;
  $("#status").textContent = r.verification.overall_status;
  $("#scoreBars").innerHTML = Object.entries(r.architecture_scores)
    .map(
      ([k, v]) =>
        `<div class="score"><span>${esc(k)}</span><div class="bar"><i style="width:${v}%"></i></div><b>${v}</b></div>`,
    )
    .join("");
  const perf = r.performance;
  $("#metricCards").innerHTML = [
    ["MTOW", `${fmt(r.mass.mtow_est_kg)} kg`],
    ["BATERIA", `${fmt(r.mass.battery_kg)} kg`],
    [
      r.architecture === "Multirrotor" ? "VOO HORIZONTAL" : "POTÊNCIA DE MISSÃO",
      `${fmt(perf.mission_power_w)} W`,
    ],
    ["AUTONOMIA CALCULADA", `${fmt(perf.achieved_endurance_min)} min`],
  ]
    .map(
      ([k, v]) =>
        `<div class="metric"><span>${k}</span><strong>${v}</strong></div>`,
    )
    .join("");
  $("#configTable").innerHTML = kv({
    ...r.configuration,
    ...r.geometry,
    structural_status: r.structural_precheck?.status,
    structural_limit_load_n: r.structural_precheck?.limit_load_n,
    structural_ultimate_load_n: r.structural_precheck?.ultimate_load_n,
    root_bending_moment_est_nm:
      r.structural_precheck?.root_bending_moment_est_nm,
    faixa_de_massa_conceitual_kg: `${fmt(r.mass.estimate_low_kg)} – ${fmt(r.mass.estimate_high_kg)}`,
    confianca_do_modelo_de_massa: r.mass.model_confidence,
    validacao_do_conjunto_propulsivo: r.propulsion_validation?.status,
    limite_do_modelo_propulsivo: r.propulsion_validation?.note,
  });
  $("#performanceTable").innerHTML = kv(r.performance);
  $("#electricalTable").innerHTML = kv({
    ...r.electrical,
    battery_part: r.electrical.battery?.part?.name,
    parallel_packs: r.electrical.battery?.parallel_packs,
    usable_energy_wh: r.electrical.battery?.usable_energy_wh,
    ...r.energy_balance,
  });
  $("#airfoilTable").innerHTML = r.airfoil_analysis?.selected
    ? kv({
        selected: r.airfoil_analysis.selected.name,
        reynolds: r.airfoil_analysis.reynolds,
        domain: r.airfoil_analysis.domain,
        preferred_status: r.airfoil_analysis.preferred_status,
        max_cl_cd_2d_at_re: r.airfoil_analysis.selected.max_cl_cd_2d_at_re,
        thickness_pct: r.airfoil_analysis.selected.thickness_pct,
        camber_pct: r.airfoil_analysis.selected.camber_pct,
        model: r.airfoil_analysis.model,
        warning: r.airfoil_analysis.warning,
      }) + `<a class="technical-link" href="https://airfoiltools.com/airfoil/details?airfoil=${esc(r.airfoil_analysis.selected.airfoiltools_id)}" target="_blank" rel="noopener">ABRIR PERFIL NO AIRFOILTOOLS ↗</a>`
    : '<div class="empty-state">Não aplicável a esta arquitetura.</div>';
  $("#remoteSensingTable").innerHTML = r.remote_sensing?.applicable
    ? kv(r.remote_sensing)
    : '<div class="empty-state">Ferramenta aplicada a missões de sensoriamento remoto.</div>';
  $("#verificationSummary").innerHTML =
    `<div><span>STATUS GLOBAL</span><strong>${esc(r.verification.overall_status)}</strong></div><div><span>FALHAS</span><strong>${r.verification.failed_checks}</strong></div><div><span>REQUISITOS ABERTOS</span><strong>${r.requirements_matrix.open_count}</strong></div>`;
  $("#verificationList").innerHTML = r.verification.checks
    .map(
      (x) =>
        `<div class="gate"><span class="tag ${x.status}">${x.status}</span><span><b>${esc(x.id)}</b><br>${esc(x.detail)}</span></div>`,
    )
    .join("");
  $("#warningList").innerHTML = r.warnings
    .map(
      (x) =>
        `<div class="warning"><span class="tag OPEN">REVIEW</span><span>${esc(x)}</span></div>`,
    )
    .join("");
  $("#fmeaGrid").innerHTML = r.reliability.fmea_seed
    .map(
      (x) =>
        `<article class="risk"><header><span>${x.id}</span><span class="${x.risk_class === "ALTO" ? "FAIL" : "OPEN"}">${x.risk_class} · ${x.initial_risk_score}</span></header><h4>${esc(x.failure)}</h4><p>${esc(x.effect)}</p><p><b>Mitigação:</b> ${esc(x.mitigation)}</p><small>${esc(x.verification)}</small></article>`,
    )
    .join("");
  $("#reqBody").innerHTML = r.requirements_matrix.items
    .map(
      (x) =>
        `<tr><td>${x.id}</td><td>${esc(x.requirement)}</td><td>${esc(x.value)}</td><td>${esc(x.verification)}</td><td class="tag ${x.status}">${x.status}</td></tr>`,
    )
    .join("");
  $("#assuranceGrid").innerHTML = Object.entries(r.engineering_assurance)
    .filter(([, v]) => typeof v === "object")
    .map(
      ([k, v]) =>
        `<article class="assurance"><span class="tag ${v.status === "NOT CLAIMED" ? "FAIL" : "OPEN"}">${v.status}</span><h4>${esc(label(k))}</h4><p>${v.required_evidence.map(esc).join(" · ")}</p></article>`,
    )
    .join("");
  filterCatalog();
  decorateResultHelp();
}
function renderCatalog(list) {
  const visible = list.slice(0, 96);
  $("#catalogCount").textContent = result
    ? `${list.length} compatíveis · exibindo ${visible.length}; refine os filtros para detalhar`
    : `${list.length} de ${catalog.length} itens · exibindo ${visible.length}`;
  $("#catalogGrid").innerHTML = visible
    .map((x) => {
      const fit = catalogFit.get(x.id),
        fitLabel =
          fit?.status === "SELECTED"
            ? "SELECIONADO PARA O PROJETO"
            : "COMPATÍVEL COM A CONFIGURAÇÃO";
      const hidden = new Set([
          "id",
          "name",
          "category",
          "system",
          "summary",
          "source_url",
          "availability_note",
          "record_type",
          "validation_status",
          "applicability",
          "selection_basis",
          "verification_required",
          "lifecycle_status",
        ]),
        specs = Object.entries(x)
          .filter(
            ([k, v]) => !hidden.has(k) && v != null && typeof v !== "object",
          )
          .slice(0, 10);
      return `<article class="catalog-card"><header><span>${esc(x.system)} / ${esc(label(x.category))}</span><small>${esc(x.id)}</small></header>${fit ? `<div class="catalog-badge reference">${fitLabel}</div>` : ""}<div class="catalog-badge ${x.validation_status === "reference" ? "reference" : "template"}">${x.validation_status === "reference" ? "REFERÊNCIA IDENTIFICADA" : "CLASSE DE ENGENHARIA"}</div><h4>${esc(x.name)}</h4><p>${esc(x.summary)}</p><dl class="catalog-specs">${specs.map(([k, v]) => `<div><dt>${esc(label(k))}</dt><dd>${esc(fmt(v))}</dd></div>`).join("")}</dl><div class="catalog-meta"><span>${esc(x.interface || "interface a definir")}</span><span>${esc((x.applicability || []).join(" · "))}</span></div>${x.source_url ? `<a href="${esc(x.source_url)}" target="_blank" rel="noopener">FONTE TÉCNICA ↗</a>` : "<small>REQUER SELEÇÃO DE SKU E DATASHEET</small>"}</article>`;
    })
    .join("");
}
function filterCatalog() {
  const q = $("#catalogSearch").value.toLowerCase().trim(),
    system = $("#catalogSystem").value,
    category = $("#catalogCategory").value,
    grade = $("#catalogGrade").value,
    fitFilter = $("#catalogFit").value;
  renderCatalog(
    catalog.filter(
      (x) =>
        (!result ||
          (catalogFit.has(x.id) &&
            catalogFit.get(x.id).status !== "INCOMPATIBLE")) &&
        (!system || x.system === system) &&
        (!category || x.category === category) &&
        (!grade || x.validation_status === grade) &&
        (!fitFilter || catalogFit.get(x.id)?.status === fitFilter) &&
        (!q ||
          `${x.name} ${x.system} ${x.category} ${x.summary} ${JSON.stringify(x)}`
            .toLowerCase()
            .includes(q)),
    ),
  );
}
async function init() {
  const [defaults, cat] = await Promise.all([
    fetch("/api/uav-defaults").then((r) => r.json()),
    fetch("/api/uav-catalog").then((r) => r.json()),
  ]);
  catalog = cat.parts;
  catalogMeta = cat.meta ?? {};
  $("#missionForm").innerHTML = fields
    .map((f) => fieldHtml(f, defaults[f[0]]))
    .join("");
  const categories = [...new Set(catalog.map((x) => x.category))].sort(),
    systems = [...new Set(catalog.map((x) => x.system))].sort();
  $("#catalogSystem").insertAdjacentHTML(
    "beforeend",
    systems
      .map(
        (x) =>
          `<option value="${esc(x)}">${esc(x)} · ${catalog.filter((p) => p.system === x).length}</option>`,
      )
      .join(""),
  );
  $("#catalogCategory").insertAdjacentHTML(
    "beforeend",
    categories
      .map(
        (x) =>
          `<option value="${esc(x)}">${esc(label(x))} · ${catalog.filter((p) => p.category === x).length}</option>`,
      )
      .join(""),
  );
  const references = catalog.filter(
    (x) => x.validation_status === "reference",
  ).length;
  $("#catalogStats").innerHTML =
    `<div><strong>${catalog.length}</strong><span>ITENS TÉCNICOS</span></div><div><strong>${categories.length}</strong><span>CATEGORIAS / ${systems.length} SISTEMAS</span></div><div><strong>${references}</strong><span>REFERÊNCIAS IDENTIFICADAS</span></div><div><strong>${catalogMeta.audit?.error_count ?? 0}</strong><span>ERROS DE ESQUEMA · ${catalogMeta.audit?.review_count ?? 0} EM REVISÃO</span></div>`;
  renderCatalog(catalog);
  decorateResultHelp();
  updateFieldAccess();
  $("#missionForm").addEventListener("change", (e) => {
    if (e.target.type === "checkbox")
      e.target.nextElementSibling.textContent = e.target.checked
        ? "Sim"
        : "Não";
    if (["preferred_architecture", "mission_type"].includes(e.target.id))
      updateFieldAccess();
  });
}
$$(".tabs button").forEach((b) =>
  b.addEventListener("click", () => switchTab(b.dataset.tab)),
);
$("#analyze").addEventListener("click", analyze);
$("#downloadJson").addEventListener("click", async () => {
  if (!result) return;
  const catalogJson = JSON.stringify(catalog),
    digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(catalogJson)),
    sha256 = [...new Uint8Array(digest)].map((x) => x.toString(16).padStart(2, "0")).join(""),
    exported = {
      export_manifest: {
        schema: "sirius-uav-complete-export-v1",
        exported_at: new Date().toISOString(),
        analysis_complete: true,
        catalog_complete: true,
        catalog_item_count: catalog.length,
        catalog_sha256: sha256,
        catalog_schema_version: catalogMeta.schema_version,
        catalog_audit: catalogMeta.audit,
      },
      analysis: result,
      catalog_snapshot: { meta: catalogMeta, parts: catalog },
    };
  const blob = new Blob([JSON.stringify(exported, null, 2)], {
      type: "application/json",
    }),
    a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${String(result.project_name || "Sirius_UAV").replace(/[^a-z0-9_-]+/gi, "_")}_engineering.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
$("#catalogSearch").addEventListener("input", filterCatalog);
$("#catalogSystem").addEventListener("change", filterCatalog);
$("#catalogCategory").addEventListener("change", filterCatalog);
$("#catalogGrade").addEventListener("change", filterCatalog);
$("#catalogFit").addEventListener("change", filterCatalog);
$("#bomSearch").addEventListener("input", filterBom);
$("#bomSystem").addEventListener("change", filterBom);
init().catch((e) => toast(e.message));
