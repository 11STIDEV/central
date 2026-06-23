import type { Trilha } from "@/data/trilhasMock";
import { trilhaMissaoVisaoCci } from "./missaoVisaoCci";
import { trilhaGoogleDrive } from "./googleDrive";
import { trilhaIscholar } from "./ischolar";
import { trilhaPlurall } from "./plurall";
import { trilhaTaxonomiaBloom } from "./taxonomiaBloom";
import { trilhaEspacosEscola } from "./espacosEscola";
import { trilhaPrimeirosSocorros } from "./primeirosSocorros";

export const TRILHAS_MOCK: Trilha[] = [
  trilhaMissaoVisaoCci,
  trilhaGoogleDrive,
  trilhaIscholar,
  trilhaPlurall,
  trilhaTaxonomiaBloom,
  trilhaEspacosEscola,
  trilhaPrimeirosSocorros,
];
