
// ============================================================
// GAEP — Módulo de Gestão (Admin / Super Admin)
// ============================================================

// ── Dados iniciais do Admin ──────────────────────────────────
const OPERADORES_INIT = [
  { id:1, nome:'Hachid',   matricula:'001', senha:'hachid',   perfil:'SUPER_ADMIN', equipe:'Alpha', ativo:true },
  { id:2, nome:'Alex',     matricula:'002', senha:'alex',     perfil:'OPERADOR',    equipe:'Alpha', ativo:true },
  { id:3, nome:'Botta',    matricula:'003', senha:'botta',    perfil:'OPERADOR',    equipe:'Alpha', ativo:true },
  { id:4, nome:'Nakazo',   matricula:'004', senha:'nakazo',   perfil:'OPERADOR',    equipe:'Bravo', ativo:true },
  { id:5, nome:'Mlotto',   matricula:'005', senha:'mlotto',   perfil:'OPERADOR',    equipe:'Bravo', ativo:true },
  { id:6, nome:'Maia',     matricula:'006', senha:'maia',     perfil:'SUPERVISOR',  equipe:'Bravo', ativo:true },
  { id:7, nome:'Teixeira', matricula:'007', senha:'teixeira', perfil:'OPERADOR',    equipe:'Charlie', ativo:true },
  { id:8, nome:'Ernesto',  matricula:'008', senha:'ernesto',  perfil:'OPERADOR',    equipe:'Charlie', ativo:true },
  { id:9, nome:'Rocco',    matricula:'009', senha:'rocco',    perfil:'OPERADOR',    equipe:'Charlie', ativo:true },
  { id:10,nome:'Stadler',  matricula:'010', senha:'stadler',  perfil:'OPERADOR',    equipe:'Delta',   ativo:true },
  { id:11,nome:'Regio',    matricula:'011', senha:'regio',    perfil:'AUDITOR',     equipe:'Delta',   ativo:true },
  { id:12,nome:'Filipe',   matricula:'012', senha:'filipe',   perfil:'ADMIN',       equipe:'Delta',   ativo:false },
];

const ATIVIDADES_INIT = {
  OPERAR:  ['POJ','Apoio e Contributo','Patrulha','Escolta','Segurança VIP','Abordagem'],
  TREINAR: ['Atividade Lúdica','Atletismo Prime','CDR','Luta Policial','Arremesso/Tiro','Rádio Comunicações'],
  INSTRUIR:['Instrução Técnica','Palestra','Curso Externo','Nivelamento'],
};

const FERIADOS_INIT = [
  { id:1, data:'2026-01-01', desc:'Confraternização Universal' },
  { id:2, data:'2026-04-07', desc:'Paixão de Cristo' },
  { id:3, data:'2026-04-21', desc:'Tiradentes' },
  { id:4, data:'2026-05-01', desc:'Dia do Trabalho' },
  { id:5, data:'2026-06-11', desc:'Corpus Christi' },
  { id:6, data:'2026-09-07', desc:'Independência do Brasil' },
  { id:7, data:'2026-10-12', desc:'Nossa Sra. Aparecida' },
  { id:8, data:'2026-11-02', desc:'Finados' },
  { id:9, data:'2026-11-15', desc:'Proclamação da República' },
  { id:10,data:'2026-12-25', desc:'Natal' },
];

const DIARIAS_INIT = [
  { id:1, tipo:'Tipo 1', locais:'Brasília, São Paulo, Rio de Janeiro e Manaus', valor:425.00, vigencia:'2025-01-01' },
  { id:2, tipo:'Tipo 2', locais:'Demais Capitais Estaduais', valor:380.00, vigencia:'2025-01-01' },
  { id:3, tipo:'Tipo 3', locais:'Outras Localidades', valor:335.00, vigencia:'2025-01-01' },
];

const GAEPS_INIT = [
  { id:1, codigo:'GAEP-CAT', cidade:'Catanduvas',   estado:'PR', admin:'Hachid', ativo:true },
  { id:2, codigo:'GAEP-CG',  cidade:'Campo Grande', estado:'MS', admin:'—',      ativo:false },
  { id:3, codigo:'GAEP-PV',  cidade:'Ponta Porã',   estado:'MS', admin:'—',      ativo:false },
  { id:4, codigo:'GAEP-MOS', cidade:'Mossoró',      estado:'RN', admin:'—',      ativo:false },
  { id:5, codigo:'GAEP-BRA', cidade:'Brasília',     estado:'DF', admin:'—',      ativo:false },
];

