import * as React from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import moment from "moment";
import {
  getCollaboratorsByManager,
  getSavedDates,
  updateDatesWithManager,
} from "../../../services/managerService";
import styles from "./ManagerPart.module.scss";
import { getDaysInMonth } from "../../../services/dateService";
import { getManagerEmails } from "../../../services/calendarService";
import {
  getCollaboratorEmail,
  sendUpdateNotification,
} from "../../../services/emailService";
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
import { ManagerState, CollaboratorItem } from "../../../models/ManagerState";
import {BarClickData} from "../../../models/BarClickData";

type Status = "Approuvé" | "Rejeté" | "En attente";
import { sp } from "@pnp/sp/presets/all";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import CircularProgress from "@mui/material/CircularProgress";
import { AjouterButton, AnnulerButton } from "./button";
//
import Box from "@mui/material/Box";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell } from "recharts";
import { getListItems } from "../../../services/ChartsServices";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import { SelectChangeEvent } from "@mui/material/Select";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import CancelIcon from "@mui/icons-material/Cancel";
import { IManagerPartProps } from "./IManagerPartProps";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
type HandleChangeFunction = (
  event: React.SyntheticEvent,
  isExpanded: boolean
) => void;
class ManagerPart extends React.Component<IManagerPartProps, ManagerState> {
  constructor(props: IManagerPartProps) {
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
      collaboratorss: [],
      manager: "",
      filter: "semaine",
      expanded: "",
    };
  }

  async componentDidMount(): Promise<void> {
    sp.setup({
      sp: {
        baseUrl: "https://ibsugoy.sharepoint.com/sites/communicationtools",
      },
    });
    const manager = this.props.context.pageContext.user.displayName;
    const user = await sp.web.currentUser.get();
    const userEmail = user.Email;
    await this.fetchAllCollaborators();
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

  async componentDidUpdate(
    prevProps: IManagerPartProps,
    prevState: ManagerState
  ): Promise<void> {
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
    const spHttpClient = this.props.context.spHttpClient;
    const siteUrl = this.props.context.pageContext.web.absoluteUrl;
    const manager = this.props.context.pageContext.user.displayName;

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
    const manager = this.props.context.pageContext.user.displayName;
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
  //
  fetchAllCollaborators = async (): Promise<void> => {
    try {
      const manager = this.props.context.pageContext.user.displayName;
      const items: CollaboratorItem[] = await getListItems(
        "DemandeCollaborateur",
        manager
      );
      this.setState({ collaboratorss: items });
    } catch (error) {
      console.error("Error fetching collaborators:", error);
      this.setState({ collaborators: [] });
    }
  };

  handleFilterChange = (event: SelectChangeEvent<string>): void => {
    this.setState({ filter: event.target.value });
  };

  chartCollaborators = (
    collaborators: CollaboratorItem[]
  ): CollaboratorItem[] => {
    const { filter } = this.state;
    const now = new Date();

    return collaborators.filter((collaborator) => {
      const collaboratorDate = new Date(collaborator.Date);

      if (filter === "semaine") {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);

        return collaboratorDate >= startOfWeek && collaboratorDate < endOfWeek;
      } else if (filter === "mois") {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        return (
          collaboratorDate >= startOfMonth && collaboratorDate < endOfMonth
        );
      } else if (filter === "annee") {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear() + 1, 0, 1);

        return collaboratorDate >= startOfYear && collaboratorDate < endOfYear;
      }

      return false;
    });
  };

 handleBarClick = (data: BarClickData) : void  => {
    const { name } = data;
    const count = this.state.collaboratorss.filter(collab => collab.Statut === name).length;
    alert(`Nombre de demandes ${name}: ${count}`);
};

  handleChange =
    (panel: string): HandleChangeFunction =>
    (event: React.SyntheticEvent, isExpanded: boolean): void => {
      this.setState({ expanded: isExpanded ? panel : "" });
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
    //
    const chartCollaborators = this.chartCollaborators(
      this.state.collaboratorss
    );

    const statusCounts = {
      Approuvé: 0,
      Rejeté: 0,
      "En attente": 0,
    };

    chartCollaborators.forEach((collaborator) => {
      if (collaborator.Statut === "Approuvé") {
        statusCounts.Approuvé += 1;
      } else if (collaborator.Statut === "Rejeté") {
        statusCounts.Rejeté += 1;
      } else if (collaborator.Statut === "En attente") {
        statusCounts["En attente"] += 1;
      }
    });

    const chartData = [
      {
        name: "Approuvé",
        valeur: statusCounts.Approuvé,
        fill: "#A8D9B4",
      },
      {
        name: "Rejeté",
        valeur: statusCounts.Rejeté,
        fill: "#FFB0A8",
      },
      {
        name: "En attente",
        valeur: statusCounts["En attente"],
        fill: "#B3D2F5",
      },
    ];

    const CustomLegend: React.FC = (): JSX.Element => (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: "20px",
          paddingLeft: "10%",
        }}
      >
        {chartData.map((entry, index) => (
          <div
            key={`legend-${index}`}
            style={{ margin: "0 10px", display: "flex", alignItems: "center" }}
          >
            <div
              style={{
                width: "20px",
                height: "20px",
                backgroundColor: entry.fill,
                borderRadius: "4px",
                marginRight: "8px",
              }}
            />
            <span>{entry.name}</span>
          </div>
        ))}
      </div>
    );
    const backgroundImage1 = `${require("../assets/guidelines.png")}?w=50&h=50&fit=crop&auto=format`;
    const backgroundImage2 = `${require("../assets/charte.png")}?w=50&h=50&fit=crop&auto=format`;
    const backgroundImage3 = `${require("../assets/faq.png")}?w=50&h=50&fit=crop&auto=format`;
    return (
      <div>
        <div>
          <Box>
            <Accordion
              style={{
                padding: "16px",
                borderRadius: "10px",
                backgroundColor: "rgb(255, 255, 255)",
                boxShadow: "rgba(0, 0, 0, 0.08) 1px 2px 6px 4px",
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="panel1-content"
                id="panel1-header"
                sx={{
                  fontSize: "1.25rem",
                  padding: "60px 98px",
                  backgroundImage: `url(${backgroundImage1})`,
                  backgroundSize: "70px 70px",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "15px center",
                  height: "100px",
                }}
              >
                <strong style={{ color: "#4a4b67" }}>Comment ça marche</strong>
              </AccordionSummary>
              <AccordionDetails>
                <Box display="flex" flexDirection="column" gap={2} width="100%">
                  <Accordion
                    expanded={this.state.expanded === "panel1"}
                    onChange={this.handleChange("panel1")}
                    sx={{
                      boxShadow: "none",
                      border: "none",
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      aria-controls="panel1a-content"
                      id="panel1a-header"
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          backgroundImage: `url(${backgroundImage2})`,
                          backgroundSize: "contain",
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "0 center",
                          height: "40px",
                          fontSize: "18px",
                        }}
                      >
                        <span style={{ paddingLeft: "50px" }}>
                          Representation en pourcentage
                        </span>
                      </div>
                    </AccordionSummary>
                    <AccordionDetails>
                      <div>
                        <p
                          style={{
                            fontSize: "1rem",
                            color: "#868181 ",
                            letterSpacing: "0.00938em",
                            lineHeight: "1.5",
                          }}
                        >
                          Ce diagramme vous permet, en tant que manager,
                          d&apos;évaluer rapidement l&apos;état des demandes de
                          vos collaborateurs et obtenir des informations
                          essentielles pour une gestion optimisée de votre
                          équipe. Chaque barre reflète le nombre de demandes
                          dans les catégories{" "}
                          <strong> Approuvé, Rejeté, et En attente </strong>.
                        </p>

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            marginBottom: "20px",
                          }}
                        >
                          <FormControl fullWidth style={{ width: "200px" }}>
                            <InputLabel>Filter</InputLabel>
                            <Select
                              value={this.state.filter}
                              onChange={this.handleFilterChange}
                              label="Filter"
                            >
                              <MenuItem value="semaine">Semaine</MenuItem>
                              <MenuItem value="mois">Mois</MenuItem>
                              <MenuItem value="annee">Année</MenuItem>
                            </Select>
                          </FormControl>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            height: "100%",
                          }}
                        >
                          <BarChart width={500} height={300} data={chartData}>
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend content={<CustomLegend />} />
                            <Bar dataKey="valeur">
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </div>
                      </div>
                    </AccordionDetails>
                  </Accordion>
                  <Accordion
                    expanded={this.state.expanded === "panel2"}
                    onChange={this.handleChange("panel2")}
                    sx={{
                      boxShadow: "none",
                      border: "none",
                      "&::before": { content: "none" },
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      aria-controls="panel2a-content"
                      id="panel2a-header"
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          backgroundImage: `url(${backgroundImage3})`,
                          backgroundSize: "contain",
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "0 center",
                          height: "30px",
                          fontSize: "18px",
                        }}
                      >
                        <span style={{ paddingLeft: "50px" }}>
                          Explications
                        </span>
                      </div>
                    </AccordionSummary>
                    <AccordionDetails>
                      <p
                        style={{
                          fontSize: "1rem",
                          color: "#868181",
                          letterSpacing: "0.00938em",
                          lineHeight: "1.5",
                        }}
                      >
                        En cliquant sur le boutton{" "}
                        <strong> Choisir collaborateur </strong>, vous accéderez
                        à une liste des collaborateurs ayant soumis des demandes
                        à votre attention. Vous pourrez sélectionner lun
                        d&apos;eux pour consulter son calendrier de télétravail
                        . En cliquant sur <strong> Sauvegarder </strong>, les
                        collaborateurs seront informés de vos choix.
                      </p>
                      <div className={styles.container}>
                        <div className={styles.legend}>
                          <div className={styles.legendItem}>
                            <span
                              className={`${styles.label} ${styles.approvedd}`}
                            >
                              Demande Approuvée
                            </span>
                          </div>
                          <div className={styles.legendItem}>
                            <span
                              className={`${styles.label} ${styles.rejectedd}`}
                            >
                              Demande Rejetée
                            </span>
                          </div>
                          <div className={styles.legendItem}>
                            <span
                              className={`${styles.label} ${styles.pendingg}`}
                            >
                              Demande En attente
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
          maxWidth={false}
          fullWidth
          PaperProps={{
            sx: {
              width: "530px", 
              maxWidth: "600px", 
              minHeight: "500px",
              margin: "20px auto", 
              padding :"20px 20px",
            },
          }}
        >
          <DialogTitle
            sx={{
              marginTop: "20px",
              color: "#242424",
              fontSize: "24px",
              textAlign: "center",
              fontWeight: "bold",
              letterSpacing: "0.82px",
              position: "relative",
            }}
          >
            Choisir Collaborateur 
            <IconButton
              aria-label="close"
              onClick={this.handleCloseDialogCollab}
              sx={{
                position: "absolute",
                right: 8,
                top: 8,
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent
            dividers
            sx={{
              borderTop: 0,
              borderBottom: 0,
            }}
          >
            <Typography variant="body1" gutterBottom>
              Choisissez un collaborateur parmi la liste ci-dessous pour
              visualiser et approuver les demandes de télétravail qui vous ont
              été soumises.
            </Typography>

            <div>
              <label
                htmlFor="autocomplete-input"
                style={{
                  fontSize: "16px",            
                  fontFamily: "Radikal, arial, sans-serif",
                  letterSpacing: "0.82px",
                  marginTop:"15px",
                  marginBottom: "5px",
                  display: "inline-block",
                  padding: "2px 4px",
                }}
              >
                Rechercher un collaborateur :
              </label>
              <Autocomplete
                freeSolo
                options={filteredCollaborators}
                onInputChange={this.handleInputChange}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="outlined"
                    fullWidth
                    id="autocomplete-input"
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
            </div>
          </DialogContent>
          <DialogActions>
            <AnnulerButton
              variant="contained"
              onClick={this.handleCloseDialogCollab}
              startIcon={<CancelIcon />}
            >
              Annuler
            </AnnulerButton>
          </DialogActions>
        </Dialog>

        <div style={{ textAlign: "center", marginTop: "20px" }}>
          {!selectedCollaborator ? (
            <Typography variant="h5" className={styles.customTitle}>
              Aucun collaborateur sélectionné
            </Typography>
          ) : (
            <Typography
              variant="h5"
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
                {!selectedCollaborator ? (
                  <TableRow>
                    <TableCell
                      colSpan={weekdays.length}
                      style={{
                        textAlign: "center",
                        padding: "20px",
                        verticalAlign: "middle",
                        backgroundColor: "#fff",
                      }}
                    >
                      <Typography
                        variant="body1"
                        style={{
                          color: "#4a4b67",
                          fontFamily: " Radikal-Bold, arial, sans-serif",
                          margin: "0",
                          fontSize: "18px",
                          fontWeight: "600",
                          letterSpacing: "0.82px",
                        }}
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
                startIcon={<CancelIcon />}
              >
                Annuler
              </AnnulerButton>

              <AjouterButton
                variant="contained"
                onClick={this.handleSave}
                startIcon={<EventAvailableIcon />}
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
            <AjouterButton
              variant="contained"
              onClick={this.handleSaveMotif}
              startIcon={<EventAvailableIcon />}
            >
              Sauvegarder
            </AjouterButton>

            <AnnulerButton
              variant="contained"
              onClick={this.handleCloseDialogMotif}
              startIcon={<CancelIcon />}
            >
              Annuler
            </AnnulerButton>
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
