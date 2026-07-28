import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { flattenNavForSearch, type NavSection } from "@/navigation/intranetNavConfig";

type IntranetCommandPaletteProps = {
  sections: NavSection[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function IntranetCommandPalette({ sections, open, onOpenChange }: IntranetCommandPaletteProps) {
  const navigate = useNavigate();

  const grouped = useMemo(() => {
    const entries = flattenNavForSearch(sections);
    const map = new Map<string, typeof entries>();
    for (const entry of entries) {
      const list = map.get(entry.group) ?? [];
      list.push(entry);
      map.set(entry.group, list);
    }
    return [...map.entries()];
  }, [sections]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey)) return;
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }
      event.preventDefault();
      onOpenChange(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Buscar páginas, setores e ferramentas…" />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        {grouped.map(([group, items]) => (
          <CommandGroup key={group} heading={group}>
            {items.map((item) => (
              <CommandItem
                key={`${group}-${item.url}`}
                value={`${item.title} ${item.url} ${group}`}
                disabled={item.locked}
                onSelect={() => {
                  if (item.locked) return;
                  onOpenChange(false);
                  navigate(item.url);
                }}
              >
                <span className="truncate">{item.title}</span>
                {item.locked ? (
                  <Lock className="ml-auto h-3.5 w-3.5 shrink-0 opacity-50" />
                ) : (
                  <CommandShortcut className="hidden sm:inline">{item.url}</CommandShortcut>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
