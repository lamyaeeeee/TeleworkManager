
import { Version } from '@microsoft/sp-core-library';
import { IPropertyPaneConfiguration } from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import * as React from 'react';
import * as ReactDom from 'react-dom';
import CollabPart from './components/CollaboratorPart';
import { sp } from "@pnp/sp/presets/all";

export default class CollaboratorPartWebPart extends BaseClientSideWebPart<{}>  {

  protected onInit(): Promise<void> {
    return super.onInit().then((_) => {
      sp.setup({
        spfxContext: this.context as any,
      }); 
    });
  }

  public render(): void {
    const { pageContext } = this.context;
    const collaborator = pageContext.user.displayName;
    const element = React.createElement(CollabPart, { sp, collaborator });
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