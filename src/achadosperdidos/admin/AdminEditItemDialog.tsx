import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { MAX_ITEM_PHOTOS } from "@/achadosperdidos/constants";
import type { LostFoundItem } from "@/achadosperdidos/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type Props = {
  item: LostFoundItem | null;
  open: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { title: string; keptImageUrls: string[]; newImageFiles: File[] }) => Promise<void>;
};

export function AdminEditItemDialog({ item, open, saving, onOpenChange, onSave }: Props) {
  const [title, setTitle] = useState("");
  const [keptImageUrls, setKeptImageUrls] = useState<string[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!open || !item) return;
    setTitle(item.title);
    setKeptImageUrls(item.image_urls ?? []);
    setNewImageFiles([]);
  }, [open, item]);

  const totalPhotos = keptImageUrls.length + newImageFiles.length;
  const photosFull = totalPhotos >= MAX_ITEM_PHOTOS;

  const newImagePreviews = useMemo(
    () => newImageFiles.map((file) => URL.createObjectURL(file)),
    [newImageFiles],
  );

  useEffect(() => {
    return () => {
      for (const url of newImagePreviews) URL.revokeObjectURL(url);
    };
  }, [newImagePreviews]);

  function appendFiles(files: File[]) {
    if (!files.length) return;
    setNewImageFiles((prev) => {
      const combined = [...prev, ...files];
      if (keptImageUrls.length + combined.length > MAX_ITEM_PHOTOS) {
        toast.error(`Máximo de ${MAX_ITEM_PHOTOS} fotos por item.`);
        return prev;
      }
      return combined;
    });
  }

  function removeKeptUrl(url: string) {
    setKeptImageUrls((prev) => prev.filter((u) => u !== url));
  }

  function removeNewFile(index: number) {
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!item) return;
    if (!title.trim()) {
      toast.error("Informe o título do item.");
      return;
    }
    if (totalPhotos < 1) {
      toast.error("O item precisa de pelo menos uma foto.");
      return;
    }
    await onSave({ title, keptImageUrls, newImageFiles });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar item</DialogTitle>
          <DialogDescription>
            Alterações em título ou fotos serão marcadas como editadas no cadastro.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Título</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do item" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Fotos ({totalPhotos}/{MAX_ITEM_PHOTOS})
            </label>
            <div className="grid grid-cols-4 gap-2">
              {keptImageUrls.map((url) => (
                <div key={url} className="relative aspect-square overflow-hidden rounded-md border bg-muted">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    className="absolute right-0.5 top-0.5 rounded-full bg-background/90 p-0.5 shadow"
                    onClick={() => removeKeptUrl(url)}
                    aria-label="Remover foto"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {newImageFiles.map((file, index) => (
                <div key={`new-${file.name}-${file.lastModified}-${index}`} className="relative aspect-square overflow-hidden rounded-md border bg-muted">
                  <img src={newImagePreviews[index]} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    className="absolute right-0.5 top-0.5 rounded-full bg-background/90 p-0.5 shadow"
                    onClick={() => removeNewFile(index)}
                    aria-label="Remover foto nova"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <Input
              type="file"
              accept="image/*"
              multiple
              disabled={photosFull}
              className="mt-2"
              onChange={(e) => {
                appendFiles(Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving || !item}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
