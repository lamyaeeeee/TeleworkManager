import { Version } from '@microsoft/sp-core-library';
import { IPropertyPaneConfiguration } from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import * as React from 'react';
import * as ReactDom from 'react-dom';
import ManagerPart from './components/ManagerPart';
import { SPHttpClient } from '@microsoft/sp-http'; // Assurez-vous d'importer SPHttpClient
import { sp } from "@pnp/sp/presets/all";
export default class ManagerPartWebPart extends BaseClientSideWebPart<{}> {

  protected onInit(): Promise<void> {
    return super.onInit().then(() => {
      // Configuration de PnPJS (si nécessaire)
      sp.setup({
        spfxContext: this.context as any
      }); 
    });
  }

  public render(): void {
    const { pageContext } = this.context;
    const manager = pageContext.user.displayName;

    const spHttpClient: SPHttpClient = this.context.spHttpClient;

    const siteUrl = pageContext.web.absoluteUrl;

    const element = React.createElement(ManagerPart, {
      sp,
      spHttpClient,
      siteUrl,
      manager
    });
    

    ReactDom.render(element, this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: []
    };
  }
}
