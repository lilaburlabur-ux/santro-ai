// AI-ETF universe — curated June 2026, from Santro AI deep research.
// Shared by /etfs (the table) and /e (per-ETF pages). AUM/ER are point-in-time
// and move with price; the issuer's same-day page is the source of record.
window.ETF_BUCKETS = [
  {id:"pure",      name:"Pure-play AI",                 blurb:"The “only AI” thematic core."},
  {id:"trap",      name:"The “AI-washing” trap",        blurb:"Sound like AI, aren’t. Read the word order."},
  {id:"semis",     name:"Semiconductors / AI chips",    blurb:"The picks-and-shovels of the AI build-out."},
  {id:"robotics",  name:"Robotics & automation",        blurb:"Applied AI in the physical world."},
  {id:"humanoid",  name:"Humanoids / physical AI",      blurb:"Newest, most speculative — size small."},
  {id:"leveraged", name:"Leveraged & inverse",          blurb:"Traders only — these decay. Daily instruments."},
  {id:"income",    name:"AI income / covered-call",     blurb:"Income, NOT growth — they sell away upside."},
  {id:"adjacent",  name:"Adjacent / broad",             blurb:"AI is a slice, not the whole fund."}
];

// risk: "" normal · "trap" avoid-mislabel · "lev" leveraged/decay · "income" caps upside · "spec" speculative · "closed"
window.ETFS = [
  // ── Pure-play AI ──────────────────────────────────────────────────────────
  {t:"BAI",  name:"iShares A.I. Innovation & Tech Active", bucket:"pure", aum:"~$16.3B", er:"0.55%", holds:"concentrated", inside:"Nvidia, Broadcom, TSMC",
   note:"The biggest active AI fund — and the one most lists miss. Cheapest active way to play the theme."},
  {t:"AIQ",  name:"Global X Artificial Intelligence & Technology", bucket:"pure", aum:"~$6.8B", er:"0.68%", holds:"~92", inside:"SK Hynix, Micron, Samsung, AMD, Intel",
   note:"Broad and international — the default one-ticker AI core."},
  {t:"ARTY", name:"iShares Future AI & Tech", bucket:"pure", aum:"~$3.75B", er:"~0.47%", holds:"~65", inside:"Global AI infrastructure, software & services"},
  {t:"CHAT", name:"Roundhill Generative AI & Technology", bucket:"pure", aum:"~$1.4B", er:"0.75%", holds:"44", inside:"Alphabet, Nvidia — generative-AI focus"},
  {t:"IGPT", name:"Invesco AI & Next Gen Software", bucket:"pure", aum:"~$1.1B", er:"0.56%", holds:"—", inside:"Micron, Meta, AMD"},
  {t:"AGIX", name:"KraneShares Public & Private AI & Tech", bucket:"pure", aum:"~$1.0B", er:"0.99%", holds:"—", inside:"Nvidia, Alphabet + private Anthropic (1.7%) & SpaceX (2.6%)",
   note:"The only ETF giving you pre-IPO Anthropic/SpaceX exposure — genuinely differentiated, but you pay 0.99% and take SPV/valuation risk.", spv:true},
  {t:"IVES", name:"Dan Ives Wedbush AI Revolution", bucket:"pure", aum:"~$950M", er:"~0.75%", holds:"32", inside:"Strict 50%+-revenue-from-AI screen",
   note:"The purest screen on the list — a name only makes it in if AI is at least half its revenue."},
  {t:"WTAI", name:"WisdomTree Artificial Intelligence & Innovation", bucket:"pure", aum:"~$548M", er:"0.45%", holds:"—", inside:"Micron, Samsung, Nvidia, Kioxia, Amazon"},
  {t:"THNQ", name:"ROBO Global Artificial Intelligence", bucket:"pure", aum:"~$284M", er:"0.68%", holds:"—", inside:"Lumentum, Palo Alto Networks, Analog Devices"},
  {t:"LRNZ", name:"TrueShares Technology, AI & Deep Learning", bucket:"pure", aum:"small", er:"~0.69%", holds:"concentrated", inside:"Active, high-conviction"},
  {t:"FDTX", name:"Fidelity Disruptive Technology", bucket:"pure", aum:"small", er:"0.50%", holds:"active", inside:"Nvidia, Marvell"},

  // ── AI-washing trap ───────────────────────────────────────────────────────
  {t:"AIVL", name:"WisdomTree U.S. AI-Enhanced Value", bucket:"trap", aum:"—", er:"—", holds:"—", inside:"A value fund that uses AI to pick stocks",
   note:"NOT an AI fund. “AI-Enhanced Value” = a value fund using AI as a tool — you’d own banks and industrials, not AI.", risk:"trap"},
  {t:"AIVI", name:"WisdomTree International AI-Enhanced Value", bucket:"trap", aum:"—", er:"—", holds:"—", inside:"International value, AI-picked",
   note:"Same trap as AIVL, international. Read the word order: “AI & Technology” is an AI fund; “AI-Enhanced Value” is a value fund.", risk:"trap"},
  {t:"VGT",  name:"Vanguard Information Technology (broad tech)", bucket:"trap", aum:"—", er:"0.09%", holds:"300+", inside:"All of big tech — AI by accident",
   note:"Fine fund, wrong label. Hundreds of non-AI names; AI exposure is incidental. (Same goes for QQQ / XLK.)", risk:"trap"},

  // ── Semiconductors ────────────────────────────────────────────────────────
  {t:"SMH",  name:"VanEck Semiconductor", bucket:"semis", aum:"~$68.7B", er:"0.35%", holds:"25", inside:"Nvidia-heavy, most concentrated",
   note:"The biggest, most concentrated chip ETF. This is the “ride Nvidia” bet."},
  {t:"SOXX", name:"iShares Semiconductor", bucket:"semis", aum:"~$39.3B", er:"0.35%", holds:"~30", inside:"Micron, AMD, Intel, Broadcom, Nvidia"},
  {t:"SOXQ", name:"Invesco PHLX Semiconductor", bucket:"semis", aum:"~$2.2B", er:"0.19%", holds:"~30", inside:"~Same basket as SOXX, half the fee",
   note:"Same fight as always: ~identical stocks to SOXX at 0.19% vs 0.35%. The cheap clone."},
  {t:"XSD",  name:"SPDR S&P Semiconductor", bucket:"semis", aum:"~$1.67B", er:"0.35%", holds:"~40", inside:"Equal-weight — Marvell, Cirrus, smaller chips",
   note:"Equal-weight — the near-opposite of SMH. This is “spread across the small chip names,” not ride Nvidia."},
  {t:"PSI",  name:"Invesco Semiconductors", bucket:"semis", aum:"smaller", er:"0.56%", holds:"30", inside:"Momentum / quality screened"},
  {t:"FTXL", name:"First Trust Nasdaq Semiconductor", bucket:"semis", aum:"smaller", er:"~0.60%", holds:"30+", inside:"Modified equal-weight, mid-cap tilt"},
  {t:"DRAM", name:"Roundhill Memory ETF", bucket:"semis", aum:"~$23B", er:"0.65%", holds:"21", inside:"SK Hynix, Samsung, Micron, SanDisk, WDC — pure memory (DRAM/NAND/HBM)",
   note:"The first pure memory-chip ETF — DRAM, NAND and the HBM stacks that feed AI training. It rocketed past $20B in weeks (the fastest-growing launch on record), which tells you how crowded the memory trade has become. One clean ticker for the SK Hynix / Samsung / Micron supercycle — but three names are ~70% of it, it runs on total-return swaps, and memory is a brutally cyclical, boom-and-bust business. A theme bet, not a diversified core."},

  // ── Robotics & automation ─────────────────────────────────────────────────
  {t:"BOTZ", name:"Global X Robotics & Artificial Intelligence", bucket:"robotics", aum:"~$3.0B", er:"0.68%", holds:"~68", inside:"Nvidia, Intuitive Surgical, AeroVironment, Cognex"},
  {t:"ARKQ", name:"ARK Autonomous Technology & Robotics", bucket:"robotics", aum:"~$2.18B", er:"~0.75%", holds:"41", inside:"Tesla 10.2%, AMD, Teradyne, Rocket Lab, Kratos",
   note:"Active, with a defense/space tilt — the most “Cathie Wood” of the robotics names."},
  {t:"ROBT", name:"First Trust Nasdaq AI & Robotics", bucket:"robotics", aum:"—", er:"0.65%", holds:"114", inside:"Marvell, Cisco, Palo Alto Networks"},
  {t:"ROBO", name:"ROBO Global Robotics & Automation", bucket:"robotics", aum:"—", er:"0.95%", holds:"~80", inside:"Industrial robots, sensors, factory automation"},
  {t:"IRBO", name:"iShares Robotics & AI Multisector", bucket:"robotics", aum:"—", er:"—", holds:"—", inside:"Closed — ignore", risk:"closed"},

  // ── Humanoids / physical AI ───────────────────────────────────────────────
  {t:"HUMN", name:"Roundhill Humanoid Robotics", bucket:"humanoid", aum:"new", er:"0.75%", holds:"46", inside:"Tesla 8%, UBTech, Rainbow Robotics, Harmonic Drive, Nvidia — 68% foreign",
   note:"Thin, brand-new, story-driven. Position small or you’re gambling, not investing.", risk:"spec"},
  {t:"KOID", name:"KraneShares Global Humanoid & Physical AI", bucket:"humanoid", aum:"new", er:"0.69%", holds:"50", inside:"“Brain” (chips) + “body” (actuators/sensors) + integrators",
   note:"Splits the humanoid stack into brains and bodies. Newest theme on the board — speculative.", risk:"spec"},

  // ── Leveraged & inverse ───────────────────────────────────────────────────
  {t:"SOXL", name:"Direxion Daily Semiconductor Bull 3×", bucket:"leveraged", aum:"~$11B", er:"0.95%", holds:"3× SMH basket", inside:"+450% YTD 2026 … −90% in 2022. Daily reset.",
   note:"A DAILY instrument. “3×” is NOT 3× over a year — volatility decay ate 90% in 2022 while chips fell only 35%. If you can’t watch it daily, you don’t own it.", risk:"lev"},
  {t:"SOXS", name:"Direxion Daily Semiconductor Bear 3×", bucket:"leveraged", aum:"—", er:"~1.0%", holds:"-3× chips", inside:"Inverse — bet against chips",
   note:"Inverse daily 3×. Same decay math, pointed the other way.", risk:"lev"},
  {t:"UBOT", name:"Direxion Daily Robotics/AI/Automation Bull 2×", bucket:"leveraged", aum:"small", er:"1.32%", holds:"2× robotics", inside:"Leveraged robotics", risk:"lev"},
  {t:"NVDL", name:"GraniteShares 2× Long NVDA Daily", bucket:"leveraged", aum:"~$4B+", er:"~1.15%", holds:"2× NVDA", inside:"Single-stock leverage on Nvidia", risk:"lev"},
  {t:"AVGX", name:"Defiance 2× Long Broadcom Daily", bucket:"leveraged", aum:"small", er:"~1.0%", holds:"2× AVGO", inside:"Single-stock leverage on Broadcom", risk:"lev"},

  // ── AI income / covered-call ──────────────────────────────────────────────
  {t:"AIPI", name:"REX AI Equity Premium Income", bucket:"income", aum:"~$429M", er:"0.65%", holds:"covered calls", yield:"~41% TTM", inside:"Covered calls on AI stocks",
   note:"That 41% yield is not free money — it’s paid by selling away your upside. In a roaring AI bull you’d likely have made more just holding AIQ.", risk:"income"},
  {t:"FEPI", name:"REX FANG & Innovation Premium Income", bucket:"income", aum:"~$600M", er:"~0.65%", holds:"covered calls", yield:"~25%", inside:"Same idea on FANG names", risk:"income"},
  {t:"AIYY", name:"YieldMax AI Option Income", bucket:"income", aum:"small", er:"~1.3%", holds:"options", yield:"very high", inside:"Options on C3.ai — single stock, fragile",
   note:"Single-stock option income on C3.ai. The highest yield here and the most fragile — the underlying is one volatile name.", risk:"income"},
  {t:"QQQI", name:"NEOS Nasdaq-100 Covered Call", bucket:"income", aum:"~$12.9B", er:"~0.68%", holds:"covered calls", yield:"~14%", inside:"Broad Nasdaq-100, not pure AI", risk:"income"},

  // ── Adjacent / broad ──────────────────────────────────────────────────────
  {t:"QTUM", name:"Defiance Quantum", bucket:"adjacent", aum:"~$6.3B", er:"—", holds:"71", inside:"Quantum computing + AI"},
  {t:"DTCR", name:"Global X Data Center & Digital Infrastructure", bucket:"adjacent", aum:"—", er:"—", holds:"—", inside:"The AI power / build-out play (data centers, REITs)",
   note:"The picks-and-shovels behind the build-out — where the AI electricity and real estate demand shows up."},
  {t:"DTEC", name:"ALPS Disruptive Technologies", bucket:"adjacent", aum:"—", er:"—", holds:"—", inside:"10 disruptive themes, ~10% AI"},
  {t:"KOMP", name:"SPDR S&P Kensho New Economies", bucket:"adjacent", aum:"—", er:"—", holds:"—", inside:"Broad new-economy basket"},
  {t:"LOUP", name:"Innovator Deepwater Frontier Tech", bucket:"adjacent", aum:"~$153M", er:"—", holds:"—", inside:"Gene Munster — active frontier tech"}
];

