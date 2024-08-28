import { DateUpdate} from "./DateUpdate"

export interface CollaboratorItem {
  Titre: string;
  Collaborateur: { Title: string };
  Date: string;
  Statut: string;
  Manager: { Title: string };
}

export interface ManagerState {
    collaborators: string[];
    filteredCollaborators: string[];
    selectedCollaborator: string | undefined;
    dates: { date: string; status: string }[];
    openDialog: boolean;
    currentMonth: moment.Moment;
    tooltipMessage: string;
    emailError: string | undefined;
    updates: DateUpdate[];
    openDialogMotif: boolean;
    currentDate: string;
    motif: string;
    openSnackbar: boolean;
    snackbarMessage: string;
    collaboratorCount: number;
    openDialogCollab: boolean;
    isManager: boolean;
    loading:boolean,
    //
    collaboratorss: CollaboratorItem[];
    manager: string;
    filter: string;
    expanded: string;
  }