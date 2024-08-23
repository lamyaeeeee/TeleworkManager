import React, { Component } from "react";
import moment from "moment";
import {
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Typography,
  Tooltip,
  TextField,
  InputAdornment,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import styles from "./CollaboratorPart.module.scss";
import { formatDate, getDaysInMonth } from "../services/dateService"
import {
  saveDate,
  deleteDate,
  getSavedDates,
  getManagerEmails,
  updateDatesWithManager,
} from "../services/calendarService";
import {
  sendTeleworkRequest,
  getCollaboratorEmail,
} from "../services/emailService";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import Autocomplete from "@mui/material/Autocomplete";
import {SavedDate} from "../models/SavedDate";
import {Props} from "../models/Props";
import {State} from "../models/State";

import {  TeleworkRequest} from "../models/TeleworkRquest";

class CollaboratorPart extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      selectedDates: new Set(),
      deletedDates: new Set(),
      currentMonth: moment().startOf("month"),
      savedDates: new Map<string, SavedDate>(),
      showModal: false,
      tooltipMessages: {},
      managerEmail: "",
      modalType: "",
      managerEmails: [],
      emailError: null,
    };
  }

  async componentDidMount(): Promise<void> {
    const { collaborator } = this.props;

    try {
      const savedDatesArray = await getSavedDates(collaborator);
      const managerEmails = await getManagerEmails();

      const savedDatesMap = new Map<string, SavedDate>(
        savedDatesArray.map((item) => [
          formatDate(item.date),
          {
            status: item.status,
            hasManager: item.hasManager,
            motif: item.motif,
          },
        ])
      );

      const selectedDates = new Set(
        [...savedDatesMap.entries()]
          .filter(([_, dateData]) => dateData.status === "En attente")
          .map(([date]) => date)
      );

      this.setState({
        savedDates: savedDatesMap,
        selectedDates,
        managerEmails: managerEmails.map((item) => item.email),
      });
      console.log("voila hadu li recuperna :", savedDatesMap);
    } catch (error) {
      console.error("Erreur lors du chargement des données :", error);
    }
  }

  handleDateClick = (date: string): void => {
    const dayOfWeek = moment(date).day();
    const isPastDate = moment(date).isBefore(moment(), "day");
    const status = this.state.savedDates.get(date)?.status;

    if (dayOfWeek === 0 || dayOfWeek === 6 || isPastDate) return;

    this.setState((prevState) => {
      const { selectedDates, deletedDates, savedDates } = prevState;

      const newSelectedDates = new Set(selectedDates);
      const newDeletedDates = new Set(deletedDates);
      const newSavedDates = new Map(savedDates);

      if (newSelectedDates.has(date)) {
        newSelectedDates.delete(date);
        newDeletedDates.add(date);
      } else if (status === "En attente") {
        newSelectedDates.delete(date);
        newDeletedDates.add(date);
        newSavedDates.delete(date);
      } else if (status === "Approuvé") {
        newSavedDates.delete(date);
        newDeletedDates.add(date);
      } else {
        newSelectedDates.add(date);
        newDeletedDates.delete(date);
      }

      return {
        selectedDates: newSelectedDates,
        deletedDates: newDeletedDates,
        savedDates: newSavedDates,
      };
    });
  };

  handleSave = async (manager: string): Promise<void> => {
    const { collaborator } = this.props;
    const { selectedDates, deletedDates } = this.state;

    for (const date of selectedDates) {
      const saveSuccess = await saveDate(
        `Demande de ${collaborator}`,
        collaborator,
        date,
        "En attente",
        manager
      );
      if (!saveSuccess) {
        //    console.log(`La date ${date} existe déjà pour ${collaborator}.`);
      }
    }

    const savedDatesFormatted = Array.from(selectedDates).map((date) =>
      formatDate(date)
    );
    this.setState((prevState) => {
      if (!(prevState.savedDates instanceof Map)) {
        console.error("savedDates n'est pas une instance de Map.");
        return null;
      }

      const updatedSavedDates = new Map(prevState.savedDates);

      const defaultSavedDate: SavedDate = {
        status: "En attente",
        hasManager: false,
      };

      savedDatesFormatted.forEach((date) => {
        updatedSavedDates.set(date, defaultSavedDate);
      });

      return {
        savedDates: updatedSavedDates,
      };
    });

    for (const date of deletedDates) {
      await deleteDate(date, collaborator);
    }

    this.setState({ deletedDates: new Set(), modalType: "save" });
  };

  handleSendRequest = async (): Promise<void> => {
    const { managerEmail, selectedDates, managerEmails } = this.state;

    if (!managerEmails.includes(managerEmail)) {
      this.setState({ emailError: "L'email du manager n'est pas valide." });
      return;
    }

    this.setState({ emailError: null });

    const updateSuccess = await updateDatesWithManager(
      this.props.collaborator,
      managerEmail
    );
    if (!updateSuccess) {
      console.error("Échec de la mise à jour des dates avec le manager.");
      return;
    }

    await this.handleSave(managerEmail);

    const { collaborator, spHttpClient, siteUrl } = this.props;
    const collaboratorEmail = await getCollaboratorEmail(collaborator);

    if (!collaboratorEmail) {
      console.error("Impossible de récupérer l'email du collaborateur.");
      return;
    }

    const teleworkRequest: TeleworkRequest = {
      collaborator,
      dates: Array.from(selectedDates),
      managerEmail,
      collaboratorEmail,
    };

    const sendSuccess = await sendTeleworkRequest(
      spHttpClient,
      siteUrl,
      teleworkRequest
    );

    if (sendSuccess) {
      this.setState({ modalType: "send" });
    } else {
      console.error("Échec de l'envoi de la demande.");
    }
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

  handleNavigateToMonth = (date: string): void => {
    const newMonth = moment(date).startOf("month");
    this.setState({ currentMonth: newMonth });
  };

  handleCloseModal = (): void => {
    this.setState({ showModal: false, modalType: "" });
  };

  handleMouseOver = (date: string): void => {
    const savedDate = this.state.savedDates.get(date);

    if (savedDate && savedDate.status === "Rejeté" && savedDate.motif) {
      this.setState((prevState) => ({
        tooltipMessages: {
          ...prevState.tooltipMessages,
          [date]: `Motif du refus pour ${date}: ${savedDate.motif}`,
        },
      }));
    }
  };

  handleMouseOut = (date: string): void => {
    this.setState((prevState) => ({
      tooltipMessages: {
        ...prevState.tooltipMessages,
        [date]: "",
      },
    }));
  };

  handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    this.setState({
      managerEmail: event.target.value,
      emailError: null,
    });
  };

  render(): JSX.Element {
    const { currentMonth, selectedDates, tooltipMessages, managerEmail } =
      this.state;
    const days = getDaysInMonth(currentMonth);
    const weekdays = ["Lun", "Mar", "Mer", "Jeu", "Ven"];

    return (
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div style={{ textAlign: "center", flex: 1 }}>
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
              Planning de Télétravail
            </Typography>
          </div>
          <div style={{ marginLeft: "auto", marginRight: "16px" }}>
            <Tooltip
              title={
                <span style={{ fontSize: "18px" }}>
                  Enregistrer le calendrier
                </span>
              }
              arrow
            >
              <EventAvailableIcon
                onClick={() => this.handleSave("")}
                style={{
                  cursor: "pointer",
                  color: "#2e7cb3",
                  fontSize: "45px",
                }}
              />
            </Tooltip>
          </div>
        </div>

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
              {Array.from(
                { length: Math.ceil(days.length / 5) },
                (_, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {days.slice(rowIndex * 5, (rowIndex + 1) * 5).map((day) => {
                      const dateStr = day.date.format("YYYY-MM-DD");
                      const isSelected = selectedDates.has(dateStr);
                      const isToday = moment().isSame(day.date, "day");
                      const isPastDate = moment(dateStr).isBefore(
                        moment(),
                        "day"
                      );
                      const isCurrentMonth = day.isCurrentMonth;
                      const { status, hasManager } =
                        this.state.savedDates.get(dateStr) || {};
                      const statusClass =
                        status === "En attente"
                          ? hasManager
                            ? styles.done
                            : styles.selected
                          : "";

                      return (
                        <TableCell
                          key={dateStr}
                          className={`${styles.calendarDay} ${
                            isToday ? styles.today : ""
                          } ${isPastDate ? styles.pastDate : ""} ${
                            isSelected ? styles.selected : ""
                          } ${statusClass} ${
                            !isCurrentMonth ? styles.otherMonth : ""
                          } ${status === "Approuvé" ? styles.approved : ""} ${
                            status === "Rejeté" ? styles.rejected : ""
                          }`}
                          onClick={() => {
                            if (isCurrentMonth && !isPastDate) {
                              this.handleDateClick(dateStr);
                            } else if (!isCurrentMonth) {
                              this.handleNavigateToMonth(dateStr);
                            }
                          }}
                          onMouseOver={() => this.handleMouseOver(dateStr)}
                          onMouseOut={() => this.handleMouseOut(dateStr)}
                        >
                          <div className={styles.date}>{day.date.date()}</div>
                          <div
                            className={`${styles.circle} ${
                              isSelected ? styles.selectedCircle : ""
                            } ${
                              status === "Approuvé" ? styles.approvedCircle : ""
                            } ${
                              status === "Rejeté" ? styles.rejectedCircle : ""
                            }`}
                          />
                          {status === "Rejeté" && tooltipMessages[dateStr] && (
                            <Tooltip
                              title={tooltipMessages[dateStr]} // Tooltip spécifique à chaque jour
                              placement="top"
                              arrow
                            >
                              <div className={styles.tooltip}>
                                {tooltipMessages[dateStr]}
                              </div>
                            </Tooltip>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <br />

        <br />
        <div style={{ position: "relative", marginBottom: "20px" }}>
          {/* Message d'erreur */}
          {this.state.emailError && (
            <div style={{ color: "red", marginBottom: "8px" }}>
              {this.state.emailError}
            </div>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ flex: 1 }}>
              <Autocomplete
                options={this.state.managerEmails}
                getOptionLabel={(option) => option}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Sélectionner le manager"
                    variant="outlined"
                    fullWidth
                    value={managerEmail}
                    onChange={this.handleEmailChange}
                    InputProps={{
                      ...params.InputProps,
                      style: { fontSize: "18px" },
                      endAdornment: (
                        <InputAdornment position="end">
                          <Tooltip
                            title={
                              <span style={{ fontSize: "18px" }}>
                                Envoyer la demande au manager
                              </span>
                            }
                            arrow
                          >
                            <IconButton
                              onClick={this.handleSendRequest}
                              disabled={!managerEmail}
                              edge="end"
                              style={{ padding: 0 }}
                            >
                              <SendIcon
                                style={{
                                  color: this.state.emailError
                                    ? "red"
                                    : managerEmail
                                    ? "#3f51b5"
                                    : "grey",
                                  fontSize: "30px",
                                }}
                              />
                            </IconButton>
                          </Tooltip>
                        </InputAdornment>
                      ),
                    }}
                    InputLabelProps={{
                      style: { fontSize: "18px" },
                    }}
                    error={!!this.state.emailError}
                    helperText={null}
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props} style={{ fontSize: "18px" }}>
                    {option}
                  </li>
                )}
                value={managerEmail}
                onChange={(event, newValue) => {
                  this.setState({ managerEmail: newValue || "" });
                }}
              />
            </div>
          </div>
        </div>

        <div
          style={{ width: "100%", height: "70px", backgroundColor: "white" }}
        >
          {/* juste pour l'affichage */}
        </div>
        <Dialog open={!!this.state.modalType} onClose={this.handleCloseModal}>
          <DialogTitle>Confirmation</DialogTitle>
          <DialogContent>
            <DialogContentText>
              {this.state.modalType === "save"
                ? "Les dates ont été enregistrées avec succès."
                : "Votre demande a été envoyée au manager."}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={this.handleCloseModal} color="primary">
              Fermer
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    );
  }
}

export default CollaboratorPart;
