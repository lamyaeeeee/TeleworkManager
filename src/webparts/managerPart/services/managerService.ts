import { sp } from "@pnp/sp/presets/all";

export const getCollaboratorsByManager = async (manager: string): Promise<string[]> => {
  try {
    const items = await sp.web.lists.getByTitle("DemandeCollaborateur")
      .items
      .filter(`Manager/Title eq '${manager}'`) //.filter(`Manager/Title eq '${manager}' and Statut eq 'en attente'`)
      .select("Collaborateur/Title")
      .expand("Collaborateur")
      .get();

    const collaborators = items.map(item => item.Collaborateur.Title);
    return Array.from(new Set(collaborators));
  } catch (error) {
    console.error("Erreur lors de la récupération des collaborateurs", error);
    return [];
  }
};

export const getSavedDates = async (collaborator: string, manager: string): Promise<{ date: string; status: string }[]> => {
  try {
    const items = await sp.web.lists.getByTitle("DemandeCollaborateur") 
      .items
      .filter(`Collaborateur/Title eq '${collaborator}' and Manager/Title eq '${manager}'`)
      .select("Date, Statut")
      .get();

    return items.map(item => ({
      date: item.Date,
      status: item.Statut,
    }));
  } catch (error) {
    console.error("Erreur lors de la récupération des dates enregistrées", error);
    return [];
  }
};


interface DateUpdate {
  date: string;
  status: 'Approuvé' | 'Rejeté' | 'En attente';
  motif?: string;
}
export const updateDatesWithManager = async (
  collaborator: string,
  updates: DateUpdate[],
  manager: string
): Promise<void> => {
  try {
    const list = sp.web.lists.getByTitle("DemandeCollaborateur");

    for (const update of updates) {
      const items = await list.items
        .filter(`Collaborateur/Title eq '${collaborator}' and Date eq '${update.date}' and Manager/Title eq '${manager}'`)
        .select("Id")
        .get();

      if (items.length > 0) {
        const itemId = items[0].Id;
        await list.items.getById(itemId).update({
          Statut: update.status,
          Motif: update.motif || "", 
        });
      }
    }
  } catch (error) {
    console.error("Erreur lors de la mise à jour des dates :", error);
  }
};


