import * as React from "react";
import Box from "@mui/material/Box";
import type { ITeletravailProps } from "./ITeletravailProps";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Typography from "@mui/material/Typography";
import { CardActionArea } from "@mui/material";

export default class Teletravail extends React.Component<
  ITeletravailProps,
  {}
> {
  constructor(props: ITeletravailProps) {
    super(props);
    // Bind methods to ensure they have the correct 'this' context
    this.navigateToManager = this.navigateToManager.bind(this);
    this.navigateToCollaborator = this.navigateToCollaborator.bind(this);
  }

  private navigateToManager(): void {
    // Redirect to the manager page
    window.location.href =
      "https://ibsugoy.sharepoint.com/sites/communicationtools/SitePages/Partie-Manager2.aspx";
  }

  private navigateToCollaborator(): void {
    // Redirect to the collaborator page
    window.location.href =
      "https://ibsugoy.sharepoint.com/sites/communicationtools/SitePages/Partie-Collaborateur.aspx";
  }

  public render(): React.ReactElement<ITeletravailProps> {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          gap: 4,
          fontFamily: "Radical, Arial, sans-serif",
          width: "100%",
        }}
      >
        <Card sx={{ width: 350, borderBottomLeftRadius:'20px ', borderBottomRightRadius:'20px ' , borderTopLeftRadius:'0 ', borderTopRightRadius:'0 '}}>
          <CardActionArea onClick={this.navigateToManager}>
            <CardMedia
              component="img"
              height="180"
              image={`${require("../assets/manger.png")}?w=400&fit=crop&auto=format`}
              alt="Manager"
            />
            <CardContent >
              <Typography
                gutterBottom
                component="div"
                sx={{
                  textAlign: "center",
                  color: "#868181",
                  fontSize: "22px !important",
                  fontWeight: "600 !important",
                  
                }}
              >
                <strong>Manager</strong>
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  textAlign: "center",
                  letterSpacing: "0.82px",
                  fontSize: "0.91 rem",
                  color: "#868181",
                }}
              >
                Suivez vos équipements et accédez à un support technique dédié.
                Après avoir reçu un e-mail avec le nom du collaborateur,
                connectez-vous à la plateforme accepter ou refuser sa demande,
              </Typography>
            </CardContent>
          </CardActionArea>
        </Card>

        <Card sx={{ width: 350,  borderBottomLeftRadius:'20px ', borderBottomRightRadius:'20px ' , borderTopLeftRadius:'0 ',borderTopRightRadius:'0' }}>
          <CardActionArea onClick={this.navigateToCollaborator}>
            <CardMedia
              component="img"
              height="180"
              image={`${require("../assets/collaborateur.png")}?w=400&fit=crop&auto=format`}
              alt="Collaborator"
              
            />
            <CardContent >
              <Typography
                gutterBottom
                component="div"
                sx={{
                  textAlign: "center",
                  color: "#868181",
                  fontSize: "22px !important",
                  fontWeight: "600 !important",
                 
                }}
              >
                <strong>Collaborateur</strong>
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  textAlign: "center",
                  letterSpacing: "0.82px",
                  fontSize: "0.91 rem",
                  color: "#868181",
                }}
              >
                Effectuez vos demandes de télétravail en saisissant les jours
                souhaités et en les soumettant à votre manager. Vous recevrez
                une réponse indiquant le statut de votre demande.
              </Typography>
            </CardContent>
          </CardActionArea>
        </Card>
      </Box>
    );
  }
}