// Weighted top holdings (June 2026) for the funds whose COMPOSITION actually
// differs — issuer-reported, via stockanalysis.com. Leveraged/single-stock and
// covered-call funds are omitted on purpose: they hold the SAME names in
// leveraged or call-written form, so listing composition adds nothing. Weights
// drift daily. nh = total positions, c10 = % held in the top 10 (the "how
// concentrated" signal), src = full list, partial:true = only the top few were
// published (near-duplicate of a peer fund already shown in full).
window.ETF_HOLDINGS = {
  BAI:  {nh:55,  c10:45.85, src:"https://stockanalysis.com/etf/bai/holdings/", top:[
    {n:"SK Hynix",w:7.33},{n:"Micron",w:5.72},{n:"AMD",w:5.04},{n:"Broadcom",w:4.85},{n:"Nvidia",w:4.52},
    {n:"TSMC",w:4.41},{n:"Lam Research",w:4.20},{n:"Alphabet",w:3.53},{n:"Tower Semiconductor",w:3.25},{n:"Western Digital",w:3.00}]},
  AIQ:  {nh:92,  c10:43.79, src:"https://stockanalysis.com/etf/aiq/holdings/", top:[
    {n:"SK Hynix",w:6.86},{n:"Micron",w:6.15},{n:"Samsung Electronics",w:5.10},{n:"AMD",w:5.02},{n:"Intel",w:4.79},
    {n:"Cisco",w:4.05},{n:"TSMC",w:3.22},{n:"Broadcom",w:2.92},{n:"Apple",w:2.92},{n:"Nvidia",w:2.76}]},
  ARTY: {nh:69,  c10:50.50, src:"https://stockanalysis.com/etf/arty/holdings/", top:[
    {n:"Marvell",w:9.28},{n:"Micron",w:7.28},{n:"AMD",w:7.22},{n:"Oracle",w:4.17},{n:"CoreWeave",w:4.09},
    {n:"TSMC",w:3.85},{n:"SK Hynix",w:3.80},{n:"NAVER",w:3.70},{n:"Super Micro",w:3.59},{n:"Nvidia",w:3.53}]},
  CHAT: {nh:45,  c10:41.51, src:"https://stockanalysis.com/etf/chat/holdings/", top:[
    {n:"Nvidia",w:6.82},{n:"Alphabet",w:5.43},{n:"SK Hynix",w:4.47},{n:"Broadcom",w:4.20},{n:"AMD",w:4.08},
    {n:"Micron",w:3.87},{n:"Samsung",w:3.58},{n:"Nebius Group",w:3.40},{n:"Arm Holdings",w:2.96},{n:"CoreWeave",w:2.70}]},
  IVES: {nh:31,  c10:47.80, src:"https://stockanalysis.com/etf/ives/holdings/", top:[
    {n:"Micron",w:6.15},{n:"Broadcom",w:5.10},{n:"AMD",w:4.94},{n:"TSMC",w:4.78},{n:"Apple",w:4.60},
    {n:"Microsoft",w:4.59},{n:"Nvidia",w:4.59},{n:"Meta",w:4.44},{n:"Tesla",w:4.31},{n:"Oracle",w:4.29}]},
  IGPT: {nh:102, c10:60.10, asof:"Oct 2025", src:"https://stockanalysis.com/etf/igpt/holdings/", top:[
    {n:"AMD",w:10.56},{n:"Alphabet",w:8.13},{n:"Nvidia",w:7.95},{n:"Micron",w:6.36},{n:"Meta",w:6.00},
    {n:"SK Hynix",w:5.20},{n:"Intuitive Surgical",w:4.87},{n:"Qualcomm",w:4.25},{n:"Adobe",w:3.67},{n:"Intel",w:3.10}]},
  THNQ: {nh:57,  c10:31.89, src:"https://stockanalysis.com/etf/thnq/holdings/", top:[
    {n:"Nebius Group",w:4.23},{n:"AMD",w:3.89},{n:"Astera Labs",w:3.78},{n:"MediaTek",w:3.39},{n:"Datadog",w:3.14},
    {n:"Infineon",w:3.12},{n:"IonQ",w:2.65},{n:"Credo Technology",w:2.64},{n:"Palo Alto Networks",w:2.56},{n:"JFrog",w:2.51}]},
  SMH:  {nh:26,  c10:71.00, src:"https://stockanalysis.com/etf/smh/holdings/", top:[
    {n:"Nvidia",w:14.51},{n:"TSMC",w:9.27},{n:"Micron",w:7.84},{n:"Intel",w:7.23},{n:"AMD",w:7.07},
    {n:"Broadcom",w:6.10},{n:"Lam Research",w:4.91},{n:"KLA",w:4.88},{n:"Applied Materials",w:4.67},{n:"ASML",w:4.51}]},
  SOXX: {nh:34,  c10:62.12, src:"https://stockanalysis.com/etf/soxx/holdings/", top:[
    {n:"Micron",w:11.55},{n:"AMD",w:8.70},{n:"Marvell",w:8.22},{n:"Intel",w:6.13},{n:"Broadcom",w:5.77},
    {n:"Nvidia",w:5.53},{n:"Applied Materials",w:5.30},{n:"KLA",w:3.78},{n:"Lam Research",w:3.71},{n:"Qualcomm",w:3.41}]},
  DRAM: {nh:21, src:"https://stockanalysis.com/etf/dram/holdings/",
    extra:"Synthetic structure: DRAM takes its memory exposure through total-return swaps backed by a ~25% U.S. Treasury-bill collateral sleeve, so the raw filing grosses past 100%. Weights below consolidate each maker's direct + swap lines into its true economic exposure — three names are ~70% of the fund.", top:[
    {n:"Samsung Electronics",w:24.95},{n:"SK Hynix",w:23.69},{n:"Micron Technology",w:22.44},{n:"SanDisk",w:4.94},
    {n:"Western Digital",w:4.52},{n:"Seagate Technology",w:4.49}]},
  BOTZ: {nh:66,  c10:59.07, foreign:"68%", src:"https://stockanalysis.com/etf/botz/holdings/", top:[
    {n:"ABB (Switzerland)",w:9.18},{n:"Keyence (Japan)",w:9.12},{n:"Nvidia",w:8.70},{n:"Fanuc (Japan)",w:8.68},{n:"Intuitive Surgical",w:6.29},
    {n:"Shenzhen Inovance",w:4.23},{n:"SMC Corp (Japan)",w:4.23},{n:"Daifuku (Japan)",w:3.47},{n:"RoboTechnik",w:2.84},{n:"Yaskawa Electric (Japan)",w:2.33}]},
  ARKQ: {nh:41,  c10:55.71, src:"https://stockanalysis.com/etf/arkq/holdings/", top:[
    {n:"Tesla",w:10.20},{n:"AMD",w:8.38},{n:"Teradyne",w:7.46},{n:"Rocket Lab",w:5.84},{n:"Kratos Defense",w:5.62},
    {n:"Alphabet",w:4.55},{n:"Deere",w:3.91},{n:"Palantir",w:3.55},{n:"TSMC",w:3.18},{n:"L3Harris",w:3.01}]},
  HUMN: {nh:48,  c10:41.85, foreign:"heavy", src:"https://stockanalysis.com/etf/humn/holdings/", top:[
    {n:"UBTech Robotics (HK)",w:5.57},{n:"Tesla",w:5.18},{n:"Hyundai Motor",w:4.69},{n:"Robotis (Korea)",w:4.48},{n:"Doosan Robotics",w:3.99},
    {n:"Rainbow Robotics",w:3.97},{n:"Harmonic Drive (Japan)",w:3.85},{n:"Leader Harmonious Drive",w:3.53},{n:"Teradyne",w:3.31},{n:"Swancor Advanced",w:3.28}]},
  KOID: {nh:60,  c10:27.16, foreign:"heavy", src:"https://stockanalysis.com/etf/koid/holdings/", top:[
    {n:"Credo Technology",w:3.39},{n:"STMicroelectronics",w:3.03},{n:"Infineon",w:2.90},{n:"Harmonic Drive",w:2.74},{n:"Renesas Electronics",w:2.68},
    {n:"Leader Harmonious Drive",w:2.66},{n:"China Leadshine",w:2.56},{n:"NXP Semiconductors",w:2.42},{n:"Texas Instruments",w:2.39},{n:"Hiwin Technologies",w:2.39}]},

  // Partial — only the top few were published (composition mirrors a peer above)
  WTAI: {partial:true, src:"https://stockanalysis.com/etf/wtai/holdings/", top:[
    {n:"Micron",w:4.9},{n:"Samsung",w:4.3},{n:"Nvidia",w:4.2},{n:"Kioxia",w:3.7},{n:"Amazon",w:3.7}]},
  AGIX: {partial:true, extra:"Plus private Anthropic 1.7% & SpaceX 2.6% — the differentiator, not in the public top 10.", src:"https://stockanalysis.com/etf/agix/holdings/", top:[
    {n:"Nvidia",w:4.6},{n:"Alphabet",w:3.8},{n:"Microsoft",w:3.7},{n:"Meta",w:3.6},{n:"Apple",w:3.2}]},
  XSD:  {partial:true, extra:"Equal-weight — every name sits near 3%, the near-opposite of SMH.", src:"https://stockanalysis.com/etf/xsd/holdings/", top:[
    {n:"Marvell",w:3.2},{n:"Power Integrations",w:3.1},{n:"Cirrus Logic",w:3.0}]}
};
