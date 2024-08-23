type Status = "Approuvé" | "Rejeté" | "En attente";
export interface DateUpdate {
    date: string;
    status: Status;
    motif?: string;
  }
  