const IA_CONFIG_INIT = {
  prompt: `Você é um assistente oficial do GAEP (Grupo de Ações Especiais Penais). Sua função é redigir descrições formais de atividades operacionais com base nos dados informados pelo relatorista. Mantenha linguagem técnica e institucional. Não invente fatos — apenas corrija gramática e organize o texto fornecido. Padrão:\n\nNo dia {DATA} no período {HORA_INICIO} às {HORA_FIM} os operadores {LISTA} realizaram a {CATEGORIA} de {ATIVIDADE}. {DESCRICAO_CORRIGIDA}`,
  temperatura: 0.3,
  modelo: 'gpt-4o',
};

const PERFIS = ['OPERADOR','SUPERVISOR','ADMIN','SUPER_ADMIN','AUDITOR'];
const EQUIPES_LISTA = ['Alpha','Bravo','Charlie','Delta'];
const PERFIL_COLORS = {
  SUPER_ADMIN: '#7c3aed', ADMIN: '#1a237e', SUPERVISOR: '#0369a1',
  OPERADOR: '#16a34a', AUDITOR: '#92400e',
};

// ── Componentes auxiliares ────────────────────────────────────
function Tag({ perfil }) {
  const color = PERFIL_COLORS[perfil] || '#64748b';
  return (
    <span style={{ fontSize:'0.68rem', fontWeight:700, padding:'2px 8px', borderRadius:20,
      background:`${color}18`, color, border:`1px solid ${color}40`, fontFamily:'Segoe UI,sans-serif' }}>
      {perfil}
    </span>
  );
}

function AdminCard({ children, style }) {
  return (
    <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e2e8f0',
      boxShadow:'0 2px 8px rgba(0,0,0,0.04)', marginBottom:14, overflow:'hidden', ...style }}>
      {children}
    </div>
  );
}

function SectionHeader({ title, action }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'14px 16px', borderBottom:'1px solid #e2e8f0', background:'#f8fafc' }}>
      <span style={{ fontWeight:800, fontSize:'0.88rem', color:'#1e293b', textTransform:'uppercase', letterSpacing:0.5 }}>{title}</span>
      {action}
    </div>
  );
}

function AddBtn({ onClick, label='+ Adicionar' }) {
  return (
    <button onClick={onClick} style={{ padding:'6px 14px', background:'#1a237e', color:'#fff',
      border:'none', borderRadius:8, fontWeight:700, fontSize:'0.75rem', cursor:'pointer',
      fontFamily:'Segoe UI,sans-serif' }}>
      {label}
    </button>
  );
}

function ActionBtn({ onClick, color='#2563eb', children }) {
  return (
    <button onClick={onClick} style={{ padding:'4px 10px', background:`${color}12`, color,
      border:`1px solid ${color}30`, borderRadius:6, fontWeight:700, fontSize:'0.72rem',
      cursor:'pointer', fontFamily:'Segoe UI,sans-serif', marginLeft:4 }}>
      {children}
    </button>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.6)', zIndex:500,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:420,
        maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}
        onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #e2e8f0', display:'flex',
          justifyContent:'space-between', alignItems:'center', background:'#1a237e', borderRadius:'16px 16px 0 0' }}>
          <span style={{ fontWeight:800, color:'#fff', fontSize:'0.95rem' }}>{title}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#fff',
            fontSize:'1.2rem', cursor:'pointer', lineHeight:1 }}>✕</button>
        </div>
        <div style={{ padding:20 }}>{children}</div>
      </div>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:'block', fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase',
        color:'#64748b', letterSpacing:0.5, marginBottom:5 }}>{label}</label>
      {children}
    </div>
  );
}

