import { expect, IJupyterLabPageFixture, test } from '@jupyterlab/galata';

// Starting the almond kernel can take a while
test.setTimeout(180_000);

function getSource(page: IJupyterLabPageFixture, index: number) {
  return page.evaluate(
    index =>
      window.jupyterapp.shell.currentWidget.content.model.cells
        .get(index)
        .sharedModel.getSource(),
    index
  );
}

function execute(page: IJupyterLabPageFixture, command: string) {
  return page.evaluate(
    command => window.jupyterapp.commands.execute(command),
    command
  );
}

test('should format Scala cells with scalafmt', async ({ page }) => {
  await page.notebook.createNew('scalafmt.ipynb', { kernel: 'scala' });
  await page.notebook.setCell(0, 'code', 'val  x=List( 1,2 ,3)');
  await page.notebook.addCell('code', 'def f( a:Int )={a+1}');
  await page.notebook.addCell('markdown', 'val  y=2');
  await page.notebook.addCell('code', 'val broken = (');
  // Wait for the kernel to be ready
  await page.notebook.runCell(0);

  await test.step('list the commands in the command palette', async () => {
    await execute(page, 'apputils:activate-command-palette');
    const palette = page.locator('#modal-command-palette');
    await palette.getByRole('textbox').fill('scalafmt');
    await expect(
      palette.locator('[data-command="almond:scalafmt-current-cell"]')
    ).toBeVisible();
    await expect(
      palette.locator('[data-command="almond:scalafmt-all-cells"]')
    ).toBeVisible();
    await page.keyboard.press('Escape');
  });

  await test.step('add a command to the cell context menu', async () => {
    await (await page.notebook.getCellLocator(1))!.click({ button: 'right' });
    await expect(
      page.locator('.lm-Menu [data-command="almond:scalafmt-current-cell"]')
    ).toBeVisible();
    await page.keyboard.press('Escape');
  });

  await test.step('format the selected cells', async () => {
    await page.notebook.selectCells(1);
    await execute(page, 'almond:scalafmt-current-cell');
    await expect
      .poll(() => getSource(page, 1))
      .toBe('def f(a: Int) = { a + 1 }');
    expect(await getSource(page, 0)).toBe('val  x=List( 1,2 ,3)');
  });

  await test.step('format all code cells', async () => {
    await execute(page, 'almond:scalafmt-all-cells');
    await expect.poll(() => getSource(page, 0)).toBe('val x = List(1, 2, 3)');
    expect(await getSource(page, 2)).toBe('val  y=2');
    expect(await getSource(page, 3)).toBe('val broken = (');
  });

  await test.step('undo the formatting in one step', async () => {
    await page.notebook.enterCellEditingMode(0);
    await page.keyboard.press('Control+z');
    await expect.poll(() => getSource(page, 0)).toBe('val  x=List( 1,2 ,3)');
  });
});
