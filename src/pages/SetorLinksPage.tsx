import { ExternalLink, Link2, ShieldCheck } from "lucide-react";
import { PageHero } from "@/components/PageHero";

type SectorLink = {
  title: string;
  url: string;
};

type SectorLinkGroup = {
  title: string;
  links: SectorLink[];
};

type SectorPage = {
  title: string;
  subtitle: string;
  restrictedLabel: string;
  groups: SectorLinkGroup[];
};

export type SectorPageKey =
  | "professores"
  | "disciplinar"
  | "secretaria"
  | "servicos-gerais"
  | "publicidade"
  | "dp-financeiro"
  | "primeiros-socorros"
  | "direcao"
  | "clat";

const SECTOR_PAGES: Record<SectorPageKey, SectorPage> = {
  professores: {
    title: "Professores",
    subtitle: "Acesso rápido ao planejamento semanal, lançamento de notas e faltas.",
    restrictedLabel: "Acesso restrito aos professores.",
    groups: [
      {
        title: "Ferramentas dos professores",
        links: [
          {
            title: "Planejamento semanal, notas e faltas",
            url: "https://cci.paineldoaluno.com.br/professor_login",
          },
        ],
      },
    ],
  },
  disciplinar: {
    title: "Disciplinar",
    subtitle: "Sistemas e formulários usados pela equipe disciplinar no dia a dia.",
    restrictedLabel: "Acesso restrito ao setor Disciplinar.",
    groups: [
      {
        title: "Rotina disciplinar",
        links: [
          { title: "Sistema das catracas", url: "https://app.biomessenger.xyz/splash" },
          {
            title: "Frequência de monitores e estagiários do matutino",
            url: "https://docs.google.com/forms/d/e/1FAIpQLSfqWrSO4aSWZkT8FyxCauPkvdYrd78qGaBqTPV5jc4gRzfC4A/viewform",
          },
          {
            title: "Frequência de monitores e estagiários do vespertino",
            url: "https://docs.google.com/forms/d/e/1FAIpQLSfqWrSO4aSWZkT8FyxCauPkvdYrd78qGaBqTPV5jc4gRzfC4A/viewform",
          },
          {
            title: "Chamado de equipe SGerais, Manutenção e Limpeza",
            url: "https://docs.google.com/a/portalcci.com.br/forms/d/e/1FAIpQLSefJh6ulgJ-jZv-x0DbJ0v9QcfjtAzx18Ug0gGvZ_axAIlCkg/viewform?c=0&w=1",
          },
          {
            title: "Manutenção dos DVRs",
            url: "https://docs.google.com/spreadsheets/d/1B0tMPRxdG0Z6YCy0iRxFmV6C49Nkp0Yf9xiUC5gEYYw/edit?usp=drive_open&ouid=101233735060380075119",
          },
        ],
      },
    ],
  },
  secretaria: {
    title: "Secretaria",
    subtitle: "Links de atendimento, registros, sistemas acadêmicos e solicitações da secretaria.",
    restrictedLabel: "Acesso restrito à Secretaria.",
    groups: [
      {
        title: "Sistemas e atendimentos",
        links: [
          {
            title: "Tabela de investimento - Preços CCI",
            url: "https://docs.google.com/spreadsheets/d/1oUtC-yB-4jszkaJvp08dzITR7zRBiuhegAd3-faafFw/edit?gid=327251375#gid=327251375",
          },
          { title: "Plurall", url: "https://login.plurall.net/" },
          { title: "Trusty", url: "https://chat.trustyagents.com/login#/login" },
          { title: "iScholar", url: "https://cci.ischolar.com.br/default.php?tipo=unidade" },
          { title: "Painel do professor", url: "https://cci.paineldoaluno.com.br/professor_login" },
          {
            title: "Chamado secretaria",
            url: "https://docs.google.com/forms/d/e/1FAIpQLSeonOwQ5U6qu8h1s73yHGbICGWTQKZY3xP-_N92Qu1I4zmvsw/viewform",
          },
          {
            title: "Pedido de transferência / trancamento",
            url: "https://docs.google.com/forms/d/e/1FAIpQLScUNGUiBOoI9FlaxMzUiui-IKe1NkWBfRZuw3_gmE_IWE52QQ/viewform",
          },
          {
            title: "Indicação de aluno",
            url: "https://docs.google.com/forms/d/e/1FAIpQLSf77WZGm6sGn8pXYe9mOFhTpW576UjXNZPhMFRCaI_MmuFtPQ/viewform",
          },
          {
            title: "Registro de atendimento secretaria",
            url: "https://docs.google.com/forms/d/e/1FAIpQLSdvfAtzkpSNg4UJNetiBGAqWBt8jwhq0JwdQGBlfPEtyvkyWw/viewform",
          },
          {
            title: "Lista de espera por vagas para matrícula ou remanejamento",
            url: "https://docs.google.com/forms/d/e/1FAIpQLSfKwqYPoySu7-RX0CjUd0xVbh4pICaJGyHLR-NIsMaA7TRuzQ/viewform",
          },
          {
            title: "Pedido de bolsa",
            url: "https://docs.google.com/forms/d/e/1FAIpQLSeXCLvLblq9bfEBAqwVtndZzWAB-MqJrhWFqROHe76qKTVHcw/viewform?c=0&w=1",
          },
          {
            title: "O que acontece aqui",
            url: "https://sites.google.com/portalcci.com.br/oqueaconteceaqui/in%C3%ADcio",
          },
          {
            title: "Solicitação de estorno",
            url: "https://docs.google.com/forms/d/e/1FAIpQLSdSbP94rfAdNCZaRrMv0J7nMQLIA2yY0ONEsltv9vzwRTjeNg/viewform",
          },
        ],
      },
    ],
  },
  "servicos-gerais": {
    title: "Serviços Gerais",
    subtitle: "Formulários e planilhas para chamados, manutenção e leitura dos relógios.",
    restrictedLabel: "Acesso restrito a Serviços Gerais.",
    groups: [
      {
        title: "Serviços, manutenção e registros",
        links: [
          {
            title: "Chamado SGerais, Manutenção e Limpeza",
            url: "https://docs.google.com/a/portalcci.com.br/forms/d/e/1FAIpQLSefJh6ulgJ-jZv-x0DbJ0v9QcfjtAzx18Ug0gGvZ_axAIlCkg/viewform",
          },
          {
            title: "Planilha da manutenção",
            url: "https://docs.google.com/spreadsheets/d/1FtPn-Sn4KRMIKOrwt46I5H3mkwfjNFEzH2CUEZH2-vQ/edit?gid=1195404581#gid=1195404581",
          },
          {
            title: "Leitura dos relógios",
            url: "https://docs.google.com/forms/d/e/1FAIpQLSdYURK-7TgjrmYh00KsoCDNCEylX3kaJkM-L9CIIAJkIoYCMw/viewform",
          },
          {
            title: "Numeração dos relógios CAESB",
            url: "https://docs.google.com/spreadsheets/d/18ZDLvHq0G-RLD78ZOPv1fm-uXajNaRVkfDHsUoX3rG8/edit?resourcekey=&gid=899448828#gid=899448828",
          },
        ],
      },
    ],
  },
  publicidade: {
    title: "Publicidade",
    subtitle: "Solicitações de cobertura de eventos, atividades e tarefas de comunicação.",
    restrictedLabel: "Acesso restrito à Publicidade.",
    groups: [
      {
        title: "Solicitações",
        links: [
          {
            title: "Cobertura de eventos, atividades e solicitações de tarefas",
            url: "https://docs.google.com/forms/d/e/1FAIpQLScld4rn0nDjCdApAgqdGzaSLZuoPb80C60mdBq-xnsNbMOjww/viewform",
          },
        ],
      },
    ],
  },
  "dp-financeiro": {
    title: "DP e Financeiro",
    subtitle: "Solicitações, registros e planilhas de apoio ao DP e Financeiro.",
    restrictedLabel: "Acesso restrito ao DP e Financeiro.",
    groups: [
      {
        title: "DP e Financeiro",
        links: [
          {
            title: "Encaminhamento de colaboradores ao DP",
            url: "https://docs.google.com/forms/d/e/1FAIpQLSeCV3g1xlNn4KrzAaZvT0zFySIZoAgVTJXBI4SeZPTD5SAWKg/viewform",
          },
          {
            title: "Escala das equipes do administrativo",
            url: "https://docs.google.com/spreadsheets/d/1Qzw0_gFxPktwGgQM8_j-rwxX1MGPBjIhteI2TbLWP7k/edit?pli=1&gid=999558513#gid=999558513",
          },
          {
            title: "Solicitação de pagamentos",
            url: "https://docs.google.com/forms/d/e/1FAIpQLSffBNCcPAlFMabkNHld6j3WKXdZ58MHNHHVqHnX4gSman__OQ/viewform",
          },
          {
            title: "Banco de talentos",
            url: "https://docs.google.com/spreadsheets/d/1jgTO0_RtFHh2-5yhZnzQ6iJnJfTj49kgVb_82QEPAxU/edit?pli=1&gid=209818710#gid=209818710",
          },
          {
            title: "Registro de acolhimentos, feedbacks e advertências",
            url: "https://docs.google.com/forms/d/e/1FAIpQLSelZHf8fNkaTpsMWIft6KwDGdWsUqaz_Cxt5wuz_-fJaEG-DQ/viewform",
          },
        ],
      },
    ],
  },
  "primeiros-socorros": {
    title: "Primeiros Socorros",
    subtitle: "Registro de atendimentos da sala de primeiros socorros.",
    restrictedLabel: "Acesso restrito à equipe de Primeiros Socorros.",
    groups: [
      {
        title: "Registros",
        links: [
          {
            title: "Registro sala de primeiros socorros",
            url: "https://docs.google.com/forms/d/e/1FAIpQLSeK0E-ptkv4Kxn2FgeaoHBxNqoZYx2Mhm7se8AlIPfghCEXUg/viewform",
          },
        ],
      },
    ],
  },
  direcao: {
    title: "Direção",
    subtitle: "Planejamento e encaminhamento de tarefas para assessores da direção.",
    restrictedLabel: "Acesso restrito à Direção.",
    groups: [
      {
        title: "Planejamento e tarefas",
        links: [
          {
            title: "Planejando 2026",
            url: "https://docs.google.com/spreadsheets/d/1JD2v4NzucxdAEKfJs1OMQrAfArmSsnLN75e58WB_Jss/edit?gid=0#gid=0",
          },
          {
            title: "Tarefas para assessores da direção",
            url: "https://docs.google.com/forms/d/e/1FAIpQLSdHSNeFEOWInTLCTKxWXQ7cWc618vgBM1nVyZKjv5xsNSOqgg/viewform",
          },
        ],
      },
    ],
  },
  clat: {
    title: "CLAT",
    subtitle: "Solicitações e serviços a fazer no CLAT.",
    restrictedLabel: "Acesso restrito ao CLAT.",
    groups: [
      {
        title: "Serviços",
        links: [
          {
            title: "Serviços a fazer no CLAT",
            url: "https://docs.google.com/forms/d/e/1FAIpQLSdv2Y5gerUPCfW0n4Sqa5wMuRs1Mni6oyMrf_LN6v1wIHAPhw/viewform",
          },
        ],
      },
    ],
  },
};

