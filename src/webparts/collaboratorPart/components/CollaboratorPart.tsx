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
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import styles from "./CollaboratorPart.module.scss";
import { formatDate, getDaysInMonth } from "../../../services/dateService";
import {
  saveDate,
  deleteDate,
  getSavedDates,
} from "../../../services/calendarService";

interface Props {
  sp: any;
  collaborator: string;
}

interface State {
  selectedDates: Set<string>;
  deletedDates: Set<string>;
  currentMonth: moment.Moment;
  savedDates: Map<string, string>;
  showModal: boolean;
  tooltipMessage: string;
}

class CollaboratorPart extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      selectedDates: new Set(),
      deletedDates: new Set(),
      currentMonth: moment().startOf("month"),
      savedDates: new Map(),
      showModal: false,
      tooltipMessage: "",
    };
  }

  async componentDidMount(): Promise<void> {
    const { collaborator } = this.props;
    const savedDatesArray = await getSavedDates(collaborator);
    console.log("collaborateur : ",this.props);
    console.log("dates ar : ", savedDatesArray );
    const savedDatesMap = new Map(
      savedDatesArray.map((item) => [formatDate(item.date), item.status])
    );
  
    const selectedDates = new Set(
      [...savedDatesMap.entries()]
        .filter(([date, status]) => status === "En attente")
        .map(([date]) => date)
    );
  
    this.setState({
      savedDates: savedDatesMap,
      selectedDates,
    });
  }  
  

  handleDateClick = (date: string): void => {
    const dayOfWeek = moment(date).day();
    const isPastDate = moment(date).isBefore(moment(), "day");
    const status = this.state.savedDates.get(date);

    if (dayOfWeek === 0 || dayOfWeek === 6 || isPastDate) return;

    this.setState((prevState) => {
      const { selectedDates, deletedDates, savedDates } = prevState;

      if (selectedDates.has(date)) {
        selectedDates.delete(date);
        deletedDates.add(date);
      } else if (status === "En attente") {
        selectedDates.delete(date);
        deletedDates.add(date);
        savedDates.delete(date);
      } else if (status === "Approuvé") {
        savedDates.delete(date);
        deletedDates.add(date);
      } else {
        selectedDates.add(date);
        deletedDates.delete(date);
      }

      return {
        selectedDates: new Set(selectedDates),
        deletedDates: new Set(deletedDates),
        savedDates: new Map(savedDates),
      };
    });
  };

  handleSave = async (): Promise<void> => {
    const { collaborator } = this.props;
    const { selectedDates, deletedDates } = this.state;

    for (const date of selectedDates) {
      const saveSuccess = await saveDate(
        `Demande de ${collaborator}`,
        collaborator,
        date,
        "En attente"
      );
      if (!saveSuccess) {
        console.log(`La date ${date} existe déjà pour ${collaborator}.`);
      }
    }

    const savedDatesFormatted = Array.from(selectedDates).map((date) =>
      formatDate(date)
    );
    this.setState((prevState) => ({
      savedDates: new Map([
        ...prevState.savedDates,
        ...savedDatesFormatted.map(
          (date) => [date, "En attente"] as [string, string]
        ),
      ]),
    }));

    for (const date of deletedDates) {
      await deleteDate(date, collaborator);
    }

    this.setState({ deletedDates: new Set(), showModal: true });
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
    this.setState({ showModal: false });
  };

  handleMouseOver = (date: string): void => {
    const status = this.state.savedDates.get(date);
    if (status === "Rejeté") {
      this.setState({
        tooltipMessage: `Commentaire pour ${date}: Exemple de commentaire `,
      });
    }
  };
  

  handleMouseOut = () :void=> {
    this.setState({ tooltipMessage: "" });
  };

  render(): JSX.Element {
    const { collaborator } = this.props;
    const {
      currentMonth,
      selectedDates,
      savedDates,
      showModal,
      tooltipMessage,
    } = this.state;
    const days = getDaysInMonth(currentMonth);
    const weekdays = ["Lun", "Mar", "Mer", "Jeu", "Ven"];

    return (
      <div>
        <Typography variant="h4" align="center" gutterBottom>
          Calendrier de Télétravail
        </Typography>
        <Typography variant="body1" align="center" gutterBottom>
  Bonjour {collaborator}, veuillez sélectionner les jours de télétravail souhaités et cliquer sur &quot;Enregistrer&quot; pour soumettre votre demande de télétravail.
</Typography>
        <div className={styles.naviDate}>
          <IconButton
            onClick={this.handlePrevMonth}
            className="customIconButton"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5">
            {currentMonth.format("MMMM YYYY")}
          </Typography>
          <IconButton
            onClick={this.handleNextMonth}
            className="customIconButton"
          >
            <ArrowForwardIcon />
          </IconButton>
        </div>

        <TableContainer>
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
                      const status = savedDates.get(dateStr) || "";

                      const isToday = moment().isSame(day.date, "day");
                      const isPastDate = moment(dateStr).isBefore(
                        moment(),
                        "day"
                      );
                      const isCurrentMonth = day.isCurrentMonth;

                      return (
                        <TableCell
                          key={dateStr}
                          className={`${styles.calendarDay} ${
                            isToday ? styles.today : ""
                          } ${isPastDate ? styles.pastDate : ""} ${
                            isSelected ? styles.selected : ""
                          } ${status === "En attente" ? styles.pending : ""} ${
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
                          onMouseOut={() => this.handleMouseOut()}
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
                          {status === "Rejeté" && tooltipMessage && (
                            <Tooltip title={tooltipMessage}>
                              <div className={styles.tooltip}>
                                {tooltipMessage}
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
        <div className={styles.legend}>
          <div
            className={styles.legendBox}
            style={{ backgroundColor: "#2e7cb3 " }}
            />
          <span>En attente</span>
          <div
            className={styles.legendBox}
            style={{ backgroundColor: "#6daa69" }}
            />
          <span>Approuvé</span>
          <div
            className={styles.legendBox}
            style={{ backgroundColor: "#ED2B2A" }}
          />
          <span>Rejeté</span>
        </div>
        <Button
          startIcon={<SaveIcon />}
          onClick={this.handleSave}
          variant="contained"
          style={{ backgroundColor: "#2e7cb3", color: "#fff" }}
        >
          Enregistrer
        </Button>
        <Dialog open={showModal} onClose={this.handleCloseModal}>
          <DialogTitle>Confirmation</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Les dates sélectionnées ont été enregistrées avec succès !
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={this.handleCloseModal} color="primary">
              OK
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    );
  }
}

export default CollaboratorPart;
