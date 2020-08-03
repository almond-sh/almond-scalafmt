import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

/**
 * Initialization data for the almond-scalafmt extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'almond-scalafmt',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension almond-scalafmt is activated!');
  }
};

export default extension;