// ── Tab: Efetivo ──────────────────────────────────────────────
function TabEfetivo() {
  const [ops, setOps] = React.useState(OPERADORES_INIT);
  const [modal, setModal] = React.useState(null); // null | 'add' | op obj
  const [form, setForm] = React.useState({ nome:'', matricula:'', senha:'', perfil:'OPERADOR', equipe:'Alpha' });
  const [search, setSearch] = React.useState('');
  const [toast, setToast] = React.useState('');

  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(''),2500); }
  function openAdd() { setForm({ nome:'', matricula:'', senha:'', perfil:'OPERADOR', equipe:'Alpha' }); setModal('add'); }
  function openEdit(op) { setForm({ ...op }); setModal(op); }

  function salvar() {
    if (!form.nome || !form.matricula) return;
    if (modal === 'add') {
      setOps(o => [...o, { ...form, id: Date.now(), ativo:true }]);
      showToast('✅ Operador cadastrado com sucesso!');
    } else {
      setOps(o => o.map(x => x.id===modal.id ? { ...x, ...form } : x));
      showToast('✅ Operador atualizado!');
    }
    setModal(null);
  }

  function toggleAtivo(id) {
    setOps(o => o.map(x => x.id===id ? { ...x, ativo:!x.ativo } : x));
    showToast('✅ Status atualizado (soft delete)!');
  }

  const filtered = ops.filter(o => o.nome.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      {toast && <div style={{ background:'#dcfce7', border:'1px solid #86efac', color:'#166534',
        padding:'10px 14px', borderRadius:10, marginBottom:12, fontWeight:700, fontSize:'0.85rem', fontFamily:'Segoe UI,sans-serif' }}>{toast}</div>}

      <AdminCard>
        <SectionHeader title={`Operadores (${ops.filter(o=>o.ativo).length} ativos)`}
          action={<AddBtn onClick={openAdd} label="+ Novo Operador" />} />
        <div style={{ padding:'12px 16px', borderBottom:'1px solid #f1f5f9' }}>
          <input placeholder="🔍  Buscar operador..." value={search} onChange={e=>setSearch(e.target.value)}
            style={{ width:'100%', padding:'9px 12px', border:'1px solid #e2e8f0', borderRadius:8,
              fontSize:'0.87rem', outline:'none', fontFamily:'Segoe UI,sans-serif', background:'#f8fafc' }} />
        </div>
        {filtered.map(op => (
          <div key={op.id} style={{ padding:'12px 16px', borderBottom:'1px solid #f8fafc',
            display:'flex', alignItems:'center', gap:10, opacity: op.ativo ? 1 : 0.5 }}>
            <div style={{ width:38, height:38, borderRadius:'50%', background:'rgba(26,35,126,0.08)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontWeight:800, fontSize:'0.95rem', color:'#1a237e', flexShrink:0 }}>
              {op.nome[0]}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:'0.9rem', color:'#1e293b' }}>{op.nome}</div>
              <div style={{ fontSize:'0.75rem', color:'#64748b', fontFamily:'Segoe UI,sans-serif' }}>
                Mat. {op.matricula} · Equipe {op.equipe}
              </div>
              <div style={{ marginTop:3 }}><Tag perfil={op.perfil} /></div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:4, alignItems:'flex-end' }}>
              <ActionBtn onClick={()=>openEdit(op)} color="#2563eb">✏️ Editar</ActionBtn>
              <ActionBtn onClick={()=>toggleAtivo(op.id)} color={op.ativo?"#ef4444":"#16a34a"}>
                {op.ativo ? '🔒 Desativar' : '✅ Ativar'}
              </ActionBtn>
            </div>
          </div>
        ))}
      </AdminCard>

      {modal && (
        <Modal title={modal==='add' ? 'Novo Operador' : `Editar — ${modal.nome}`} onClose={()=>setModal(null)}>
          <FormField label="Nome Completo">
            <input value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))}
              style={mInput} placeholder="Nome do operador" />
          </FormField>
          <FormField label="Matrícula">
            <input value={form.matricula} onChange={e=>setForm(f=>({...f,matricula:e.target.value}))}
              style={mInput} placeholder="Ex: 013" />
          </FormField>
          <FormField label="Senha Inicial">
            <input value={form.senha} onChange={e=>setForm(f=>({...f,senha:e.target.value}))}
              style={mInput} placeholder="Padrão: nome em minúsculas" />
          </FormField>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <FormField label="Perfil de Acesso">
              <select value={form.perfil} onChange={e=>setForm(f=>({...f,perfil:e.target.value}))} style={mInput}>
                {PERFIS.map(p=><option key={p}>{p}</option>)}
              </select>
            </FormField>
            <FormField label="Equipe">
              <select value={form.equipe} onChange={e=>setForm(f=>({...f,equipe:e.target.value}))} style={mInput}>
                {EQUIPES_LISTA.map(e=><option key={e}>{e}</option>)}
              </select>
            </FormField>
          </div>
          <button onClick={salvar} style={{ width:'100%', padding:14, background:'#1a237e', color:'#fff',
            border:'none', borderRadius:10, fontWeight:700, fontSize:'0.9rem', cursor:'pointer', marginTop:8 }}>
            {modal==='add' ? 'Cadastrar Operador' : 'Salvar Alterações'}
          </button>
        </Modal>
      )}
    </div>
  );
}

