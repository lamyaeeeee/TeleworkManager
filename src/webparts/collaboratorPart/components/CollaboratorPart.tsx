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
import { formatDate, getDaysInMonth } from "../../../services/dateService";
import {
  saveDate,
  deleteDate,
  getSavedDates,
  getManagerEmails,
  updateDatesWithManager,
} from "../../../services/calendarService";
import {
  sendTeleworkRequest,
  getCollaboratorEmail,
} from "../../../services/emailService";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import Autocomplete from "@mui/material/Autocomplete";
import { SavedDate } from "../../../models/SavedDate";

import { State } from "../../../models/State";
import { TeleworkRequest } from "../../../models/TeleworkRquest";

import Box from "@mui/material/Box";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { ICollaboratorPartProps } from "./ICollaboratorPartProps";
import { sp } from "@pnp/sp/presets/all";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
type HandleChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => void;
class CollaboratorPart extends Component<ICollaboratorPartProps, State> {
  constructor(props: ICollaboratorPartProps) {
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
      emailError: undefined,
      expanded: "",
    };
    
  }

  async componentDidMount(): Promise<void> {
    sp.setup({
      sp: {
        baseUrl: "https://ibsugoy.sharepoint.com/sites/communicationtools",
      },
    });
    const collaborator = this.props.userDisplayName;
    console.log("voila toi :", collaborator)
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
    const collaborator = this.props.context.pageContext.user.displayName;
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

    this.setState({ emailError: undefined });

    const updateSuccess = await updateDatesWithManager(
      this.props.context.pageContext.user.displayName,
      managerEmail
    );
    if (!updateSuccess) {
      console.error("Échec de la mise à jour des dates avec le manager.");
      return;
    }

    await this.handleSave(managerEmail);

    const spHttpClient = this.props.context.spHttpClient;
    const siteUrl = this.props.context.pageContext.web.absoluteUrl;
    const collaborator = this.props.context.pageContext.user.displayName;
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
      emailError: undefined,
    });
  };
  handleRedirect = (): void => {
    window.location.href = "/sites/communicationtools"; //on doit remplacer ca par le lien de notre page 1
  };

  //
  handleChange: HandleChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    this.setState({ expanded: isExpanded ? panel : '' });
  };
  render(): JSX.Element {
    const { currentMonth, selectedDates, tooltipMessages, managerEmail } =
      this.state;
    const days = getDaysInMonth(currentMonth);
    const weekdays = ["Lun", "Mar", "Mer", "Jeu", "Ven"];
    const backgroundImage = `${require("../assets/guidelines.png")}?w=50&h=50&fit=crop&auto=format`;

    return (
      <div>
        <div>
          <Box>
          <Accordion style={{
                        padding: "16px",
                        borderRadius: "10px",
                        backgroundColor: "rgb(255, 255, 255)",
                        boxShadow: "rgba(0, 0, 0, 0.08) 1px 2px 6px 4px",
                    }}>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="panel1-content"
                id="panel1-header"
              sx={{
                  fontSize: '1.25rem',
                  padding: '60px 98px',  
                  backgroundImage: `url(${backgroundImage})`,
                  backgroundSize: '70px 70px',  
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: '15px center',
                  height: '100px', 
              }}

              >
                <strong style={{color:"#4a4b67"}}>Comment ça marche</strong>
              </AccordionSummary>
              <AccordionDetails>
                <Box display="flex" flexDirection="column" gap={2} width="100%">
                  <Accordion
                    expanded={this.state.expanded === "panel2"}
                    onChange={this.handleChange("panel2")}
                    sx={{
                      boxShadow: "none",
                      border: "none",
                    }}
                  >

                    <AccordionDetails>
                    <p
                        style={{
                          fontSize: "1rem",
                          color: "#868181 ",
                          letterSpacing: "0.00938em",
                          lineHeight: "1.5",
                        }}
                      >
                        Vous pouvez sélectionner les jours souhaités dans le
                        calendrier et enregistrer temporairement votre choix
                        avant de l&apos;envoyer à votre manager. Une fois prêt,
                        sélectionnez votre manager dans la liste en bas et
                        soumettez votre demande. Vous serez ensuite notifié de
                        l&apos;approbation ou du refus. Voici une  <strong> légende </strong> indiquant
                        l&apos;état de votre demande selon sa couleur.
                        
                        
                      </p>
                      <div className={styles.container}>
                        <div className={styles.legend}>
                          <div className={styles.legendItem}>
                            <span
                              className={`${styles.label} ${styles.approvedd}`}
                            >
                              Approuvé
                            </span>
                          </div>
                          <div className={styles.legendItem}>
                            <span
                              className={`${styles.label} ${styles.rejectedd}`}
                            >
                              Rejeté
                            </span>
                          </div>
                          <div className={styles.legendItem}>
                            <span
                              className={`${styles.label} ${styles.pendingg}`}
                            >
                              En attente
                            </span>
                          </div>
                        </div>
                      </div>
                    </AccordionDetails>
                  </Accordion>
                </Box>
              </AccordionDetails>
            </Accordion>
          </Box>
        </div>
        <br />
        <br />
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: "100%",
            position: "relative",
          }}
        >
          <Typography
            variant="h5"
            className={styles.customTitle}
            style={{
              color: "#118ec5",
              padding: "8px",
              borderRadius: "8px",
              textAlign: "center",
              flex: 1,
              position: "absolute",
              left: 0,
              right: 0,
              margin: "0 auto",
            }}
          >
            Planning de Télétravail
          </Typography>
          <div
            style={{
              position: "relative",
              marginLeft: "auto",
              marginRight: "16px",
            }}
          >
            <Tooltip
              title={
                <span style={{ fontSize: " 0.875rem" }}>
                  Enregistrer le calendrier
                </span>
              }
              arrow
            >
              <EventAvailableIcon
                onClick={() => this.handleSave("")}
                style={{
                  cursor: "pointer",
                  color: "#118ec5",
                  fontSize: "35px",
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

          <Typography variant="h5" className={styles.customMonth}>
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
                              title={tooltipMessages[dateStr]}
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
            <div
              style={{
                color: "red",
                marginBottom: "8px",
                fontSize: " 0.875rem",
              }}
            >
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
                      style: {
                        fontSize: " 0.875rem",
                        backgroundColor: "white",
                      },
                      endAdornment: (
                        <InputAdornment position="end">
                          <Tooltip
                            title={
                              <span style={{ fontSize: " 0.875rem" }}>
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
                      style: { fontSize: " 0.875rem" },
                    }}
                    error={!!this.state.emailError}
                    helperText={null}
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props} style={{ fontSize: " 0.875rem" }}>
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
          style={{
            width: "100%",
            height: "70px",
            backgroundColor: "transparent",
          }}
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
