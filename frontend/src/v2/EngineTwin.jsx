import { useState } from 'react'

const components = {
  cylinder: { name: 'Cylinder assembly', sensor: 'cht', unit: '°C', text: 'Combustion heat is coupled to cylinder-head temperature through a 15-second thermal response.' },
  exhaust: { name: 'Exhaust manifold', sensor: 'egt', unit: '°C', text: 'Exhaust temperature responds to engine load, ambient conditions and fuel mixture.' },
  oil: { name: 'Lubrication circuit', sensor: 'oil_pressure', unit: 'bar', text: 'Oil pressure and temperature reveal lubrication loss and thermal stress.' },
  shaft: { name: 'Crankshaft & bearings', sensor: 'vibration', unit: 'mm/s', text: 'Shaft speed and vibration track rotating-assembly condition.' },
}

export default function EngineTwin({ sensors, running, selected, onSelect }) {
  const [thermal, setThermal] = useState(false)
  const current = components[selected]
  const warm = thermal ? (sensors.cht > 220 ? '#ff795c' : '#eeb968') : '#698a99'
  function hotspot(key, x, y, label, textX, textY) {
    return <g className={`engine-hotspot ${selected === key ? 'selected' : ''}`} role="button" tabIndex="0" aria-label={`Inspect ${components[key].name}`} onClick={() => onSelect(key)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(key) } }}>
      <path d={`M ${x} ${y} L ${textX > x ? x + 36 : x - 36} ${textY} H ${textX}`} fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx={x} cy={y} r="10" fill="#071b22" stroke="currentColor" /><circle cx={x} cy={y} r="3" fill="currentColor" />
      <text x={textX} y={textY - 10} textAnchor={textX > x ? 'end' : 'start'} fill="currentColor" fontSize="10" letterSpacing="1.2">{label}</text>
    </g>
  }
  return <>
    <div className="twin-toolbar"><span><i className="v-dot" /> {running ? "STATE SYNCHRONIZED" : "LAST KNOWN STATE"}</span><div className="v-segment"><button className={!thermal ? 'active' : ''} onClick={() => setThermal(false)}>Structure</button><button className={thermal ? 'active' : ''} onClick={() => setThermal(true)}>Thermal</button></div></div>
    <div className={`engine-stage ${running ? 'engine-running' : ''}`}>
      <svg viewBox="0 0 760 390" role="img" aria-label="Interactive four-cylinder boxer aero piston engine schematic">
        <defs>
          <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#77909d"/><stop offset=".35" stopColor="#304954"/><stop offset="1" stopColor="#0b1923"/></linearGradient>
          <linearGradient id="bodyMetal" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#637985"/><stop offset=".5" stopColor="#253d48"/><stop offset="1" stopColor="#11222d"/></linearGradient>
          <linearGradient id="fin" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#182b35"/><stop offset=".5" stopColor={warm}/><stop offset="1" stopColor="#1b313d"/></linearGradient>
          <radialGradient id="engineGlow"><stop stopColor="#3bd5bd" stopOpacity=".14"/><stop offset="1" stopColor="#3bd5bd" stopOpacity="0"/></radialGradient>
          <pattern id="grid" width="35" height="35" patternUnits="userSpaceOnUse"><path d="M35 0H0V35" fill="none" stroke="#3c7d82" strokeOpacity=".13"/></pattern>
          <filter id="shadow"><feDropShadow dx="0" dy="15" stdDeviation="12" floodOpacity=".7"/></filter>
        </defs>
        <ellipse cx="390" cy="230" rx="290" ry="170" fill="url(#engineGlow)"/>
        <path d="M30 285L355 160 735 285 410 410Z" fill="url(#grid)"/>
        <ellipse cx="390" cy="290" rx="240" ry="56" fill="none" stroke="#2cd4b5" strokeOpacity=".15" strokeDasharray="5 8"/>
        <path d="M50 50V30H70M690 30H710V50M50 310V330H70M690 330H710V310" fill="none" stroke="#476775"/>
        <g filter="url(#shadow)">
          <path d="M305 242L298 296 460 324 480 258" fill="url(#bodyMetal)" stroke="#4b6470"/>
          <path d="M317 287L435 311 450 286 330 262Z" fill="#172d37" stroke="#517079"/>
          <g fill="none" stroke="#416271" strokeWidth="13" strokeLinejoin="round"><path d="M272 148L226 198 237 270 316 298"/><path d="M475 172L549 222 525 279 466 295"/></g>
          <path d="M310 137L403 100 490 148 473 250 377 286 294 231Z" fill="url(#bodyMetal)" stroke="#718a95"/>
          <path d="M310 137L391 178 490 148M391 178L377 286" fill="none" stroke="#8ea7b2" strokeOpacity=".65"/>
          {[{x:263,y:136,angle:-28}, {x:311,y:178,angle:-28}, {x:445,y:126,angle:29}, {x:488,y:168,angle:29}].map(({x,y,angle}, index) => <g key={index} transform={`translate(${x} ${y}) rotate(${angle})`}>
            <rect x="-40" y="-31" width="80" height="91" rx="13" fill="url(#metal)" stroke="#6e8791"/>
            {Array.from({length:10}, (_, fin) => <path key={fin} d={`M-44 ${-18 + fin*7}H44L39 ${-13 + fin*7}H-40Z`} fill="url(#fin)" stroke={warm} strokeWidth=".8"/>)}
            <rect x="-40" y="-40" width="80" height="27" rx="7" fill="url(#metal)" stroke={thermal ? warm : '#93a8b0'}/>
            <path d="M-25-29H23M-24-23H24" stroke="#abc1c8" strokeOpacity=".5"/>
            <circle cx="-27" cy="-31" r="3" fill="#061920"/><circle cx="27" cy="-31" r="3" fill="#061920"/>
            <path d="M0-40V-56" stroke="#a3bab9" strokeWidth="7"/><path d="M0-56Q25-86 65-49" fill="none" stroke="#24343c" strokeWidth="4"/>
          </g>)}
          <path d="M341 138L376 122 420 147 386 163Z" fill="#80979e" stroke="#9db0b7"/><path d="M354 127V98L385 86 418 105V139L386 150Z" fill="url(#metal)" stroke="#6d8b96"/>
          <ellipse cx="385" cy="101" rx="27" ry="13" fill="#0d2530" stroke="#8199a1" strokeWidth="4"/>
          <path d="M361 97L407 109M362 104L401 93" stroke="#51767e" strokeWidth="2"/>
          <path d="M295 222L215 241 214 270 303 252Z" fill="url(#metal)" stroke="#80959d"/>
          <ellipse cx="217" cy="253" rx="19" ry="28" fill="url(#bodyMetal)" stroke="#99aeb7" strokeWidth="3"/>
          <g className="propeller" style={{transformOrigin:'217px 253px'}}><path d="M217 249Q183 142 208 115Q231 142 222 250M217 257Q251 364 226 385Q202 365 211 255" fill="#8aa8b0" fillOpacity=".24" stroke="#9bbbc3" strokeOpacity=".5"/></g>
          <ellipse cx="217" cy="253" rx="10" ry="16" fill="#183641" stroke="#4bdec3" strokeWidth="2"/>
          <path d="M390 259L391 287 435 297 448 274" fill="#215256" stroke="#59c7b5"/>
          <path d="M460 247C501 301 380 343 346 276" fill="none" stroke="#38b7a4" strokeWidth="4"/>
          <path d="M460 247C501 301 380 343 346 276" className="oil-flow" fill="none" stroke="#adffe3" strokeWidth="2" strokeDasharray="5 22"/>
          {[ [332,208], [366,227], [417,221], [449,207], [315,225], [455,254] ].map(([cx,cy],i) => <circle key={i} cx={cx} cy={cy} r="4" fill="#101f29" stroke="#8cabb3"/>)}
        </g>
        {hotspot('cylinder', 293, 137, 'CYLINDER HEAD', 140, 83)}
        {hotspot('exhaust', 526, 221, 'EXHAUST SYSTEM', 665, 161)}
        {hotspot('shaft', 261, 246, 'CRANKSHAFT', 100, 302)}
        {hotspot('oil', 439, 287, 'OIL CIRCUIT', 659, 321)}
        <g transform="translate(658 66)" strokeWidth="1.5"><path d="M0 0V-22" stroke="#6f99bc"/><path d="M0 0L22 9" stroke="#4cceac"/><path d="M0 0L-14 13" stroke="#a587c5"/><text x="-4" y="-27" fill="#6f99bc" fontSize="9">Z</text><text x="26" y="14" fill="#4cceac" fontSize="9">X</text></g>
        <text x="67" y="360" fill="#647e89" fontSize="9" letterSpacing="1.2">BOXER-4 · REDUCED-ORDER TWIN</text>
        <text x="693" y="360" textAnchor="end" fill="#647e89" fontSize="9" letterSpacing="1.2">SCHEMATIC / NOT TO SCALE</text>
      </svg>
    </div>
    <div className="twin-detail"><div><span className="v-dot"/><strong>{current.name}</strong><p>{current.text}</p></div><b>{sensors[current.sensor].toFixed(1)}<small>{current.unit}</small></b></div>
  </>
}

