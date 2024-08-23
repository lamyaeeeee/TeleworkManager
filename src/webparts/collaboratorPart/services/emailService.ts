import { SPHttpClient, SPHttpClientResponse } from "@microsoft/sp-http";
import { sp } from "@pnp/sp/presets/all";
import moment from "moment";
import {TeleworkRequest} from "../models/TeleworkRquest"


export async function sendTeleworkRequest(
  spHttpClient: SPHttpClient,
  siteUrl: string,
  request: TeleworkRequest
): Promise<boolean> {
  try {
    const subject = `Demande de Télétravail de ${request.collaborator}`;
    const body = `
        <p>Bonjour,</p>
        
        <p>${
          request.collaborator
        } souhaite effectuer du télétravail aux dates suivantes :</p>
        <ul>
          ${request.dates.map((date) => `<li>${date}</li>`).join("")}
        </ul>
        
        <p>Vous pouvez le/la contacter par email à l'adresse suivante : ${
          request.collaboratorEmail
        }</p>
        
        <p>Cordialement,<br/>Votre équipe</p>
      `;

    const response: SPHttpClientResponse = await spHttpClient.post(
      `${siteUrl}/_api/SP.Utilities.Utility.SendEmail`,
      SPHttpClient.configurations.v1,
      {
        headers: {
          Accept: "application/json;odata=verbose",
          "Content-Type": "application/json;odata=verbose",
        },
        body: JSON.stringify({
          properties: {
            To: [request.managerEmail],
            Subject: subject,
            Body: body,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erreur:", response.status, response.statusText, errorText);
      throw new Error("Erreur lors de l'envoi de l'e-mail.");
    }

    return true;
  } catch (error) {
    console.error("Erreur:", error);
    return false;
  }
}

export async function getCollaboratorEmail(
  collaborator: string
): Promise<string | null> {
  try {
    const user = await sp.web.ensureUser(collaborator);
    return user.data.Email || null;
  } catch (error) {
    console.error("Erreur:", error);
    return null;
  }
}

interface DateUpdate {
  date: string;
  status: "Approuvé" | "Rejeté" | "En attente";
  motif?: string;
}

export async function sendUpdateNotification(
  spHttpClient: SPHttpClient,
  siteUrl: string,
  collaboratorEmail: string,
  updates: DateUpdate[]
): Promise<boolean> {
  try {
    const subject = `Mise à jour de votre demande de télétravail`;
    let body = `
  <p>Bonjour,</p>
  <p>Votre manager a effectué des mises à jour concernant vos dates de télétravail.</p>
  <table border="1" style="border-collapse: collapse; width: 100%;">
    <thead>
      <tr>
        <th style="text-align: center;">Date</th>
        <th style="text-align: center;">Statut</th>
        <th style="text-align: center;">Motif (si rejeté)</th>
      </tr>
    </thead>
    <tbody>
`;

    updates.forEach((update) => {
      body += `
    <tr>
      <td style="text-align: center;">${moment(update.date).format(
        "YYYY-MM-DD"
      )}</td>
      <td style="text-align: center;">${update.status}</td>
      <td style="text-align: center;">${
        update.motif ? update.motif : "N/A"
      }</td>
    </tr>
  `;
    });

    body += `
    </tbody>
  </table>
  <p>Veuillez consulter votre calendrier pour les détails.</p>
  <p>Cordialement,<br/>Votre équipe</p>
`;

    const response: SPHttpClientResponse = await spHttpClient.post(
      `${siteUrl}/_api/SP.Utilities.Utility.SendEmail`,
      SPHttpClient.configurations.v1,
      {
        headers: {
          Accept: "application/json;odata=verbose",
          "Content-Type": "application/json;odata=verbose",
        },
        body: JSON.stringify({
          properties: {
            To: [collaboratorEmail],
            Subject: subject,
            Body: body,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erreur:", response.status, response.statusText, errorText);
      throw new Error("Erreur lors de l'envoi de l'e-mail.");
    }

    return true;
  } catch (error) {
    console.error("Erreur:", error);
    return false;
  }
}
