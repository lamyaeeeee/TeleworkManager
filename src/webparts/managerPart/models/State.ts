import { DateUpdate} from "./DateUpdate"

export interface State {
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
  }