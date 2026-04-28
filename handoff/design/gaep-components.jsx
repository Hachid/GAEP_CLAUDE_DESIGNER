
// ============================================================
// GAEP — Componentes Compartilhados
// ============================================================
const { useState, useEffect, useRef, useCallback } = React;

// ── Dados Mock ───────────────────────────────────────────────
const OPERADORES = ['Hachid', 'Alex', 'Botta', 'Nakazo', 'Mlotto', 'Maia', 'Teixeira', 'Ernesto', 'Rocco', 'Stadler', 'Regio', 'Filipe'];

const CATEGORIAS = {
  'OPERAR': ['POJ', 'Apoio e Contributo', 'Patrulha', 'Escolta', 'Segurança VIP', 'Abordagem'],
  'TREINAR': ['Atividade Lúdica', 'Atletismo Prime', 'CDR', 'Luta Policial', 'Arremesso/Tiro', 'Rádio Comunicações'],
  'INSTRUIR': ['Instrução Técnica', 'Palestra', 'Curso Externo', 'Nivelamento']
};

const BI_DATA = {
  totalRegistros: 11,
  cargaHoraria: '50:00h',
  operar: '27:30h', treinar: '22:30h', instruir: '00:00h',
  composicao: [
  { label: 'Treinar', value: 22.5, display: '22:30h' },
  { label: 'Operar',  value: 27.5, display: '27:30h' }],

  rankingOperar: [
  { nome: 'POJ', horas: 27.5 },
  { nome: 'Apoio e Contributo', horas: 18 },
  { nome: 'Patrulha', horas: 12 }],

  rankingTreinar: [
  { nome: 'Atividade Lúdica', horas: 9 },
  { nome: 'Atletismo Prime', horas: 7 },
  { nome: 'CDR', horas: 5.5 },
  { nome: 'Luta Policial', horas: 4 },
  { nome: 'Arremesso/Tiro', horas: 3.5 },
  { nome: 'Rádio Comunicações', horas: 2 }],

  rankingInstruir: []
};

const OP_DATA = {
  totalRegistros: 11, cargaHoraria: '50:00h',
  composicao: [
  { label: 'Treinar', value: 20.5 },
  { label: 'Operar', value: 24.5 }],

  operar: { total: '4 / 24:20h', items: [
    { nome: 'POJ', horas: 12 },
    { nome: 'Apoio e Contributo', horas: 8 },
    { nome: 'Patrulha', horas: 4.3 }]
  },
  treinar: { total: '7 / 25:20h', items: [
    { nome: 'Atividade Lúdica', horas: 8 },
    { nome: 'Atletismo Prime', horas: 6 },
    { nome: 'CDR', horas: 5 },
    { nome: 'Luta Policial', horas: 3.5 },
    { nome: 'Arremesso/Tiro', horas: 2.8 }]
  }
};

const FOLHA_DATA = [
{ data: '01/04/2026', rows: [
    { ativ:'Escolta',       i:'08:00', f:'12:00', t:'04:00h' },
    { ativ:'Administrativo',i:'12:00', f:'15:00', t:'03:00h' },
  ], sub: '07:00h' },
{ data: '05/04/2026', rows: [
    { ativ:'POJ',           i:'00:00', f:'12:00', t:'12:00h' },
  ], sub: '12:00h' },
{ data: '07/04/2026', rows: [
    { ativ:'Patrulha',      i:'08:00', f:'12:00', t:'04:00h' },
    { ativ:'Atividade Lúdica',i:'14:00',f:'17:00',t:'03:00h' },
  ], sub: '07:00h' },
{ data: '08/04/2026', rows: [
    { ativ:'CDR',           i:'08:00', f:'12:00', t:'04:00h' },
    { ativ:'Luta Policial', i:'13:00', f:'15:00', t:'02:00h' },
    { ativ:'Arremesso/Tiro',i:'15:00', f:'16:00', t:'01:00h' },
  ], sub: '07:00h' },
{ data: '09/04/2026', rows: [
    { ativ:'Escolta',       i:'06:00', f:'12:00', t:'06:00h' },
  ], sub: '06:00h' },
{ data: '13/04/2026', rows: [
    { ativ:'Administrativo',i:'08:00', f:'12:00', t:'04:00h' },
    { ativ:'Atletismo Prime',i:'14:00',f:'15:00', t:'01:00h' },
  ], sub: '05:00h' },
{ data: '16/04/2026', rows: [
    { ativ:'POJ',           i:'00:00', f:'06:00', t:'06:00h' },
  ], sub: '06:00h' }];


// ── Dados Linha do Tempo ────────────────────────────────────
const MESES_TODOS = ['Mai/25','Jun/25','Jul/25','Ago/25','Set/25','Out/25','Nov/25','Dez/25','Jan/26','Fev/26','Mar/26','Abr/26'];
const LINHA_TOTAL  = [138,152,141,168,145,172,160,148,175,163,158,180];
const LINHA_OPS = {
  'Hachid':  [46,50,44,55,48,58,54,50,58,55,52,60],
  'Alex':    [36,40,35,42,37,44,40,38,44,42,40,46],
  'Botta':   [28,32,28,36,30,36,34,28,38,34,32,38],
  'Nakazo':  [28,30,34,35,30,34,32,32,35,32,34,36],
};
const PERIODOS = [
  { id:'trimestral', label:'Trimestral', meses:3 },
  { id:'semestral',  label:'Semestral',  meses:6 },
  { id:'anual',      label:'Anual',      meses:12 },
];

