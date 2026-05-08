'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Search, UserPlus, Download, Check, X,
  GraduationCap, Users, ClipboardList, BadgeCheck
} from 'lucide-react';

/* ── Types ──────────────────────────────────────────────────── */
type EntryType = 'Student' | 'Visitor';

interface Record {
  id: string;
  name: string;
  type: EntryType;
  details: string;
  phone: string;
  payId?: string;
  team?: string;
  nic?: string;
  from?: string;
  interest?: string;
  time: string;
  date: string;
}

interface Toast { msg: string; kind: 'success' | 'error'; }

/* ── Helpers ────────────────────────────────────────────────── */
const nowTime = () => new Date().toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' });
const todayDate = () => new Date().toLocaleDateString('en-LK');
const pad4 = (n: number) => String(n).padStart(4, '0');

/* ── Main Component ─────────────────────────────────────────── */
export default function CheckInPage() {
  const [tab, setTab]               = useState<'student' | 'visitor'>('student');
  const [records, setRecords] = useState<Record[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('oc_records');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [visCounter, setVisCounter] = useState<number>(() => {
    if (typeof window === 'undefined') return 1;
    try {
      const saved = localStorage.getItem('oc_viscounter');
      return saved ? parseInt(saved) : 1;
    } catch { return 1; }
  });

  // Persist records to localStorage on every change
  useEffect(() => {
    try { localStorage.setItem('oc_records', JSON.stringify(records)); }
    catch { /* storage full */ }
  }, [records]);

  // Persist visitor counter
  useEffect(() => {
    try { localStorage.setItem('oc_viscounter', String(visCounter)); }
    catch { /* storage full */ }
  }, [visCounter]);
  const [toast, setToast]           = useState<Toast | null>(null);
  const [searching, setSearching]   = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);
  const toastTimer                  = useRef<ReturnType<typeof setTimeout>>(null);

  // Student fields
  const [sr, setSr]               = useState('');
  const [stuPayId, setStuPayId]   = useState('');
  const [stuName, setStuName]     = useState('');
  const [stuProg, setStuProg]     = useState('');
  const [stuPhone, setStuPhone]   = useState('');
  const [stuMedium, setStuMedium] = useState('');
  const [stuFormat, setStuFormat] = useState('');
  const [stuTeam, setStuTeam]     = useState('');
  const [stuSessions, setStuSessions] = useState<string[]>([]);

  // Visitor fields
  const [visName, setVisName]       = useState('');
  const [visPhone, setVisPhone]     = useState('');
  const [visNic, setVisNic]         = useState('');
  const [visFrom, setVisFrom]       = useState('');
  const [visSessions, setVisSessions] = useState<string[]>([]);
  const [visInterest, setVisInterest] = useState('');

  /* ── Toast ── */
  const showToast = useCallback((msg: string, kind: 'success' | 'error') => {
    setToast({ msg, kind });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  /* ── SR Search ── */
  const searchSR = async () => {
    if (!sr.trim()) { showToast('SR number enter பண்ணுங்க', 'error'); return; }
    setSearching(true);
    setAutoFilled(false);
    try {
      const res  = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ srNumber: sr.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? 'Not found');
      setStuPayId(data.payId      ?? '');
      setStuName(data.name        ?? '');
      setStuProg(data.programme   ?? '');
      setStuPhone(data.contact    ?? '');
      setStuMedium(data.medium    ?? '');
      setStuFormat(data.classFormat ?? '');
      setStuTeam(data.team        ?? '');
      // Update SR field with canonical username (CN format)
      if (data.srNumber) setSr(data.srNumber);
      setAutoFilled(true);
      showToast(`✓ Found: ${data.name}`, 'success');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Not found';
      showToast(msg + ' — manually fill பண்ணலாம்', 'error');
    } finally {
      setSearching(false);
    }
  };

  /* ── Register Student ── */
  const registerStudent = () => {
    if (!sr.trim() || !stuName.trim()) {
      showToast('SR number மற்றும் பெயர் கட்டாயம்!', 'error'); return;
    }
    if (records.find(r => r.id === sr.trim().toUpperCase())) {
      showToast('இந்த student ஏற்கனவே registered!', 'error'); return;
    }
    setRecords(prev => [{
      id:      sr.trim().toUpperCase(),
      name:    stuName.trim(),
      type:    'Student',
      details: [stuProg, stuMedium, stuFormat].filter(Boolean).join(' · '),
      phone:   stuPhone,
      payId:   stuPayId,
      team:    stuTeam,
      interest: stuSessions.length > 0 ? stuSessions.join(', ') : '',
      time:    nowTime(),
      date:    todayDate(),
    }, ...prev]);
    showToast(`✓ ${stuName} registered`, 'success');
    setSr(''); setStuPayId(''); setStuName(''); setStuProg('');
    setStuPhone(''); setStuMedium(''); setStuFormat(''); setStuTeam('');
    setStuSessions([]);
    setAutoFilled(false);
  };

  /* ── Register Visitor ── */
  const registerVisitor = () => {
    if (!visName.trim() || !visPhone.trim()) {
      showToast('பெயர் மற்றும் phone கட்டாயம்!', 'error'); return;
    }
    const vid = `VIS-${pad4(visCounter)}`;
    setRecords(prev => [{
      id:       vid,
      name:     visName.trim(),
      type:     'Visitor',
      details:  visSessions.length > 0 ? visSessions.join(', ') : 'General inquiry',
      phone:    visPhone,
      nic:      visNic,
      from:     visFrom,
      interest: visInterest,
      time:     nowTime(),
      date:     todayDate(),
    }, ...prev]);
    setVisCounter(c => c + 1);
    showToast(`✓ ${visName} registered as ${vid}`, 'success');
    setVisName(''); setVisPhone(''); setVisNic(''); setVisFrom('');
    setVisSessions([]); setVisInterest('');
  };

  /* ── Clear session ── */
  const clearSession = () => {
    if (!confirm('எல்லா data-வும் clear ஆகும். Sure-ஆ?')) return;
    setRecords([]);
    setVisCounter(1);
    try {
      localStorage.removeItem('oc_records');
      localStorage.removeItem('oc_vis_counter');
    } catch {}
    showToast('Session cleared!', 'success');
  };

  /* ── Excel Export ── */
  const exportExcel = async () => {
    if (!records.length) { showToast('Export பண்ண data இல்லை!', 'error'); return; }

    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Attendance');

    ws.columns = [
      { header: 'ID',                         key: 'id',       width: 14 },
      { header: 'Full Name',                  key: 'name',     width: 22 },
      { header: 'Type',                       key: 'type',     width: 10 },
      { header: 'Programme / Purpose',        key: 'details',  width: 16 },
      { header: 'Sessions Selected',           key: 'sessions', width: 60 },
      { header: 'Phone',                      key: 'phone',    width: 14 },
      { header: 'Pay ID (Student)',           key: 'payId',    width: 14 },
      { header: 'Team (Student)',            key: 'team',     width: 14 },
      { header: 'NIC (Visitor)',              key: 'nic',      width: 14 },
      { header: 'Hometown (Visitor)',         key: 'from',     width: 16 },
      { header: 'Programme Interest (Visit)', key: 'interest', width: 28 },
      { header: 'Check-in Time',             key: 'time',     width: 12 },
      { header: 'Date',                       key: 'date',     width: 12 },
    ];

    // Style header row
    ws.getRow(1).eachCell(cell => {
      cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };
      cell.font   = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FF0B7A6E' } } };
    });

    [...records].reverse().forEach(r => {
      ws.addRow({
        id: r.id, name: r.name, type: r.type,
        details: r.details, phone: r.phone || '',
        sessions: r.interest || '',
        nic: r.nic || '', from: r.from || '',
        interest: r.type === 'Visitor' ? r.interest || '' : '',
        time: r.time, date: r.date,
      });
    });

    // Alternate row colours
    ws.eachRow((row, rowNum) => {
      if (rowNum === 1) return;
      row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowNum % 2 === 0 ? 'FFF0F6F6' : 'FFFFFFFF' } };
      });
    });

    const buf  = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `OpenCampus_${todayDate().replace(/\//g, '-')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('✓ Excel downloaded!', 'success');
  };

  /* ── Clear all data ── */
  const clearAll = () => {
    if (!confirm('எல்லா data-வையும் delete பண்ணணுமா? This cannot be undone.')) return;
    setRecords([]);
    setVisCounter(1);
    localStorage.removeItem('oc_records');
    localStorage.removeItem('oc_viscounter');
    showToast('✓ Data cleared', 'success');
  };

  const stuCount = records.filter(r => r.type === 'Student').length;
  const visCount = records.filter(r => r.type === 'Visitor').length;
  const nextVid  = `VIS-${pad4(visCounter)}`;

  return (
    <>
      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position:'fixed', top:16, left:'50%', transform:'translateX(-50%)',
          background:'#fff', border:`1px solid ${toast.kind==='success'?'rgba(16,185,129,.4)':'rgba(239,68,68,.4)'}`,
          borderRadius:10, padding:'11px 18px', fontSize:13, fontWeight:500,
          display:'flex', alignItems:'center', gap:8,
          boxShadow:'0 8px 32px rgba(13,148,136,.15)', zIndex:999,
          color: toast.kind==='success' ? 'var(--success)' : 'var(--danger)',
          animation:'slideDown .28s cubic-bezier(.34,1.56,.64,1)',
          minWidth:260, maxWidth:420,
        }}>
          {toast.kind === 'success'
            ? <Check size={15} strokeWidth={2.5} />
            : <X size={15} strokeWidth={2.5} />}
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <header style={{
        background:'linear-gradient(135deg,#0d9488,#0891b2)',
        padding:'1.1rem 1.5rem', display:'flex', alignItems:'center', gap:14,
        boxShadow:'0 2px 16px rgba(13,148,136,.3)',
      }}>
        <div style={{
          width:38, height:38, background:'rgba(255,255,255,.2)',
          borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <GraduationCap size={20} color="#fff" />
        </div>
        <div>
          <h1 style={{ color:'#fff', fontSize:17, fontWeight:600, letterSpacing:'-.01em' }}>
            SkillLift Open Campus
          </h1>
          <p style={{ color:'rgba(255,255,255,.75)', fontSize:12, marginTop:1 }}>
            SkillLift — SkillLift Open Campus
          </p>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:10 }}>
          {[
            { dot:'#a7f3d0', label:`${stuCount} student${stuCount!==1?'s':''}` },
            { dot:'#fde68a', label:`${visCount} visitor${visCount!==1?'s':''}` },
          ].map(({ dot, label }) => (
            <div key={label} style={{
              background:'rgba(255,255,255,.18)', border:'1px solid rgba(255,255,255,.25)',
              borderRadius:20, padding:'5px 12px', display:'flex', alignItems:'center',
              gap:6, color:'#fff', fontSize:13, fontWeight:500,
            }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:dot, display:'inline-block' }}/>
              {label}
            </div>
          ))}
        </div>
      </header>

      <main style={{ maxWidth:820, margin:'0 auto', padding:'1.5rem 1rem' }}>

        {/* ── Tab switcher ── */}
        <div style={{
          display:'flex', background:'var(--card)',
          border:'1px solid var(--border)', borderRadius:'var(--radius)',
          padding:5, gap:4, marginBottom:'1.4rem',
          boxShadow:'var(--shadow)',
        }}>
          {(['student','visitor'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex:1, padding:10, border:'none', borderRadius:9,
              fontFamily:'DM Sans, sans-serif', fontSize:14, fontWeight:500,
              cursor:'pointer', display:'flex', alignItems:'center',
              justifyContent:'center', gap:7, transition:'all .18s',
              background: tab===t ? 'var(--teal)' : 'transparent',
              color:       tab===t ? '#fff'        : 'var(--muted)',
              boxShadow:   tab===t ? '0 2px 8px rgba(13,148,136,.35)' : 'none',
            }}>
              {t === 'student' ? <Users size={15}/> : <UserPlus size={15}/>}
              {t === 'student' ? 'Student' : 'Visitor (Non-Student)'}
            </button>
          ))}
        </div>

        {/* ── Student Form ── */}
        {tab === 'student' && (
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'1.4rem', boxShadow:'var(--shadow)', animation:'fadeIn .2s ease' }}>
            {/* SR row */}
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--muted)', letterSpacing:'.03em', textTransform:'uppercase', marginBottom:5 }}>
                SR Number
                {autoFilled && (
                  <span style={{ display:'inline-flex', alignItems:'center', gap:4, marginLeft:8, padding:'2px 8px', background:'var(--success-bg)', border:'1px solid rgba(16,185,129,.35)', borderRadius:20, fontSize:11, fontWeight:600, color:'var(--success)', verticalAlign:'middle' }}>
                    <BadgeCheck size={11}/> Auto-filled
                  </span>
                )}
              </label>
              <div style={{ display:'flex', gap:8 }}>
                <input
                  value={sr}
                  onChange={e => { setSr(e.target.value.toUpperCase()); setAutoFilled(false); }}
                  onKeyDown={e => e.key === 'Enter' && searchSR()}
                  placeholder="e.g. SR2024001"
                  style={{ flex:1, padding:'10px 13px', border:'1.5px solid var(--border)', borderRadius:9, fontFamily:'DM Sans,sans-serif', fontSize:14, color:'var(--text)', outline:'none' }}
                />
                <button onClick={searchSR} disabled={searching} style={{
                  padding:'10px 16px', background:'var(--teal-light)',
                  border:'1.5px solid rgba(13,148,136,.4)', borderRadius:9,
                  fontFamily:'DM Sans,sans-serif', fontSize:13, fontWeight:600,
                  color:'var(--teal)', cursor:'pointer', display:'flex', alignItems:'center', gap:6,
                  opacity: searching ? .6 : 1,
                }}>
                  {searching
                    ? <span style={{ width:14, height:14, border:'2px solid rgba(13,148,136,.25)', borderTopColor:'var(--teal)', borderRadius:'50%', animation:'spin .6s linear infinite', display:'inline-block' }}/>
                    : <Search size={14} strokeWidth={2.5}/>}
                  {searching ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>

            {/* Fields */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {[
                { label:'Pay ID',             val:stuPayId,  set:setStuPayId,  ph:'Auto-filled' },
                { label:'Full Name *',        val:stuName,   set:setStuName,   ph:'Student full name' },
                { label:'Programme',          val:stuProg,   set:setStuProg,   ph:'e.g. Crypto Trading Guide' },
                { label:'Contact',            val:stuPhone,  set:setStuPhone,  ph:'Mobile number' },
                { label:'Medium',             val:stuMedium, set:setStuMedium, ph:'e.g. Sinhala / English' },
                { label:'Class Format',       val:stuFormat, set:setStuFormat, ph:'Online / Physical' },
                { label:'Team',               val:stuTeam,   set:setStuTeam,   ph:'e.g. AVENGERS' },
              ].map(({ label, val, set, ph }) => (
                <div key={label}>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--muted)', letterSpacing:'.03em', textTransform:'uppercase', marginBottom:5 }}>{label}</label>
                  <input value={val} onChange={e => set(e.target.value)} placeholder={ph}
                    style={{ width:'100%', padding:'10px 13px', border:'1.5px solid var(--border)', borderRadius:9, fontFamily:'DM Sans,sans-serif', fontSize:14, color:'var(--text)', outline:'none' }}/>
                </div>
              ))}
            </div>

            {/* Sessions multi-select for Student */}
            <div style={{ marginTop:16 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--muted)', letterSpacing:'.03em', textTransform:'uppercase', marginBottom:8 }}>
                Which sessions are you expecting to participate in?
              </label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {[
                  'Introduction & Course registration',
                  'Binance Account Creation',
                  'P2P',
                  'Fibonacci',
                  'SMC',
                  'RSI & Indicators',
                  'Trading View & Candlestick patterns',
                  'Advanced Revision',
                ].map(session => {
                  const checked = stuSessions.includes(session);
                  return (
                    <div key={session} onClick={() => setStuSessions(prev =>
                        checked ? prev.filter(s => s !== session) : [...prev, session]
                      )} style={{
                      display:'flex', alignItems:'center', gap:9, padding:'9px 12px',
                      border: `1.5px solid ${checked ? 'var(--teal)' : 'var(--border)'}`,
                      borderRadius:9, cursor:'pointer',
                      background: checked ? 'var(--teal-light)' : '#fff',
                      transition:'all .15s',
                    }}>
                      <div style={{
                        width:17, height:17, borderRadius:5, flexShrink:0,
                        border: `2px solid ${checked ? 'var(--teal)' : '#cbd5e1'}`,
                        background: checked ? 'var(--teal)' : '#fff',
                        display:'flex', alignItems:'center', justifyContent:'center',
                      }}>
                        {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <span style={{ fontSize:13, fontWeight: checked ? 600 : 400, color: checked ? 'var(--teal-dark)' : 'var(--text)', lineHeight:1.3 }}>{session}</span>
                    </div>
                  );
                })}
              </div>
              {stuSessions.length > 0 && (
                <div style={{ marginTop:8, fontSize:12, color:'var(--teal)', fontWeight:500 }}>
                  ✓ {stuSessions.length} session{stuSessions.length > 1 ? 's' : ''} selected
                </div>
              )}
            </div>

            <button onClick={registerStudent} style={{
              width:'100%', padding:13, marginTop:16,
              background:'linear-gradient(135deg,var(--teal),var(--cyan))',
              border:'none', borderRadius:10, fontFamily:'DM Sans,sans-serif',
              fontSize:15, fontWeight:600, color:'#fff', cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            }}>
              <Check size={18} strokeWidth={2.5}/> Register Student
            </button>
          </div>
        )}

        {/* ── Visitor Form ── */}
        {tab === 'visitor' && (
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'1.4rem', boxShadow:'var(--shadow)', animation:'fadeIn .2s ease' }}>
            {/* Visitor ID banner */}
            <div style={{
              background:'linear-gradient(135deg,var(--teal-light),var(--teal-mid))',
              border:'1.5px solid rgba(13,148,136,.3)', borderRadius:10,
              padding:'12px 16px', display:'flex', alignItems:'center',
              justifyContent:'space-between', marginBottom:'1.2rem',
            }}>
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--teal)', letterSpacing:'.05em', textTransform:'uppercase' }}>Auto Visitor ID</div>
                <div style={{ fontFamily:'DM Mono,monospace', fontSize:22, fontWeight:500, color:'var(--teal-dark)', letterSpacing:2, marginTop:2 }}>{nextVid}</div>
              </div>
              <div style={{ width:40, height:40, background:'rgba(13,148,136,.12)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <ClipboardList size={20} color="var(--teal)"/>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              {[
                { label:'Full Name *',        val:visName,     set:setVisName,     ph:'Visitor full name' },
                { label:'Phone *',            val:visPhone,    set:setVisPhone,    ph:'07X XXXXXXX' },
                { label:'NIC / Passport',     val:visNic,      set:setVisNic,      ph:'Optional' },
                { label:'Hometown / City',    val:visFrom,     set:setVisFrom,     ph:'e.g. Colombo' },
              ].map(({ label, val, set, ph }) => (
                <div key={label}>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--muted)', letterSpacing:'.03em', textTransform:'uppercase', marginBottom:5 }}>{label}</label>
                  <input value={val} onChange={e => set(e.target.value)} placeholder={ph}
                    style={{ width:'100%', padding:'10px 13px', border:'1.5px solid var(--border)', borderRadius:9, fontFamily:'DM Sans,sans-serif', fontSize:14, color:'var(--text)', outline:'none' }}/>
                </div>
              ))}
            </div>

            {/* Sessions multi-select */}
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--muted)', letterSpacing:'.03em', textTransform:'uppercase', marginBottom:8 }}>
                Which sessions are you expecting to participate in?
                <span style={{ color:'var(--danger)', marginLeft:3 }}>*</span>
              </label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {[
                  'Introduction & Course registration',
                  'Binance Account Creation',
                  'P2P',
                  'Fibonacci',
                  'SMC',
                  'RSI & Indicators',
                  'Trading View & Candlestick patterns',
                  'Advanced Revision',
                ].map(session => {
                  const checked = visSessions.includes(session);
                  return (
                    <div key={session} onClick={() => setVisSessions(prev =>
                        checked ? prev.filter(s => s !== session) : [...prev, session]
                      )} style={{
                      display:'flex', alignItems:'center', gap:9, padding:'9px 12px',
                      border: `1.5px solid ${checked ? 'var(--teal)' : 'var(--border)'}`,
                      borderRadius:9, cursor:'pointer',
                      background: checked ? 'var(--teal-light)' : '#fff',
                      transition:'all .15s',
                    }}>
                      <div style={{
                        width:17, height:17, borderRadius:5, flexShrink:0,
                        border: `2px solid ${checked ? 'var(--teal)' : '#cbd5e1'}`,
                        background: checked ? 'var(--teal)' : '#fff',
                        display:'flex', alignItems:'center', justifyContent:'center',
                      }}>
                        {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <span style={{ fontSize:13, fontWeight: checked ? 600 : 400, color: checked ? 'var(--teal-dark)' : 'var(--text)', lineHeight:1.3 }}>{session}</span>
                    </div>
                  );
                })}
              </div>
              {visSessions.length > 0 && (
                <div style={{ marginTop:8, fontSize:12, color:'var(--teal)', fontWeight:500 }}>
                  ✓ {visSessions.length} session{visSessions.length > 1 ? 's' : ''} selected
                </div>
              )}
            </div>

            <button onClick={registerVisitor} style={{
              width:'100%', padding:13, marginTop:16,
              background:'linear-gradient(135deg,var(--teal),var(--cyan))',
              border:'none', borderRadius:10, fontFamily:'DM Sans,sans-serif',
              fontSize:15, fontWeight:600, color:'#fff', cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            }}>
              <Check size={18} strokeWidth={2.5}/> Register Visitor
            </button>
          </div>
        )}

        {/* ── Divider ── */}
        <div style={{ height:1, background:'var(--border)', margin:'1.4rem 0' }}/>

        {/* ── Log table ── */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'1.4rem', boxShadow:'var(--shadow)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div>
              <span style={{ fontSize:14, fontWeight:600, color:'var(--text)' }}>
                Attendance Log
              </span>
              <span style={{
                marginLeft:8, fontSize:11, fontWeight:600,
                background:'var(--teal-light)', color:'var(--teal)',
                padding:'2px 8px', borderRadius:20,
              }}>
                {records.length} / 150
              </span>
{records.length > 0 && (                <span style={{
                  marginLeft:6, fontSize:11, color:'var(--success)',
                  fontWeight:500,
                }}>✓ Auto-saved</span>
              )}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={clearSession} style={{
                padding:'7px 14px', background:'var(--danger-bg)',
                border:'1.5px solid rgba(239,68,68,.3)', borderRadius:8,
                fontFamily:'DM Sans,sans-serif', fontSize:13, fontWeight:600,
                color:'var(--danger)', cursor:'pointer',
                display:'flex', alignItems:'center', gap:6,
              }}>
                <X size={13} strokeWidth={2.5}/> Clear
              </button>
              <button onClick={exportExcel} style={{
                padding:'7px 14px', background:'var(--success-bg)',
                border:'1.5px solid rgba(16,185,129,.4)', borderRadius:8,
                fontFamily:'DM Sans,sans-serif', fontSize:13, fontWeight:600,
                color:'var(--success)', cursor:'pointer',
                display:'flex', alignItems:'center', gap:6,
              }}>
                <Download size={13} strokeWidth={2.5}/> Export Excel
              </button>
            </div>
          </div>

          <div style={{ overflowX:'auto', borderRadius:10, border:'1px solid var(--border)' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr>
                  {['ID','Name','Type','Details','Time'].map(h => (
                    <th key={h} style={{
                      textAlign:'left', padding:'9px 12px',
                      background:'var(--teal-light)', color:'var(--teal-dark)',
                      fontWeight:600, fontSize:11, letterSpacing:'.04em',
                      textTransform:'uppercase', borderBottom:'1px solid var(--border)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign:'center', padding:28, color:'var(--muted)', fontSize:13 }}>
                    No registrations yet — check in your first attendee above
                  </td></tr>
                ) : records.map((r, i) => (
                  <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : 'var(--teal-light)' }}>
                    <td style={{ padding:'9px 12px', fontFamily:'DM Mono,monospace', fontSize:12, color:'var(--muted)' }}>{r.id}</td>
                    <td style={{ padding:'9px 12px', fontWeight:500 }}>{r.name}</td>
                    <td style={{ padding:'9px 12px' }}>
                      <span style={{
                        display:'inline-flex', alignItems:'center', gap:4,
                        padding:'3px 9px', borderRadius:20, fontSize:11, fontWeight:600,
                        background: r.type==='Student' ? 'rgba(13,148,136,.12)' : '#fff7ed',
                        color:      r.type==='Student' ? 'var(--teal-dark)'      : '#c2410c',
                        border:     r.type==='Student' ? 'none' : '1px solid #fed7aa',
                      }}>
                        {r.type==='Student' ? <GraduationCap size={10}/> : <UserPlus size={10}/>}
                        {r.type}
                      </span>
                    </td>
                    <td style={{ padding:'9px 12px', color:'var(--muted)', fontSize:12 }}>{r.details || '—'}</td>
                    <td style={{ padding:'9px 12px', fontFamily:'DM Mono,monospace', fontSize:12 }}>{r.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}