// ── Tab: Atividades ───────────────────────────────────────────
function TabAtividades() {
  const [ativs, setAtivs] = React.useState({ ...ATIVIDADES_INIT });
  const [modal, setModal] = React.useState(null); // { cat, idx } | 'add'
  const [novaAtiv, setNovaAtiv] = React.useState('');
  const [novacat, setNovaCat] = React.useState('OPERAR');
  const [toast, setToast] = React.useState('');
  const catColors = { OPERAR:'#1a237e', TREINAR:'#f97316', INSTRUIR:'#16a34a' };

  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(''),2500); }

  function adicionar() {
    if (!novaAtiv.trim()) return;
    setAtivs(a => ({ ...a, [novacat]: [...a[novacat], novaAtiv.trim()] }));
    showToast(`✅ "${novaAtiv}" adicionada em ${novacat}`);
    setNovaAtiv(''); setModal(null);
  }

  function remover(cat, idx) {
    setAtivs(a => ({ ...a, [cat]: a[cat].filter((_,i)=>i!==idx) }));
    showToast('🗑️ Atividade removida');
  }

  return (
    <div>
      {toast && <div style={{ background:'#dcfce7', border:'1px solid #86efac', color:'#166534',
        padding:'10px 14px', borderRadius:10, marginBottom:12, fontWeight:700, fontSize:'0.85rem', fontFamily:'Segoe UI,sans-serif' }}>{toast}</div>}

      {Object.entries(ativs).map(([cat, lista]) => (
        <AdminCard key={cat}>
          <SectionHeader title={`${cat} (${lista.length})`}
            action={<AddBtn onClick={()=>{ setNovaCat(cat); setModal('add'); }} label="+ Atividade" />} />
          {lista.map((a,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', padding:'10px 16px',
              borderBottom:'1px solid #f8fafc', gap:10 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:catColors[cat], flexShrink:0 }}></div>
              <span style={{ flex:1, fontSize:'0.9rem', color:'#1e293b', fontWeight:600 }}>{a}</span>
              <ActionBtn onClick={()=>remover(cat,i)} color="#ef4444">🗑️</ActionBtn>
            </div>
          ))}
          {lista.length===0 && <div style={{ padding:'16px', textAlign:'center', color:'#94a3b8', fontSize:'0.85rem', fontFamily:'Segoe UI,sans-serif' }}>Nenhuma atividade cadastrada</div>}
        </AdminCard>
      ))}

      {modal==='add' && (
        <Modal title={`Nova Atividade — ${novacat}`} onClose={()=>setModal(null)}>
          <FormField label="Categoria">
            <select value={novacat} onChange={e=>setNovaCat(e.target.value)} style={mInput}>
              {Object.keys(ativs).map(c=><option key={c}>{c}</option>)}
            </select>
          </FormField>
          <FormField label="Nome da Atividade">
            <input value={novaAtiv} onChange={e=>setNovaAtiv(e.target.value)} style={mInput}
              placeholder="Ex: Operação Especial" autoFocus
              onKeyDown={e=>e.key==='Enter'&&adicionar()} />
          </FormField>
          <button onClick={adicionar} style={{ width:'100%', padding:14, background:'#1a237e', color:'#fff',
            border:'none', borderRadius:10, fontWeight:700, fontSize:'0.9rem', cursor:'pointer', marginTop:8 }}>
            Adicionar Atividade
          </button>
        </Modal>
      )}
    </div>
  );
}

