import { useEffect, useRef, useState, useCallback } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Link as LinkIcon,
  Unlink,
  Image as ImageIcon,
  Table as TableIcon,
  Minus,
  RemoveFormatting,
  Undo,
  Redo,
  Highlighter,
  Palette,
  Lightbulb,
  CheckSquare,
} from "lucide-react";

interface RichWordEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

/**
 * Converte markdown básico legado para HTML, permitindo edição contínua
 * de conteúdos existentes que foram criados em Markdown.
 */
function markdownToHtml(md: string): string {
  if (!md) return "";
  // Se já for HTML com tags, retorna diretamente
  if (/<\/?[a-z][\s\S]*>/i.test(md)) {
    return md;
  }

  return md
    .split("\n\n")
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";

      // H2
      if (trimmed.startsWith("## ")) {
        return `<h2>${formatInline(trimmed.slice(3))}</h2>`;
      }
      // H3
      if (trimmed.startsWith("### ")) {
        return `<h3>${formatInline(trimmed.slice(4))}</h3>`;
      }
      // H4
      if (trimmed.startsWith("#### ")) {
        return `<h4>${formatInline(trimmed.slice(5))}</h4>`;
      }
      // Dica
      if (trimmed.startsWith("### Dica de Ouro ") || trimmed.startsWith("💡 ")) {
        const text = trimmed.replace(/^(### Dica de Ouro |💡 )/, "");
        return `<div class="callout-box"><strong>💡 Dica de Ouro:</strong> ${formatInline(text)}</div>`;
      }
      // Lista não ordenada
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const items = trimmed
          .split("\n")
          .map((line) => line.replace(/^[-*]\s+/, "").trim())
          .filter(Boolean)
          .map((item) => `<li>${formatInline(item)}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }
      // Lista numerada
      if (/^\d+\.\s/.test(trimmed)) {
        const items = trimmed
          .split("\n")
          .map((line) => line.replace(/^\d+\.\s+/, "").trim())
          .filter(Boolean)
          .map((item) => `<li>${formatInline(item)}</li>`)
          .join("");
        return `<ol>${items}</ol>`;
      }
      // Parágrafo regular
      return `<p>${formatInline(trimmed.replace(/\n/g, "<br/>"))}</p>`;
    })
    .filter(Boolean)
    .join("");
}

function formatInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/~~(.+?)~~/g, "<del>$1</del>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

export function RichWordEditor({
  value,
  onChange,
  placeholder = "Digite aqui o conteúdo da missão...",
  minHeight = "360px",
}: RichWordEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isUpdatingRef = useRef(false);
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({});

  // Carrega e sincroniza o valor inicial
  useEffect(() => {
    if (!editorRef.current) return;
    const initialHtml = markdownToHtml(value || "");
    if (editorRef.current.innerHTML !== initialHtml && !isUpdatingRef.current) {
      editorRef.current.innerHTML = initialHtml;
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    isUpdatingRef.current = true;
    const html = editorRef.current.innerHTML;
    onChange(html);
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 50);
  }, [onChange]);

  // Executa comandos de formatação com document.execCommand
  const execCmd = (cmd: string, val: string | undefined = undefined) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    handleInput();
    updateActiveFormats();
  };

  const updateActiveFormats = () => {
    try {
      setActiveFormats({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        strikeThrough: document.queryCommandState("strikeThrough"),
        justifyLeft: document.queryCommandState("justifyLeft"),
        justifyCenter: document.queryCommandState("justifyCenter"),
        justifyRight: document.queryCommandState("justifyRight"),
        justifyFull: document.queryCommandState("justifyFull"),
        insertUnorderedList: document.queryCommandState("insertUnorderedList"),
        insertOrderedList: document.queryCommandState("insertOrderedList"),
      });
    } catch {}
  };

  const handleHeading = (tag: "p" | "h1" | "h2" | "h3") => {
    execCmd("formatBlock", tag);
  };

  const handleLink = () => {
    const url = window.prompt("Insira a URL do link:", "https://");
    if (url) {
      execCmd("createLink", url);
    }
  };

  const handleImage = () => {
    const url = window.prompt("Insira a URL da imagem:", "https://");
    if (url) {
      execCmd("insertImage", url);
    }
  };

  const handleColor = (color: string) => {
    execCmd("foreColor", color);
  };

  const handleHighlight = (color: string) => {
    execCmd("hiliteColor", color);
  };

  const handleInsertTable = () => {
    const rows = 3;
    const cols = 3;
    let tableHtml = `<table style="width:100%; border-collapse:collapse; margin:14px 0; border:1px solid rgba(255,255,255,0.15);">`;
    tableHtml += `<thead><tr>`;
    for (let c = 1; c <= cols; c++) {
      tableHtml += `<th style="border:1px solid rgba(255,255,255,0.15); padding:8px; background:rgba(255,255,255,0.06); text-align:left;">Cabeçalho ${c}</th>`;
    }
    tableHtml += `</tr></thead><tbody>`;
    for (let r = 1; r <= rows - 1; r++) {
      tableHtml += `<tr>`;
      for (let c = 1; c <= cols; c++) {
        tableHtml += `<td style="border:1px solid rgba(255,255,255,0.12); padding:8px;">Item ${r}.${c}</td>`;
      }
      tableHtml += `</tr>`;
    }
    tableHtml += `</tbody></table><p><br></p>`;
    execCmd("insertHTML", tableHtml);
  };

  const handleCallout = (tipo: "dica" | "atencao") => {
    const bg = tipo === "dica" ? "rgba(37,99,235,0.08)" : "rgba(14,165,233,0.08)";
    const border = tipo === "dica" ? "rgba(37,99,235,0.4)" : "rgba(14,165,233,0.4)";
    const icon = tipo === "dica" ? "💡" : "📌";
    const titulo = tipo === "dica" ? "Dica Importante:" : "Atenção:";

    const calloutHtml = `
      <div style="background:${bg}; border:1px solid ${border}; border-left:4px solid ${border}; padding:12px 16px; border-radius:8px; margin:14px 0;">
        <p style="margin:0; font-weight:700; color:#2563eb;">${icon} ${titulo}</p>
        <p style="margin:4px 0 0 0;">Escreva o texto do destaque aqui...</p>
      </div><p><br></p>
    `;
    execCmd("insertHTML", calloutHtml);
  };

  return (
    <div className="flex flex-col rounded-xl border border-border dark:border-white/12 bg-card dark:bg-slate-900 shadow-md overflow-hidden">
      {/* ── Toolbar estilo Microsoft Word ───────────────────────── */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border dark:border-white/10 bg-muted/30 dark:bg-white/[0.04] p-2 text-foreground select-none">
        {/* Desfazer / Refazer */}
        <div className="flex items-center border-r border-border dark:border-white/10 pr-1.5 mr-1 gap-0.5">
          <button
            type="button"
            onClick={() => execCmd("undo")}
            title="Desfazer (Ctrl+Z)"
            className="rounded p-1.5 text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground transition"
          >
            <Undo className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd("redo")}
            title="Refazer (Ctrl+Y)"
            className="rounded p-1.5 text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground transition"
          >
            <Redo className="h-4 w-4" />
          </button>
        </div>

        {/* Títulos / Estilos de Parágrafo */}
        <div className="flex items-center border-r border-border dark:border-white/10 pr-1.5 mr-1 gap-0.5">
          <button
            type="button"
            onClick={() => handleHeading("p")}
            title="Texto Normal"
            className="rounded px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground transition"
          >
            Normal
          </button>
          <button
            type="button"
            onClick={() => handleHeading("h1")}
            title="Título 1 (H1)"
            className="rounded p-1.5 text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground transition"
          >
            <Heading1 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleHeading("h2")}
            title="Título 2 (H2)"
            className="rounded p-1.5 text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground transition"
          >
            <Heading2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleHeading("h3")}
            title="Título 3 (H3)"
            className="rounded p-1.5 text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground transition"
          >
            <Heading3 className="h-4 w-4" />
          </button>
        </div>

        {/* Formatação básica (Bold, Italic, Underline, Strikethrough) */}
        <div className="flex items-center border-r border-border dark:border-white/10 pr-1.5 mr-1 gap-0.5">
          <button
            type="button"
            onClick={() => execCmd("bold")}
            title="Negrito (Ctrl+B)"
            className={`rounded p-1.5 transition ${
              activeFormats.bold
                ? "bg-primary/20 text-primary font-bold dark:bg-indigo-500/20 dark:text-indigo-400"
                : "text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground"
            }`}
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd("italic")}
            title="Itálico (Ctrl+I)"
            className={`rounded p-1.5 transition ${
              activeFormats.italic
                ? "bg-primary/20 text-primary font-bold dark:bg-indigo-500/20 dark:text-indigo-400"
                : "text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground"
            }`}
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd("underline")}
            title="Sublinhado (Ctrl+U)"
            className={`rounded p-1.5 transition ${
              activeFormats.underline
                ? "bg-primary/20 text-primary font-bold dark:bg-indigo-500/20 dark:text-indigo-400"
                : "text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground"
            }`}
          >
            <Underline className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd("strikeThrough")}
            title="Tachado"
            className={`rounded p-1.5 transition ${
              activeFormats.strikeThrough
                ? "bg-primary/20 text-primary font-bold dark:bg-indigo-500/20 dark:text-indigo-400"
                : "text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground"
            }`}
          >
            <Strikethrough className="h-4 w-4" />
          </button>
        </div>

        {/* Cores e Destaques */}
        <div className="flex items-center border-r border-border dark:border-white/10 pr-1.5 mr-1 gap-1">
          {/* Cor do Texto */}
          <div className="relative flex items-center" title="Cor do texto">
            <Palette className="h-3.5 w-3.5 text-muted-foreground mr-1" />
            <input
              type="color"
              defaultValue="#1e293b"
              onChange={(e) => handleColor(e.target.value)}
              className="h-6 w-6 cursor-pointer rounded border border-input bg-transparent p-0"
              title="Cor do Texto"
            />
          </div>
          {/* Marca-texto / Realce */}
          <div className="relative flex items-center" title="Cor de Realce / Marca-texto">
            <Highlighter className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 mr-1" />
            <input
              type="color"
              defaultValue="#fef08a"
              onChange={(e) => handleHighlight(e.target.value)}
              className="h-6 w-6 cursor-pointer rounded border border-input bg-transparent p-0"
              title="Cor de Realce"
            />
          </div>
        </div>

        {/* Alinhamento */}
        <div className="flex items-center border-r border-border dark:border-white/10 pr-1.5 mr-1 gap-0.5">
          <button
            type="button"
            onClick={() => execCmd("justifyLeft")}
            title="Alinhar à Esquerda"
            className="rounded p-1.5 text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground transition"
          >
            <AlignLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd("justifyCenter")}
            title="Centralizar"
            className="rounded p-1.5 text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground transition"
          >
            <AlignCenter className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd("justifyRight")}
            title="Alinhar à Direita"
            className="rounded p-1.5 text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground transition"
          >
            <AlignRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd("justifyFull")}
            title="Justificar"
            className="rounded p-1.5 text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground transition"
          >
            <AlignJustify className="h-4 w-4" />
          </button>
        </div>

        {/* Listas */}
        <div className="flex items-center border-r border-border dark:border-white/10 pr-1.5 mr-1 gap-0.5">
          <button
            type="button"
            onClick={() => execCmd("insertUnorderedList")}
            title="Lista com Marcadores"
            className="rounded p-1.5 text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground transition"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd("insertOrderedList")}
            title="Lista Numerada"
            className="rounded p-1.5 text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground transition"
          >
            <ListOrdered className="h-4 w-4" />
          </button>
        </div>

        {/* Inserções (Tabela, Link, Imagem, Dica, Linha) */}
        <div className="flex items-center border-r border-border dark:border-white/10 pr-1.5 mr-1 gap-0.5">
          <button
            type="button"
            onClick={handleInsertTable}
            title="Inserir Tabela"
            className="rounded p-1.5 text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground transition"
          >
            <TableIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleLink}
            title="Inserir Link"
            className="rounded p-1.5 text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground transition"
          >
            <LinkIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd("unlink")}
            title="Remover Link"
            className="rounded p-1.5 text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground transition"
          >
            <Unlink className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleImage}
            title="Inserir Imagem (URL)"
            className="rounded p-1.5 text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground transition"
          >
            <ImageIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleCallout("dica")}
            title="Inserir Dica em Destaque"
            className="rounded p-1.5 text-primary dark:text-amber-400 hover:bg-primary/10 dark:hover:bg-amber-400/10 transition"
          >
            <Lightbulb className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd("insertHorizontalRule")}
            title="Linha Divisória"
            className="rounded p-1.5 text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground transition"
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>

        {/* Limpar formatação */}
        <button
          type="button"
          onClick={() => execCmd("removeFormat")}
          title="Limpar Formatação"
          className="rounded p-1.5 text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground transition"
        >
          <RemoveFormatting className="h-4 w-4" />
        </button>
      </div>

      {/* ── Document Canvas (Área de Edição estilo Página do Word) ── */}
      <div className="bg-muted/40 dark:bg-black/30 p-4 md:p-6 overflow-y-auto" style={{ minHeight }}>
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onKeyUp={updateActiveFormats}
          onMouseUp={updateActiveFormats}
          data-placeholder={placeholder}
          className="rich-word-content outline-none min-h-[300px] w-full rounded-lg bg-card text-card-foreground p-6 shadow-sm border border-border dark:border-white/10 leading-relaxed transition font-sans text-sm"
          style={{ minHeight }}
        />
      </div>

      {/* ── Rodapé com Dica de Atalhos ────────────────────────── */}
      <div className="flex items-center justify-between border-t border-border dark:border-white/8 bg-muted/20 dark:bg-white/[0.02] px-4 py-2 text-[11px] text-muted-foreground">
        <span>💡 Dica: Você pode usar <strong>Ctrl+B</strong> (Negrito), <strong>Ctrl+I</strong> (Itálico) e <strong>Ctrl+U</strong> (Sublinhado).</span>
        <span className="font-mono text-[10px] opacity-70">Editor Visual Word WYSIWYG</span>
      </div>
    </div>
  );
}
