import { createFileRoute, Link } from "@tanstack/react-router";
import { Star, MapPin, Clock, Instagram, MessageCircle, CalendarCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SalonLogoIcon } from "@/lib/logo-icons";
import { DEFAULT_HOME, HomeImg, useHomeContent } from "@/lib/home-content";
import { BeforeAfterSection, Carousel, GallerySection, LocationSection, PillarsSection, ServicesSection, Stats } from "@/components/HomeSections";

const WHATSAPP = "https://wa.me/5513998071897";
const MAPS = "https://www.google.com/maps/place/Studio+Naylza+Reis/@-24.1618135,-46.7540683,17z";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Studio Naylza Reis — Beleza em Itanhaém" },
      { name: "description", content: "Unhas, cílios, sobrancelhas, rosto e pés em Itanhaém. Mais de 200 clientes atendidas. Agende online no Studio Naylza Reis." },
      { property: "og:title", content: "Studio Naylza Reis — Beleza em Itanhaém" },
      { property: "og:description", content: "Realce sua beleza natural com atendimento acolhedor. Agende seu horário online." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const reviews = [
  { name: "Juliana M.", text: "Minhas unhas nunca duraram tanto! Atendimento caprichoso, ambiente lindo e a Naylza é um amor. Virei cliente fiel." },
  { name: "Patrícia S.", text: "Fiz cílios e sobrancelha e saí outra pessoa. Ficou natural, do jeitinho que eu pedi. Recomendo de olhos fechados." },
  { name: "Carla R.", text: "Peguei o pacote de pés e mãos e valeu cada centavo. Pontualidade, higiene impecável e muito carinho em cada detalhe." },
];

const steps = [
  { t: "Clique em agendar", d: "Toque no botão “Agendar horário agora”." },
  { t: "Escolha o serviço", d: "Selecione o procedimento e a profissional." },
  { t: "Escolha o horário", d: "Veja a agenda livre e garanta seu horário." },
  { t: "Compareça", d: "É só chegar e aproveitar seu momento." },
];

function Landing() {
  const { data } = useHomeContent();
  const c = data ?? DEFAULT_HOME;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-full border border-border bg-white shadow-sm">
              <SalonLogoIcon className="size-4" />
            </span>
            <span className="font-display text-lg font-semibold">Studio Naylza Reis</span>
          </div>
          <Button asChild size="sm"><Link to="/entrar">Entrar / Agendar</Link></Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-soft">
        {c.heroBg && (
          <>
            <HomeImg value={c.heroBg} alt="" eager className="absolute inset-0 -z-20 size-full" />
            <div className="absolute inset-0 -z-10 bg-background/75" />
          </>
        )}
        <div className="mx-auto max-w-4xl px-4 py-24 text-center">
          <p className="text-sm uppercase tracking-widest text-primary">Studio de beleza em Itanhaém</p>
          <h1 className="mt-4 font-display text-5xl leading-tight md:text-6xl">Sua beleza natural, realçada com carinho e técnica.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Unhas, cílios, sobrancelhas, cuidados com o rosto e os pés em um só lugar. Saia daqui se sentindo ainda mais você.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg"><Link to="/entrar">Agendar horário agora</Link></Button>
            <Button asChild size="lg" variant="outline"><a href="#servicos">Ver serviços</a></Button>
          </div>
          <div className="mx-auto mt-12 max-w-md"><Stats c={c} /></div>
        </div>
      </section>

      <Carousel images={c.carousel} />

      {/* Avaliações */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center font-display text-4xl">Quem conhece, recomenda</h2>
        <p className="mt-2 text-center text-muted-foreground">O carinho das nossas clientes é o nosso melhor cartão de visita.</p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {reviews.map((r) => (
            <figure key={r.name} className="surface-card p-6">
              <div className="flex gap-0.5 text-primary">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="size-4 fill-current" />)}</div>
              <blockquote className="mt-3 text-sm">“{r.text}”</blockquote>
              <figcaption className="mt-4 text-sm font-semibold">{r.name}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <ServicesSection c={c} />

      <PillarsSection c={c} />

      <GallerySection c={c} />

      <BeforeAfterSection c={c} />

      <LocationSection c={c} whatsapp={WHATSAPP} />

      {/* CTA */}
      <section className="bg-hero text-primary-foreground">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="font-display text-4xl">Agenda aberta — poucas vagas nesta semana!</h2>
          <p className="mt-3 opacity-90">Os melhores horários acabam rápido. Garanta o seu agora e reserve um momento só para você.</p>
          <Button asChild size="lg" variant="secondary" className="mt-6"><Link to="/entrar">Quero garantir meu horário</Link></Button>
        </div>
      </section>

      {/* Como funciona */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center font-display text-4xl">Como funciona</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.t} className="text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">{i + 1}</div>
              <h3 className="mt-3 font-semibold">{s.t}</h3>
              <p className="text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sobre */}
      <section className="bg-soft">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h2 className="font-display text-4xl">Sobre nós</h2>
          <p className="mt-4 text-muted-foreground">
            O Studio Naylza Reis nasceu da paixão por cuidar de pessoas. Há 3 anos em Itanhaém, unimos técnica, produtos de qualidade e um atendimento acolhedor para que cada cliente saia confiante e feliz com o resultado. Aqui, beleza é feita com dedicação, segurança e muito carinho.
          </p>
          <div className="mx-auto mt-10 max-w-md"><Stats c={c} /></div>
        </div>
      </section>

      {/* Rodapé */}
      <footer className="border-t border-border">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
          <div>
            <h3 className="flex items-center gap-2 font-semibold"><MapPin className="size-4 text-primary" />Endereço</h3>
            <p className="mt-2 text-sm text-muted-foreground">{c.address}</p>
            <a href={MAPS} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">Ver no Google Maps</a>
          </div>
          <div>
            <h3 className="flex items-center gap-2 font-semibold"><Clock className="size-4 text-primary" />Horário</h3>
            <p className="mt-2 text-sm text-muted-foreground">{c.hours}</p>
          </div>
          <div>
            <h3 className="flex items-center gap-2 font-semibold"><CalendarCheck className="size-4 text-primary" />Contato</h3>
            <div className="mt-2 flex flex-col gap-1 text-sm">
              <a href={WHATSAPP} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline"><MessageCircle className="size-4" />(13) 99807-1897</a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline"><Instagram className="size-4" />Instagram</a>
            </div>
          </div>
        </div>
        <p className="flex items-center justify-center gap-1 pb-8 text-xs text-muted-foreground"><CheckCircle2 className="size-3" />Studio Naylza Reis · Itanhaém</p>
      </footer>
    </div>
  );
}