// ── Tab: Feriados ─────────────────────────────────────────────
function TabFeriados() {
  const [feriados, setFeriados] = React.useState(FERIADOS_INIT);
  const [modal, setModal] = React.useState(false);
  const [form, setForm] = React.useState({ data:'', desc:'' });
  const [toast, setToast] = React.useState('');
  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(''),2500); }

  function adicionar() {
    if (!form.data || !form.desc.trim()) return;
    setFeriados(f=>[...f, { id:Date.now(), ...form }].sort((a,b)=>a.data.localeCompare(b.data)));
    showToast('✅ Feriado cadastrado!');
    setForm({ data:'', desc:'' }); setModal(false);
  }

  function remover(id) {
    setFeriados(f=>f.filter(x=>x.id!==id));
    showToast('🗑️ Feriado removido');
  }

  const fmt = d => new Date(d+'T12:00:00').toLocaleDateString('pt-BR');

  return (
    <div>
      {toast && <div style={{ background:'#dcfce7', border:'1px solid #86efac', color:'#166534',
        padding:'10px 14px', borderRadius:10, marginBottom:12, fontWeight:700, fontSize:'0.85rem', fontFamily:'Segoe UI,sans-serif' }}>{toast}</div>}

      <div style={{ background:'rgba(26,35,126,0.05)', borderLeft:'4px solid #1a237e', padding:'12px 16px',
        borderRadius:8, marginBottom:14, fontSize:'0.83rem', color:'#334155', fontFamily:'Segoe UI,sans-serif' }}>
        📌 Feriados afetam o cálculo da <strong>carga horária de expediente</strong> (7h × dias úteis do mês).
      </div>

      <AdminCard>
        <SectionHeader title={`Feriados ${new Date().getFullYear()} (${feriados.length})`}
          action={<AddBtn onClick={()=>setModal(true)} label="+ Feriado" />} />
        {feriados.map(f => (
          <div key={f.id} style={{ display:'flex', alignItems:'center', padding:'11px 16px',
            borderBottom:'1px solid #f8fafc', gap:10 }}>
            <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)',
              borderRadius:8, padding:'5px 10px', textAlign:'center', minWidth:56, flexShrink:0 }}>
              <div style={{ fontSize:'0.7rem', color:'#ef4444', fontWeight:700, fontFamily:'Segoe UI,sans-serif' }}>
                {fmt(f.data).substring(0,5)}
              </div>
              <div style={{ fontSize:'0.65rem', color:'#94a3b8', fontFamily:'Segoe UI,sans-serif' }}>
                {fmt(f.data).substring(6)}
              </div>
            </div>
            <span style={{ flex:1, fontSize:'0.88rem', color:'#1e293b', fontWeight:600 }}>{f.desc}</span>
            <ActionBtn onClick={()=>remover(f.id)} color="#ef4444">🗑️</ActionBtn>
          </div>
        ))}
      </AdminCard>

      {modal && (
        <Modal title="Novo Feriado" onClose={()=>setModal(false)}>
          <FormField label="Data">
            <input type="date" value={form.data} onChange={e=>setForm(f=>({...f,data:e.target.value}))} style={mInput} />
          </FormField>
          <FormField label="Descrição">
            <input value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} style={mInput}
              placeholder="Ex: Aniversário de Catanduvas" onKeyDown={e=>e.key==='Enter'&&adicionar()} />
          </FormField>
          <button onClick={adicionar} style={{ width:'100%', padding:14, background:'#1a237e', color:'#fff',
            border:'none', borderRadius:10, fontWeight:700, cursor:'pointer', marginTop:8 }}>
            Cadastrar Feriado
          </button>
        </Modal>
      )}
    </div>
  );
}

// ── Tab: Config IA ────────────────────────────────────────────
function TabIA() {
  const [cfg, setCfg] = React.useState({ ...IA_CONFIG_INIT });
  const [saved, setSaved] = React.useState(false);
  const [testando, setTestando] = React.useState(false);
  const [resultado, setResultado] = React.useState('');

  function salvar() {
    setSaved(true); setTimeout(()=>setSaved(false), 2000);
  }

  function testar() {
    setTestando(true); setResultado('');
    setTimeout(() => {
      setResultado('No dia 06 de abril de 2026 no período das 08:00h às 14:00h os operadores Hachid, Alex e Botta realizaram a OPERAR de Escolta. A operação transcorreu dentro dos padrões previstos no Manual Operacional do GAEP, sem intercorrências registradas.');
      setTestando(false);
    }, 1800);
  }

  return (
    <div>
      <AdminCard>
        <SectionHeader title="Configuração do Modelo IA" />
        <div style={{ padding:16 }}>
          <div style={{ marginBottom:16 }}>
            <label style={lStyle}>Modelo GPT</label>
            <select value={cfg.modelo} onChange={e=>setCfg(c=>({...c,modelo:e.target.value}))} style={mInput}>
              <option>gpt-4o</option>
              <option>gpt-4o-mini</option>
              <option>gpt-4-turbo</option>
            </select>
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={lStyle}>
              Temperatura: <span style={{ color:'#1a237e', fontWeight:800 }}>{cfg.temperatura}</span>
              <span style={{ color:'#94a3b8', fontWeight:400, marginLeft:8, fontSize:'0.68rem' }}>
                (0.1 = preciso | 1.0 = criativo)
              </span>
            </label>
            <input type="range" min="0.1" max="1.0" step="0.1" value={cfg.temperatura}
              onChange={e=>setCfg(c=>({...c,temperatura:parseFloat(e.target.value)}))}
              style={{ width:'100%', marginTop:8, accentColor:'#1a237e' }} />
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.7rem', color:'#94a3b8', fontFamily:'Segoe UI,sans-serif', marginTop:4 }}>
              <span>0.1 — Formal</span><span>0.5 — Balanceado</span><span>1.0 — Criativo</span>
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={lStyle}>Prompt do Sistema</label>
            <textarea value={cfg.prompt} onChange={e=>setCfg(c=>({...c,prompt:e.target.value}))}
              rows={8} style={{ ...mInput, resize:'vertical', fontFamily:'Courier New, monospace', fontSize:'0.8rem', lineHeight:1.6 }} />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:16 }}>
            <button onClick={testar} disabled={testando}
              style={{ padding:12, background:testando?'#93c5fd':'#2563eb', color:'#fff',
                border:'none', borderRadius:10, fontWeight:700, fontSize:'0.85rem', cursor:'pointer' }}>
              {testando ? '⏳ Testando...' : '🧪 Testar Prompt'}
            </button>
            <button onClick={salvar} style={{ padding:12, background:'#16a34a', color:'#fff',
              border:'none', borderRadius:10, fontWeight:700, fontSize:'0.85rem', cursor:'pointer' }}>
              {saved ? '✅ Salvo!' : '💾 Salvar Config'}
            </button>
          </div>

          {resultado && (
            <div style={{ marginTop:16, padding:14, background:'rgba(37,99,235,0.05)',
              border:'1px solid rgba(37,99,235,0.2)', borderRadius:10 }}>
              <div style={lStyle}>Resultado do Teste:</div>
              <p style={{ fontSize:'0.87rem', color:'#1e293b', lineHeight:1.7, marginTop:6 }}>{resultado}</p>
            </div>
          )}
        </div>
      </AdminCard>
    </div>
  );
}