const MISSOES_DATA_INIT = [
  { id:1, nome:'Hachid', qtd:1.5, tipo:'Tipo 1 (R$ 425)', valor:'R$ 637,50', obs:'Escolta BSB — operação especial' },
  { id:2, nome:'Hachid', qtd:1.5, tipo:'Tipo 2 (R$ 380)', valor:'R$ 570,00', obs:'Deslocamento Curitiba' },
  { id:3, nome:'Alex',   qtd:1,   tipo:'Tipo 1 (R$ 425)', valor:'R$ 425,00', obs:'Missão SP — reforço' },
  { id:4, nome:'Alex',   qtd:1.5, tipo:'Tipo 3 (R$ 335)', valor:'R$ 502,50', obs:'Apoio Foz do Iguaçu' },
  { id:5, nome:'Botta',  qtd:2,   tipo:'Tipo 2 (R$ 380)', valor:'R$ 760,00', obs:'Escolta Rio de Janeiro' },
  { id:6, nome:'Nakazo', qtd:1.5, tipo:'Tipo 3 (R$ 335)', valor:'R$ 502,50', obs:'Transporte Londrina' },
  { id:7, nome:'Mlotto', qtd:1,   tipo:'Tipo 2 (R$ 380)', valor:'R$ 380,00', obs:'Deslocamento Campo Mourão' },
];


// ── Plugin: label no final das barras ────────────────────────
const barLabelPlugin = {
  id: 'barLabel',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    chart.getDatasetMeta(0).data.forEach((bar, i) => {
      const v = chart.data.datasets[0].data[i];
      ctx.save();
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 11px Segoe UI, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${v}h`, bar.x + 5, bar.y);
      ctx.restore();
    });
  }
};

// ── Gráfico Donut ─────────────────────────────────────────────
function DonutChart({ data, colors, size = 240 }) {
  const ref = useRef(null);
  const inst = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    if (inst.current) inst.current.destroy();
    const total = data.reduce((s,d)=>s+d.value,0);
    inst.current = new Chart(ref.current, {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.display ? `${d.label}  ${d.display}` : d.label),
        datasets: [{ data: data.map(d => d.value), backgroundColor: colors, borderWidth: 3, borderColor:'#fff', hoverOffset:8 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: 18, font: { size: 12, weight: '700' }, color: '#1e293b',
              generateLabels(chart) {
                return chart.data.labels.map((lbl,i) => ({
                  text: lbl,
                  fillStyle: colors[i],
                  strokeStyle: colors[i],
                  lineWidth: 0,
                  index: i,
                }));
              }
            }
          },
          tooltip: { callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.parsed.toFixed(1)}h (${Math.round(ctx.parsed/total*100)}%)`
          }}
        }
      }
    });
    return () => inst.current && inst.current.destroy();
  }, [JSON.stringify(data)]);
  return <div style={{ height: size, position: 'relative' }}><canvas ref={ref} /></div>;
}

// ── Gráfico Barra Horizontal ──────────────────────────────────
function HBarChart({ data, color, size = 180 }) {
  const ref = useRef(null);
  const inst = useRef(null);
  const h = Math.max(size, data.length * 40);
  useEffect(() => {
    if (!ref.current) return;
    if (inst.current) inst.current.destroy();
    inst.current = new Chart(ref.current, {
      type: 'bar',
      data: {
        labels: data.map(d => d.nome),
        datasets: [{ data: data.map(d => d.horas), backgroundColor: color, borderRadius: 5,
          barThickness: 22, borderSkipped: false }]
      },
      plugins: [barLabelPlugin],
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        layout: { padding: { right: 40 } },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.x}h` }}},
        scales: {
          x: { display: false, grid: { display: false } },
          y: { grid: { display: false }, ticks: { font: { size: 11, weight:'600' }, color: '#334155' }}
        }
      }
    });
    return () => inst.current && inst.current.destroy();
  }, [JSON.stringify(data), color]);
  return <div style={{ height: h, position: 'relative' }}><canvas ref={ref} /></div>;
}

// ── Gráfico de Linhas ─────────────────────────────────────────
function LineChart({ periodo }) {
  const ref = useRef(null);
  const inst = useRef(null);
  const n = periodo.meses;
  const labels = MESES_TODOS.slice(-n);
  const totalSlice = LINHA_TOTAL.slice(-n);
  const lineColors = ['#f97316','#2563eb','#16a34a','#8b5cf6'];
  useEffect(() => {
    if (!ref.current) return;
    if (inst.current) inst.current.destroy();
    const ctx = ref.current.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 280);
    grad.addColorStop(0, 'rgba(26,35,126,0.18)');
    grad.addColorStop(1, 'rgba(26,35,126,0)');
    const datasets = [
      {
        label: 'Total Grupo',
        data: totalSlice,
        borderColor: '#1a237e',
        backgroundColor: grad,
        borderWidth: 3,
        pointRadius: 5,
        pointBackgroundColor: '#1a237e',
        tension: 0.4,
        fill: true,
        order: 0,
      },
      ...Object.entries(LINHA_OPS).map(([nome, vals], i) => ({
        label: nome,
        data: vals.slice(-n),
        borderColor: lineColors[i],
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: lineColors[i],
        tension: 0.4,
        fill: false,
        borderDash: [4,3],
        order: i+1,
      }))
    ];
    inst.current = new Chart(ref.current, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position:'bottom', labels:{ padding:14, font:{ size:11, weight:'600' }, color:'#334155', usePointStyle:true, pointStyleWidth:10 }},
          tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}h` }}
        },
        scales: {
          x: { grid: { color:'#f1f5f9' }, ticks: { font:{ size:10 }, color:'#64748b', maxRotation:0 }},
          y: { grid: { color:'#f1f5f9' }, ticks: { font:{ size:10 }, color:'#64748b', callback: v => `${v}h` }, beginAtZero:false }
        }
      }
    });
    return () => inst.current && inst.current.destroy();
  }, [periodo.id]);
  return <div style={{ height: 280, position:'relative' }}><canvas ref={ref} /></div>;
}

