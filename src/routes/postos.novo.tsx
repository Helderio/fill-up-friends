import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { submitStation } from "@/lib/stations.functions";
import { getDeviceId } from "@/lib/device-id";

const LocationPicker = lazy(() =>
  import("@/components/LocationPicker").then((m) => ({ default: m.LocationPicker })),
);

const PROVINCES = [
  "Luanda",
  "Benguela",
  "Huíla",
  "Huambo",
  "Cabinda",
  "Cuanza Sul",
  "Cuanza Norte",
  "Malanje",
  "Namibe",
  "Uíge",
  "Bié",
  "Moxico",
  "Lunda Norte",
  "Lunda Sul",
  "Bengo",
  "Cunene",
  "Cuando Cubango",
  "Zaire",
];

const BRANDS = ["Sonangol", "Pumangol", "TotalEnergies", "Outro"];

export const Route = createFileRoute("/postos/novo")({
  head: () => ({ meta: [{ title: "Adicionar posto — Abastece.ao" }] }),
  component: NovoPostoPage,
});

function NovoPostoPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [brand, setBrand] = useState<string>("");
  const [address, setAddress] = useState("");
  const [province, setProvince] = useState("Luanda");
  const [coord, setCoord] = useState<[number, number] | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Indica o nome do posto");
    if (!coord) return toast.error("Marca a localização no mapa");
    setBusy(true);
    try {
      const res = await submitStation({
        data: {
          name: name.trim(),
          brand: brand || null,
          address: address.trim() || null,
          province,
          lat: coord[0],
          lng: coord[1],
          deviceId: getDeviceId(),
        },
      });
      toast.success("Posto submetido! Fica visível após 3 confirmações.");
      navigate({ to: "/postos/$stationId", params: { stationId: res.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur-md px-4 py-3 flex items-center gap-3">
        <Link to="/reportar" className="size-9 grid place-items-center rounded-full hover:bg-muted">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-lg font-bold">Adicionar posto</h1>
      </header>

      <form onSubmit={onSubmit} className="p-4 space-y-5">
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          Postos novos entram como <strong>pendentes</strong> e ficam visíveis para
          todos após confirmação de 3 utilizadores diferentes ou aprovação manual.
        </div>

        <Field label="Nome do posto">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Sonangol Vila Alice"
            className="w-full rounded-xl border border-border bg-card px-3 py-3 text-sm"
            maxLength={80}
          />
        </Field>

        <Field label="Marca">
          <div className="grid grid-cols-2 gap-2">
            {BRANDS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBrand(b)}
                className={
                  "rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition " +
                  (brand === b
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-card text-muted-foreground")
                }
              >
                {b}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Província">
          <select
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-3 py-3 text-sm"
          >
            {PROVINCES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>

        <Field label="Morada (opcional)">
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Rua, bairro, referência"
            className="w-full rounded-xl border border-border bg-card px-3 py-3 text-sm"
            maxLength={160}
          />
        </Field>

        <Field label="Localização no mapa">
          <Suspense
            fallback={
              <div className="h-[280px] grid place-items-center text-xs text-muted-foreground rounded-2xl border border-border">
                A carregar mapa…
              </div>
            }
          >
            <LocationPicker value={coord} onChange={(la, ln) => setCoord([la, ln])} />
          </Suspense>
          {coord && (
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              {coord[0].toFixed(5)}, {coord[1].toFixed(5)}
            </p>
          )}
        </Field>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-50"
        >
          {busy ? "A enviar…" : "SUBMETER POSTO"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