// ── Tab: Diárias ──────────────────────────────────────────────
function TabDiarias() {
  const [diarias, setDiarias] = React.useState(DIARIAS_INIT);
  const [editando, setEditando] = React.useState(null);
  const [form, setForm] = React.useState({});
  const [toast, setToast] = React.useState('');
  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(''),2500); }

  function iniciarEdicao(d) { setEditando(d.id); setForm({ ...d }); }
  function salvar() {
    setDiarias(ds => ds.map(d => d.id===editando ? { ...d, ...form, vigencia: new Date().toISOString().split('T')[0] } : d));
    setEditando(null);
    showToast('✅ Valor atualizado! Nova vigência registrada.');
  }

  const fmt = v => `R$ ${Number(v).toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.')}`;

  return (
    <div>
      {toast && <div style={{ background:'#dcfce7', border:'1px solid #86efac', color:'#166534',
        padding:'10px 14px', borderRadius:10, marginBottom:12, fontWeight:700, fontSize:'0.85rem', fontFamily:'Segoe UI,sans-serif' }}>{toast}</div>}

      <div style={{ background:'rgba(249,115,22,0.07)', borderLeft:'4px solid #f97316', padding:'12px 16px',
        borderRadius:8, marginBottom:14, fontSize:'0.83rem', color:'#7c2d12', fontFamily:'Segoe UI,sans-serif' }}>
        ⚠️ Alterações de valor <strong>não retroagem</strong> em missões já registradas. O valor antigo fica registrado como snapshot.
      </div>

      {diarias.map(d => (
        <AdminCard key={d.id}>
          <div style={{ padding:'16px' }}>
            {editando===d.id ? (
              <div>
                <div style={{ fontWeight:800, fontSize:'1rem', color:'#1a237e', marginBottom:14 }}>{d.tipo}</div>
                <FormField label="Destinos / Locais">
                  <input value={form.locais} onChange={e=>setForm(f=>({...f,locais:e.target.value}))} style={mInput} />
                </FormField>
                <FormField label="Valor (R$)">
                  <input type="number" value={form.valor} onChange={e=>setForm(f=>({...f,valor:parseFloat(e.target.value)}))}
                    style={mInput} step="5" min="0" />
                </FormField>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:8 }}>
                  <button onClick={salvar} style={{ padding:12, background:'#16a34a', color:'#fff', border:'none', borderRadius:10, fontWeight:700, cursor:'pointer' }}>✅ Salvar</button>
                  <button onClick={()=>setEditando(null)} style={{ padding:12, background:'#f1f5f9', color:'#64748b', border:'none', borderRadius:10, fontWeight:700, cursor:'pointer' }}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:800, fontSize:'0.95rem', color:'#1a237e' }}>{d.tipo}</div>
                  <div style={{ fontSize:'0.8rem', color:'#64748b', fontFamily:'Segoe UI,sans-serif', marginTop:2 }}>{d.locais}</div>
                  <div style={{ fontSize:'0.72rem', color:'#94a3b8', fontFamily:'Segoe UI,sans-serif', marginTop:4 }}>
                    Vigência desde: {new Date(d.vigencia+'T12:00:00').toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:'1.4rem', fontWeight:900, color:'#16a34a' }}>{fmt(d.valor)}</div>
                  <div style={{ fontSize:'0.7rem', color:'#94a3b8', fontFamily:'Segoe UI,sans-serif' }}>por diária</div>
                  <ActionBtn onClick={()=>iniciarEdicao(d)} color="#2563eb">✏️ Editar</ActionBtn>
                </div>
              </div>
            )}
          </div>
        </AdminCard>
      ))}
    </div>
  );
}