function countLinks(page: SectorPage): number {
  return page.groups.reduce((total, group) => total + group.links.length, 0);
}

export function SetorLinksPage({ setor }: { setor: SectorPageKey }) {
  const page = SECTOR_PAGES[setor];
  const totalLinks = countLinks(page);

  return (
    <div className="animate-fade-in">
      <PageHero title={page.title} subtitle={page.subtitle} />

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:px-8">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/80 px-4 py-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-medium text-card-foreground">{page.restrictedLabel}</p>
              <p className="text-xs text-muted-foreground">
                Os links abrem os sistemas oficiais em uma nova aba.
              </p>
            </div>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <Link2 className="h-3.5 w-3.5" aria-hidden />
            {totalLinks} {totalLinks === 1 ? "link" : "links"}
          </span>
        </div>

        <div className="space-y-8">
          {page.groups.map((group) => (
            <section key={group.title} className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">{group.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Escolha uma opção para acessar o recurso externo.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {group.links.map((link) => (
                  <a
                    key={`${group.title}-${link.title}`}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex min-h-[132px] flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/15">
                        <ExternalLink className="h-5 w-5 text-primary" aria-hidden />
                      </div>
                      <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                    </div>
                    <div className="mt-5">
                      <h3 className="text-base font-semibold leading-snug text-card-foreground">
                        {link.title}
                      </h3>
                      <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">{link.url}</p>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

