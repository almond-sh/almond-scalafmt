import type { ICellModel } from '@jupyterlab/cells';
import type { INotebookModel } from '@jupyterlab/notebook';
import { Kernel, KernelMessage } from '@jupyterlab/services';
import type { JSONObject } from '@lumino/coreutils';

/**
 * Content of the `format_request` shell message understood by almond.
 */
export interface IFormatRequestContent extends JSONObject {
  /** Code to format, keyed by cell id. */
  cells: Record<string, string>;
  /** Scalafmt configuration, as found in the notebook metadata. */
  conf: JSONObject;
}

/**
 * Content of the `format_response` IOPub messages sent back by almond,
 * one per formatted cell.
 */
export interface IFormatResponseContent {
  key: string;
  initial_code: string;
  /** Formatted code, or `null` if scalafmt failed to format the cell. */
  code: string | null;
}

/**
 * Outcome of applying a single `format_response` to a cell.
 */
export type FormatOutcome =
  'formatted' | 'unchanged' | 'failed' | 'stale' | 'unknown';

/**
 * Code cells to be formatted, keyed by cell id.
 */
export type PendingCells = Map<string, { model: ICellModel; source: string }>;

/**
 * Read the scalafmt configuration from the `scalafmt` notebook metadata.
 */
export function getScalafmtConf(model: INotebookModel): JSONObject {
  const conf = model.getMetadata('scalafmt');
  return conf && typeof conf === 'object' && !Array.isArray(conf) ? conf : {};
}

/**
 * Collect the non-empty code cells among `cells`.
 */
export function collectCells(cells: Iterable<ICellModel>): PendingCells {
  const pending: PendingCells = new Map();
  for (const model of cells) {
    const source = model.sharedModel.getSource();
    if (model.type === 'code' && source.trim().length > 0) {
      pending.set(model.id, { model, source });
    }
  }
  return pending;
}

/**
 * Create a `format_request` shell message for `kernel`.
 */
export function createFormatRequest(
  kernel: Kernel.IKernelConnection,
  pending: PendingCells,
  conf: JSONObject
): KernelMessage.IShellMessage {
  const content: IFormatRequestContent = {
    cells: Object.fromEntries(
      Array.from(pending, ([id, { source }]) => [id, source])
    ),
    conf
  };
  // format_request is an almond-specific message type, unknown to the
  // typed overloads of createMessage.
  return KernelMessage.createMessage<any>({
    channel: 'shell',
    msgType: 'format_request',
    session: kernel.clientId,
    username: kernel.username,
    content
  });
}

/**
 * Apply a `format_response` to the matching pending cell.
 *
 * The cell is left untouched if its code changed since the request was sent.
 */
export function applyFormatResponse(
  pending: PendingCells,
  response: IFormatResponseContent
): FormatOutcome {
  const entry = pending.get(response.key);
  if (!entry || response.initial_code !== entry.source) {
    return 'unknown';
  }
  if (response.code === null || response.code === undefined) {
    return 'failed';
  }
  const shared = entry.model.sharedModel;
  if (shared.getSource() !== entry.source) {
    return 'stale';
  }
  if (response.code === entry.source) {
    return 'unchanged';
  }
  // Single transaction, so that this can be undone in one step
  shared.setSource(response.code);
  return 'formatted';
}