// ── Tab: GAEPs (Super Admin) ──────────────────────────────────
function TabGAEPs() {
  const [gaeps, setGaeps] = React.useState(GAEPS_INIT);
  const [modal, setModal] = React.useState(false);
  const [form, setForm] = React.useState({ codigo:'', cidade:'', estado:'', admin:'' });
  const [toast, setToast] = React.useState('');
  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(''),2500); }

  function adicionar() {
    if (!form.codigo || !form.cidade) return;
    setGaeps(g=>[...g, { ...form, id:Date.now(), ativo:false }]);
    showToast('✅ Unidade GAEP cadastrada!');
    setModal(false); setForm({ codigo:'', cidade:'', estado:'', admin:'' });
  }

  function toggleAtivo(id) {
    setGaeps(g=>g.map(x=>x.id===id?{...x,ativo:!x.ativo}:x));
  }

  return (
    <div>
      {toast && <div style={{ background:'#dcfce7', border:'1px solid #86efac', color:'#166534',
        padding:'10px 14px', borderRadius:10, marginBottom:12, fontWeight:700, fontSize:'0.85rem', fontFamily:'Segoe UI,sans-serif' }}>{toast}</div>}

      <div style={{ background:'rgba(124,58,237,0.06)', borderLeft:'4px solid #7c3aed', padding:'12px 16px',
        borderRadius:8, marginBottom:14, fontSize:'0.83rem', color:'#4c1d95', fontFamily:'Segoe UI,sans-serif' }}>
        🌐 Painel exclusivo <strong>SUPER ADMIN</strong>. Gerencie todas as unidades GAEP no país.
      </div>

      <AdminCard>
        <SectionHeader title={`Unidades GAEP (${gaeps.length})`}
          action={<AddBtn onClick={()=>setModal(true)} label="+ Nova Unidade" />} />
        {gaeps.map(g => (
          <div key={g.id} style={{ padding:'13px 16px', borderBottom:'1px solid #f8fafc',
            display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:44, height:44, borderRadius:10, background: g.ativo?'rgba(26,35,126,0.08)':'#f1f5f9',
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ fontSize:'1.1rem' }}>🏛️</span>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                <span style={{ fontWeight:800, fontSize:'0.92rem', color: g.ativo?'#1a237e':'#94a3b8' }}>{g.codigo}</span>
                <span style={{ fontSize:'0.68rem', padding:'1px 7px', borderRadius:20, fontWeight:700,
                  background: g.ativo?'rgba(22,163,74,0.1)':'rgba(148,163,184,0.15)',
                  color: g.ativo?'#16a34a':'#94a3b8', border:`1px solid ${g.ativo?'rgba(22,163,74,0.3)':'#e2e8f0'}` }}>
                  {g.ativo?'ATIVA':'INATIVA'}
                </span>
              </div>
              <div style={{ fontSize:'0.8rem', color:'#64748b', fontFamily:'Segoe UI,sans-serif' }}>
                {g.cidade}/{g.estado} · Admin: {g.admin}
              </div>
            </div>
            <ActionBtn onClick={()=>toggleAtivo(g.id)} color={g.ativo?'#ef4444':'#16a34a'}>
              {g.ativo?'🔒 Desativar':'✅ Ativar'}
            </ActionBtn>
          </div>
        ))}
      </AdminCard>

      {modal && (
        <Modal title="Nova Unidade GAEP" onClose={()=>setModal(false)}>
          <FormField label="Código da Unidade">
            <input value={form.codigo} onChange={e=>setForm(f=>({...f,codigo:e.target.value}))}
              style={mInput} placeholder="Ex: GAEP-XXX" />
          </FormField>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:10 }}>
            <FormField label="Cidade">
              <input value={form.cidade} onChange={e=>setForm(f=>({...f,cidade:e.target.value}))} style={mInput} placeholder="Cidade" />
            </FormField>
            <FormField label="Estado">
              <input value={form.estado} onChange={e=>setForm(f=>({...f,estado:e.target.value}))} style={mInput} placeholder="UF" maxLength={2} />
            </FormField>
          </div>
          <FormField label="Admin Responsável">
            <select value={form.admin} onChange={e=>setForm(f=>({...f,admin:e.target.value}))} style={mInput}>
              <option value="">Selecione...</option>
              {OPERADORES_INIT.filter(o=>['ADMIN','SUPER_ADMIN'].includes(o.perfil)).map(o=>(
                <option key={o.id}>{o.nome}</option>
              ))}
            </select>
          </FormField>
          <button onClick={adicionar} style={{ width:'100%', padding:14, background:'#7c3aed', color:'#fff',
            border:'none', borderRadius:10, fontWeight:700, cursor:'pointer', marginTop:8 }}>
            Cadastrar Unidade
          </button>
        </Modal>
      )}
    </div>
  );
}

