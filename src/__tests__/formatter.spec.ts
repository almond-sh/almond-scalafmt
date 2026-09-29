import { NotebookModel } from '@jupyterlab/notebook';
import type { Kernel } from '@jupyterlab/services';

import {
  applyFormatResponse,
  collectCells,
  createFormatRequest,
  getScalafmtConf
} from '../formatter';

function createNotebook(): NotebookModel {
  const model = new NotebookModel();
  model.sharedModel.insertCells(0, [
    { cell_type: 'code', source: 'val  x=1' },
    { cell_type: 'markdown', source: '# Title' },
    { cell_type: 'code', source: '  \n' },
    { cell_type: 'code', source: 'def f( a:Int )=a' }
  ]);
  return model;
}

describe('getScalafmtConf', () => {
  it('reads the scalafmt notebook metadata', () => {
    const model = createNotebook();
    expect(getScalafmtConf(model)).toEqual({});
    model.setMetadata('scalafmt', { maxColumn: 40 });
    expect(getScalafmtConf(model)).toEqual({ maxColumn: 40 });
  });

  it('ignores non-object metadata', () => {
    const model = createNotebook();
    model.setMetadata('scalafmt', ['maxColumn']);
    expect(getScalafmtConf(model)).toEqual({});
  });
});

describe('collectCells', () => {
  it('only keeps non-empty code cells', () => {
    const model = createNotebook();
    const pending = collectCells(model.cells);
    expect(Array.from(pending.values(), e => e.source)).toEqual([
      'val  x=1',
      'def f( a:Int )=a'
    ]);
  });
});

describe('createFormatRequest', () => {
  it('builds an almond format_request message', () => {
    const model = createNotebook();
    const pending = collectCells(model.cells);
    const kernel = {
      clientId: 'client-id',
      username: 'user'
    } as Kernel.IKernelConnection;

    const msg = createFormatRequest(kernel, pending, { maxColumn: 40 });

    expect(msg.channel).toBe('shell');
    expect(msg.header.msg_type).toBe('format_request');
    expect(msg.header.session).toBe('client-id');
    expect(msg.content).toEqual({
      cells: Object.fromEntries(
        Array.from(pending, ([id, { source }]) => [id, source])
      ),
      conf: { maxColumn: 40 }
    });
  });
});

describe('applyFormatResponse', () => {
  function setup() {
    const model = createNotebook();
    const pending = collectCells(model.cells);
    const [key, { model: cell }] = pending.entries().next().value!;
    return { pending, key, cell };
  }

  it('updates the cell with the formatted code', () => {
    const { pending, key, cell } = setup();
    expect(
      applyFormatResponse(pending, {
        key,
        initial_code: 'val  x=1',
        code: 'val x = 1'
      })
    ).toBe('formatted');
    expect(cell.sharedModel.getSource()).toBe('val x = 1');
  });

  it('leaves cells edited in the meantime untouched', () => {
    const { pending, key, cell } = setup();
    cell.sharedModel.setSource('val  x=2');
    expect(
      applyFormatResponse(pending, {
        key,
        initial_code: 'val  x=1',
        code: 'val x = 1'
      })
    ).toBe('stale');
    expect(cell.sharedModel.getSource()).toBe('val  x=2');
  });

  it('reports cells scalafmt failed to format', () => {
    const { pending, key, cell } = setup();
    expect(
      applyFormatResponse(pending, {
        key,
        initial_code: 'val  x=1',
        code: null
      })
    ).toBe('failed');
    expect(cell.sharedModel.getSource()).toBe('val  x=1');
  });

  it('ignores responses for unknown cells', () => {
    const { pending } = setup();
    expect(
      applyFormatResponse(pending, {
        key: 'other',
        initial_code: 'val  x=1',
        code: 'val x = 1'
      })
    ).toBe('unknown');
  });
});
