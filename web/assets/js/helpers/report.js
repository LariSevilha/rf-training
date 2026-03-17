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
    fromKey,
    toKey,
  }) {
    const now = new Date().toLocaleString("pt-BR");
    const keys = monthsBetween(fromKey, toKey);
  
    const periodUsers = (users || []).filter((u) => {
      const d = pickDate(u);
      if (!d) return false;
      return keys.includes(monthKey(d));
    });
  
    const monthsCount = keys.length || 1;
    const avgPerMonth = (periodNew / monthsCount).toFixed(1);
  
    const sortedBest = [...(monthlyRows || [])].sort((a, b) => b.total - a.total);
    const sortedWorst = [...(monthlyRows || [])].sort((a, b) => a.total - b.total);
  
    const bestMonth = sortedBest[0] || null;
    const worstMonth = sortedWorst[0] || null;
  
    const activePeriod = periodUsers.filter((u) => !!u.active).length;
    const inactivePeriod = periodUsers.length - activePeriod;
  
    const firstMonth = monthlyRows?.[0] || null;
    const lastMonth = monthlyRows?.[monthlyRows.length - 1] || null;
  
    const variationText =
      firstMonth && lastMonth
        ? `${monthLabel(firstMonth.key)} (${firstMonth.total}) → ${monthLabel(lastMonth.key)} (${lastMonth.total})`
        : "—";
  
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
  
    const usersRowsHtml = (periodUsers || [])
      .sort((a, b) => new Date(pickDate(b) || 0) - new Date(pickDate(a) || 0))
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
    <title>RF Fitness — Relatório Detalhado de Alunos</title>
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
        border-bottom: 3px solid #ceac5e;
        padding-bottom: 14px;
        margin-bottom: 24px;
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
        margin-top:26px;
      }
  
      .section h2{
        margin:0 0 12px;
        font-size:18px;
        color:#222;
        border-left: 4px solid #ceac5e;
        padding-left:10px;
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
  
      @media print {
        body{ padding:16px; }
        .section{ break-inside: avoid; }
        table{ break-inside: auto; }
        tr{ break-inside: avoid; break-after: auto; }
      }
    </style>
  </head>
  <body>
    <div class="header">
      <h1 class="title">RF FITNESS — Relatório Detalhado de Alunos</h1>
      <p class="subtitle">
        ${periodLabel}<br>
        Gerado em: ${now}
      </p>
    </div>
  
    <div class="section">
      <h2>Resumo executivo</h2>
      <div class="summary">
        A base atual possui <strong>${total}</strong> alunos cadastrados, sendo
        <strong>${active}</strong> ativos (${pct(active, total)}) e
        <strong>${inactive}</strong> inativos (${pct(inactive, total)}).<br><br>
  
        No período selecionado, foram encontrados <strong>${periodNew}</strong> cadastros,
        com média de <strong>${avgPerMonth}</strong> alunos por mês.<br><br>
  
        Dentro do período, há <strong>${activePeriod}</strong> alunos ativos e
        <strong>${inactivePeriod}</strong> inativos.<br><br>
  
        ${
          bestMonth
            ? `O mês com maior volume de cadastros foi <strong>${monthLabel(bestMonth.key)}</strong>, com <strong>${bestMonth.total}</strong> cadastro(s).`
            : ""
        }
        <br>
        ${
          worstMonth
            ? `O mês com menor volume foi <strong>${monthLabel(worstMonth.key)}</strong>, com <strong>${worstMonth.total}</strong> cadastro(s).`
            : ""
        }
        <br><br>
  
        Comparação entre início e fim do período: <strong>${variationText}</strong>.
      </div>
    </div>
  
    <div class="section">
      <h2>Indicadores gerais</h2>
      <div class="grid">
        <div class="box">
          <div class="label">Total de alunos</div>
          <div class="val">${total}</div>
        </div>
  
        <div class="box">
          <div class="label">Ativos</div>
          <div class="val">${active}</div>
          <div class="mini">${pct(active, total)} do total</div>
        </div>
  
        <div class="box">
          <div class="label">Inativos</div>
          <div class="val">${inactive}</div>
          <div class="mini">${pct(inactive, total)} do total</div>
        </div>
  
        <div class="box">
          <div class="label">Cadastros no período</div>
          <div class="val">${periodNew}</div>
          <div class="mini">Média ${avgPerMonth}/mês</div>
        </div>
      </div>
    </div>
  
    <div class="section">
      <h2>Evolução mensal</h2>
      <table>
        <thead>
          <tr>
            <th>Mês</th>
            <th>Total cadastrados</th>
            <th>Ativos</th>
            <th>Inativos</th>
          </tr>
        </thead>
        <tbody>
          ${monthlyRowsHtml || `<tr><td colspan="4">Nenhum dado disponível no período.</td></tr>`}
        </tbody>
      </table>
    </div>
  
    <div class="section">
      <h2>Listagem detalhada de alunos cadastrados no período</h2>
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
          ${usersRowsHtml || `<tr><td colspan="6">Nenhum aluno encontrado no período selecionado.</td></tr>`}
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