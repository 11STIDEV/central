import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  initParceiroSessionFromStorage,
  parceiroLogin,
  parceiroLogout,
  parceiroObterSessao,
  type ParceiroOperador,
} from "./parceiroSessionApi";

type ParceiroAuthContextType = {
  operador: ParceiroOperador | null;
  carregando: boolean;
  login: (usuario: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
};

const ParceiroAuthContext = createContext<ParceiroAuthContextType | undefined>(undefined);

export function ParceiroAuthProvider({ children }: { children: ReactNode }) {
  const [operador, setOperador] = useState<ParceiroOperador | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    initParceiroSessionFromStorage();
    parceiroObterSessao()
      .then(setOperador)
      .finally(() => setCarregando(false));
  }, []);

  const login = useCallback(async (usuario: string, senha: string) => {
    const op = await parceiroLogin(usuario, senha);
    setOperador(op);
  }, []);

  const logout = useCallback(async () => {
    await parceiroLogout();
    setOperador(null);
  }, []);

  return (
    <ParceiroAuthContext.Provider value={{ operador, carregando, login, logout }}>
      {children}
    </ParceiroAuthContext.Provider>
  );
}

export function useParceiroAuth() {
  const ctx = useContext(ParceiroAuthContext);
  if (!ctx) throw new Error("useParceiroAuth deve ser usado dentro de ParceiroAuthProvider");
  return ctx;
}
