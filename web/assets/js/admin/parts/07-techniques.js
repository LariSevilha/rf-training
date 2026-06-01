// ===== TÉCNICAS DE TREINO =====
function resetTechniqueEdit() {
  editingTechniqueId = null;
  if (techniqueName) techniqueName.value = "";
  if (techniqueVideoUrl) techniqueVideoUrl.value = "";
  if (techniqueNotes) techniqueNotes.value = "";
  if (techniqueSaveBtn) techniqueSaveBtn.textContent = "Cadastrar técnica";
  if (techniqueCancelEditBtn) techniqueCancelEditBtn.style.display = "none";
}

async function refreshTechniques() {
  const data = await apiAdminListTechniques(token);
  techniqueCatalog = data.techniques || [];

  if (workoutTechniqueSelect) {
    workoutTechniqueSelect.innerHTML =
      `<option value="">Sem técnica</option>` +
      techniqueCatalog.map((t) => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.name)}</option>`).join("");
  }

  if (techniqueListBox) {
    techniqueListBox.innerHTML = techniqueCatalog.length
      ? techniqueCatalog.map((t) => `
        <div class="smallHint" style="display:flex;justify-content:space-between;gap:10px;align-items:center;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px;margin:8px 0;">
          <span><b>${escapeHtml(t.name)}</b>${t.videoUrl ? ` · vídeo ok` : ""}${t.notes ? `<br><small>${escapeHtml(t.notes)}</small>` : ""}</span>
          <span style="display:flex;gap:8px;">
            <button class="btnGhost" type="button" data-edit-technique="${escapeHtml(t.id)}" style="padding:6px 10px;min-width:auto;">Editar</button>
            <button class="btnGhost" type="button" data-delete-technique="${escapeHtml(t.id)}" style="padding:6px 10px;min-width:auto;">Excluir</button>
          </span>
        </div>
      `).join("")
      : `<div class="smallHint">Nenhuma técnica cadastrada.</div>`;

    techniqueListBox.querySelectorAll("[data-edit-technique]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const t = techniqueCatalog.find((item) => String(item.id) === String(btn.dataset.editTechnique));
        if (!t) return;
        editingTechniqueId = t.id;
        if (techniqueName) techniqueName.value = t.name || "";
        if (techniqueVideoUrl) techniqueVideoUrl.value = t.videoUrl || "";
        if (techniqueNotes) techniqueNotes.value = t.notes || "";
        if (techniqueSaveBtn) techniqueSaveBtn.textContent = "Salvar alteração";
        if (techniqueCancelEditBtn) techniqueCancelEditBtn.style.display = "inline-flex";
      });
    });

    techniqueListBox.querySelectorAll("[data-delete-technique]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const ok = await openModal({ title: "Excluir técnica", text: "Excluir esta técnica? Ela será removida dos exercícios onde foi vinculada.", mode: "confirm", okText: "Excluir" });
        if (!ok) return;
        try {
          await apiAdminDeleteTechnique(token, btn.dataset.deleteTechnique);
          resetTechniqueEdit();
          await refreshTechniques();
          toast("ok", "Técnica excluída", "Lista atualizada.");
        } catch (e) {
          toast("error", "Erro", e.message || "Erro ao excluir técnica.");
        }
      });
    });
  }
}

techniqueSaveBtn?.addEventListener("click", async () => {
  const name = (techniqueName?.value || "").trim();
  const videoUrl = (techniqueVideoUrl?.value || "").trim();
  const notes = (techniqueNotes?.value || "").trim();
  if (!name) return toast("error", "Atenção", "Informe o nome da técnica.");
  try {
    if (editingTechniqueId) {
      await apiAdminUpdateTechnique(token, editingTechniqueId, { name, videoUrl, notes });
      toast("ok", "Técnica atualizada", "Lista atualizada.");
    } else {
      await apiAdminCreateTechnique(token, { name, videoUrl, notes });
      toast("ok", "Técnica cadastrada", "Lista atualizada.");
    }
    resetTechniqueEdit();
    await refreshTechniques();
  } catch (e) {
    toast("error", "Erro", e.message || "Erro ao salvar técnica.");
  }
});
techniqueCancelEditBtn?.addEventListener("click", resetTechniqueEdit);
techniqueRefreshBtn?.addEventListener("click", async () => { await refreshTechniques(); toast("ok", "Atualizado", "Técnicas carregadas."); });