// ── Card BI ───────────────────────────────────────────────────
function BiCard({ children, style }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '18px', marginBottom: 20,
      boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', ...style }}>
      {children}
    </div>);

}
function ChartTitle({ children, color = '#1e293b' }) {
  return (
    <div style={{ textAlign: 'center', fontWeight: 700, color, fontSize: '0.95rem',
      borderBottom: '1px solid #e2e8f0', paddingBottom: 10, marginBottom: 14 }}>
      {children}
    </div>);

}

// ── Evolução Mensal (linhas) ─────────────────────────────────
function EvolucaoMensal() {
  const [periodo, setPeriodo] = React.useState(PERIODOS[1]);
  return (
    <BiCard>
      <div style={{ textAlign:'center', fontWeight:800, color:'#1e293b', fontSize:'0.97rem',
        borderBottom:'1px solid #e2e8f0', paddingBottom:10, marginBottom:14 }}>
        Evolução de Horas por Mês
      </div>
      <div style={{ display:'flex', gap:6, marginBottom:18, justifyContent:'center', flexWrap:'wrap' }}>
        {PERIODOS.map(p => (
          <button key={p.id} onClick={() => setPeriodo(p)}
            style={{ padding:'7px 14px', borderRadius:20, border:'none', cursor:'pointer',
              fontWeight:700, fontSize:'0.75rem', transition:'0.2s',
              background: periodo.id===p.id ? '#1a237e' : '#f1f5f9',
              color: periodo.id===p.id ? '#fff' : '#64748b' }}>
            {p.label}
          </button>
        ))}
        <button onClick={() => setPeriodo({ id:'total', label:'Todo Período', meses:12 })}
          style={{ padding:'7px 14px', borderRadius:20, border:'none', cursor:'pointer',
            fontWeight:700, fontSize:'0.75rem', transition:'0.2s',
            background: periodo.id==='total' ? '#1a237e' : '#f1f5f9',
            color: periodo.id==='total' ? '#fff' : '#64748b' }}>
          Todo Período
        </button>
      </div>
      <LineChart periodo={periodo} />
    </BiCard>
  );
}

