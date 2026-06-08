import type { SectorLinkGroup } from "@/types/setorLinks";

/** Formulários externos editáveis por admin (chave API `portal-colaborador`). */
export const PORTAL_COLABORADOR_DEFAULT_GROUPS: SectorLinkGroup[] = [
  {
    title: "Links",
    links: [
      {
        title: "Atestados, Ausência e declarações",
        url: "https://docs.google.com/forms/d/e/1FAIpQLScQ0iBckCsZZsZGQcNzmGW02neefgDycHpcb740n2NLALhv7g/viewform",
      },
      {
        title: "Serviços e pedidos ao DP e Financeiro",
        url: "https://docs.google.com/forms/d/e/1FAIpQLSfjT8H5IaComOcE64EBubTzVmRpaV98-rSeuST7QcvkyZYtNg/viewform",
      },
      {
        title: "Registro de certificados e históricos",
        url: "https://docs.google.com/forms/d/e/1FAIpQLSdCnxgk1CDoyhpB1iTt_sqOTFH9KZxfCRElgEqmgd0G6r2dNw/viewform",
      },
      {
        title: "Registro de atividade de capacitação sem certificado",
        url: "https://docs.google.com/forms/d/e/1FAIpQLSf-G3ge11lB0XTnU848cMz6Em0pc79hyLYp_9hdsRzASoBHWQ/viewform",
      },
      {
        title: "Autoavaliação",
        url: "https://docs.google.com/forms/d/e/1FAIpQLSdZQ_Y-0AV5KJXMLqpkauLL8Qd2pOurq7yJFsvUNUSYtDA77g/viewform",
      },
    ],
  },
];

export const PORTAL_COLABORADOR_LINK_KEY = "portal-colaborador" as const;
