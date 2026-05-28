import { Link } from "react-router-dom";
import { lostFoundPublicSiteUrl } from "@/achadosperdidos/publicHost";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AchadosPerdidosHubPage() {
  return (
    <div className="mx-auto w-full max-w-5xl p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Achados e Perdidos</h1>
        <p className="text-sm text-muted-foreground">
          Escolha entre consultar os itens disponíveis publicamente ou gerenciar os cadastros e pendências.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Consulta pública</CardTitle>
            <CardDescription>Listagem aberta para qualquer pessoa identificar itens encontrados.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href={lostFoundPublicSiteUrl()} target="_blank" rel="noreferrer">
                Ver itens encontrados
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Administração</CardTitle>
            <CardDescription>Cadastro de itens e revisão das reivindicações da secretaria.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/achados-e-perdidos/admin">Gerenciar itens</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