// ── Estilos internos ──────────────────────────────────────────
const mInput = {
  width:'100%', padding:'10px 12px', border:'1px solid #e2e8f0', borderRadius:8,
  fontSize:'0.9rem', outline:'none', background:'#f8fafc', fontFamily:'Segoe UI,sans-serif',
  boxSizing:'border-box', color:'#1e293b',
};
const lStyle = {
  display:'block', fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase',
  color:'#64748b', letterSpacing:0.5, marginBottom:5, fontFamily:'Segoe UI,sans-serif',
};

// ── Componente Principal: GestaoScreen ────────────────────────
function GestaoScreen({ usuario }) {
  const isSuperAdmin = usuario === 'Hachid';
  const tabs = [
    { id:'efetivo',    icon:'👮', label:'Efetivo',   comp:<TabEfetivo /> },
    { id:'atividades', icon:'📋', label:'Atividades',comp:<TabAtividades /> },
    { id:'feriados',   icon:'📅', label:'Feriados',  comp:<TabFeriados /> },
    { id:'ia',         icon:'🤖', label:'Config IA', comp:<TabIA /> },
    { id:'diarias',    icon:'💰', label:'Diárias',   comp:<TabDiarias /> },
    ...(isSuperAdmin ? [{ id:'gaeps', icon:'🌐', label:'GAEPs', comp:<TabGAEPs /> }] : []),
  ];
  const [tab, setTab] = React.useState('efetivo');
  const current = tabs.find(t=>t.id===tab);

  return (
    <div style={{ paddingBottom:30 }}>
      {/* Badge de nível */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px',
        background: isSuperAdmin?'rgba(124,58,237,0.06)':'rgba(26,35,126,0.05)',
        borderLeft:`4px solid ${isSuperAdmin?'#7c3aed':'#1a237e'}`,
        borderRadius:8, marginBottom:16 }}>
        <div>
          <div style={{ fontSize:'0.68rem', color:'#94a3b8', fontWeight:700, textTransform:'uppercase', fontFamily:'Segoe UI,sans-serif' }}>Nível de Acesso</div>
          <div style={{ fontWeight:800, color: isSuperAdmin?'#7c3aed':'#1a237e', fontSize:'1rem' }}>
            {isSuperAdmin ? '🔑 SUPER ADMIN — Acesso Total' : '⚙️ ADMIN — GAEP-CAT'}
          </div>
          <div style={{ fontSize:'0.75rem', color:'#64748b', fontFamily:'Segoe UI,sans-serif' }}>
            {usuario} · {isSuperAdmin?'Todos os GAEPs':'GAEP-CAT · Catanduvas/PR'}
          </div>
        </div>
      </div>

      {/* Tabs de navegação */}
      <div style={{ display:'flex', overflowX:'auto', gap:6, marginBottom:18, paddingBottom:2,
        scrollbarWidth:'none' }}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ padding:'9px 14px', borderRadius:10, border:'none', cursor:'pointer',
              fontWeight:700, fontSize:'0.78rem', whiteSpace:'nowrap', transition:'0.2s',
              fontFamily:'Segoe UI,sans-serif',
              background: tab===t.id?'#1a237e':'#f1f5f9',
              color: tab===t.id?'#fff':'#64748b',
              boxShadow: tab===t.id?'0 4px 12px rgba(26,35,126,0.25)':'none' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Conteúdo da aba */}
      <div key={tab} style={{ animation:'slideUp .25s ease' }}>
        {current?.comp}
      </div>
    </div>
  );
}

Object.assign(window, { GestaoScreen });
