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
