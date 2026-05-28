import { Building2, School } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { LOST_FOUND_DELIVERY_METHODS, LOST_FOUND_SCHOOL_PERIODS } from "@/achadosperdidos/constants";
import type { LostFoundDeliveryMethod, LostFoundItem, LostFoundSchoolPeriod } from "@/achadosperdidos/types";
import { cn } from "@/lib/utils";

export type ClaimFormState = {
  name: string;
  email: string;
  phone: string;
  deliveryMethod: LostFoundDeliveryMethod | "";
  studentName: string;
  studentClass: string;
  schoolPeriod: LostFoundSchoolPeriod | "";
};

type ActionsProps = {
  onSubmit: () => void;
  onCancel: () => void;
  sending: boolean;
  className?: string;
};

export function ClaimItemFormActions({ onSubmit, onCancel, sending, className }: ActionsProps) {
  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row", className)}>
      <Button type="button" className="min-h-11 flex-1" onClick={onSubmit} disabled={sending}>
        {sending ? "Enviando..." : "Enviar solicitação"}
      </Button>
      <Button type="button" variant="ghost" className="min-h-11" onClick={onCancel} disabled={sending}>
        Cancelar
      </Button>
    </div>
  );
}

type Props = {
  item: LostFoundItem;
  form: ClaimFormState;
  onChange: (form: ClaimFormState) => void;
  onSubmit: () => void;
  onCancel: () => void;
  sending: boolean;
  showActions?: boolean;
};

export function ClaimItemForm({
  item,
  form,
  onChange,
  onSubmit,
  onCancel,
  sending,
  showActions = true,
}: Props) {
  const showClassroomFields = form.deliveryMethod === "sala_aula";

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Você está reivindicando: <strong className="text-foreground">{item.title}</strong>
      </p>

      <div className="space-y-2">
        <Label htmlFor="claim-name">Nome *</Label>
        <Input
          id="claim-name"
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          placeholder="Seu nome completo"
          autoComplete="name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="claim-email">E-mail *</Label>
        <Input
          id="claim-email"
          value={form.email}
          onChange={(e) => onChange({ ...form, email: e.target.value })}
          placeholder="seu@email.com"
          type="email"
          autoComplete="email"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="claim-phone">Telefone *</Label>
        <Input
          id="claim-phone"
          value={form.phone}
          onChange={(e) => onChange({ ...form, phone: e.target.value })}
          placeholder="(00) 00000-0000"
          type="tel"
          autoComplete="tel"
          required
        />
      </div>

      <div className="space-y-3">
        <Label>Como deseja receber o item? *</Label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {LOST_FOUND_DELIVERY_METHODS.map(({ value, label }) => {
            const selected = form.deliveryMethod === value;
            const Icon = value === "secretaria" ? Building2 : School;
            return (
              <button
                key={value}
                type="button"
                onClick={() =>
                  onChange({
                    ...form,
                    deliveryMethod: value,
                    ...(value === "secretaria"
                      ? { studentName: "", studentClass: "", schoolPeriod: "" }
                      : {}),
                  })
                }
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-all",
                  selected
                    ? "border-primary bg-primary/5 text-foreground shadow-sm"
                    : "border-border bg-card hover:border-primary/40",
                )}
              >
                <Icon className={cn("h-5 w-5 shrink-0", selected ? "text-primary" : "text-muted-foreground")} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {showClassroomFields ? (
        <div className="animate-fade-in space-y-4 rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-sm font-medium text-foreground">Dados para entrega na sala</p>
          <div className="space-y-2">
            <Label htmlFor="claim-student">Nome do aluno *</Label>
            <Input
              id="claim-student"
              value={form.studentName}
              onChange={(e) => onChange({ ...form, studentName: e.target.value })}
              placeholder="Nome do aluno"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="claim-class">Turma *</Label>
            <Input
              id="claim-class"
              value={form.studentClass}
              onChange={(e) => onChange({ ...form, studentClass: e.target.value })}
              placeholder="Ex.: 3º ano A"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Período *</Label>
            <RadioGroup
              value={form.schoolPeriod}
              onValueChange={(value) =>
                onChange({ ...form, schoolPeriod: value as LostFoundSchoolPeriod })
              }
              className="flex flex-wrap gap-4"
            >
              {LOST_FOUND_SCHOOL_PERIODS.map(({ value, label }) => (
                <div key={value} className="flex items-center gap-2">
                  <RadioGroupItem value={value} id={`period-${value}`} />
                  <Label htmlFor={`period-${value}`} className="cursor-pointer font-normal">
                    {label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>
      ) : null}

      {showActions ? (
        <ClaimItemFormActions onSubmit={onSubmit} onCancel={onCancel} sending={sending} />
      ) : null}
    </div>
  );
}
