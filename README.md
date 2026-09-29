# almond-scalafmt

[![Github Actions Status](https://github.com/almond-sh/almond-scalafmt/actions/workflows/build.yml/badge.svg)](https://github.com/almond-sh/almond-scalafmt/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@almond-sh/scalafmt)](https://www.npmjs.com/package/@almond-sh/scalafmt)

JupyterLab extension to format the code cells of [almond](https://almond.sh) Scala notebooks with [scalafmt](https://scalameta.org/scalafmt).

![Demo](https://github.com/almond-sh/almond-scalafmt/raw/main/demo.gif)

## Requirements

- JupyterLab >= `4.0`
- [almond](https://github.com/almond-sh/almond) >= `0.10.8`

## Install

```bash
pip install almond-scalafmt
```

No JupyterLab rebuild (nor Node.js) is needed: the extension ships prebuilt.

## Usage

When a notebook runs the almond kernel, this extension adds two commands:

- **Format Selected Cells with scalafmt**, also available in the context menu of code cells
- **Format All Code Cells with scalafmt**

Both can be found in the command palette (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd>, or <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd> on macOS), by typing `scalafmt`.
Keyboard shortcuts can be assigned to them in _Settings > Settings Editor > Keyboard Shortcuts_.

To revert the formatting of a cell, put the cursor in this cell, and hit the undo shortcut
(<kbd>Ctrl</kbd>+<kbd>Z</kbd>, or <kbd>Cmd</kbd>+<kbd>Z</kbd> on macOS).

Cells edited while scalafmt is running are left untouched.

## Uninstall

```bash
pip uninstall almond-scalafmt
```

## Contributing

If you would like to contribute to this extension, please refer to the [Contributing Guide](CONTRIBUTING.md).

Please report issues in the [almond repository](https://github.com/almond-sh/almond/issues) rather than in the almond-scalafmt repository.
