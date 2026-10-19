import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode, type CameraDevice } from "html5-qrcode";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { extrairTokenPagamentoQr } from "@/lib/ccipayQrParse";
import {
  Camera,
  RefreshCw,
  Zap,
  ZapOff,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ClipboardPaste,
  ArrowRight,
  ScanLine,
  Terminal,
  Info,
  Play,
} from "lucide-react";

const SCANNER_ELEMENT_ID = "ccipay-qr-reader-container";

/** Abre o console DevTools móvel (Eruda) diretamente na tela do celular */
export function abrirEruda() {
  if (typeof window === "undefined") return;
  if ((window as any).eruda) {
    (window as any).eruda.show();
    return;
  }
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/eruda";
  script.onload = () => {
    if ((window as any).eruda) {
      (window as any).eruda.init();
      (window as any).eruda.show();
    }
  };
  document.head.appendChild(script);
}

const REGEX_CAMERA_TRASEIRA = /back|rear|environment|traseir[ao]|tr[aá]s|externa|wide|principal|main|world/i;
const REGEX_CAMERA_FRONTAL = /front|user|frontal|selfie|face|anterior/i;

function encontrarCameraTraseira(
  lista: CameraDevice[],
): { camera: CameraDevice; index: number } | null {
  if (!lista || lista.length === 0) return null;

  // 1. Procura câmera cujo label declare explicitamente que é traseira
  const idxTraseira = lista.findIndex((c) => REGEX_CAMERA_TRASEIRA.test(c.label || ""));
  if (idxTraseira >= 0) {
    return { camera: lista[idxTraseira], index: idxTraseira };
  }

  // 2. Procura qualquer câmera que não declare ser frontal
  const idxNaoFrontal = lista.findIndex((c) => !REGEX_CAMERA_FRONTAL.test(c.label || ""));
  if (idxNaoFrontal >= 0) {
    return { camera: lista[idxNaoFrontal], index: idxNaoFrontal };
  }

  // 3. Em celulares com rótulos genéricos (ex: camera 0 / camera 1),
  // a câmera 0 costuma ser a frontal e a última (ou 1) a traseira.
  if (lista.length > 1) {
    const ultimoIdx = lista.length - 1;
    return { camera: lista[ultimoIdx], index: ultimoIdx };
  }

  return { camera: lista[0], index: 0 };
}

type CcipayQrScannerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTokenDetected: (token: string) => void;
};

type ScannerStatus = "idle" | "starting" | "scanning" | "success" | "error";

