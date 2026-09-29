import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ICommandPalette, Notification } from '@jupyterlab/apputils';
import type { ICellModel } from '@jupyterlab/cells';
import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';

import {
  applyFormatResponse,
  collectCells,
  createFormatRequest,
  FormatOutcome,
  getScalafmtConf,
  IFormatResponseContent
} from './formatter';

namespace CommandIDs {
  export const formatSelectedCells = 'almond:scalafmt-current-cell';
  export const formatAllCells = 'almond:scalafmt-all-cells';
}

/**
 * Whether the notebook runs a Scala kernel (or if we can't tell yet).
 */
function isScalaNotebook(panel: NotebookPanel): boolean {
  const model = panel.model;
  if (!model || !panel.sessionContext.session?.kernel) {
    return false;
  }
  const languageInfo = model.getMetadata('language_info') as
    { name?: string } | undefined;
  const kernelSpec = model.getMetadata('kernelspec') as
    { language?: string } | undefined;
  const language = languageInfo?.name ?? kernelSpec?.language;
  return language === undefined || language.toLowerCase() === 'scala';
}

/**
 * Initialization data for the @almond-sh/scalafmt extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: '@almond-sh/scalafmt:plugin',
  description: 'Format Scala notebook cells with scalafmt, via almond.',
  autoStart: true,
  requires: [INotebookTracker],
  optional: [ICommandPalette, ITranslator],
  activate: (
    app: JupyterFrontEnd,
    tracker: INotebookTracker,
    palette: ICommandPalette | null,
    translator: ITranslator | null
  ): void => {
    const trans = (translator ?? nullTranslator).load('almond_scalafmt');

    const isEnabled = (): boolean =>
      tracker.currentWidget !== null && isScalaNotebook(tracker.currentWidget);

    async function formatCells(
      panel: NotebookPanel,
      cells: Iterable<ICellModel>
    ): Promise<void> {
      const kernel = panel.sessionContext.session?.kernel;
      if (!kernel || !panel.model) {
        Notification.warning(trans.__('No kernel available to run scalafmt'), {
          autoClose: 3000
        });
        return;
      }

      const pending = collectCells(cells);
      if (pending.size === 0) {
        return;
      }

      const counts: Record<FormatOutcome, number> = {
        formatted: 0,
        unchanged: 0,
        failed: 0,
        stale: 0,
        unknown: 0
      };
      const future = kernel.sendShellMessage(
        createFormatRequest(kernel, pending, getScalafmtConf(panel.model)),
        true,
        true
      );
      future.onIOPub = msg => {
        if ((msg.header.msg_type as string) === 'format_response') {
          const response = msg.content as unknown as IFormatResponseContent;
          counts[applyFormatResponse(pending, response)]++;
        }
      };

      try {
        await future.done;
      } catch (reason) {
        console.error('scalafmt request failed', reason);
        Notification.error(trans.__('Formatting with scalafmt failed'), {
          autoClose: 5000
        });
        return;
      }

      if (counts.failed > 0) {
        Notification.warning(
          trans._n(
            'scalafmt could not format %1 cell',
            'scalafmt could not format %1 cells',
            counts.failed
          ),
          { autoClose: 5000 }
        );
      }
      if (counts.stale > 0) {
        Notification.info(
          trans._n(
            '%1 cell was edited while being formatted and was left untouched',
            '%1 cells were edited while being formatted and were left untouched',
            counts.stale
          ),
          { autoClose: 5000 }
        );
      }
    }

    app.commands.addCommand(CommandIDs.formatSelectedCells, {
      label: trans.__('Format Selected Cells with scalafmt'),
      caption: trans.__('Format the selected code cells with scalafmt'),
      isEnabled,
      describedBy: { args: {} },
      execute: () => {
        const panel = tracker.currentWidget;
        if (!panel) {
          return;
        }
        const { content } = panel;
        const cells = content.widgets
          .filter(cell => content.isSelectedOrActive(cell))
          .map(cell => cell.model);
        return formatCells(panel, cells);
      }
    });

    app.commands.addCommand(CommandIDs.formatAllCells, {
      label: trans.__('Format All Code Cells with scalafmt'),
      caption: trans.__(
        'Format all the code cells of the notebook with scalafmt'
      ),
      isEnabled,
      describedBy: { args: {} },
      execute: () => {
        const panel = tracker.currentWidget;
        if (!panel?.model) {
          return;
        }
        return formatCells(panel, panel.model.cells);
      }
    });

    if (palette) {
      const category = trans.__('Scala');
      palette.addItem({ command: CommandIDs.formatSelectedCells, category });
      palette.addItem({ command: CommandIDs.formatAllCells, category });
    }
  }
};

export default plugin;
