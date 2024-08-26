import {SavedDate} from "./SavedDate"

export interface State {
    selectedDates: Set<string>;
    deletedDates: Set<string>;
    currentMonth: moment.Moment;
    savedDates: Map<string, SavedDate>;
    showModal: boolean;
    tooltipMessages: { [date: string]: string };
    managerEmail: string;
    modalType: "save" | "send" | "";
    managerEmails: string[];
    emailError: string | undefined;
    
  }
  