// ── Tela: Painel BI ──────────────────────────────────────────
function PainelBI() {
  const [showFiltros, setShowFiltros] = useState(false);
  return (
    <div style={{ padding: '0 0 30px' }}>
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
        marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <button onClick={() => setShowFiltros((v) => !v)}
        style={{ width: '100%', padding: '14px 18px', background: 'transparent',
          border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, fontWeight: 700, fontSize: '0.82rem', color: '#1a237e',
          cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5,
          borderRadius: 12, outline: '1px solid #1a237e' }}>
          <span>🔍</span> Mostrar / Ocultar Filtros do Painel
        </button>
        {showFiltros &&
        <div style={{ padding: '18px', borderTop: '1px solid #e2e8f0', animation: 'fadeIn .25s' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div><label style={labelStyle}>Data Início</label><input type="date" style={inputStyle} /></div>
              <div><label style={labelStyle}>Data Fim</label><input type="date" style={inputStyle} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div><label style={labelStyle}>Categoria</label>
                <select style={inputStyle}><option>Todas</option>{Object.keys(CATEGORIAS).map((c) => <option key={c}>{c}</option>)}</select>
              </div>
              <div><label style={labelStyle}>Atividade</label>
                <select style={inputStyle}><option>Todas</option></select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button style={{ ...btnStyle, background: '#1a237e', fontSize: '0.8rem', margin: 0 }}>📊 Atualizar</button>
              <button style={{ ...btnStyle, background: '#16a34a', fontSize: '0.8rem', margin: 0 }}>📄 PDF</button>
            </div>
          </div>
        }
      </div>

      {/* KPI Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <BiCard style={{ textAlign: 'center', borderTop: '4px solid #1a237e', margin: 0 }}>
          <div style={kpiLabelStyle}>Total de Registros</div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#1e293b', lineHeight: 1.1, marginTop: 6 }}>11</div>
        </BiCard>
        <BiCard style={{ textAlign: 'center', borderTop: '4px solid #1e293b', margin: 0 }}>
          <div style={kpiLabelStyle}>Carga Horária (Mês)</div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#1e293b', lineHeight: 1.1, marginTop: 6 }}>50:00h</div>
        </BiCard>
      </div>

      {/* KPI Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
        {[
        { label: 'Operar', value: '27:30h', color: '#1a237e' },
        { label: 'Treinar', value: '22:30h', color: '#f97316' },
        { label: 'Instruir', value: '00:00h', color: '#16a34a' }].
        map((k) =>
        <BiCard key={k.label} style={{ textAlign: 'center', padding: '14px 6px', borderTop: `3px solid ${k.color}`, margin: 0 }}>
            <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: k.color }}>{k.value}</div>
          </BiCard>
        )}
      </div>

      {/* Donut */}
      <BiCard>
        <ChartTitle>Composição por Categoria</ChartTitle>
        <DonutChart data={BI_DATA.composicao} colors={['#f97316', '#1a237e']} />
      </BiCard>

      {/* Rankings */}
      <BiCard>
        <ChartTitle color="#1a237e">Ranking: Operar</ChartTitle>
        <HBarChart data={BI_DATA.rankingOperar} color="#1a237e" />
        <div style={{ marginTop:24 }}>
          <ChartTitle color="#f97316">Ranking: Treinar</ChartTitle>
          <HBarChart data={BI_DATA.rankingTreinar} color="#f97316" />
        </div>
      </BiCard>

      {/* Evolução Mensal */}
      <EvolucaoMensal />
    </div>);

}

// ── Tela: Desempenho Individual ──────────────────────────────
function DesempenhoIndividual() {
  const [operador, setOperador] = useState('Hachid');
  const [tab, setTab] = useState('mes');
  const [view, setView] = useState(null); // null | 'bi' | 'folha'

  function analisar() {setView('bi');}
  function folha() {setView('folha');}

  return (
    <div style={{ paddingBottom: 30 }}>
      {/* Filtros */}
      <BiCard style={{ borderLeft: '4px solid #1a237e', background: 'rgba(26,35,126,0.02)' }}>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Selecionar Operador</label>
          <select style={inputStyle} value={operador} onChange={(e) => {setOperador(e.target.value);setView(null);}}>
            {OPERADORES.map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0', marginBottom: 14 }}>
          {['mes', 'periodo'].map((t, i) =>
          <div key={t} onClick={() => setTab(t)}
          style={{ flex: 1, padding: '12px 8px', textAlign: 'center', cursor: 'pointer',
            fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase',
            background: tab === t ? '#1a237e' : '#fff',
            color: tab === t ? '#fff' : '#64748b', transition: '0.2s' }}>
              {i === 0 ? 'Mês Referência' : 'Período Exato'}
            </div>
          )}
        </div>
        {tab === 'mes' ?
        <div><label style={labelStyle}>Mês e Ano</label><input type="month" defaultValue="2026-04" style={inputStyle} /></div> :
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={labelStyle}>Data Início</label><input type="date" style={inputStyle} /></div>
              <div><label style={labelStyle}>Data Fim</label><input type="date" style={inputStyle} /></div>
            </div>
        }
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
          <button onClick={analisar} style={{ ...btnStyle, background: '#2563eb', fontSize: '0.78rem', margin: 0 }}>📊 Analisar Operador</button>
          <button onClick={folha} style={{ ...btnStyle, background: '#16a34a', fontSize: '0.78rem', margin: 0 }}>📅 Gerar Folha</button>
        </div>
      </BiCard>

      {view === 'bi' &&
      <div style={{ animation: 'fadeIn .3s' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <BiCard style={{ textAlign: 'center', margin: 0, borderTop: '4px solid #1a237e' }}>
              <div style={kpiLabelStyle}>Missões no Período</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b', marginTop: 6 }}>11</div>
            </BiCard>
            <BiCard style={{ textAlign: 'center', margin: 0, borderTop: '4px solid #f97316' }}>
              <div style={kpiLabelStyle}>Carga Horária</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f97316', marginTop: 6 }}>50:00h</div>
            </BiCard>
          </div>
          <BiCard>
            <ChartTitle>Composição por Categoria</ChartTitle>
            <DonutChart data={OP_DATA.composicao} colors={['#f97316', '#1a237e']} />
          </BiCard>
          <BiCard>
            <ChartTitle color="#1a237e">Categoria: Operar <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Total: {OP_DATA.operar.total}</span></ChartTitle>
            <HBarChart data={OP_DATA.operar.items} color="#1a237e" />
            <div style={{ marginTop: 20 }}>
              <ChartTitle color="#f97316">Categoria: Treinar <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Total: {OP_DATA.treinar.total}</span></ChartTitle>
              <HBarChart data={OP_DATA.treinar.items} color="#f97316" />
            </div>
          </BiCard>
        </div>
      }

      {view === 'folha' &&
      <div style={{ animation: 'fadeIn .3s' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <BiCard style={{ textAlign: 'center', margin: 0, borderTop: '4px solid #1a237e' }}>
              <div style={kpiLabelStyle}>Missões no Período</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b', marginTop: 6 }}>11</div>
            </BiCard>
            <BiCard style={{ textAlign: 'center', margin: 0, borderTop: '4px solid #f97316' }}>
              <div style={kpiLabelStyle}>Carga Horária</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f97316', marginTop: 6 }}>50:00h</div>
            </BiCard>
          </div>
          <BiCard style={{ padding: 12 }}>
            <div style={{ fontWeight:700, textTransform:'uppercase', color:'#64748b', fontSize:'0.75rem', textAlign:'center', marginBottom:16, letterSpacing:0.5 }}>
              Quadro de Horários (Folha Ponto)
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem' }}>
              <thead>
                <tr style={{ borderBottom:'2px solid #e2e8f0', color:'#64748b', textAlign:'center' }}>
                  <th style={{ padding:'8px 4px', textAlign:'left' }}>Data</th>
                  <th style={{ padding:'8px 4px', textAlign:'left' }}>Atividade</th>
                  <th style={{ padding:'8px 4px' }}>Início</th>
                  <th style={{ padding:'8px 4px' }}>Fim</th>
                  <th style={{ padding:'8px 4px' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {FOLHA_DATA.map((dia, di) =>
                  <React.Fragment key={di}>
                    {dia.rows.map((r, ri) =>
                      <tr key={ri} style={{ borderBottom:'1px solid #f1f5f9' }}>
                        <td style={{ padding:'7px 4px', color:'#1a237e', fontWeight:700, whiteSpace:'nowrap' }}>
                          {ri === 0 ? dia.data : ''}
                        </td>
                        <td style={{ padding:'7px 4px', color:'#334155', fontWeight:600, fontSize:'0.8rem' }}>{r.ativ}</td>
                        <td style={{ padding:'7px 4px', textAlign:'center' }}>{r.i}</td>
                        <td style={{ padding:'7px 4px', textAlign:'center' }}>{r.f}</td>
                        <td style={{ padding:'7px 4px', textAlign:'center', fontWeight:700, color:'#475569' }}>{r.t}</td>
                      </tr>
                    )}
                    <tr style={{ background:'rgba(249,115,22,0.06)' }}>
                      <td colSpan={4} style={{ padding:'6px 4px 6px 8px', textAlign:'right', color:'#64748b', fontSize:'0.78rem', fontWeight:700, letterSpacing:0.3 }}>
                        TOTAL DO DIA:
                      </td>
                      <td style={{ padding:'6px 4px', textAlign:'center', color:'#f97316', fontWeight:800, fontSize:'0.88rem' }}>{dia.sub}</td>
                    </tr>
                    {di < FOLHA_DATA.length - 1 && <tr><td colSpan={5} style={{ height:6 }}></td></tr>}
                  </React.Fragment>
                )}
              </tbody>
              <tfoot>
                <tr style={{ borderTop:'2px solid #1a237e', fontWeight:700, color:'#1a237e', background:'rgba(26,35,126,0.04)' }}>
                  <td colSpan={4} style={{ padding:'12px 4px 12px 8px', textAlign:'right', fontSize:'0.9rem' }}>TOTAL GERAL:</td>
                  <td style={{ padding:'12px 4px', textAlign:'center', fontSize:'1rem' }}>50:00h</td>
                </tr>
              </tfoot>
            </table>
          </BiCard>
        </div>
      }
    </div>);

}

// ── Tela: Registro de Operação ───────────────────────────────
function RegistroOperacao({ usuario }) {
  const [categoria, setCategoria] = useState('');
  const [equipe, setEquipe] = useState([...OPERADORES]);
  const [todos, setTodos] = useState(true);
  const [descricao, setDescricao] = useState('');
  const [showRevisao, setShowRevisao] = useState(false);
  const [iaLoading, setIaLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [duracaoBadge, setDuracaoBadge] = useState('00:00h');
  const iRef = useRef(null);const fRef = useRef(null);

  const atividadeOpts = categoria ? CATEGORIAS[categoria] : [];

  function toggleMembro(nome) {
    setTodos(false);
    setEquipe(e => e.includes(nome) ? e.filter(x => x !== nome) : [...e, nome]);
  }
  function toggleTodos() {
    if (!todos) { setTodos(true); setEquipe([...OPERADORES]); }
    else { setTodos(false); setEquipe([]); }
  }
  function calcDuracao() {
    const i = iRef.current?.value,f = fRef.current?.value;
    if (!i || !f) return;
    const [ih, im] = i.split(':').map(Number),[fh, fm] = f.split(':').map(Number);
    let mins = fh * 60 + fm - (ih * 60 + im);
    if (mins < 0) mins += 24 * 60;
    setDuracaoBadge(`${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}h`);
  }
  function gerarIA() {
    setIaLoading(true);
    setTimeout(() => {
      setIaLoading(false);
      setShowRevisao(true);
    }, 1800);
  }
  function salvarDireto() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div style={{ paddingBottom: 30 }}>
      {/* Relatorista badge */}
      <div style={{ background: 'rgba(26,35,126,0.05)', borderLeft: '4px solid #1a237e',
        padding: '12px 16px', borderRadius: 8, marginBottom: 22 }}>
        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Relatorista Ativo:</div>
        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1a237e', marginTop: 2 }}>{usuario}</div>
      </div>

      {/* Data + Horários — bloco compacto mobile */}
      <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14,
        overflow:'hidden', marginBottom:20, boxShadow:'0 2px 8px rgba(0,0,0,0.05)' }}>
        {/* Data */}
        <div style={{ padding:'14px 16px', borderBottom:'1px solid #e2e8f0', display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:'1.3rem' }}>📅</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'0.68rem', fontWeight:700, textTransform:'uppercase', color:'#64748b', letterSpacing:0.5, marginBottom:4 }}>Data do Turno</div>
            <input type="date" defaultValue="2026-04-26"
              style={{ border:'none', background:'transparent', fontSize:'1rem', fontWeight:700, color:'#1e293b', width:'100%', outline:'none', padding:0 }} />
          </div>
        </div>
        {/* Horários */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr' }}>
          <div style={{ padding:'14px 16px', borderRight:'1px solid #e2e8f0' }}>
            <div style={{ fontSize:'0.68rem', fontWeight:700, textTransform:'uppercase', color:'#64748b', letterSpacing:0.5, marginBottom:4 }}>⏱ Início</div>
            <input type="time" ref={iRef} onChange={calcDuracao}
              style={{ border:'none', background:'transparent', fontSize:'1.1rem', fontWeight:800, color:'#1a237e', width:'100%', outline:'none', padding:0 }} />
          </div>
          <div style={{ padding:'14px 16px', position:'relative' }}>
            <div style={{ fontSize:'0.68rem', fontWeight:700, textTransform:'uppercase', color:'#64748b', letterSpacing:0.5, marginBottom:4 }}>🏁 Término</div>
            <input type="time" ref={fRef} onChange={calcDuracao}
              style={{ border:'none', background:'transparent', fontSize:'1.1rem', fontWeight:800, color:'#1a237e', width:'100%', outline:'none', padding:0 }} />
          </div>
        </div>
        {/* Duração calculada */}
        {duracaoBadge !== '00:00h' && (
          <div style={{ background:'rgba(249,115,22,0.07)', padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            <span style={{ fontSize:'0.8rem', color:'#f97316', fontWeight:700 }}>⏳ Duração: {duracaoBadge}</span>
          </div>
        )}
      </div>

      {/* Categoria + Atividade */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
        <div>
          <label style={labelStyle}>CATEGORIA</label>
          <select style={inputStyle} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="">Selecione...</option>
            {Object.keys(CATEGORIAS).map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Atividade</label>
          <select style={inputStyle} disabled={!categoria}>
            <option value="">{categoria ? 'Selecione...' : 'Escolha a categoria'}</option>
            {atividadeOpts.map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* Equipe chips */}
      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>
          Equipe GAEP
          <span style={{ float: 'right', color: '#1a237e', fontSize: '0.78rem', fontWeight: 700 }}>({equipe.length})</span>
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          {/* Todos chip */}
          <div onClick={toggleTodos} style={{
            padding: '9px 14px', borderRadius: 30, fontSize: '0.87rem', fontWeight: 700,
            cursor: 'pointer', transition: '0.2s', userSelect: 'none',
            background: todos ? '#1a237e' : 'rgba(26,35,126,0.05)',
            color: todos ? '#fff' : '#1a237e',
            border: '1px solid #1a237e'
          }}>✦ TODOS</div>
          {OPERADORES.map((nome) =>
          <div key={nome} onClick={() => toggleMembro(nome)} style={{
            padding: '9px 14px', borderRadius: 30, fontSize: '0.87rem', fontWeight: 600,
            cursor: 'pointer', transition: '0.2s', userSelect: 'none',
            background: (todos || equipe.includes(nome)) ? '#1a237e' : '#fff',
            color: (todos || equipe.includes(nome)) ? '#fff' : '#64748b',
            border: '1px solid #e2e8f0'
          }}>{nome}</div>
          )}
        </div>
      </div>

      {/* Outros integrantes */}
      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>Nome dos Outros Integrantes</label>
        <input type="text" style={inputStyle} placeholder="Outros integrantes ou Forças Amigas" />
      </div>

      {/* Fotos */}
      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>FOTOS</label>
        <div style={{ border: '2px dashed #e2e8f0', borderRadius: 12, padding: '22px',
          textAlign: 'center', background: 'rgba(26,35,126,0.02)', cursor: 'pointer' }}>
          <div style={{ fontSize: '2rem' }}>📸</div>
          <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, marginTop: 4 }}>
            Toque para Câmera ou Galeria — Máx. 3 fotos.
          </div>
        </div>
      </div>

      {/* Fatos observados */}
      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>DESCRIÇÃO DOS FATOS</label>
        <div style={{ position: 'relative' }}>
          <textarea rows={4} value={descricao} onChange={(e) => setDescricao(e.target.value)}
          placeholder="Descreva a atividade ou toque no microfone..."
          style={{ ...inputStyle, resize: 'vertical', paddingRight: 60, fontFamily: 'inherit' }} />
          <div style={{ position: 'absolute', bottom: 10, right: 10, width: 42, height: 42,
            borderRadius: '50%', background: '#2563eb', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} style={{ width: 20, height: 20 }}>
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" />
            </svg>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <button onClick={salvarDireto} style={{ ...btnStyle, background: '#64748b', margin: 0, fontSize: '0.85rem' }}>💾 Salvar Direto</button>
        <button onClick={gerarIA} disabled={iaLoading}
        style={{ ...btnStyle, background: iaLoading ? '#93c5fd' : '#2563eb', margin: 0, fontSize: '0.85rem' }}>
          {iaLoading ? '⏳ Redigindo...' : '✨ Redigir com IA'}
        </button>
      </div>

      {saved &&
      <div style={{ textAlign: 'center', padding: 14, borderRadius: 10, fontWeight: 700,
        color: '#16a34a', background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.2)', animation: 'fadeIn .3s' }}>
          ✅ Operação registrada com sucesso!
        </div>
      }

      {showRevisao &&
      <div style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 12, padding: 20, animation: 'fadeIn .3s' }}>
          <label style={{ ...labelStyle, color: '#2563eb' }}>Texto Oficial Revisado</label>
          <textarea rows={5} defaultValue={`No dia 26/04/2026 no período solicitado os operadores da Equipe GAEP realizaram a atividade de ${categoria || 'Operação'} conforme descrito. ${descricao}`}
        style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
          <label style={{ ...labelStyle, color: '#f97316', marginTop: 14 }}>Observações sobre a Atividade</label>
          <textarea rows={2} placeholder="Ex: Informações relevantes extras..." style={{ ...inputStyle, fontFamily: 'inherit' }} />
          <button style={{ ...btnStyle, background: '#1a237e', marginTop: 20 }}>Salvar & Consolidar Turno</button>
        </div>
      }
    </div>);

}

// ── Tela: Missões ─────────────────────────────────────────────
function Missoes() {
  const [missoes, setMissoes] = useState(MISSOES_DATA_INIT);
  const [status, setStatus] = useState(null);
  const [expandido, setExpandido] = useState(null);
  const [editando, setEditando] = useState(null); // id da missão em edição
  const [editObs, setEditObs] = useState('');

  // Ranking agrupado por operador
  const ranking = OPERADORES.map(nome => {
    const ms = missoes.filter(m => m.nome === nome);
    const qtd = ms.reduce((s,m) => s + m.qtd, 0);
    const total = ms.reduce((s,m) => s + parseFloat(m.valor.replace('R$ ','').replace('.','').replace(',','.')), 0);
    return { nome, qtd, total, missoes: ms };
  }).filter(r => r.qtd > 0).sort((a,b) => b.qtd - a.qtd);

  function registrar() {
    setStatus('loading');
    setTimeout(() => setStatus('ok'), 1000);
  }
  function excluir(id) {
    if (window.confirm('Excluir esta missão?')) {
      setMissoes(ms => ms.filter(m => m.id !== id));
    }
  }
  function iniciarEdicao(m) {
    setEditando(m.id);
    setEditObs(m.obs);
  }
  function salvarEdicao(id) {
    setMissoes(ms => ms.map(m => m.id === id ? { ...m, obs: editObs } : m));
    setEditando(null);
  }

  return (
    <div style={{ paddingBottom:30 }}>
      {/* Tabela referência */}
      <div style={{ background:'rgba(26,35,126,0.05)', borderLeft:'4px solid #1a237e',
        padding:16, borderRadius:8, marginBottom:22 }}>
        <h4 style={{ margin:'0 0 10px', color:'#1a237e', fontSize:'0.9rem' }}>Tabela de Referência</h4>
        <ul style={{ margin:0, paddingLeft:20, fontSize:'0.83rem', lineHeight:1.8 }}>
          <li><strong>Tipo 1 (R$ 425,00):</strong> Brasília, SP, RJ e Manaus.</li>
          <li><strong>Tipo 2 (R$ 380,00):</strong> Demais Capitais.</li>
          <li><strong>Tipo 3 (R$ 335,00):</strong> Outras Localidades.</li>
        </ul>
      </div>

      {/* Formulário */}
      <div style={{ marginBottom:16 }}>
        <label style={labelStyle}>Operador Selecionado</label>
        <select style={inputStyle}>{OPERADORES.map(o => <option key={o}>{o}</option>)}</select>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
        <div><label style={labelStyle}>Qtd. Diárias</label>
          <input type="number" step="0.5" min="0.5" placeholder="Ex: 1.5" style={inputStyle} /></div>
        <div><label style={labelStyle}>Tipo da Missão</label>
          <select style={inputStyle}>
            <option value="">Selecione...</option>
            <option>Tipo 1 (R$ 425)</option>
            <option>Tipo 2 (R$ 380)</option>
            <option>Tipo 3 (R$ 335)</option>
          </select></div>
      </div>
      <div style={{ marginBottom:16 }}>
        <label style={labelStyle}>Observação / Descrição da Missão</label>
        <textarea rows={3} placeholder="Descreva a missão (destino, finalidade, detalhes...)"
          style={{ ...inputStyle, resize:'vertical', fontFamily:'inherit' }} />
      </div>
      <button onClick={registrar} style={{ ...btnStyle, background:'#1a237e' }}>Registrar Missão</button>
      {status==='loading' && <div style={{ textAlign:'center', padding:14, borderRadius:10, fontWeight:700, color:'#f97316', background:'rgba(249,115,22,0.1)', marginTop:12 }}>⏳ Registrando...</div>}
      {status==='ok' && <div style={{ textAlign:'center', padding:14, borderRadius:10, fontWeight:700, color:'#16a34a', background:'rgba(22,163,74,0.1)', marginTop:12 }}>✅ Missão registrada!</div>}

      <hr style={{ border:'none', borderTop:'1px solid #e2e8f0', margin:'24px 0' }} />

      {/* Ranking com expansão */}
      <h3 style={{ margin:'0 0 14px', fontSize:'1rem', color:'#64748b', textTransform:'uppercase', fontWeight:700 }}>Ranking Consolidado</h3>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {ranking.map(r => (
          <div key={r.nome} style={{ background:'#fff', borderRadius:12, border:'1px solid #e2e8f0',
            boxShadow:'0 2px 8px rgba(0,0,0,0.04)', overflow:'hidden' }}>
            {/* Linha do operador */}
            <div onClick={() => setExpandido(expandido===r.nome ? null : r.nome)}
              style={{ display:'flex', alignItems:'center', padding:'14px 16px', cursor:'pointer',
                background: expandido===r.nome ? 'rgba(26,35,126,0.04)' : '#fff', transition:'0.2s' }}>
              <div style={{ flex:1, fontWeight:700, color:'#1e293b', fontSize:'0.95rem' }}>{r.nome}</div>
              <div style={{ textAlign:'center', minWidth:44 }}>
                <div style={{ fontSize:'1.2rem', fontWeight:800, color:'#1a237e' }}>{r.qtd}</div>
                <div style={{ fontSize:'0.65rem', color:'#94a3b8', textTransform:'uppercase' }}>diárias</div>
              </div>
              <div style={{ textAlign:'right', minWidth:90, marginLeft:12 }}>
                <div style={{ fontSize:'0.88rem', fontWeight:700, color:'#16a34a' }}>
                  R$ {r.total.toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.')}
                </div>
                <div style={{ fontSize:'0.65rem', color:'#94a3b8' }}>total</div>
              </div>
              <div style={{ marginLeft:12, color:'#94a3b8', fontSize:'0.8rem', transform: expandido===r.nome ? 'rotate(180deg)' : 'rotate(0deg)', transition:'0.2s' }}>▼</div>
            </div>

            {/* Missões expandidas */}
            {expandido===r.nome && (
              <div style={{ borderTop:'1px solid #e2e8f0', animation:'fadeIn .2s' }}>
                {r.missoes.map(m => (
                  <div key={m.id} style={{ padding:'12px 16px', borderBottom:'1px solid #f8fafc' }}>
                    {editando===m.id ? (
                      <div>
                        <div style={{ fontSize:'0.8rem', fontWeight:700, color:'#1a237e', marginBottom:6 }}>{m.tipo}</div>
                        <textarea value={editObs} onChange={e=>setEditObs(e.target.value)} rows={2}
                          style={{ ...inputStyle, fontSize:'0.85rem', marginBottom:8, fontFamily:'inherit' }} />
                        <div style={{ display:'flex', gap:8 }}>
                          <button onClick={()=>salvarEdicao(m.id)}
                            style={{ flex:1, padding:'8px', background:'#16a34a', color:'#fff', border:'none', borderRadius:8, fontWeight:700, fontSize:'0.8rem', cursor:'pointer' }}>
                            ✅ Salvar
                          </button>
                          <button onClick={()=>setEditando(null)}
                            style={{ flex:1, padding:'8px', background:'#f1f5f9', color:'#64748b', border:'none', borderRadius:8, fontWeight:700, fontSize:'0.8rem', cursor:'pointer' }}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                          <span style={{ fontSize:'0.8rem', fontWeight:700, color:'#1a237e' }}>{m.tipo}</span>
                          <span style={{ fontSize:'0.85rem', fontWeight:700, color:'#16a34a' }}>{m.valor}</span>
                        </div>
                        <div style={{ fontSize:'0.82rem', color:'#475569', marginBottom:8 }}>{m.obs}</div>
                        <div style={{ display:'flex', gap:8 }}>
                          <button onClick={()=>iniciarEdicao(m)}
                            style={{ padding:'6px 12px', background:'rgba(37,99,235,0.08)', color:'#2563eb',
                              border:'1px solid rgba(37,99,235,0.2)', borderRadius:6, fontWeight:700, fontSize:'0.75rem', cursor:'pointer' }}>
                            ✏️ Editar
                          </button>
                          <button onClick={()=>excluir(m.id)}
                            style={{ padding:'6px 12px', background:'rgba(239,68,68,0.06)', color:'#ef4444',
                              border:'1px solid rgba(239,68,68,0.2)', borderRadius:6, fontWeight:700, fontSize:'0.75rem', cursor:'pointer' }}>
                            🗑️ Excluir
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Estilos compartilhados ────────────────────────────────────
const labelStyle = {
  display: 'block', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase',
  color: '#64748b', fontSize: '0.75rem', letterSpacing: 0.5
};
const inputStyle = {
  width: '100%', padding: '12px 14px', background: '#f3f4f6',
  border: '1px solid #e2e8f0', color: '#1e293b', borderRadius: 10,
  fontSize: 15, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit'
};
const btnStyle = {
  width: '100%', padding: '14px', color: 'white', border: 'none', borderRadius: 10,
  fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer',
  marginTop: 10, letterSpacing: 0.5, transition: 'opacity .2s'
};
const kpiLabelStyle = {
  fontSize: '0.68rem', textTransform: 'uppercase', color: '#64748b',
  fontWeight: 700, letterSpacing: 0.5, marginBottom: 4
};

// Export to window
Object.assign(window, {
  PainelBI, DesempenhoIndividual, RegistroOperacao, Missoes,
  labelStyle, inputStyle, btnStyle, kpiLabelStyle,
  OPERADORES, CATEGORIAS, BI_DATA, FOLHA_DATA, MISSOES_DATA_INIT
});