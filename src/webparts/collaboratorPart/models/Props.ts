import { SPHttpClient } from "@microsoft/sp-http";

export interface Props {
    sp: any;
    collaborator: string;
    spHttpClient: SPHttpClient;
    siteUrl: string;
  }
  