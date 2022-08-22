# cxsd

[![build status](https://travis-ci.org/charto/cxsd.svg?branch=master)](http://travis-ci.org/charto/cxsd)
[![dependency status](https://david-dm.org/charto/cxsd.svg)](https://david-dm.org/charto/cxsd)
[![npm version](https://img.shields.io/npm/v/cxsd.svg)](https://www.npmjs.com/package/cxsd)

![Atom screenshot](src/screenshot.png)

`cxsd` is a streaming XSD parser and XML parser generator for Node.js and
(optionally but highly recommended) [TypeScript](http://www.typescriptlang.org/).
It automatically downloads all referenced `.xsd` files and outputs two files for each defined namespace:

- `.js` JavaScript code for Node.js containing a compact state machine table for the [cxml](https://github.com/charto/cxml) parser.
- `.d.ts` TypeScript definition with JSDoc comments to help editors with tab completion, type verification and tooltips.

Since namespaces map to source files, compiled namespaces can import others like normal JavaScript files.

[cxml](https://github.com/charto/cxml) itself is highly advanced and unlike other JavaScript XML parsers.
It fully supports namespaces, derived types and (soon) substitution groups.
Output structure is defined mainly by schema, not the XML input.
You can correctly parse files with completely unexpected structures (conditions apply) and element names,
if they refer to a schema mapping the contents to supported equivalents.

## Usage

```bash
echo '{ "scripts": { "cxsd": "cxsd" } }' > package.json
npm install cxsd
npm run cxsd http://schemas.opengis.net/wfs/1.1.0/wfs.xsd
```

The first line just sets up NPM to allow calling `cxsd` without installing it globally. It also works on Windows if you omit the single quotes (`'`).

This downloads 96 `.xsd` files (total about 720 kilobytes) and produces 9 `.js` files for the XML parser (total about 90 kilobytes)
and 9 `.d.ts` files (total about 480 kilobytes) for TypeScript editors to statically verify the parser output is correctly used and generally help the programmer.

You can import the resulting `.d.ts` and `.js` files from TypeScript:

```TypeScript
import * as wfs from './xmlns/www.opengis.net/wfs';
import * as ows from './xmlns/www.opengis.net/ows';

var metadata = wfs.document.WFS_Capabilities.OperationsMetadata;
```

See how the [Atom](https://atom.io/) editor with [atom-typescript](https://atom.io/packages/atom-typescript) understands the code in the screenshot at the top.

## Features

- Automatically download and cache to disk all imported .xsd files
- Convert XSD contents to ES6 equivalents (generated `.js` files call `cxml` to parse themselves into JavaScript structures)
  - Types to classes
    - Deriving from other types to inheriting other classes
  - Imports from remote URLs to imports from local relative paths
  - Strings, numbers and dates to matching primitive types
  - Lists to arrays
- To TypeScript equivalents (defined in `.d.ts` for working with source code)
  - Annotations to JSDoc comments
  - Enumerations to unions of string literals

## Related projects

- [CodeSynthesis XSD](http://codesynthesis.com/projects/xsd/) generates `C++`-based parsers out of XSD schema definitions.

# License

[The MIT License](https://raw.githubusercontent.com/charto/cxsd/master/LICENSE)

Copyright (c) 2015-2016 BusFaster Ltd
