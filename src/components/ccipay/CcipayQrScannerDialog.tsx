import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanType, Html5QrcodeScanner } from "html5-qrcode";
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

const SCANNER_ELEMENT_ID = "ccipay-qr-reader";

type CcipayQrScannerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTokenDetected: (token: string) => void;
};

export function CcipayQrScannerDialog({
  open,
  onOpenChange,
  onTokenDetected,
}: CcipayQrScannerDialogProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const handledRef = useRef(false);
  const [pasteLink, setPasteLink] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      handledRef.current = false;
      setPasteLink("");
      setErro(null);
      if (scannerRef.current) {
        void scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
      return;
    }

    handledRef.current = false;

    const timer = window.setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        SCANNER_ELEMENT_ID,
        {
          fps: 10,
          qrbox: { width: 240, height: 240 },
          rememberLastUsedCamera: true,
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        },
        false,
      );

      scanner.render(
        (decodedText) => {
          if (handledRef.current) return;
          const token = extrairTokenPagamentoQr(decodedText);
          if (!token) {
            setErro("Este QR code não é um pagamento Advance-CCI válido.");
            return;
          }
          handledRef.current = true;
          void scanner.clear().then(() => {
            scannerRef.current = null;
            onOpenChange(false);
            onTokenDetected(token);
          });
        },
        () => {
          // leitura contínua — erros de frame são normais
        },
      );

      scannerRef.current = scanner;
    }, 150);

    return () => {
      window.clearTimeout(timer);
      if (scannerRef.current) {
        void scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [open, onOpenChange, onTokenDetected]);

  function confirmarLinkColado() {
    const token = extrairTokenPagamentoQr(pasteLink);
    if (!token) {
      setErro("Link inválido. Cole a URL do QR ou o código de pagamento.");
      return;
    }
    onOpenChange(false);
    onTokenDetected(token);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pagar com QR code</DialogTitle>
          <DialogDescription>
            Aponte a câmera para o QR code exibido pelo parceiro na hora da compra.
          </DialogDescription>
        </DialogHeader>

        {erro ? <p className="text-sm text-destructive">{erro}</p> : null}

        <div
          id={SCANNER_ELEMENT_ID}
          className="overflow-hidden rounded-lg border border-border [&_img]:mx-auto"
        />

        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            Sem câmera? Cole o link que aparece abaixo do QR do parceiro:
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="https://.../cci-pay/pagar/..."
              value={pasteLink}
              onChange={(e) => {
                setPasteLink(e.target.value);
                setErro(null);
              }}
            />
            <Button type="button" variant="secondary" onClick={confirmarLinkColado}>
              Ir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
