import Link from "next/link";
import { BRAND } from "@/lib/brand";

const STEPS = [
  {
    title: "Add your projects",
    body: "Enter your projects, configurations and starting prices once. The agent only quotes what you have entered, so it never invents an offer.",
  },
  {
    title: "Import your leads",
    body: "Add enquiries from your portals and ad forms. Each lead is called with the context you already hold about them.",
  },
  {
    title: "The agent calls in Hinglish",
    body: "It greets, confirms the enquiry, asks budget, BHK, timeline and purpose, and offers two site-visit slots.",
  },
  {
    title: "Your team gets qualified leads",
    body: "Transcript, summary, recording and the extracted requirements land in your dashboard. Your executives call only the interested ones.",
  },
];

const FEATURES = [
  { title: "Natural Hinglish", body: "Speaks the way a polite Indian sales executive does, and switches to Hindi or English when the caller does." },
  { title: "Never invents facts", body: "Answers come from your project data. Anything else becomes a callback from your manager." },
  { title: "Respects do-not-call", body: "Callers who say stop are marked and blocked from further calls automatically." },
  { title: "Every call recorded", body: "Listen to the recording, read the transcript and see the AI summary for each lead." },
  { title: "Site visits, not just chats", body: "The goal of each call is a confirmed visit slot or a scheduled advisor callback." },
  { title: "Your own workspace", body: "Each company gets a private workspace. Your leads and calls are never visible to anyone else." },
];

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-border/50 bg-surface/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="font-serif text-2xl tracking-tighter text-on-surface">
            {BRAND.name}
          </Link>
          <nav className="flex items-center gap-3 sm:gap-6 text-sm font-medium">
            <a href="#how-it-works" className="hidden sm:block hover:text-primary transition-colors">How it works</a>
            <a href="#features" className="hidden sm:block hover:text-primary transition-colors">Features</a>
            <Link href="/login" className="hover:text-primary transition-colors">Log in</Link>
            <Link href="/signup" className="bg-primary text-white px-5 py-2.5 rounded-full font-bold shadow-sm hover:opacity-90 transition-opacity">
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
          <p className="inline-block bg-tertiary text-on-surface-muted text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full mb-6">
            AI calling for Indian real estate
          </p>
          <h1 className="text-4xl sm:text-6xl font-serif tracking-tighter text-on-surface max-w-4xl mx-auto leading-[1.1]">
            Call every lead within minutes. <span className="text-primary">Book more site visits.</span>
          </h1>
          <p className="mt-6 text-lg text-on-surface-muted max-w-2xl mx-auto leading-relaxed">
            {BRAND.name} calls your enquiry leads in Hinglish, qualifies them on budget, configuration and timeline, and
            books site visits, so your sales team talks only to buyers who are ready.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="bg-primary text-white px-8 py-3.5 rounded-full font-bold shadow-sm hover:opacity-90 transition-opacity">
              Create your workspace
            </Link>
            <a href="#how-it-works" className="border border-border/50 bg-surface px-8 py-3.5 rounded-full font-semibold hover:bg-tertiary transition-colors">
              See how it works
            </a>
          </div>
        </section>

        <section id="how-it-works" className="bg-surface border-y border-border/50">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <h2 className="text-3xl sm:text-4xl font-serif tracking-tight text-center mb-12">How it works</h2>
            <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {STEPS.map((s, i) => (
                <li key={s.title} className="bg-neutral border border-border/50 rounded-2xl p-6">
                  <span className="text-primary font-serif text-3xl">{i + 1}</span>
                  <h3 className="font-semibold text-lg mt-3 mb-2">{s.title}</h3>
                  <p className="text-sm text-on-surface-muted leading-relaxed">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="features" className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="text-3xl sm:text-4xl font-serif tracking-tight text-center mb-12">Built for sales teams, not demos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-surface border border-border/50 rounded-2xl p-6 shadow-sm">
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-on-surface-muted leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-6 pb-24 text-center">
          <div className="bg-primary text-white rounded-3xl px-8 py-14 shadow-sm">
            <h2 className="text-3xl sm:text-4xl font-serif tracking-tight">Start with a pilot</h2>
            <p className="mt-4 text-white/90 max-w-xl mx-auto leading-relaxed">
              Tell us about your project and lead volume. We set up the agent for your project and run a pilot on your own leads.
            </p>
            <Link href="/signup" className="mt-8 inline-block bg-white text-primary px-8 py-3.5 rounded-full font-bold hover:opacity-90 transition-opacity">
              Create your workspace
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/50 bg-surface">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row justify-between gap-2 text-sm text-on-surface-muted">
          <span>&copy; {new Date().getFullYear()} {BRAND.name}</span>
          <a href={`mailto:${BRAND.supportEmail}`} className="hover:text-primary transition-colors">{BRAND.supportEmail}</a>
        </div>
      </footer>
    </div>
  );
}
