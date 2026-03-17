export function monthKey(d) {
    const dt = new Date(d);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }
  
  export function monthLabel(key) {
    const [y, m] = key.split("-");
    return `${m}/${y}`;
  }
  
  export function pct(part, total) {
    if (!total) return "0%";
    return Math.round((part / total) * 100) + "%";
  }
  
  export function pickDate(u) {
    return u.createdAt || u.created_at || u.updatedAt || u.updated_at || null;
  }
  
  export function monthsBetween(fromKey, toKey) {
    const [fy, fm] = fromKey.split("-").map(Number);
    const [ty, tm] = toKey.split("-").map(Number);
  
    const start = new Date(fy, fm - 1, 1);
    const end = new Date(ty, tm - 1, 1);
  
    const a = start <= end ? start : end;
    const b = start <= end ? end : start;
  
    const out = [];
    const cur = new Date(a.getFullYear(), a.getMonth(), 1);
  
    while (cur <= b) {
      out.push(monthKey(cur));
      cur.setMonth(cur.getMonth() + 1);
    }
  
    return out;
  }
  
  export function formatDateBR(value) {
    if (!value) return "—";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("pt-BR");
  }
  
  export function formatDateTimeBR(value) {
    if (!value) return "—";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("pt-BR");
  }
  
  export function buildDashboardPrintHTML({
    periodLabel = "",
    total = 0,
    active = 0,
    inactive = 0,
    periodNew = 0,
    users = [],
    monthlyRows = [],
    filterMeta = {},
  }) {
    const now = new Date().toLocaleString("pt-BR");
  
    const activeUsers = (users || []).filter((u) => !!u.active);
    const inactiveUsers = (users || []).filter((u) => !u.active);
    const unnamedUsers = (users || []).filter((u) => !String(u.name || "").trim());
  
    const sortedByDateAsc = [...(users || [])].sort(
      (a, b) => new Date(pickDate(a) || 0) - new Date(pickDate(b) || 0)
    );
  
    const firstUser = sortedByDateAsc[0] || null;
    const lastUser = sortedByDateAsc[sortedByDateAsc.length - 1] || null;
  
    const bestMonth = [...(monthlyRows || [])].sort((a, b) => b.total - a.total)[0] || null;
    const worstMonth = [...(monthlyRows || [])].sort((a, b) => a.total - b.total)[0] || null;
  
    const avgPerMonth = monthlyRows.length ? (periodNew / monthlyRows.length).toFixed(1) : "0.0";
  
    const domainsRows = (filterMeta.domains || [])
      .map(
        (d) => `
        <tr>
          <td>${d.domain}</td>
          <td>${d.total}</td>
        </tr>
      `
      )
      .join("");
  
    const monthlyRowsHtml = (monthlyRows || [])
      .map(
        (r) => `
        <tr>
          <td>${monthLabel(r.key)}</td>
          <td>${r.total}</td>
          <td>${r.active}</td>
          <td>${r.inactive}</td>
        </tr>
      `
      )
      .join("");
  
    const usersRowsHtml = (users || [])
      .map((u, index) => {
        const status = u.active ? "Ativo" : "Inativo";
        const statusClass = u.active ? "status-active" : "status-inactive";
  
        return `
        <tr>
          <td>${index + 1}</td>
          <td>${(u.name || "").trim() || "—"}</td>
          <td>${u.email || "—"}</td>
          <td><span class="status ${statusClass}">${status}</span></td>
          <td>${formatDateBR(pickDate(u))}</td>
          <td>${formatDateTimeBR(pickDate(u))}</td>
        </tr>
      `;
      })
      .join("");
  
    return `
  <!doctype html>
  <html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>RF Fitness — Relatório Avançado de Alunos</title>
    <style>
      *{ box-sizing:border-box; }
  
      body{
        margin:0;
        padding:28px;
        font-family: Arial, Helvetica, sans-serif;
        color:#111;
        background:#fff;
      }
  
      .header{
        border-bottom:3px solid #ceac5e;
        padding-bottom:14px;
        margin-bottom:22px;
      }
  
      .title{
        margin:0;
        font-size:28px;
        font-weight:800;
        color:#111;
        letter-spacing:.3px;
      }
  
      .subtitle{
        margin:8px 0 0;
        color:#555;
        font-size:13px;
        line-height:1.6;
      }
  
      .section{
        margin-top:24px;
      }
  
      .section h2{
        margin:0 0 12px;
        font-size:18px;
        border-left:4px solid #ceac5e;
        padding-left:10px;
        color:#222;
      }
  
      .summary{
        border:1px solid #ddd;
        border-radius:12px;
        padding:14px;
        background:#fcfcfc;
        font-size:14px;
        line-height:1.75;
        color:#333;
      }
  
      .grid{
        display:grid;
        grid-template-columns: repeat(4, 1fr);
        gap:12px;
        margin-top:14px;
      }
  
      .box{
        border:1px solid #ddd;
        border-radius:12px;
        padding:14px;
        background:#fafafa;
      }
  
      .label{
        font-size:12px;
        color:#666;
        margin-bottom:6px;
      }
  
      .val{
        font-size:24px;
        font-weight:800;
        color:#111;
      }
  
      .mini{
        margin-top:6px;
        font-size:12px;
        color:#666;
      }
  
      table{
        width:100%;
        border-collapse:collapse;
        margin-top:12px;
      }
  
      th, td{
        border:1px solid #ddd;
        padding:10px;
        text-align:left;
        font-size:13px;
        vertical-align:top;
      }
  
      th{
        background:#f5f5f5;
        color:#222;
        font-weight:700;
      }
  
      .status{
        display:inline-block;
        padding:4px 8px;
        border-radius:999px;
        font-size:12px;
        font-weight:700;
        white-space:nowrap;
      }
  
      .status-active{
        background:#e8f8ee;
        color:#1f7a3d;
        border:1px solid #bfe6cb;
      }
  
      .status-inactive{
        background:#fdecec;
        color:#b42318;
        border:1px solid #f5c2c0;
      }
  
      .footer{
        margin-top:30px;
        padding-top:10px;
        border-top:1px solid #ddd;
        font-size:12px;
        color:#666;
      }
  
      @media print{
        body{ padding:16px; }
        .section{ break-inside: avoid; }
        tr{ break-inside: avoid; }
      }
    </style>
  </head>
  <body>
    <div class="header">
      <h1 class="title">RF FITNESS — Relatório Avançado de Alunos</h1>
      <p class="subtitle">
        ${periodLabel}<br>
        Gerado em: ${now}
      </p>
    </div>
  
 
  
    <div class="section">
      <h2>Resumo executivo</h2>
      <div class="summary">
        O relatório filtrado contém <strong>${total}</strong> aluno(s), sendo
        <strong>${active}</strong> ativo(s) (${pct(active, total)}) e
        <strong>${inactive}</strong> inativo(s) (${pct(inactive, total)}).<br><br>
  
        A média de cadastros por mês no período foi de <strong>${avgPerMonth}</strong>.<br>
        ${
          bestMonth
            ? `Mês com maior volume: <strong>${monthLabel(bestMonth.key)}</strong> (${bestMonth.total}).<br>`
            : ""
        }
        ${
          worstMonth
            ? `Mês com menor volume: <strong>${monthLabel(worstMonth.key)}</strong> (${worstMonth.total}).<br>`
            : ""
        }
        ${firstUser ? `Primeiro cadastro do filtro: <strong>${formatDateTimeBR(pickDate(firstUser))}</strong>.<br>` : ""}
        ${lastUser ? `Último cadastro do filtro: <strong>${formatDateTimeBR(pickDate(lastUser))}</strong>.<br>` : ""}
        Alunos sem nome preenchido: <strong>${unnamedUsers.length}</strong>.<br>
        Alunos ativos no filtro: <strong>${activeUsers.length}</strong>.<br>
        Alunos inativos no filtro: <strong>${inactiveUsers.length}</strong>.
      </div>
    </div>
  
    
    <div class="section">
      <h2>Listagem detalhada</h2>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Nome</th>
            <th>Email</th>
            <th>Status</th>
            <th>Data</th>
            <th>Data e hora</th>
          </tr>
        </thead>
        <tbody>
          ${usersRowsHtml || `<tr><td colspan="6">Nenhum aluno encontrado no filtro.</td></tr>`}
        </tbody>
      </table>
    </div>
  
    <div class="footer">
      RF Fitness • Relatório administrativo gerado automaticamente pelo painel.
    </div>
  </body>
  </html>
    `;
  }