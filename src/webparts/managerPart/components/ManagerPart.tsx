import * as React from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import moment from "moment";
import {
  getCollaboratorsByManager,
  getSavedDates,
  updateDatesWithManager,
} from "../services/managerService";
import styles from "./ManagerPart.module.scss";
import { getDaysInMonth } from "../../collaboratorPart/services/dateService";
import { getManagerEmails } from "../../collaboratorPart/services/calendarService";
import {
  getCollaboratorEmail,
  sendUpdateNotification,
} from "../../collaboratorPart/services/emailService";
import {
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Typography,
  Container,
} from "@mui/material";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import Button from "@mui/material/Button";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HighlightOffSharpIcon from "@mui/icons-material/HighlightOffSharp";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";

import DialogTitle from "@mui/material/DialogTitle";
import CloseIcon from "@mui/icons-material/Close";
import Paper from "@mui/material/Paper";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { Props } from "../models/Props";
import { State } from "../models/State";
type Status = "Approuvé" | "Rejeté" | "En attente";
import { sp } from "@pnp/sp/presets/all";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import CircularProgress from "@mui/material/CircularProgress";
import { AjouterButton ,AnnulerButton} from './button'; 
class ManagerPart extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      collaborators: [],
      filteredCollaborators: [],
      selectedCollaborator: undefined,
      dates: [],
      currentMonth: moment().startOf("month"),
      tooltipMessage: "",
      emailError: undefined,
      openDialog: false,
      updates: [],
      openDialogMotif: false,
      currentDate: "",
      motif: "",
      openSnackbar: false,
      snackbarMessage: "",
      collaboratorCount: 0,
      openDialogCollab: false,
      isManager: false,
      loading: true,
    };
  }

  async componentDidMount(): Promise<void> {
    const { manager } = this.props;
    const user = await sp.web.currentUser.get();
    const userEmail = user.Email;
    try {
      const managers = await getManagerEmails();
      const isManager = managers.some((manager) => manager.email === userEmail);
      this.setState({ isManager, loading: false });
      if (isManager) {
        const collaborators = await getCollaboratorsByManager(manager);
        this.setState({
          collaborators,
          filteredCollaborators: collaborators,
          collaboratorCount: collaborators.length,
        });
      } else {
        this.setState({ isManager });
      }
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des collaborateurs :",
        error
      );
    }
  }

  async componentDidUpdate(prevProps: Props, prevState: State): Promise<void> {
    if (prevState.selectedCollaborator !== this.state.selectedCollaborator) {
      await this.loadDates();
    }
  }
  handleInputChange = async (
    event: React.ChangeEvent<{}>,
    value: string | undefined
  ): Promise<void> => {
    this.setState({ selectedCollaborator: value }, async () => {
      if (value) {
        await this.loadDates();
        this.handleCloseDialogCollab();
      }
    });
  };

  handleOpenDialogMotif = (date: string): void => {
    this.setState({ openDialogMotif: true, currentDate: date });
  };

  handleCloseDialogMotif = (): void => {
    this.setState({ openDialogMotif: false, motif: "" });
  };

  handleMotifChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    this.setState({ motif: event.target.value });
  };

  handleSaveMotif = (): void => {
    const { currentDate, motif } = this.state;
    if (!motif) return;

    this.updateStatus(currentDate, "Rejeté", motif);
    this.setState({ openDialogMotif: false, motif: "" });
  };

  handleStatusChange = (date: string, newStatus: Status): void => {
    if (newStatus === "Rejeté") {
      this.handleOpenDialogMotif(date);
    } else {
      this.updateStatus(date, newStatus);
    }
  };
  updateStatus = (date: string, newStatus: Status, motif?: string): void => {
    this.setState((prevState) => {
      const existingUpdate = prevState.updates.find(
        (update) => update.date === date
      );
      let newUpdates;
      if (existingUpdate) {
        newUpdates = prevState.updates.map((update) =>
          update.date === date
            ? { ...update, status: newStatus, motif: motif || update.motif }
            : update
        );
      } else {
        newUpdates = [
          ...prevState.updates,
          { date, status: newStatus, motif: motif || "" },
        ];
      }
      return { updates: newUpdates };
    });
  };

  handleSave = async (): Promise<void> => {
    const { selectedCollaborator } = this.state;
    const { manager, spHttpClient, siteUrl } = this.props;

    if (selectedCollaborator) {
      try {
        await updateDatesWithManager(
          selectedCollaborator,
          this.state.updates,
          manager
        );
        this.setState({
          openSnackbar: true,
          snackbarMessage: "Les mises à jour ont été enregistrées avec succès.",
        });

        const collaboratorEmail = await getCollaboratorEmail(
          selectedCollaborator
        );
        if (collaboratorEmail) {
          const emailSent = await sendUpdateNotification(
            spHttpClient,
            siteUrl,
            collaboratorEmail,
            this.state.updates
          );
          if (emailSent) {
            console.log("Email de notification envoyé avec succès.");
          } else {
            console.error("Échec de l'envoi de l'email de notification.");
          }
        }
      } catch (error) {
        console.error(
          "Erreur lors de l'enregistrement des mises à jour :",
          error
        );
      }
    }
  };

  handleCloseSnackbar = (): void => {
    this.setState({ openSnackbar: false });
  };

  async loadDates(): Promise<void> {
    const { selectedCollaborator } = this.state;
    const { manager } = this.props;
    if (selectedCollaborator) {
      try {
        const dates = await getSavedDates(selectedCollaborator, manager);

        const formattedDates = dates.map((date) => ({
          date: moment(date.date).format("YYYY-MM-DD"),
          status: date.status,
        }));

        this.setState({ dates: formattedDates });
      } catch (error) {
        console.error("Erreur lors de la récupération des dates :", error);
      }
    }
  }

  handleNavigateToMonth = (date: string): void => {
    const newMonth = moment(date).startOf("month");
    this.setState({ currentMonth: newMonth });
  };

  handlePrevMonth = (): void => {
    this.setState((prevState) => ({
      currentMonth: prevState.currentMonth.clone().subtract(1, "month"),
    }));
  };

  handleNextMonth = (): void => {
    this.setState((prevState) => ({
      currentMonth: prevState.currentMonth.clone().add(1, "month"),
    }));
  };
  handleOpenDialog = (): void => {
    this.setState({ openDialog: true });
  };

  handleCloseDialog = (): void => {
    this.setState({ openDialog: false, selectedCollaborator: undefined });
  };
  handleOpenDialogCollab = (): void => {
    this.setState({ openDialogCollab: true });
  };
  handleCloseDialogCollab = (): void => {
    this.setState({ openDialogCollab: false });
  };
  handleRedirect = (): void => {
    window.location.href = "/sites/communicationtools"; //remplacons ca apres avec le lien de la page de redirection
  };
  render(): JSX.Element {
    const {
      currentMonth,
      filteredCollaborators,
      selectedCollaborator,
      dates,
      openSnackbar,
      snackbarMessage,
      openDialogCollab,
      collaboratorCount,
      isManager,
      loading,
    } = this.state;
    const days = getDaysInMonth(currentMonth);
    const weekdays = ["Lun", "Mar", "Mer", "Jeu", "Ven"];
    if (loading) {
      return (
        <Container
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "300px",
          }}
        >
          <CircularProgress />
        </Container>
      );
    }
    if (!isManager) {
      return (
        <Container
          maxWidth="sm"
          style={{ textAlign: "center", marginTop: "50px" }}
        >
          <ErrorOutlineIcon style={{ fontSize: 80, color: "#d32f2f" }} />
          <Typography
            variant="h4"
            style={{ marginTop: "20px", marginBottom: "20px" }}
          >
            Accès refusé
          </Typography>
          <Typography variant="body1" style={{ marginBottom: "30px" }}>
            Vous n&apos;avez pas les droits nécessaires pour accéder à cette
            page.
          </Typography>
          <Button
            style={{
              backgroundColor: "#047bb3",
              borderRadius: "8px", 
              color: "#fff",
              textTransform: "none",
              fontSize: "16px",
              padding: "8px 18px",
            }}
            variant="contained"
            onClick={this.handleRedirect}
          >
            Retour à l&apos;accueil
          </Button>
        </Container>
      );
    }

    return (
      <div>
        <br />
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "20px",
          }}
        >
           <AjouterButton
      variant="contained"
      onClick={this.handleOpenDialogCollab}
    >
      Choisir collaborateur
    </AjouterButton>
        </div>

        <Dialog
          open={openDialogCollab}
          onClose={this.handleCloseDialogCollab}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              height: "400px",
              minHeight: "300px",
            },
          }}
        >
          <DialogTitle>
            Choisir Collaborateur
            <IconButton
              aria-label="close"
              onClick={this.handleCloseDialogCollab}
              sx={{
                position: "absolute",
                right: 8,
                top: 8,
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Typography variant="body1" gutterBottom>
              Choisissez un collaborateur parmi la liste ci-dessous pour
              visualiser et approuver les demandes de télétravail qui vous ont
              été soumises.
            </Typography>

            <Autocomplete
              freeSolo
              options={filteredCollaborators}
              onInputChange={this.handleInputChange}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Rechercher un collaborateur..."
                  variant="outlined"
                  fullWidth
                />
              )}
              PaperComponent={(props) => (
                <Paper
                  {...props}
                  sx={{
                    maxHeight: collaboratorCount > 3 ? "140px" : "none",
                    overflowY: collaboratorCount > 3 ? "auto" : "visible",
                  }}
                />
              )}
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button
              onClick={this.handleCloseDialogCollab}
              color="primary"
              variant="outlined"
            >
              Annuler
            </Button>
          </DialogActions>
        </Dialog>

        <div style={{ textAlign: "center", marginTop: "20px" }}>
          {!selectedCollaborator ? (
            <Typography variant="h4" className={styles.customTitle}>
              Aucun collaborateur sélectionné
            </Typography>
          ) : (
            <Typography
              variant="h4"
              className={styles.customTitle}
              style={{
                color: "#FFF",
                padding: "8px",
                borderRadius: "8px",
                display: "inline-block",
              }}
            >
              Dates pour {selectedCollaborator}
            </Typography>
          )}

          <div className={styles.naviDate}>
            <IconButton
              onClick={this.handlePrevMonth}
              className={styles.customIconButton}
            >
              <ArrowBackIcon />
            </IconButton>

            <Typography variant="h4" className={styles.customMonth}>
              {currentMonth.format("MMMM YYYY")}
            </Typography>

            <IconButton
              onClick={this.handleNextMonth}
              className={styles.customIconButton}
            >
              <ArrowForwardIcon />
            </IconButton>
          </div>
          <TableContainer
            style={{
              borderRadius: "8px",
              overflow: "hidden",
              boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
            }}
          >
            <Table>
              <TableHead>
                <TableRow>
                  {weekdays.map((day) => (
                    <TableCell key={day} className={styles.weekday}>
                      {day}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {!selectedCollaborator ? (
                  <TableRow>
                    <TableCell
                      colSpan={weekdays.length}
                      style={{
                        textAlign: "center",
                        padding: "20px",
                        verticalAlign: "middle",
                      }}
                    >
                      <Typography
                        variant="body1"
                        style={{ color: "#526D82", margin: "0" }}
                      >
                        Veuillez choisir un collaborateur pour afficher les
                        dates de télétravail.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  Array.from(
                    { length: Math.ceil(days.length / 5) },
                    (_, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {days
                          .slice(rowIndex * 5, (rowIndex + 1) * 5)
                          .map((day) => {
                            const dateStr = day.date.format("YYYY-MM-DD");
                            const isToday = moment().isSame(day.date, "day");
                            const isPastDate = moment(dateStr).isBefore(
                              moment(),
                              "day"
                            );
                            const isCurrentMonth = day.isCurrentMonth;

                            const dateInfo = dates.find(
                              (d) => d.date === dateStr
                            );
                            const status = dateInfo
                              ? dateInfo.status
                              : undefined;

                            const statusClass =
                              status === "En attente"
                                ? styles.selected
                                : status === "Approuvé"
                                ? styles.approved
                                : status === "Rejeté"
                                ? styles.rejected
                                : "";

                            return (
                              <TableCell
                                key={dateStr}
                                className={`${styles.calendarDay} ${
                                  isToday ? styles.today : ""
                                } ${
                                  isPastDate ? styles.pastDate : ""
                                } ${statusClass} ${
                                  !isCurrentMonth ? styles.otherMonth : ""
                                }`}
                                onClick={() => {
                                  if (!isCurrentMonth) {
                                    this.handleNavigateToMonth(dateStr);
                                  }
                                }}
                              >
                                <div className={styles.circleWrapper}>
                                  <div
                                    className={`${styles.circle} ${
                                      status === "En attente"
                                        ? styles.pendingCircle
                                        : status === "Approuvé"
                                        ? styles.approvedCircle
                                        : status === "Rejeté"
                                        ? styles.rejectedCircle
                                        : ""
                                    }`}
                                  >
                                    <div className={styles.date}>
                                      {day.date.date()}
                                    </div>
                                  </div>
                                  {status === "En attente" && (
                                    <div className={styles.statusWrapper}>
                                      <IconButton
                                        className={styles.pendingIcon}
                                        onClick={() =>
                                          this.handleStatusChange(
                                            dateStr,
                                            "Approuvé"
                                          )
                                        }
                                      >
                                        {this.state.updates.find(
                                          (update) =>
                                            update.date === dateStr &&
                                            update.status === "Approuvé"
                                        ) ? (
                                          <CheckCircleIcon
                                            className={styles.approvedIcon}
                                          />
                                        ) : (
                                          <CheckCircleOutlineIcon
                                            style={{ fontSize: "40px" }}
                                          />
                                        )}
                                      </IconButton>
                                      <IconButton
                                        className={styles.pendingIcon}
                                        onClick={() =>
                                          this.handleStatusChange(
                                            dateStr,
                                            "Rejeté"
                                          )
                                        }
                                      >
                                        {this.state.updates.find(
                                          (update) =>
                                            update.date === dateStr &&
                                            update.status === "Rejeté"
                                        ) ? (
                                          <CancelOutlinedIcon
                                            className={styles.rejectedIcon}
                                          />
                                        ) : (
                                          <HighlightOffSharpIcon
                                            style={{ fontSize: "40px" }}
                                          />
                                        )}
                                      </IconButton>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            );
                          })}
                      </TableRow>
                    )
                  )
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {selectedCollaborator && (
            <div className={styles.dialogHeader}>
              
              <AnnulerButton
        variant="contained"
        onClick={this.handleCloseDialog}
      >
        Annuler
      </AnnulerButton>

             


              <AjouterButton
      variant="contained"
      onClick={this.handleSave}
    >
      Sauvegarder
    </AjouterButton>
             
            </div>
          )}
        </div>

        <Dialog
          open={this.state.openDialogMotif}
          onClose={this.handleCloseDialogMotif}
          maxWidth="sm"
          fullWidth
        >
          <DialogContent>
            <Typography variant="h6" gutterBottom>
              Motif du rejet
            </Typography>
            <Typography variant="body1" color="textSecondary" paragraph>
              Veuillez fournir une explication détaillée pour le rejet afin que
              le collaborateur puisse comprendre les raisons de la décision.
              Votre feedback est essentiel pour améliorer le processus et aider
              le collaborateur à s&apos;ajuster en conséquence.
            </Typography>

            <TextField
              autoFocus
              margin="dense"
              label="Motif"
              type="text"
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              value={this.state.motif}
              onChange={this.handleMotifChange}
            />
          </DialogContent>
          <DialogActions>
            <Button
              onClick={this.handleSaveMotif}
              color="primary"
              variant="contained"
            >
              Enregistrer
            </Button>
            <Button
              onClick={this.handleCloseDialogMotif}
              color="secondary"
              variant="outlined"
            >
              Annuler
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={openSnackbar}
          autoHideDuration={6000}
          onClose={this.handleCloseSnackbar}
        >
          <Alert onClose={this.handleCloseSnackbar} severity="success">
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </div>
    );
  }
}

export default ManagerPart;
