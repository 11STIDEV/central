import { PageHero } from "@/components/PageHero";
import { AlterdataTester } from "@/components/ti/AlterdataTester";

export default function AlterdataPage() {
  return (
    <div className="animate-fade-in">
      <PageHero
        title="Alterdata ePlugin — Testes de Integração"
        subtitle="Ferramenta de testes de APIs do sistema Alterdata (Departamento Pessoal / eContador)"
      />
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <AlterdataTester />
      </div>
    </div>
  );
}
