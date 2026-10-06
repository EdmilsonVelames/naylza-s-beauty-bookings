import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PENDING_HOLD_MIN,
  buildSlots,
  formatBRL,
  dayKey,
  formatDayLabel,
  hoursFor,
  minutesOf,
  overlaps,
  sameDayRange,
  saveDraft,
  toIsoSlot,
  type Busy,
} from "@/lib/salon";
import { useSalonSettings } from "@/hooks/useSalonSettings";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useIsStaff } from "@/components/AppShell";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { staffCreateClient } from "@/lib/clients.functions";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SalonImage } from "@/lib/images";
import { PickCalendar, useDaysOff } from "@/components/ScheduleTools";

export const Route = createFileRoute("/_authenticated/booking")({
  head: () => ({
    meta: [
      { title: "Novo agendamento — Salão Naylza Reis" },
      { name: "description", content: "Escolha serviço, profissional, data e horário." },
      { property: "og:title", content: "Novo agendamento — Salão Naylza Reis" },
      { property: "og:description", content: "Escolha serviço, profissional, data e horário." },
    ],
  }),
  component: Booking,
});

function nextDays(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function Booking() {
  const navigate = useNavigate();
  const days = useMemo(() => nextDays(1), []);
  const [serviceId, setServiceId] = useState<string>("");
  const [professionalId, setProfessionalId] = useState<string>("");
  const [day, setDay] = useState<Date>(days[0]!);
  const [time, setTime] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const { isStaff, isAdmin, myPro } = useIsStaff();
  const queryClient = useQueryClient();
  const [clientMode, setClientMode] = useState<"registered" | "guest">("registered");
  const [clientId, setClientId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const createClient = useServerFn(staffCreateClient);
  const [saving, setSaving] = useState(false);
  const [formatName, setFormatName] = useState("");
  const [formatOpen, setFormatOpen] = useState(false);

  const { data: formats } = useQuery({
    queryKey: ["service-formats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_formats")
        .select("*")
        .order("position")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
  const serviceFormats = (formats ?? []).filter((f) => f.service_id === serviceId);

  const { data: categories } = useQuery({
    queryKey: ["service-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_categories")
        .select("*")
        .order("position")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["staff-clients-list"],
    enabled: isStaff,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: services } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*, service_categories(hidden)")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data.filter((s) => !s.service_categories?.hidden);
    },
  });

  const { data: professionals } = useQuery({
    queryKey: ["professionals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professionals")
        .select("*")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: proServices } = useQuery({
    queryKey: ["professional-services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("professional_services").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: hours } = useSalonSettings();
  const slotMinutes = hours?.slot_minutes ?? 30;

  const { data: busy } = useQuery({
    queryKey: ["slots", professionalId, day.toDateString()],
    enabled: Boolean(professionalId),
    refetchInterval: 30_000,
    queryFn: async (): Promise<Busy[]> => {
      const { start, end } = sameDayRange(day);
      const [appts, blocks] = await Promise.all([
        supabase
          .from("appointments")
          .select("starts_at, status, created_at, services(duration_min)")
          .eq("professional_id", professionalId)
          .neq("status", "cancelled")
          .gte("starts_at", start)
          .lte("starts_at", end),
        supabase
          .from("blocked_slots")
          .select("starts_at")
          .eq("professional_id", professionalId)
          .gte("starts_at", start)
          .lte("starts_at", end),
      ]);
      const now = Date.now();
      const fromAppts = (appts.data ?? [])
        .filter((a) => {
          if (a.status !== "pending") return true;
          // reserva não paga segura o horário por alguns minutos apenas
          return now - new Date(a.created_at).getTime() < PENDING_HOLD_MIN * 60_000;
        })
        .map((a) => {
          const s = new Date(a.starts_at).getTime();
          const dur = a.services?.duration_min ?? slotMinutes;
          return { start: s, end: s + dur * 60_000 };
        });
      const fromBlocks = (blocks.data ?? []).map((b) => {
        const s = new Date(b.starts_at).getTime();
        return { start: s, end: s + slotMinutes * 60_000 };
      });
      return [...fromAppts, ...fromBlocks];
    },
  });

  const dayHours = useMemo(
    () =>
      hoursFor(
        professionals?.find((p) => p.id === professionalId),
        {
          open_time: hours?.open_time ?? "09:00",
          close_time: hours?.close_time ?? "19:00",
          slot_minutes: slotMinutes,
          break_start: hours?.break_start ?? "",
          break_end: hours?.break_end ?? "",
        },
      ),
    [hours, slotMinutes, professionals, professionalId],
  );
  const slots = useMemo(
    () =>
      buildSlots(dayHours),
    [dayHours],
  );
  const closeMinutes = minutesOf(dayHours.close_time);
  const { data: daysOff } = useDaysOff(professionalId);
  const isDayOff = daysOff?.has(dayKey(day)) ?? false;

  const service = services?.find((s) => s.id === serviceId);
  const professional = professionals?.find((p) => p.id === professionalId);
  const ready = Boolean(service && professional && time && (serviceFormats.length === 0 || formatName));

  const { data: myPhone, isLoading: loadingPhone } = useQuery({
    queryKey: ["my-phone"],
    enabled: !isStaff,
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return "";
      const { data } = await supabase.from("profiles").select("phone").eq("id", u.user.id).maybeSingle();
      return data?.phone ?? "";
    },
  });
  const needsPhone = !isStaff && !loadingPhone && (myPhone ?? "").replace(/\D/g, "").length < 10;

  const clientReady =
    !needsPhone &&
    (!isStaff || (clientMode === "registered" ? Boolean(clientId) : guestName.trim().length > 1);

  async function createForClient() {
    if (!service || !professional || !time) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setSaving(true);
    let targetId = clientId;
    if (clientMode === "guest") {
      try {
        const r = await createClient({
          data: { name: guestName.trim(), phone: guestPhone.trim(), email: guestEmail.trim() },
        });
        targetId = r.userId;
      } catch (e) {
        setSaving(false);
        toast.error(e instanceof Error ? e.message : "Não foi possível criar o cadastro.");
        return;
      }
    }
    const { error } = await supabase.from("appointments").insert({
      user_id: targetId,
      guest_name: "",
      guest_phone: "",
      format_name: formatName,
      created_by: u.user.id,
      service_id: service.id,
      professional_id: professional.id,
      starts_at: toIsoSlot(day, time),
      total_cents: service.price_cents,
      paid_cents: 0,
      payment_method: "salao",
      status: "confirmed",
    });
    setSaving(false);
    if (error) {
      toast.error(
        error.code === "23505"
          ? "Este horário acabou de ser reservado. Escolha outro."
          : "Não foi possível criar o agendamento.",
      );
      return;
    }
    toast.success("Agendamento criado para a cliente.");
    setTime("");
    setGuestName("");
    setGuestPhone("");
    setGuestEmail("");
    setClientId("");
    setClientMode("registered");
    queryClient.invalidateQueries({ queryKey: ["staff-clients-list"] });
    queryClient.invalidateQueries({ queryKey: ["slots"] });
  }

  function continueToCheckout() {
    if (isStaff) {
      void createForClient();
      return;
    }
    if (!service || !professional || !time) return;
    saveDraft({
      serviceId: service.id,
      serviceName: service.name,
      priceCents: service.price_cents,
      professionalId: professional.id,
      professionalName: professional.name,
      startsAt: toIsoSlot(day, time),
      formatName,
    });
    navigate({ to: "/checkout" });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl">Novo agendamento</h1>
        <p className="mt-1 text-muted-foreground">
          Reserve seu horário confirmando 50% do valor.
        </p>
      </div>

      {needsPhone ? (
        <section className="surface-card space-y-3 border-destructive/40 p-4">
          <h2 className="font-display text-2xl">Falta seu telefone</h2>
          <p className="text-sm text-muted-foreground">
            Para agendar, cadastre seu celular com DDD no Perfil. Usamos para lembrar você do horário.
          </p>
          <Button onClick={() => navigate({ to: "/profile" })}>Ir para o Perfil</Button>
        </section>
      ) : null}

      {isStaff ? (
        <section className="surface-card space-y-3 p-4">
          <h2 className="font-display text-2xl">Cliente</h2>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={clientMode === "registered" ? "default" : "outline"}
              onClick={() => setClientMode("registered")}
            >
              Cliente cadastrada
            </Button>
            <Button
              size="sm"
              variant={clientMode === "guest" ? "default" : "outline"}
              onClick={() => setClientMode("guest")}
            >
              Sem cadastro
            </Button>
          </div>
          {clientMode === "registered" ? (
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="w-full sm:w-96">
                <SelectValue placeholder="Escolha a cliente" />
              </SelectTrigger>
              <SelectContent>
                {(clients ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name || c.email} {c.phone ? `— ${c.phone}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <Input placeholder="Nome da cliente" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
              <Input placeholder="Telefone" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} />
              <Input type="email" placeholder="E-mail (opcional)" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} className="sm:col-span-2" />
              <p className="text-xs text-muted-foreground sm:col-span-2">O cadastro da cliente é criado automaticamente.</p>
            </div>
          )}
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-display text-2xl">1. Serviço</h2>
        {!categoryId ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ...(categories ?? []).filter((c) => !c.hidden),
              ...((services ?? []).some((s) => !s.category_id)
                ? [{ id: "none", name: "Outros" }]
                : []),
            ].map((c) => {
              const count = (services ?? []).filter((s) =>
                c.id === "none" ? !s.category_id : s.category_id === c.id,
              ).length;
              if (!count) return null;
              return (
                <button
                  key={c.id}
                  onClick={() => setCategoryId(c.id)}
                  className="surface-card overflow-hidden text-left transition-all hover:shadow-[var(--shadow-lift)]"
                >
                  {"image_url" in c && c.image_url ? (
                    <SalonImage path={c.image_url} alt={c.name} className="aspect-[4/3] w-full" />
                  ) : null}
                  <div className="p-5">
                    <p className="font-display text-2xl">{c.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {count} {count === 1 ? "serviço" : "serviços"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCategoryId(null);
                setServiceId("");
                setTime("");
              }}
            >
              ← Categorias
            </Button>
            <div className="grid gap-3 sm:grid-cols-2">
              {(services ?? [])
                .filter((s) => (categoryId === "none" ? !s.category_id : s.category_id === categoryId))
                .map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setServiceId(s.id);
                      setTime("");
                      setFormatName("");
                      if ((formats ?? []).some((f) => f.service_id === s.id)) setFormatOpen(true);
                      const links = (proServices ?? []).filter((l) => l.professional_id === professionalId);
                      if (links.length && !links.some((l) => l.service_id === s.id)) setProfessionalId("");
                    }}
                    className={cn(
                      "surface-card overflow-hidden text-left transition-all hover:shadow-[var(--shadow-lift)]",
                      serviceId === s.id && "ring-2 ring-primary",
                    )}
                  >
                    {s.image_url ? (
                      <SalonImage path={s.image_url} alt={s.name} className="aspect-[4/3] w-full" />
                    ) : null}
                    <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-sm text-muted-foreground">{s.description}</p>
                      </div>
                      <span className="whitespace-nowrap font-display text-lg">
                        {formatBRL(s.price_cents)}
                      </span>
                    </div>
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="size-3.5" /> {s.duration_min} min
                    </p>
                    </div>
                  </button>
                ))}
            </div>
            {serviceFormats.length > 0 ? (
              <div className="surface-card flex flex-wrap items-center justify-between gap-3 p-4">
                <p className="text-sm">
                  Formato: <strong>{formatName || "não escolhido"}</strong>
                </p>
                <Button size="sm" variant="outline" onClick={() => setFormatOpen(true)}>
                  {formatName ? "Trocar formato" : "Escolher formato"}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </section>

      <Dialog open={formatOpen} onOpenChange={setFormatOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Escolha o formato</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {serviceFormats.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setFormatName(f.name);
                  setFormatOpen(false);
                }}
                className={cn(
                  "surface-card overflow-hidden text-left transition-all hover:shadow-[var(--shadow-lift)]",
                  formatName === f.name && "ring-2 ring-primary",
                )}
              >
                <SalonImage path={f.image_url} alt={f.name} className="aspect-square w-full" />
                <p className="p-3 font-medium">{f.name}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">2. Profissional</h2>
        <Select value={professionalId} onValueChange={setProfessionalId}>
          <SelectTrigger className="w-full sm:w-80">
            <SelectValue placeholder="Escolha a profissional" />
          </SelectTrigger>
          <SelectContent>
            {(professionals ?? [])
              .filter((p) => isAdmin || !myPro || p.id === myPro.id)
              .filter((p) => {
                if (!serviceId) return true;
                const mine = (proServices ?? []).filter((l) => l.professional_id === p.id);
                return mine.length === 0 || mine.some((l) => l.service_id === serviceId);
              })
              .map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} — {p.specialty}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">3. Data</h2>
        <PickCalendar
          professionalId={professionalId}
          day={day}
          onSelect={(d) => {
            setDay(d);
            setTime("");
          }}
        />
        <p className="font-display text-xl capitalize">{formatDayLabel(day)}</p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">4. Horário</h2>
        {!professionalId || !service ? (
          <p className="text-sm text-muted-foreground">
            Escolha o serviço e a profissional para ver os horários livres.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {slots.map((h) => {
                const ts = new Date(toIsoSlot(day, h)).getTime();
                const duration = service.duration_min;
                const fitsInDay = (professional?.allow_past_closing ?? hours?.allow_past_closing ?? true) || minutesOf(h) + duration <= closeMinutes;
                const taken = overlaps(ts, duration, busy ?? []);
                const disabled = isDayOff || taken || ts < Date.now() || !fitsInDay;
                return (
                  <button
                    key={h}
                    disabled={disabled}
                    onClick={() => setTime(h)}
                    className={cn(
                      "rounded-lg border border-border bg-card py-2.5 text-sm transition-colors",
                      disabled && "cursor-not-allowed opacity-40 line-through",
                      time === h && "bg-primary text-primary-foreground border-transparent",
                    )}
                  >
                    {h}
                  </button>
                );
              })}
            </div>
            {isDayOff ? (
              <p className="text-sm font-medium text-destructive">
                {professional?.name} está de folga neste dia. Escolha outra data.
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Só aparecem livres os horários com {service.duration_min} min completos para{" "}
              {service.name}.
            </p>
          </>
        )}
      </section>

      <div className="surface-card sticky bottom-20 flex flex-wrap items-center justify-between gap-4 p-4 md:bottom-4">
        <div>
          <p className="text-sm text-muted-foreground">Sinal de 50%</p>
          <p className="font-display text-2xl">
            {service ? formatBRL(Math.round(service.price_cents / 2)) : "—"}
          </p>
        </div>
        <Button disabled={!ready || !clientReady || saving} onClick={continueToCheckout}>
          {isStaff ? (saving ? "Salvando…" : "Criar agendamento") : "Continuar para pagamento"}
        </Button>
      </div>
    </div>
  );
}
