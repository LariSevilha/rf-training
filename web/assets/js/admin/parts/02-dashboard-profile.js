// ===== DASHBOARD =====
async function loadDashboard() {
  if (!dashTotal || !dashMonthlyBody) return;

  try {
    dashTotal.textContent = "…";
    dashActive.textContent = "…";
    dashInactive.textContent = "…";
    if (dashPeriodNew) dashPeriodNew.textContent = "…";
    if (dashActivePct) dashActivePct.textContent = "—";
    if (dashInactivePct) dashInactivePct.textContent = "—";
    if (dashPeriodLabel) dashPeriodLabel.textContent = "—";

    dashMonthlyBody.innerHTML = `<tr><td colspan="4" style="opacity:.7;padding:12px;">Carregando...</td></tr>`;

    const data = await apiAdminListUsers(token, "");
    const users = data?.users || [];
    dashboardUsers = users;

    const totalBase = users.length;
    const fromKey = dashFrom?.value || monthKey(new Date());
    const toKey = dashTo?.value || monthKey(new Date());
    const keys = monthsBetween(fromKey, toKey);

    let periodUsers = users.filter((u) => {
      const d = pickDate(u);
      if (!d) return false;
      return keys.includes(monthKey(d));
    });

    periodUsers = applyDashboardExtraFilters(periodUsers);
    dashboardFilteredUsers = periodUsers;

    const filteredTotal = periodUsers.length;
    const activeCount = periodUsers.filter((u) => !!u.active).length;
    const inactiveCount = filteredTotal - activeCount;

    dashTotal.textContent = String(filteredTotal);
    dashActive.textContent = String(activeCount);
    dashInactive.textContent = String(inactiveCount);

    if (dashActivePct) dashActivePct.textContent = `${pct(activeCount, filteredTotal)} do total filtrado`;
    if (dashInactivePct) dashInactivePct.textContent = `${pct(inactiveCount, filteredTotal)} do total filtrado`;

    if (dashPeriodLabel) {
      dashPeriodLabel.textContent = `Período: ${monthLabel(keys[0])} → ${monthLabel(keys[keys.length - 1])}`;
    }

    if (dashPeriodNew) dashPeriodNew.textContent = String(filteredTotal);

    const monthly = keys.map((key) => {
      const inMonth = periodUsers.filter((u) => {
        const d = pickDate(u);
        if (!d) return false;
        return monthKey(d) === key;
      });

      const t = inMonth.length;
      const a = inMonth.filter((u) => !!u.active).length;

      return {
        key,
        total: t,
        active: a,
        inactive: t - a,
      };
    });

    dashboardMonthlyRows = monthly;

    dashboardFilterMeta = {
      fromKey,
      toKey,
      totalBase,
      filteredTotal,
      status: dashStatus?.value || "all",
      named: dashNamed?.value || "all",
      text: (dashText?.value || "").trim(),
      sort: dashSort?.value || "recent",
      domains: buildDomainSummary(periodUsers),
    };

    renderMonthly(monthly);
  } catch (e) {
    toast("error", "Erro", e.message || "Erro ao carregar dashboard.");
    if (dashMonthlyBody) {
      dashMonthlyBody.innerHTML = `<tr><td colspan="4" style="opacity:.7;padding:12px;">Erro ao carregar.</td></tr>`;
    }
  }
}

// ===== ME (Admin) =====
async function loadMe() {
  try {
    const data = await apiMe(token);

    if (!data?.user?.email) {
      toast("error", "Erro", "API /me não retornou um usuário válido.");
      return;
    }

    meSessionUser = data.user;

    if (meName) meName.value = (data.user.name || "").trim();
    if (meEmail) meEmail.value = (data.user.email || "").trim();
    if (who) who.textContent = data.user.email;
    if (mName) mName.textContent = data.user.name || "";
    if (footerAdminName) footerAdminName.textContent = data.user.name || "Admin";
    if (footerAdminEmail) footerAdminEmail.textContent = data.user.email || "";
    if (adminAvatar) adminAvatar.textContent = getInitials(data.user.name || data.user.email || "RF");

    if (mePass1) mePass1.value = "";
    if (mePass2) mePass2.value = "";
  } catch (e) {
    toast("error", "Erro", e.message || "Erro ao carregar admin.");
  }
}

async function saveMe() {
  try {
    if (!meSessionUser) {
      await loadMe();
      if (!meSessionUser) {
        toast("error", "Erro", "Não foi possível carregar seu perfil para salvar.");
        return;
      }
    }

    const oldName = (meSessionUser.name || "").trim();
    const oldEmail = (meSessionUser.email || "").trim().toLowerCase();

    const name = (meName?.value || "").trim();
    const email = (meEmail?.value || "").trim().toLowerCase();

    const p1 = (mePass1?.value || "").trim();
    const p2 = (mePass2?.value || "").trim();

    if (!name || name.length < 2) {
      return toast("error", "Atenção", "Nome precisa ter no mínimo 2 caracteres.");
    }

    if (!email) {
      return toast("error", "Atenção", "Email inválido.");
    }

    const patch = {};
    if (name !== oldName) patch.name = name;
    if (email !== oldEmail) patch.email = email;

    const passwordChanged = !!(p1 || p2);

    if (passwordChanged) {
      if (p1.length < 6) return toast("error", "Senha fraca", "Use no mínimo 6 caracteres.");
      if (p1 !== p2) return toast("error", "Senha não confere", "Digite a mesma senha nos 2 campos.");
    }

    if (Object.keys(patch).length === 0 && !passwordChanged) {
      return toast("info", "Nada mudou", "Nenhuma alteração detectada.");
    }

    let updatedUser = meSessionUser;

    if (Object.keys(patch).length > 0) {
      const resp = await apiUpdateMe(token, patch);
      updatedUser = resp?.user || updatedUser;

      if (who) who.textContent = updatedUser.email || oldEmail;
      toast("ok", "Salvo", "Perfil atualizado.");
    }

    if (passwordChanged) {
      await apiUpdateMyPassword(token, p1);
      toast("ok", "Salvo", "Senha atualizada.");

      if (mePass1) mePass1.value = "";
      if (mePass2) mePass2.value = "";
    }

    await loadMe();

    if (email !== oldEmail) {
      toast("info", "Atenção", "Email alterado. Se der problema depois, faça login novamente.");
    }
  } catch (e) {
    const status = e?.status ? ` (HTTP ${e.status})` : "";
    toast("error", "Erro ao salvar", (e?.message || "Erro desconhecido") + status);
    console.error("saveMe error:", e);
  }
}
