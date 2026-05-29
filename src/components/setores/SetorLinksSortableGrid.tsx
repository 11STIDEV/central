import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ExternalLink, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SectorLink } from "@/types/setorLinks";

function linkSortId(groupTitle: string, link: SectorLink): string {
  return `${groupTitle}::${link.url}::${link.title}`;
}

const cardClassName =
  "group flex min-h-[132px] flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-card transition-all";

function LinkCardContent({ link }: { link: SectorLink }) {
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/15">
          <ExternalLink className="h-5 w-5 text-primary" aria-hidden />
        </div>
        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
      </div>
      <div className="mt-5">
        <h3 className="text-base font-semibold leading-snug text-card-foreground">{link.title}</h3>
        <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">{link.url}</p>
      </div>
    </>
  );
}

function ViewLinkCard({ link }: { link: SectorLink }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noreferrer"
      className={cn(
        cardClassName,
        "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated",
      )}
    >
      <LinkCardContent link={link} />
    </a>
  );
}

function SortableLinkCard({
  id,
  link,
}: {
  id: string;
  link: SectorLink;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        cardClassName,
        "relative ring-2 ring-transparent",
        isDragging && "z-10 opacity-90 ring-primary/40 shadow-elevated",
      )}
    >
      <button
        type="button"
        className="absolute left-2 top-2 flex h-8 w-8 cursor-grab items-center justify-center rounded-md border border-border bg-muted/80 text-muted-foreground active:cursor-grabbing"
        aria-label={`Arrastar ${link.title}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <a
        href={link.url}
        target="_blank"
        rel="noreferrer"
        className="block pl-8"
        onClick={(e) => e.stopPropagation()}
      >
        <LinkCardContent link={link} />
      </a>
    </div>
  );
}

type Props = {
  groupTitle: string;
  links: SectorLink[];
  arrangeMode: boolean;
  onReorder: (links: SectorLink[]) => void;
};

export function SetorLinksSortableGrid({ groupTitle, links, arrangeMode, onReorder }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const sortIds = links.map((link) => linkSortId(groupTitle, link));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortIds.indexOf(String(active.id));
    const newIndex = sortIds.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    onReorder(arrayMove(links, oldIndex, newIndex));
  }

  if (!arrangeMode) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {links.map((link) => (
          <ViewLinkCard key={`${groupTitle}-${link.url}-${link.title}`} link={link} />
        ))}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sortIds} strategy={rectSortingStrategy}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {links.map((link) => (
            <SortableLinkCard
              key={linkSortId(groupTitle, link)}
              id={linkSortId(groupTitle, link)}
              link={link}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