export function CcipayQrScannerDialog({
  open,
  onOpenChange,
  onTokenDetected,
}: CcipayQrScannerDialogProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isCancelledRef = useRef(false);

  const [status, setStatus] = useState<ScannerStatus>("idle");
  const [erro, setErro] = useState<string | null>(null);
  const [pasteLink, setPasteLink] = useState("");
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [cameraIndex, setCameraIndex] = useState(0);
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [diagInfo, setDiagInfo] = useState<{
    cameraName?: string;
    videoWidth?: number;
    videoHeight?: number;
    paused?: boolean;
    readyState?: number;
  } | null>(null);
  const [mostrarDiag, setMostrarDiag] = useState(false);
  const [mostrarManual, setMostrarManual] = useState(false);

  const onTokenDetectedRef = useRef(onTokenDetected);
  onTokenDetectedRef.current = onTokenDetected;

  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  // Garante que todo elemento de vídeo criado pela biblioteca html5-qrcode
  // já nasça com todos os atributos obrigatórios do iOS Safari antes do stream ser associado
  useEffect(() => {
    if (typeof document === "undefined") return;
    const originalCreateElement = document.createElement.bind(document);
    document.createElement = function (tagName: string, options?: any) {
      const el = originalCreateElement(tagName, options);
      if (tagName && tagName.toLowerCase() === "video") {
        el.setAttribute("playsinline", "true");
        el.setAttribute("webkit-playsinline", "true");
        el.setAttribute("autoplay", "true");
        el.setAttribute("muted", "true");
        (el as HTMLVideoElement).playsInline = true;
        (el as HTMLVideoElement).muted = true;
        (el as HTMLVideoElement).autoplay = true;
        el.style.transform = "translateZ(0)";
        (el.style as any).webkitTransform = "translateZ(0)";
      }
      return el;
    };
    return () => {
      document.createElement = originalCreateElement;
    };
  }, []);

  const finalizarComToken = useCallback((token: string) => {
    if (handledRef.current) return;
    handledRef.current = true;
    setStatus("success");

    // Feedback háptico em celulares
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate?.([60, 40, 80]);
      } catch (_) {}
    }

    // Parar câmera imediatamente
    const scanner = scannerRef.current;
    if (scanner) {
      if (scanner.isScanning) {
        scanner.stop().catch(() => {}).finally(() => {
          scanner.clear();
        });
      } else {
        scanner.clear();
      }
      scannerRef.current = null;
    }

    // Transição suave para a página de confirmação
    window.setTimeout(() => {
      onOpenChangeRef.current(false);
      onTokenDetectedRef.current(token);
    }, 450);
  }, []);

  const pararScanner = useCallback(async () => {
    isCancelledRef.current = true;
    const scanner = scannerRef.current;
    if (scanner) {
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
      } catch (_) {
        // ignora se já parou
      } finally {
        try {
          scanner.clear();
        } catch (_) {}
        scannerRef.current = null;
      }
    }
    setTorchOn(false);
    setTorchAvailable(false);
  }, []);

  const iniciarCamera = useCallback(
    async (forceCameraId?: string) => {
      isCancelledRef.current = false;
      handledRef.current = false;
      setErro(null);
      setStatus("starting");

      // Garante que o elemento DOM foi montado pelo Dialog
      await new Promise((r) => setTimeout(r, 150));
      if (isCancelledRef.current) return;

      const element = document.getElementById(SCANNER_ELEMENT_ID);
      if (!element) {
        setStatus("error");
        setErro("Elemento de visualização da câmera não encontrado.");
        return;
      }

      // Limpa instância anterior se houver
      await pararScanner();
      isCancelledRef.current = false;

      let html5Qr: Html5Qrcode;
      try {
        html5Qr = new Html5Qrcode(SCANNER_ELEMENT_ID, { verbose: false });
        scannerRef.current = html5Qr;
      } catch (e: any) {
        setStatus("error");
        setErro("Não foi possível inicializar o leitor de QR code.");
        return;
      }

      // Detecta lista de câmeras para permitir alternar e preferir o ID direto
      let disponiveis: CameraDevice[] = [];
      try {
        disponiveis = await Html5Qrcode.getCameras();
        if (disponiveis && disponiveis.length > 0) {
          setCameras(disponiveis);
        }
      } catch (_) {
        // getCameras pode falhar se permissão ainda não foi concedida
      }

      const scanConfig = {
        fps: 15,
      };

      const fixVideoElement = () => {
        const container = document.getElementById(SCANNER_ELEMENT_ID);
        const video = container?.querySelector("video") as HTMLVideoElement | null;
        if (!video) return null;

        video.setAttribute("playsinline", "true");
        video.setAttribute("webkit-playsinline", "true");
        video.setAttribute("autoplay", "true");
        video.setAttribute("muted", "true");
        video.muted = true;
        video.playsInline = true;
        video.style.setProperty("width", "100%", "important");
        video.style.setProperty("height", "100%", "important");
        video.style.setProperty("object-fit", "cover", "important");
        video.style.setProperty("display", "block", "important");
        video.style.setProperty("opacity", "1", "important");
        video.style.setProperty("visibility", "visible", "important");
        video.style.setProperty("transform", "translateZ(0)", "important");
        video.style.setProperty("-webkit-transform", "translateZ(0)", "important");

        if (video.paused) {
          video.play().catch((e) => console.warn("[scanner] auto play catch:", e));
        }

        const updateState = () => {
          setDiagInfo({
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            paused: video.paused,
            readyState: video.readyState,
          });
        };
        updateState();

        video.onloadedmetadata = updateState;
        video.onplay = updateState;
        video.onpause = updateState;

        return video;
      };

      const onScanSuccess = (decodedText: string) => {
        if (handledRef.current) return;
        const token = extrairTokenPagamentoQr(decodedText);
        if (!token) {
          setErro("Este QR code não é um pagamento válido do Advance-CCI.");
          return;
        }
        finalizarComToken(token);
      };

      const onScanFailure = () => {
        // Quadros normais sem QR code
      };

      try {
        let cameraIniciada = false;

        // 1. Câmera forçada manualmente pelo usuário (ou botão alternar câmera)
        if (forceCameraId) {
          try {
            await html5Qr.start(forceCameraId, scanConfig, onScanSuccess, onScanFailure);
            cameraIniciada = true;
          } catch (e) {
            console.warn("Falha ao abrir câmera por ID:", e);
          }
        }

        // 2. Se já temos dispositivos identificados, prefere o ID exato da traseira (resolve tela preta no iOS)
        if (!cameraIniciada && disponiveis.length > 0) {
          const traseira = encontrarCameraTraseira(disponiveis);
          if (traseira) {
            try {
              await html5Qr.start(traseira.camera.id, scanConfig, onScanSuccess, onScanFailure);
              cameraIniciada = true;
              setCameraIndex(traseira.index);
            } catch (e) {
              console.warn("Falha ao abrir câmera traseira por ID:", e);
            }
          }
        }

        // 3. Câmera traseira nativa via facingMode (padrão quando ainda não temos os IDs)
        if (!cameraIniciada) {
          try {
            await html5Qr.start(
              { facingMode: "environment" },
              scanConfig,
              onScanSuccess,
              onScanFailure,
            );
            cameraIniciada = true;
          } catch (e) {
            console.warn("Falha ao iniciar facingMode environment, tentando fallback:", e);
            try {
              if (html5Qr.isScanning) {
                await html5Qr.stop();
              }
              html5Qr.clear();
            } catch (_) {}
            html5Qr = new Html5Qrcode(SCANNER_ELEMENT_ID, { verbose: false });
            scannerRef.current = html5Qr;
          }
        }

        // 4. Fallback para câmera frontal ou webcam padrão (ex: notebooks)
        if (!cameraIniciada) {
          await html5Qr.start(
            { facingMode: "user" },
            scanConfig,
            onScanSuccess,
            onScanFailure,
          );
          cameraIniciada = true;
        }

        if (isCancelledRef.current) {
          void pararScanner();
          return;
        }

        fixVideoElement();
        [150, 400, 800, 1500].forEach((t) => {
          window.setTimeout(() => {
            if (!isCancelledRef.current) fixVideoElement();
          }, t);
        });

        setStatus("scanning");

        // Atualiza a lista de câmeras agora que a permissão foi concedida
        try {
          const cams = await Html5Qrcode.getCameras();
          if (cams && cams.length > 0) {
            setCameras(cams);
            const traseira = encontrarCameraTraseira(cams);
            if (traseira) {
              setCameraIndex(traseira.index);
            }
          }
        } catch (_) {}

        // Verifica se a câmera suporta lanterna/torch
        try {
          const capabilities = html5Qr.getRunningTrackCapabilities?.() as any;
          if (capabilities && "torch" in capabilities) {
            setTorchAvailable(true);
          }
        } catch (_) {}
      } catch (err: any) {
        if (isCancelledRef.current) return;
        setStatus("error");
        const msg = String(err?.message || err || "");
        if (
          msg.includes("NotAllowedError") ||
          msg.includes("Permission") ||
          msg.includes("negada")
        ) {
          setErro(
            "Permissão da câmera negada. Habilite a permissão de câmera nas configurações do navegador ou use o link manual abaixo.",
          );
        } else if (msg.includes("NotFoundError") || msg.includes("DevicesNotFoundError")) {
          setErro("Nenhuma câmera encontrada neste dispositivo. Digite ou cole o link abaixo.");
        } else {
          setErro(
            "Não foi possível abrir a câmera automaticamente. Verifique se outro aplicativo está usando-a ou cole o código abaixo.",
          );
        }
      }
    },
    [finalizarComToken, pararScanner],
  );

  // Inicialização automática ao abrir o diálogo — reage APENAS à mudança de "open"
  useEffect(() => {
    if (!open) {
      void pararScanner();
      setStatus("idle");
      setErro(null);
      setPasteLink("");
      setMostrarManual(false);
      return;
    }

    void iniciarCamera();

    return () => {
      void pararScanner();
    };
  }, [open]);

  // Alternar entre câmeras frontal e traseira
  const alternarCamera = async () => {
    if (cameras.length <= 1) return;
    const proximoIndex = (cameraIndex + 1) % cameras.length;
    setCameraIndex(proximoIndex);
    await iniciarCamera(cameras[proximoIndex].id);
  };

  // Alternar lanterna (se disponível no smartphone)
  const alternarLanterna = async () => {
    const scanner = scannerRef.current;
    if (!scanner || !torchAvailable) return;
    try {
      const novoEstado = !torchOn;
      await scanner.applyVideoConstraints({
        advanced: [{ torch: novoEstado } as any],
      });
      setTorchOn(novoEstado);
    } catch (e) {
      console.warn("Erro ao alternar lanterna:", e);
    }
  };

  // Escanear arquivo de imagem (foto de QR code)
  const handleSelecionarArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setStatus("starting");
      setErro(null);
      // Cria instância temporária se não houver
      let scanner = scannerRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
        scannerRef.current = scanner;
      }
      if (scanner.isScanning) {
        await scanner.stop().catch(() => {});
      }
      const resultado = await scanner.scanFile(file, false);
      const token = extrairTokenPagamentoQr(resultado);
      if (!token) {
        setErro("A imagem selecionada não contém um QR code Advance-CCI válido.");
        setStatus("error");
        return;
      }
      finalizarComToken(token);
    } catch (err: any) {
      setStatus("error");
      setErro("Não foi possível ler o QR code na imagem enviada.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Colar código / link
  const colarDoClipboard = async () => {
    try {
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setPasteLink(text);
          const token = extrairTokenPagamentoQr(text);
          if (token) {
            finalizarComToken(token);
            return;
          }
        }
      }
    } catch (_) {}
  };

  const confirmarLinkColado = () => {
    const token = extrairTokenPagamentoQr(pasteLink);
    if (!token) {
      setErro("Link inválido. Cole a URL do QR ou o código de pagamento.");
      return;
    }
    finalizarComToken(token);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-4 sm:p-6 overflow-hidden">
        <DialogHeader className="space-y-1 text-left">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <ScanLine className="h-5 w-5 text-primary" />
              Pagar com QR Code
            </DialogTitle>
            <div className="flex items-center gap-1.5">
              {status === "scanning" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Ativa
                </span>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={abrirEruda}
                className="h-7 px-2 text-[11px] gap-1 border-border/80 text-muted-foreground hover:text-foreground"
                title="Abrir Console de Logs (DevTools móvel)"
              >
                <Terminal className="h-3 w-3" />
                Logs
              </Button>
            </div>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Aponte a câmera para o QR code exibido pelo parceiro no momento da compra.
          </DialogDescription>
        </DialogHeader>

        {erro && (
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{erro}</div>
          </div>
        )}

        {/* Viewfinder da Câmera */}
        <div
          onClick={() => {
            const container = document.getElementById(SCANNER_ELEMENT_ID);
            const video = container?.querySelector("video") as HTMLVideoElement | null;
            if (video) {
              video.setAttribute("playsinline", "true");
              video.setAttribute("webkit-playsinline", "true");
              video.muted = true;
              video.play().catch(console.warn);
              setDiagInfo({
                videoWidth: video.videoWidth,
                videoHeight: video.videoHeight,
                paused: video.paused,
                readyState: video.readyState,
              });
            }
          }}
          className="relative w-full aspect-square max-h-[340px] sm:max-h-[380px] rounded-2xl overflow-hidden bg-black border border-border/80 shadow-inner cursor-pointer"
        >
          {/* Estilos forçados para WebKit / iOS Safari */}
          <style>{`
            #${SCANNER_ELEMENT_ID} {
              width: 100% !important;
              height: 100% !important;
              position: relative !important;
              overflow: hidden !important;
              transform: translateZ(0) !important;
              -webkit-transform: translateZ(0) !important;
            }
            #${SCANNER_ELEMENT_ID} video {
              width: 100% !important;
              height: 100% !important;
              object-fit: cover !important;
              display: block !important;
              opacity: 1 !important;
              visibility: visible !important;
              border-radius: 1rem !important;
              transform: translateZ(0) !important;
              -webkit-transform: translateZ(0) !important;
              background-color: #000 !important;
            }
            #${SCANNER_ELEMENT_ID} canvas {
              display: none !important;
            }
            #${SCANNER_ELEMENT_ID} > div {
              border: none !important;
            }
          `}</style>

          {/* Elemento onde o Html5Qrcode renderiza o stream */}
          <div
            id={SCANNER_ELEMENT_ID}
            className="w-full h-full"
          />

          {/* Estado: Iniciando Câmera Automaticamente */}
          {status === "starting" && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/85 text-white p-6 text-center backdrop-blur-xs">
              <div className="relative flex items-center justify-center">
                <div className="absolute h-16 w-16 rounded-full border-2 border-primary/40 animate-ping" />
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 text-primary border border-primary/30">
                  <Camera className="h-7 w-7 animate-pulse" />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold">Abrindo câmera...</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Iniciando leitor instantâneo
                </p>
              </div>
            </div>
          )}

          {/* Estado: Câmera Ativa / Escaneando (Visual Overlay) */}
          {status === "scanning" && (
            <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center">
              {/* Moldura de Foco / Retículo de Leitura */}
              <div className="relative w-[210px] h-[210px] sm:w-[240px] sm:h-[240px] rounded-2xl">
                {/* Cantos estilizados */}
                <span className="absolute top-0 left-0 h-7 w-7 border-t-3 border-l-3 border-primary rounded-tl-xl shadow-xs" />
                <span className="absolute top-0 right-0 h-7 w-7 border-t-3 border-r-3 border-primary rounded-tr-xl shadow-xs" />
                <span className="absolute bottom-0 left-0 h-7 w-7 border-b-3 border-l-3 border-primary rounded-bl-xl shadow-xs" />
                <span className="absolute bottom-0 right-0 h-7 w-7 border-b-3 border-r-3 border-primary rounded-br-xl shadow-xs" />

                {/* Linha laser de scan animada */}
                <div className="absolute inset-x-2 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_12px_rgba(59,130,246,0.9)] animate-scan-laser" />
              </div>

              <p className="mt-4 rounded-full bg-black/60 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md shadow-xs">
                Mantenha o código dentro do quadro
              </p>
            </div>
          )}

          {/* Estado: Sucesso na Leitura */}
          {status === "success" && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-emerald-950/90 text-white backdrop-blur-sm animate-fade-in">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 animate-ticket-pop">
                <CheckCircle2 className="h-10 w-10 text-emerald-400" />
              </div>
              <p className="text-base font-bold text-white">QR Code detectado!</p>
              <p className="text-xs text-emerald-200">Carregando pagamento...</p>
            </div>
          )}

          {/* Estado: Erro / Sem câmera */}
          {status === "error" && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-neutral-900/95 text-white p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/20 text-destructive border border-destructive/30">
                <AlertCircle className="h-6 w-6" />
              </div>
              <p className="text-xs text-neutral-300 max-w-[240px]">
                A câmera não pôde ser iniciada automaticamente.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-1 gap-1.5 border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                onClick={() => void iniciarCamera()}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Tentar novamente
              </Button>
            </div>
          )}

          {/* Controles sobre o vídeo da câmera */}
          {status === "scanning" && (
            <div className="pointer-events-auto absolute top-3 right-3 z-20 flex items-center gap-1.5">
              {torchAvailable && (
                <button
                  type="button"
                  aria-label="Alternar lanterna"
                  onClick={alternarLanterna}
                  className={`flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-md transition-colors ${
                    torchOn
                      ? "bg-amber-500 text-white shadow-md shadow-amber-500/30"
                      : "bg-black/60 text-white hover:bg-black/80"
                  }`}
                >
                  {torchOn ? <Zap className="h-4 w-4" /> : <ZapOff className="h-4 w-4" />}
                </button>
              )}
              {cameras.length > 1 && (
                <button
                  type="button"
                  aria-label="Alternar câmera"
                  onClick={alternarCamera}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-black/80 transition-colors"
                  title="Alternar entre câmeras"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Alerta de Vídeo Pausado no iOS Safari com botão direto para destravar */}
        {(diagInfo?.paused || (diagInfo && diagInfo.videoWidth === 0)) && status === "scanning" && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 flex items-center justify-between gap-2 animate-fade-in">
            <div className="text-xs text-amber-700 dark:text-amber-300">
              Vídeo pausado (Modo Pouca Energia ou Safari).
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                const container = document.getElementById(SCANNER_ELEMENT_ID);
                const video = container?.querySelector("video") as HTMLVideoElement | null;
                if (video) {
                  video.setAttribute("playsinline", "true");
                  video.setAttribute("webkit-playsinline", "true");
                  video.muted = true;
                  video.play().catch(console.warn);
                  setDiagInfo({
                    videoWidth: video.videoWidth,
                    videoHeight: video.videoHeight,
                    paused: video.paused,
                    readyState: video.readyState,
                  });
                }
              }}
              className="h-8 gap-1 text-xs shrink-0 bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
            >
              <Play className="h-3.5 w-3.5" />
              Destravar Câmera
            </Button>
          </div>
        )}

        {/* Barra de Ações Rápidas Alternativas */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleSelecionarArquivo}
          />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5 px-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            Ler foto
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
            onClick={() => setMostrarDiag(!mostrarDiag)}
          >
            <Info className="h-3.5 w-3.5" />
            {mostrarDiag ? "Ocultar diagnóstico" : "Diagnóstico"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
            onClick={() => setMostrarManual(!mostrarManual)}
          >
            <ClipboardPaste className="h-3.5 w-3.5" />
            {mostrarManual ? "Ocultar manual" : "Digitar link"}
          </Button>
        </div>

        {/* Seção Diagnóstico da Câmera em Tempo Real */}
        {mostrarDiag && (
          <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-1.5 text-[11px] font-mono text-muted-foreground animate-fade-in">
            <div className="flex items-center justify-between">
              <span><strong>Status:</strong> {status}</span>
              <span className={diagInfo?.paused ? "text-amber-500 font-bold" : "text-emerald-500 font-bold"}>
                {diagInfo?.paused ? "PAUSADO" : "RODANDO"}
              </span>
            </div>
            <p><strong>Resolução:</strong> {diagInfo?.videoWidth ?? 0} x {diagInfo?.videoHeight ?? 0}</p>
            <p><strong>ReadyState:</strong> {diagInfo?.readyState ?? "N/A"}</p>
            <p><strong>Câmeras ({cameras.length}):</strong> {cameras.map((c, i) => `${i}: ${c.label || (c?.id ? c.id.slice(0, 8) : `cam-${i}`)}`).join("; ") || "nenhuma"}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const container = document.getElementById(SCANNER_ELEMENT_ID);
                const video = container?.querySelector("video") as HTMLVideoElement | null;
                if (video) {
                  video.setAttribute("playsinline", "true");
                  video.setAttribute("webkit-playsinline", "true");
                  video.muted = true;
                  video.play().catch((e) => alert("Erro ao dar play: " + e));
                  setDiagInfo({
                    videoWidth: video.videoWidth,
                    videoHeight: video.videoHeight,
                    paused: video.paused,
                    readyState: video.readyState,
                  });
                } else {
                  alert("Elemento de vídeo não encontrado no DOM");
                }
              }}
              className="mt-1 w-full h-7 text-[11px] gap-1"
            >
              <Play className="h-3 w-3" />
              Forçar Play no Vídeo
            </Button>
          </div>
        )}

        {/* Seção Manual: Digitar ou Colar Código/Link */}
        {mostrarManual && (
          <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-2 animate-fade-in">
            <p className="text-[11px] text-muted-foreground">
              Cole o link exibido no parceiro ou o código identificador da venda:
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="https://central.../cci-pay/pagar/..."
                value={pasteLink}
                onChange={(e) => {
                  setPasteLink(e.target.value);
                  setErro(null);
                }}
                className="h-9 text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={colarDoClipboard}
                title="Colar da área de transferência"
                className="h-9 px-2.5 shrink-0"
              >
                <ClipboardPaste className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={confirmarLinkColado}
                className="h-9 px-3 shrink-0"
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
