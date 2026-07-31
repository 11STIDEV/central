import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHero } from "@/components/PageHero";
import { SetoresCardsGrid } from "@/components/setores/SetoresCardsGrid";
import { useAuth } from "@/auth/AuthProvider";
import { getSetorHubUrl, getSetoresDoUsuario } from "@/navigation/setoresConfig";

export default function MeuSetorPage() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const papeis = usuario?.papeis ?? [];
  const setores = getSetoresDoUsuario(papeis);

  useEffect(() => {
    if (setores.length === 0) {
      navigate("/", { replace: true });
      return;
    }
    if (setores.length === 1) {
      navigate(getSetorHubUrl(setores[0]), { replace: true });
    }
  }, [setores, navigate]);

  if (setores.length <= 1) {
    return null;
  }

  return (
    <div className="animate-fade-in">
      <PageHero
        title="Meus setores"
        subtitle="Escolha o setor para ver ferramentas, links e equipe."
      />

      <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
        <SetoresCardsGrid setores={setores} columns="two" />
      </div>
    </div>
  );
}
