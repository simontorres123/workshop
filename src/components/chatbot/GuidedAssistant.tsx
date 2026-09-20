"use client";

import * as React from "react";
import { Alert, Box, Button, ButtonBase, Chip, CircularProgress, DialogContent, Divider, IconButton, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { ArrowBack, ArrowForward, HomeOutlined, HelpOutline, Search, BuildOutlined, Refresh, Tune } from "@mui/icons-material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { MobileDatePicker } from "@mui/x-date-pickers/MobileDatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { esES } from "@mui/x-date-pickers/locales";
import { format, isValid, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useAuthStore } from "@/store/auth.store";
import { GuidedMenu, GuidedDetail, GuidedList, repairStatusLabels } from "@/lib/chatbot/guided";
import { RepairStatus } from "@/types/repair";

type Screen = "home" | "repairs" | "folio" | "results" | "detail" | "help" | "guide";
type Filters = { status: string; folio: string; branchId: string; from: string; to: string };
const emptyFilters: Filters = { status: "", folio: "", branchId: "", from: "", to: "" };
const titles: Record<Screen, string> = { home: "¿En qué te ayudo hoy?", repairs: "Consultar reparaciones", folio: "Buscar por folio", results: "Órdenes de reparación", detail: "Detalle de la orden", help: "Cómo usar el sistema", guide: "Guía paso a paso" };
const touchButton = { minHeight: 44, height: "auto", whiteSpace: "normal", lineHeight: 1.4, py: 1, textTransform: "none" } as const;
const statusLabel = (value: string) => repairStatusLabels[value as RepairStatus] || "Estado no disponible";
const dateLabel = (value: string) => { const date = new Date(value); return isValid(date) ? date.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" }) : "Sin fecha"; };
const money = (amount: number) => amount.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

function Option({ title, description, icon, onClick }: { title: string; description?: string; icon?: React.ReactNode; onClick: () => void }) {
  return <ButtonBase onClick={onClick} sx={{ width: "100%", p: 2, border: 1, borderColor: "divider", borderRadius: 2, display: "flex", gap: 1.5, textAlign: "left", color: "text.primary", alignItems: "center", minHeight: 72, "&:hover": { bgcolor: "action.hover" }, "&.Mui-focusVisible": { outline: "2px solid", outlineColor: "primary.main" } }}>
    {icon && <Box sx={{ display: "flex", flexShrink: 0 }}>{icon}</Box>}
    <Box sx={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}><Typography component="span" sx={{ display: "block", fontWeight: 700, lineHeight: 1.5 }}>{title}</Typography>{description && <Typography component="span" variant="body2" color="text.secondary" sx={{ display: "block", mt: 0.5, lineHeight: 1.5 }}>{description}</Typography>}</Box>
    <ArrowForward sx={{ fontSize: 20, flexShrink: 0, color: "text.secondary" }} />
  </ButtonBase>;
}

export default function GuidedAssistant() {
  const activeBranch = useAuthStore(state => state.activeBranchId);
  const [screen, setScreen] = React.useState<Screen>("home");
  const [menu, setMenu] = React.useState<GuidedMenu | null>(null);
  const [filters, setFilters] = React.useState<Filters>({ ...emptyFilters, branchId: activeBranch || "" });
  const [draft, setDraft] = React.useState(filters);
  const [page, setPage] = React.useState(0);
  const [list, setList] = React.useState<GuidedList | null>(null);
  const [detail, setDetail] = React.useState<GuidedDetail | null>(null);
  const [detailId, setDetailId] = React.useState("");
  const [guideId, setGuideId] = React.useState("");
  const [showFilters, setShowFilters] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [validation, setValidation] = React.useState("");
  const [revision, setRevision] = React.useState(0);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const guide = menu?.guides.find(item => item.id === guideId);

  React.useEffect(() => {
    let disposed = false;
    let timedOut = false;
    const controller = new AbortController();
    setError(""); setValidation("");
    const shouldFetch = !menu || screen === "results" || screen === "detail";
    if (!shouldFetch) { setLoading(false); return; }
    setLoading(true);
    if (screen === "results") setList(null);
    if (screen === "detail") setDetail(null);
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 20000);
    async function load() {
      try {
        const body = !menu ? undefined : screen === "detail" ? { action: "detail", id: detailId } : {
          action: "list", status: filters.status || undefined, folio: filters.folio || undefined,
          branchId: filters.branchId || undefined, from: filters.from || undefined, to: filters.to || undefined,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, page,
        };
        const response = await fetch("/api/assistant", { method: body ? "POST" : "GET", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined, signal: controller.signal, cache: "no-store" });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload) throw new Error(payload?.error || "No pudimos consultar la información.");
        if (disposed) return;
        if (!menu) setMenu(payload as GuidedMenu);
        else if (screen === "results") setList(payload as GuidedList);
        else setDetail(payload as GuidedDetail);
      } catch (e) {
        if (!disposed) setError(timedOut ? "La consulta tardó demasiado. Intenta nuevamente." : e instanceof Error ? e.message : "No pudimos consultar la información.");
      } finally { clearTimeout(timer); if (!disposed) setLoading(false); }
    }
    void load();
    return () => { disposed = true; clearTimeout(timer); controller.abort(); };
  }, [screen, filters, page, detailId, revision, menu]);

  React.useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
    headingRef.current?.focus();
  }, [screen, page]);

  function navigate(next: Screen) { setValidation(""); setScreen(next); }
  function search(next: Filters) {
    if (next.from && next.to && next.from > next.to) { setValidation("Desde no puede ser posterior a Hasta."); return; }
    if (screen === "folio" && !next.folio.trim()) { setValidation("Escribe el folio de la orden."); return; }
    if (next.folio.trim() && !/^(REP-)?[A-Z0-9-]{3,20}$/i.test(next.folio.trim())) { setValidation("Escribe un folio válido, por ejemplo REP-1234."); return; }
    setValidation(""); setFilters({ ...next }); setDraft({ ...next }); setPage(0); setScreen("results");
  }
  function back() {
    if (screen === "detail") return navigate("results");
    if (screen === "guide") return navigate("help");
    if (screen === "results" || screen === "folio") return navigate("repairs");
    navigate("home");
  }
  function pickStatus(status: string) { setShowFilters(false); search({ ...emptyFilters, branchId: filters.branchId, status }); }

  return <>
    <DialogContent ref={contentRef} sx={{ p: { xs: 2, sm: 2.5 }, flex: 1, minHeight: 0, overflowX: "hidden", overflowY: "auto" }}>
      <Stack gap={2}>
        <Box><Typography ref={headingRef} tabIndex={-1} component="h3" variant="h6" sx={{ fontWeight: 700, outline: "none" }}>{screen === "guide" ? guide?.title : titles[screen]}</Typography>{menu && <Typography variant="caption" color="text.secondary">{menu.scope} · Solo información permitida para tu usuario</Typography>}</Box>
        {error && <Alert severity="error" sx={{ "& .MuiAlert-message": { minWidth: 0, overflowWrap: "anywhere" } }}>{error}<Button onClick={() => setRevision(value => value + 1)} sx={{ ...touchButton, display: "flex", mt: 1 }} startIcon={<Refresh />}>Reintentar</Button></Alert>}
        {validation && <Alert severity="warning">{validation}</Alert>}
        {loading && <Stack role="status" aria-live="polite" direction="row" alignItems="center" gap={1.5} sx={{ py: 2 }}><CircularProgress size={22} /><Typography variant="body2">Consultando información…</Typography></Stack>}
        {menu && screen === "home" && <>
          <Typography variant="body2" color="text.secondary">Elige una opción para empezar. No necesitas escribir una pregunta.</Typography>
          <Option title="Consultar reparaciones" description="Busca un folio, revisa estados o consulta el detalle de una orden." icon={<BuildOutlined />} onClick={() => navigate("repairs")} />
          <Option title="Cómo usar el sistema" description="Guías para registrar órdenes, agregar refacciones y otros procesos." icon={<HelpOutline />} onClick={() => navigate("help")} />
        </>}
        {menu && screen === "repairs" && <>
          <Option title="Buscar por folio" description="Escribe el folio completo o solo su número." icon={<Search />} onClick={() => { setDraft({ ...emptyFilters, branchId: filters.branchId }); navigate("folio"); }} />
          <Typography variant="subtitle2">O elige un estado</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.25 }}>
            {Object.entries(repairStatusLabels).map(([status, label]) => <Option key={status} title={label} onClick={() => pickStatus(status)} />)}
          </Box>
          <Button variant="outlined" onClick={() => pickStatus("")} sx={touchButton}>Ver todas las reparaciones</Button>
        </>}
        {menu && screen === "folio" && <Box component="form" onSubmit={event => { event.preventDefault(); search(draft); }}>
          <Stack gap={2}><TextField label="Folio de reparación" placeholder="REP-1234" value={draft.folio} onChange={e => setDraft({ ...draft, folio: e.target.value })} fullWidth autoFocus inputProps={{ maxLength: 25 }} helperText="También puedes escribir solo el número, por ejemplo 1234." /><Button type="submit" variant="contained" disabled={!draft.folio.trim() || loading} startIcon={<Search />} sx={touchButton}>Buscar orden</Button></Stack>
        </Box>}
        {menu && screen === "results" && <>
          <Stack direction="row" gap={1} useFlexGap flexWrap="wrap" alignItems="center">
            <Chip label={filters.folio ? `Folio: ${filters.folio}` : filters.status ? statusLabel(filters.status) : "Todos los estados"} sx={{ height: "auto", "& .MuiChip-label": { whiteSpace: "normal", py: 0.75 } }} />
            <Button onClick={() => setShowFilters(value => !value)} startIcon={<Tune />} aria-expanded={showFilters} sx={touchButton}>{showFilters ? "Ocultar filtros" : "Filtrar"}</Button>
            <IconButton disabled={loading} onClick={() => setRevision(value => value + 1)} aria-label="Actualizar resultados"><Refresh /></IconButton>
          </Stack>
          {(filters.from || filters.to || filters.branchId) && <Typography variant="caption" color="text.secondary">{filters.branchId ? menu.branches.find(branch => branch.id === filters.branchId)?.name : "Todas las sucursales permitidas"} · {filters.from || "Sin fecha inicial"} a {filters.to || "Sin fecha final"}</Typography>}
          {showFilters && <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Box component="form" onSubmit={event => { event.preventDefault(); search(draft); }}>
              <Stack gap={2}>
                <TextField select size="small" label="Estado" value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value })} fullWidth><MenuItem value="">Todos los estados</MenuItem>{Object.entries(repairStatusLabels).map(([status, label]) => <MenuItem key={status} value={status}>{label}</MenuItem>)}</TextField>
                <TextField size="small" label="Folio (opcional)" value={draft.folio} onChange={e => setDraft({ ...draft, folio: e.target.value })} fullWidth inputProps={{ maxLength: 25 }} />
                <TextField select size="small" label="Sucursal" value={draft.branchId} onChange={e => setDraft({ ...draft, branchId: e.target.value })} fullWidth><MenuItem value="">Todas las sucursales permitidas</MenuItem>{menu.branches.map(branch => <MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>)}</TextField>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es} localeText={esES.components.MuiLocalizationProvider.defaultProps.localeText}>
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                    {(["from", "to"] as const).map(key => <MobileDatePicker key={key} label={key === "from" ? "Desde" : "Hasta"} value={draft[key] ? parseISO(draft[key]) : null} format="dd/MM/yyyy" onChange={value => { if (!value || isValid(value)) setDraft(current => ({ ...current, [key]: value ? format(value, "yyyy-MM-dd") : "" })); }} slotProps={{ textField: { size: "small", fullWidth: true }, actionBar: { actions: ["clear", "cancel", "accept"] } }} />)}
                  </Box>
                </LocalizationProvider>
                <Typography variant="caption" color="text.secondary">Fecha de ingreso · horario de tu dispositivo</Typography>
                <Stack direction="row" gap={1} useFlexGap flexWrap="wrap"><Button type="submit" disabled={loading} variant="contained" sx={touchButton}>Aplicar filtros</Button><Button disabled={loading} onClick={() => search(emptyFilters)} sx={touchButton}>Limpiar filtros</Button></Stack>
              </Stack>
            </Box>
          </Paper>}
          {!loading && !error && list && <Box aria-live="polite">
            <Typography sx={{ fontWeight: 700, mb: 1.5 }}>{list.total} {list.total === 1 ? "orden encontrada" : "órdenes encontradas"}</Typography>
            {!list.orders.length ? <Alert severity="info">No encontramos órdenes con estos filtros. Puedes cambiar el estado, el folio o el periodo.</Alert> : <Stack gap={1.5}>{list.orders.map(order => <Paper key={order.id} variant="outlined" sx={{ p: 2, borderRadius: 2, overflowWrap: "anywhere" }}>
              <Stack gap={1}><Typography sx={{ fontWeight: 800 }}>{order.folio}</Typography><Typography variant="body2">{order.device}</Typography>{order.customer !== undefined && <Typography variant="body2" color="text.secondary">Cliente: {order.customer || "Sin nombre"}</Typography>}<Typography variant="caption" color="text.secondary">{order.branch || "Sin sucursal"} · {dateLabel(order.createdAt)}</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>{statusLabel(order.status)}</Typography><Button variant="outlined" onClick={() => { setDetailId(order.id); navigate("detail"); }} aria-label={`Ver detalle de ${order.folio}`} endIcon={<ArrowForward />} sx={{ ...touchButton, alignSelf: { xs: "stretch", sm: "flex-start" } }}>Ver detalle</Button></Stack>
            </Paper>)}</Stack>}
            {list.total > list.pageSize && <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} sx={{ mt: 2 }}><Button disabled={list.page === 0} onClick={() => setPage(value => value - 1)} sx={touchButton}>Anterior</Button><Typography variant="caption">{list.page + 1} de {Math.ceil(list.total / list.pageSize)}</Typography><Button disabled={(list.page + 1) * list.pageSize >= list.total} onClick={() => setPage(value => value + 1)} sx={touchButton}>Siguiente</Button></Stack>}
          </Box>}
        </>}
        {!loading && !error && screen === "detail" && detail && <>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}><Stack gap={1}>
            <Typography variant="h6" component="h4" sx={{ fontWeight: 800 }}>{detail.folio}</Typography><Typography sx={{ overflowWrap: "anywhere" }}>{detail.device}</Typography><Chip label={statusLabel(detail.status)} sx={{ alignSelf: "flex-start", height: "auto", "& .MuiChip-label": { whiteSpace: "normal", py: 0.75 } }} />
            {detail.customer !== undefined && <Typography variant="body2">Cliente: {detail.customer}</Typography>}<Typography variant="body2">Sucursal: {detail.branch || "Sin sucursal"}</Typography><Typography variant="body2">Ingreso: {dateLabel(detail.createdAt)}</Typography>
            <Divider /><Typography variant="subtitle2">Problema reportado</Typography><Typography variant="body2" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{detail.problem || "Sin descripción"}</Typography><Typography variant="subtitle2">Diagnóstico confirmado</Typography><Typography variant="body2" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{detail.diagnosis || "Aún no registrado"}</Typography>
            <Divider /><Typography variant="body2">Garantía configurada: {detail.warrantyMonths ?? 0} meses</Typography><Typography variant="body2">Almacenamiento configurado: {detail.storageMonths ?? 0} meses</Typography>
          </Stack></Paper>
          {detail.payment !== undefined && <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}><Typography variant="subtitle2" sx={{ mb: 1 }}>Pago registrado</Typography>{detail.payment ? <Stack gap={0.5}><Typography sx={{ fontWeight: 700 }}>{money(detail.payment.amount)}</Typography><Typography variant="body2">{({ cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia", mixed: "Mixto" } as Record<string, string>)[detail.payment.method] || "Otro método"}</Typography><Typography variant="body2">{dateLabel(detail.payment.date)}</Typography></Stack> : <Typography variant="body2">Sin venta pagada registrada para esta orden.</Typography>}</Paper>}
          <Box><Typography variant="subtitle2" sx={{ mb: 1 }}>Movimientos recientes</Typography>{detail.history.length ? <Stack component="ol" gap={1.5} sx={{ m: 0, pl: 2.5 }}>{detail.history.map((item, index) => <Box component="li" key={index}><Typography variant="body2">{statusLabel(item.status)}</Typography><Typography variant="caption" color="text.secondary">{dateLabel(item.date)}</Typography></Box>)}</Stack> : <Typography variant="body2" color="text.secondary">Sin movimientos registrados.</Typography>}</Box>
        </>}
        {menu && screen === "help" && <Stack gap={1.25}>{menu.guides.map(item => <Option key={item.id} title={item.title} description={item.description} onClick={() => { setGuideId(item.id); navigate("guide"); }} />)}</Stack>}
        {screen === "guide" && guide && <Stack component="ol" gap={2} sx={{ m: 0, pl: 3 }}>{guide.steps.map((step, index) => <Box component="li" key={index} sx={{ pl: 0.5 }}><Typography variant="body1" sx={{ lineHeight: 1.65 }}>{step}</Typography></Box>)}</Stack>}
      </Stack>
    </DialogContent>
    <Divider />
    <Stack component="nav" aria-label="Navegación del asistente" direction="row" justifyContent="space-between" gap={1} sx={{ p: 2, pb: "max(16px, env(safe-area-inset-bottom))", flexShrink: 0, bgcolor: "background.paper" }}>
      <Button disabled={screen === "home"} onClick={back} startIcon={<ArrowBack />} sx={touchButton}>Atrás</Button>
      <Button disabled={screen === "home"} onClick={() => navigate("home")} startIcon={<HomeOutlined />} sx={touchButton}>Inicio</Button>
    </Stack>
  </>;
}

