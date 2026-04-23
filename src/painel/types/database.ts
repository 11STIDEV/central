export type TicketStatus = "waiting" | "called" | "attending" | "done" | "skipped";
export type QueueType = "normal" | "priority";
export type UserRole = "admin" | "attendant";

// Flat row types
export interface School {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  panel_message: string | null;
  created_at: string;
}

export interface Queue {
  id: string;
  school_id: string;
  name: string;
  prefix: string;
  description: string | null;
  is_active: boolean;
  priority_order: number;
  created_at: string;
}

export interface ServiceWindow {
  id: string;
  school_id: string;
  name: string;
  number: number;
  is_active: boolean;
  created_at: string;
}

export interface Ticket {
  id: string;
  school_id: string;
  queue_id: string;
  number: number;
  ticket_code: string;
  /** YYYY-MM-DD (America/Sao_Paulo) quando a tabela tiver a coluna pós-migration. */
  ticket_date?: string;
  type: QueueType;
  status: TicketStatus;
  called_at: string | null;
  attended_at: string | null;
  done_at: string | null;
  created_at: string;
}

export interface Call {
  id: string;
  school_id: string;
  ticket_id: string;
  service_window_id: string;
  attendant_id: string | null;
  called_at: string;
}

export interface Profile {
  id: string;
  school_id: string;
  full_name: string;
  role: UserRole;
  service_window_id: string | null;
  created_at: string;
}

// Insert types
export type SchoolInsert = Omit<School, "id" | "created_at">;
export type QueueInsert = Omit<Queue, "id" | "created_at">;
export type ServiceWindowInsert = Omit<ServiceWindow, "id" | "created_at">;
export type TicketInsert = Omit<Ticket, "id" | "created_at">;
export type CallInsert = Omit<Call, "id">;
export type ProfileInsert = Omit<Profile, "created_at">;

// Supabase Database type — requires Relationships on each table
export interface Database {
  public: {
    Tables: {
      schools: {
        Row: School;
        Insert: SchoolInsert;
        Update: Partial<SchoolInsert>;
        Relationships: [];
      };
      queues: {
        Row: Queue;
        Insert: QueueInsert;
        Update: Partial<QueueInsert>;
        Relationships: [];
      };
      service_windows: {
        Row: ServiceWindow;
        Insert: ServiceWindowInsert;
        Update: Partial<ServiceWindowInsert>;
        Relationships: [];
      };
      tickets: {
        Row: Ticket;
        Insert: TicketInsert;
        Update: Partial<TicketInsert>;
        Relationships: [];
      };
      calls: {
        Row: Call;
        Insert: CallInsert;
        Update: Partial<CallInsert>;
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: Partial<ProfileInsert>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_next_ticket_number: {
        Args: { p_queue_id: string };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
  };
}

export interface CallWithDetails extends Call {
  ticket: Ticket & { queue: Queue };
  service_window: ServiceWindow;
}

