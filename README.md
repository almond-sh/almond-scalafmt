# almond-scalafmt

[![Github Actions Status](https://github.com/almond-sh/almond-scalafmt/workflows/Build/badge.svg)](https://github.com/almond-sh/almond-scalafmt/actions?query=workflow%3ABuild)

Scalafmt extension for almond

![Demo](https://github.com/almond-sh/almond-scalafmt/raw/main/demo.gif)

## Requirements

* JupyterLab >= `2.0`
* [almond](https://github.com/almond-sh/almond) >= `0.10.8`

## Install

```bash
jupyter labextension install @almond-sh/scalafmt
```

## Usage

This extension adds two commands in the JupyterLab command palette:
- Format current cell with scalafmt
- Format all code cells with scalafmt

Open the JupyterLab command palette, by clicking on the "Commands" tab in the left sidebar. Quickly
find the almond-scalafmt commands above by typing `fmt` in the search box.

To revert the formatting in a cell, put the cursor in this cell, and hit the undo shortcut (Command + Z on macOS).

These commands work when using the [almond](https://github.com/almond-sh/almond) Scala kernel `0.10.8`, or a higher version.

## Contributing

### Install

The `jlpm` command is JupyterLab's pinned version of
[yarn](https://yarnpkg.com/) that is installed with JupyterLab. You may use
`yarn` or `npm` in lieu of `jlpm` below.

```bash
# Clone the repo to your local environment
# Move to almond-scalafmt directory

# Install dependencies
jlpm
# Build Typescript source
jlpm build
# Link your development version of the extension with JupyterLab
jupyter labextension install .
# Rebuild Typescript source after making changes
jlpm build
# Rebuild JupyterLab after making any changes
jupyter lab build
```

You can watch the source directory and run JupyterLab in watch mode to watch for changes in the extension's source and automatically rebuild the extension and application.

```bash
# Watch the source directory in another terminal tab
jlpm watch
# Run jupyterlab in watch mode in one terminal tab
jupyter lab --watch
```

Now every change will be built locally and bundled into JupyterLab. Be sure to refresh your browser page after saving file changes to reload the extension (note: you'll need to wait for webpack to finish, which can take 10s+ at times).

### Reporting issues

Please report issues in the [almond repository](https://github.com/almond-sh/almond/issues) rather than in the almond-scalafmt repository.

## Uninstall

```bash

jupyter labextension uninstall almond-scalafmt
```
