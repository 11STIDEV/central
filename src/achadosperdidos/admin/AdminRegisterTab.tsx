import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { LOST_FOUND_CATEGORIES, MAX_ITEM_PHOTOS } from "@/achadosperdidos/constants";

function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="mb-1 block text-sm font-medium text-foreground">
      {children}
      {required ? <span className="text-destructive"> *</span> : null}
    </label>
  );
}

type Props = {
  canRegister: boolean;
  saving: boolean;
  onSubmit: (data: {
    title: string;
    category: string;
    location: string;
    description: string;
    foundAt: string;
    imageFiles: File[];
  }) => Promise<void>;
};

export function AdminRegisterTab({ canRegister, saving, onSubmit }: Props) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [foundAt, setFoundAt] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const photosFull = imageFiles.length >= MAX_ITEM_PHOTOS;

  useEffect(() => {
    return () => cameraStream?.getTracks().forEach((track) => track.stop());
  }, [cameraStream]);

  useEffect(() => {
    if (!cameraOpen || !cameraStream || !videoRef.current) return;
    const video = videoRef.current;
    video.srcObject = cameraStream;
    void video.play().catch(() => setCameraError("Não foi possível iniciar o preview da câmera."));
  }, [cameraOpen, cameraStream]);

  function appendFiles(files: File[]) {
    if (!files.length) return;
    setImageFiles((prev) => {
      const combined = [...prev, ...files];
      if (combined.length > MAX_ITEM_PHOTOS) {
        toast.error(`Máximo de ${MAX_ITEM_PHOTOS} fotos por item.`);
        return prev;
      }
      return combined;
    });
  }

  async function loadCameraDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videos = devices.filter((d) => d.kind === "videoinput");
    setCameraDevices(videos);
    if (!selectedCameraId && videos[0]?.deviceId) setSelectedCameraId(videos[0].deviceId);
  }

  async function openCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Seu navegador não suporta acesso à câmera.");
      return;
    }
    setCameraBusy(true);
    setCameraError(null);
    try {
      cameraStream?.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
      const videoConstraints: MediaTrackConstraints = selectedCameraId
        ? { deviceId: { exact: selectedCameraId } }
        : { facingMode: { ideal: "environment" } };
      const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
      setCameraStream(stream);
      setCameraOpen(true);
      await loadCameraDevices();
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : "Não foi possível acessar a câmera.");
    } finally {
      setCameraBusy(false);
    }
  }

  function closeCamera() {
    cameraStream?.getTracks().forEach((track) => track.stop());
    setCameraStream(null);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    setCameraOpen(false);
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video?.videoWidth) {
      setCameraError("A câmera ainda está iniciando. Tente novamente.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      appendFiles([new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" })]);
    }, "image/jpeg", 0.92);
  }

  async function handleSubmit() {
    await onSubmit({ title, category, location, description, foundAt, imageFiles });
    setTitle("");
    setCategory("");
    setLocation("");
    setDescription("");
    setImageFiles([]);
    setFoundAt("");
    setCameraError(null);
    closeCamera();
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Cadastrar item encontrado</CardTitle>
        <CardDescription>Use no celular ou no computador para registrar itens com foto.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {!canRegister ? (
          <p className="text-sm text-destructive md:col-span-2">
            Faça login com uma conta Google para registrar o e-mail de quem cadastra o item.
          </p>
        ) : null}
        <div>
          <FieldLabel required>Título do item</FieldLabel>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Mochila preta" />
        </div>
        <div>
          <FieldLabel required>Categoria</FieldLabel>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Selecione a categoria</option>
            {LOST_FOUND_CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel>Local encontrado</FieldLabel>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex.: Biblioteca" />
        </div>
        <div>
          <FieldLabel required>Data encontrada</FieldLabel>
          <Input type="date" value={foundAt} onChange={(e) => setFoundAt(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <FieldLabel required>Fotos (máx. {MAX_ITEM_PHOTOS})</FieldLabel>
          <Input
            type="file"
            accept="image/*"
            multiple
            disabled={photosFull}
            onChange={(e) => {
              appendFiles(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 md:col-span-2">
          <select
            value={selectedCameraId}
            onChange={(e) => setSelectedCameraId(e.target.value)}
            className="h-10 min-w-[200px] flex-1 rounded-md border border-input bg-background px-3 text-sm"
          >
            {cameraDevices.length ? (
              cameraDevices.map((device, index) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Câmera ${index + 1}`}
                </option>
              ))
            ) : (
              <option value="">Câmera padrão</option>
            )}
          </select>
          <Button type="button" variant="ghost" onClick={() => void loadCameraDevices()}>
            Atualizar
          </Button>
          <Button type="button" variant="outline" onClick={() => void openCamera()} disabled={cameraBusy || photosFull}>
            {cameraBusy ? "Abrindo..." : "Câmera"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setImageFiles([])} disabled={!imageFiles.length}>
            Limpar
          </Button>
        </div>
        {cameraError ? <p className="text-xs text-destructive md:col-span-2">{cameraError}</p> : null}
        {cameraOpen ? (
          <div className="space-y-2 rounded-md border p-3 md:col-span-2">
            <video ref={videoRef} className="max-h-64 w-full rounded-md bg-black" playsInline muted />
            <div className="flex gap-2">
              <Button type="button" onClick={capturePhoto}>
                Capturar
              </Button>
              <Button type="button" variant="outline" onClick={closeCamera}>
                Fechar
              </Button>
            </div>
          </div>
        ) : null}
        <div className="md:col-span-2">
          <FieldLabel>Descrição</FieldLabel>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" rows={3} />
        </div>
        <div className="md:col-span-2">
          <Button onClick={() => void handleSubmit()} disabled={saving || !canRegister} className="w-full sm:w-auto">
            {saving ? "Salvando..." : "Cadastrar item"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
