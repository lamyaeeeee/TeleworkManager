import { sp } from '@pnp/sp/presets/all';

interface CollaboratorItem {
  Titre: string;
  Collaborateur: { Title: string };
  Date: string;
  Statut: string;
  Manager: { Title: string };
}

export async function getListItems(listTitle: string, manager: string): Promise<CollaboratorItem[]> {
  try {
    const items: CollaboratorItem[] = await sp.web.lists.getByTitle('DemandeCollaborateur').items
      .filter(`Manager/Title eq '${manager}' `)
      .select("Title, Collaborateur/Title, Date, Statut, Manager/Title")
      .expand("Collaborateur, Manager")
      .get();

    console.log("Items: ", items);
    return items;

  } catch (error) {
    console.error("Error fetching list data: ", error);
    return [];
  }
}
