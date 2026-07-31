import { PageHero } from "@/components/PageHero";
import { SetoresCardsGrid } from "@/components/setores/SetoresCardsGrid";
import { useAuth } from "@/auth/AuthProvider";
import { getSetoresAcessiveis } from "@/navigation/setoresConfig";

export default function SetoresCatalogPage() {
  const { usuario } = useAuth();
  const papeis = usuario?.papeis ?? [];
  const setores = getSetoresAcessiveis(papeis, usuario?.email);

  return (
    <div className="animate-fade-in">
      <PageHero
        title="Todos os setores"
        subtitle="Escolha um setor para ver ferramentas, links da equipe e visão geral."
      />

      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <SetoresCardsGrid setores={setores} />
      </div>
    </div>
  );
}
