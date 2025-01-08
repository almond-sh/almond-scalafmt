import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ICommandPalette } from '@jupyterlab/apputils';
import { ICellModel } from '@jupyterlab/cells';
import { INotebookTracker } from '@jupyterlab/notebook';
import { Kernel, KernelMessage } from '@jupyterlab/services';
import { IShellMessage } from '@jupyterlab/services/lib/kernel/messages';
import { UUID } from '@lumino/coreutils';

interface IFormatResponseContent {
  key: string;
  initial_code: string;
  code: string | null;
}

function scalafmtConf(notebookTracker: INotebookTracker): Record<string, any> {
  let conf: Record<string, any> = {};
  const maybeConf = notebookTracker.currentWidget.model.metadata['scalafmt'];
  if (maybeConf && maybeConf.constructor === {}.constructor) {
    conf = maybeConf as Record<string, any>;
  }
  return conf;
}

function getCells(
  allCells: boolean,
  notebookTracker: INotebookTracker
): {
  cellDict: { [cellId: string]: ICellModel };
  requestCells: { [key: string]: string };
} {
  const cellDict: { [cellId: string]: ICellModel } = {};
  const requestCells: { [key: string]: string } = {};

  if (allCells) {
    const notebookModel = notebookTracker.currentWidget.model;

    if (!notebookModel) {
      console.log('no notebook model found');
      return;
    }

    const it = notebookModel.cells[Symbol.iterator]();
    let cellModel = it.next();
    while (!cellModel.done) {
      const cellId = cellModel.value.id;
      const initialCode = cellModel.value.text;
      if (cellModel.value.type === 'code' && initialCode.length > 0) {
        requestCells[cellId] = initialCode;
        cellDict[cellId] = cellModel.value;
      }
      cellModel = it.next();
    }
  } else {
    const cellModel = notebookTracker.activeCell?.model;

    if (!cellModel) {
      console.log('no active cell found for formatting');
      return;
    }

    if (cellModel.type !== 'code') {
      console.log('active cell is not a code cell');
      return;
    }

    const cellId = cellModel.id;
    const initialCode = cellModel.sharedModel.source;

    if (initialCode.length === 0) {
      console.log('nothing to format');
      return;
    }

    requestCells[cellId] = initialCode;
    cellDict[cellId] = cellModel;
  }

  return { cellDict, requestCells };
}

function handleResponse(
  cellDict: { [cellId: string]: ICellModel },
  requestCells: { [key: string]: string }
): (msg: KernelMessage.IIOPubMessage<KernelMessage.IOPubMessageType>) => void {
  return (msg) => {
    if ((msg.header.msg_type as string) === 'format_response') {
      const response = msg.content as IFormatResponseContent;
      if (response.key in cellDict && response.key in requestCells) {
        const cellModel = cellDict[response.key];
        const initialCode = requestCells[response.key];
        const codeObservable = cellModel.sharedModel;
        if (
          response.code &&
          response.initial_code === initialCode &&
          codeObservable.source === initialCode
        ) {
          codeObservable.setSource(response.code);
        } else {
          console.log(
            'Cell code changed, not updating it with stale formatted code'
          );
        }
      }
    }
  };
}

function formatCellsMessage(
  requestCells: { [key: string]: string },
  scalafmtConf: Record<string, any>,
  kernel: Kernel.IKernelConnection
): IShellMessage {
  const msg = {
    channel: 'shell',
    content: {
      cells: requestCells,
      conf: scalafmtConf
    },
    metadata: {},
    parent_header: {},
    header: {
      date: new Date().toISOString(),
      msg_id: UUID.uuid4(),
      msg_type: 'format_request',
      session: kernel.clientId,
      username: kernel.username ?? '',
      version: '5.2'
    }
  };

  return msg as IShellMessage;
}

function formatCells(
  notebookTracker: INotebookTracker,
  kernels: { [id: string]: Kernel.IKernelConnection },
  allCells: boolean
): void {
  if (!notebookTracker.currentWidget) {
    console.log('no current widget found for formatting');
    return;
  }

  const notebookId = notebookTracker.currentWidget.id;
  const conf = scalafmtConf(notebookTracker);

  if (!(notebookId in kernels)) {
    console.log('no kernel found for panel ' + notebookId);
    return;
  }

  const kernel = kernels[notebookId];

  const { cellDict, requestCells } = getCells(allCells, notebookTracker);

  if (Object.keys(cellDict).length === 0) {
    console.log('nothing to format');
    return;
  }

  const msg = formatCellsMessage(requestCells, conf, kernel);
  const future = kernel.sendShellMessage(msg, true, true);
  future.onIOPub = handleResponse(cellDict, requestCells);
}

function watchKernelChanged(
  notebookTracker: INotebookTracker,
  kernels: { [id: string]: Kernel.IKernelConnection }
): void {
  notebookTracker.widgetAdded.connect((sender, nbPanel) => {
    nbPanel.sessionContext.kernelChanged.connect((sender, args) => {
      const kernel = args.newValue;
      if (kernel) {
        kernels[nbPanel.id] = kernel;
      } else {
        delete kernels[nbPanel.id];
      }
    });
  });
}

const formatCurrentCellCommand = 'almond:scalafmt-current-cell';
const formatAllCellsCommand = 'almond:scalafmt-all-cells';
const category = 'Scala';

function activateExtension(
  app: JupyterFrontEnd,
  palette: ICommandPalette,
  notebookTracker: INotebookTracker
): void {
  const kernels: { [id: string]: Kernel.IKernelConnection } = {};

  app.commands.addCommand(formatCurrentCellCommand, {
    label: 'Format current cell with scalafmt',
    caption: 'Format current cell with scalafmt',
    execute: (args: any) => {
      formatCells(notebookTracker, kernels, false);
    }
  });
  app.commands.addCommand(formatAllCellsCommand, {
    label: 'Format all code cells with scalafmt',
    caption: 'Format all code cells with scalafmt',
    execute: (args: any) => {
      formatCells(notebookTracker, kernels, true);
    }
  });

  palette.addItem({
    command: formatCurrentCellCommand,
    category,
    args: { origin: 'palette' }
  });
  palette.addItem({
    command: formatAllCellsCommand,
    category,
    args: { origin: 'palette' }
  });

  watchKernelChanged(notebookTracker, kernels);
}

/**
 * Initialization data for the almond-scalafmt extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'almond-scalafmt',
  autoStart: true,
  requires: [ICommandPalette, INotebookTracker],
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    notebookTracker: INotebookTracker
  ) => {
    activateExtension(app, palette, notebookTracker);
  }
};

export default extension;
