import { sp } from '@pnp/sp/presets/all';

// Define the interface for your items
interface CollaboratorItem {
  Titre: string;
  Collaborateur: { Title: string };
  Date: string;
  Statut: string;
  Manager: { Title: string };
}

// Function to get list items
export async function getListItems(listTitle: string, manager: string): Promise<CollaboratorItem[]> {
  try {
    // Fetch the items where the provided user is the manager
    const items: CollaboratorItem[] = await sp.web.lists.getByTitle('DemandeCollaborateur').items
      .filter(`Manager/Title eq '${manager}' `)
      .select("Title, Collaborateur/Title, Date, Statut, Manager/Title")
      .expand("Collaborateur, Manager")
      .get();

    console.log("Items: ", items);
    return items;

  } catch (error: any) {
    console.error("Error fetching list data: ", error);
    return [];
  }
}
