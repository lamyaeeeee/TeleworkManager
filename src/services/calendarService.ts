import { sp } from "@pnp/sp/presets/all";
import moment from "moment";

const listName = "DemandeCollaborateur";

const getCollaboratorId = async (collaboratorName: string): Promise<number> => {
  try {
    const users = await sp.web.siteUsers
      .filter(`Title eq '${collaboratorName}'`)
      .get();
      console.log("voila lid de collab:",users[0].Id );
    return users.length > 0 ? users[0].Id : 0;
  } catch (error) {
    console.error(
      "Erreur lors de la récupération de l'ID du collaborateur",
      error
    );
    return 0;
  }
};

const convertToLocalDate = (date: string): string => {
  // Conversion de date locale pour eviter le prob rencontré de jour moins d'un jour
  return moment(date).format("YYYY-MM-DDTHH:mm:ss.SSS");
};

const checkDateExists = async (
  collaboratorId: number,
  formattedDate: string
): Promise<boolean> => {
  const response = await sp.web.lists
    .getByTitle(listName)
    .items.filter(
      `CollaborateurId eq ${collaboratorId} and Date eq '${formattedDate}'`
    )
    .get();
  return response.length > 0;
};

export const saveDate = async  (title :string, collaborator: string, date: string, status: string): Promise<boolean> => {
  try {
    const formattedDate = convertToLocalDate(date);
    const collaboratorId = await getCollaboratorId(collaborator);

    if (collaboratorId === 0) {
      throw new Error("Collaborateur non trouvé");
    }

    const dateExists = await checkDateExists(collaboratorId, formattedDate);
    if (dateExists) {
      console.log("La date existe déjà pour ce collaborateur.");
      return false;
    }

    const itemData = {
      Title: title,
      CollaborateurId: collaboratorId,
      Date: formattedDate,
      Statut: status,
    };

    await sp.web.lists.getByTitle(listName).items.add(itemData);

    console.log(
      "Enregistrement réussi pour id = ",
      collaboratorId,
      "et date =",
      formattedDate
    );
    return true;
  } catch (error) {
    console.error(
      "Erreur lors de l'enregistrement de la date dans SharePoint",
      error
    );
    return false;
  }
};

export const deleteDate =async (date: string, collaborator: string): Promise<boolean> => {
  try {
    const collaboratorId = await getCollaboratorId(collaborator);

    if (collaboratorId === 0) {
      throw new Error("Collaborateur non trouvé");
    }

    const formattedDate = convertToLocalDate(date);
    console.log(
      `Tentative de suppression pour la date: ${formattedDate} et l'ID du collaborateur: ${collaboratorId}`
    );

    const filterQuery = `Date eq datetime'${formattedDate}' and CollaborateurId eq ${collaboratorId}`;
    console.log(`Requête de filtrage: ${filterQuery}`);

    const items = await sp.web.lists
      .getByTitle(listName)
      .items.filter(filterQuery)
      .get();

    console.log(`Éléments trouvés pour suppression:`, items);

    if (items.length === 0) {
      console.log("Aucun élément trouvé pour suppression");
      return true;
    }

    for (const item of items) {
      await sp.web.lists.getByTitle(listName).items.getById(item.Id).delete();
    }
    console.log("Suppression réussie");
    return true;
  } catch (error) {
    console.error(
      "Erreur lors de la suppression de la date de SharePoint",
      error
    );
    return false;
  }
};

export const getSavedDates = async (collaborator: string): Promise<{ date: string; status: string }[]> => {
  try {
    const collaboratorId = await getCollaboratorId(collaborator);
    if (collaboratorId === 0) {
      throw new Error("Collaborateur non trouvé");
    }

    const items = await sp.web.lists
      .getByTitle(listName)
      .items.filter(`CollaborateurId eq ${collaboratorId}`)
      .get();

    return items.map((item) => ({ date: item.Date, status: item.Statut }));
  } catch (error) {
    console.error("Erreur lors de la récupération des dates enregistrées", error);
    return [];
  }
};
