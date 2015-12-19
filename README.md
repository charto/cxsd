fast-xml
========

(Currently incomplete and not operational) streaming XML parser using node-expat (requires node-gyp to compile).

Uses XSD schema information to read XML into nice JavaScript structures.

Downloads schema files and keeps a local cache in the file system.

Handles arbitrarily large files using streaming.

Parsing XSD schema files
------------------------

Schema handling is implemented in the `xsd` directory. Supported syntax elements are defined in its `types` subdirectory. Each element in the xsd namespace inherits from `types.Base` which has static and dynamic members that affect parser initialization. The `Base` class and its derived classes shouldn't have manually defined constructors, because the parser will instantiate objects to inspect the dynamic properties. Instead, an `init` function is called on constructed objects when creating them during actual parsing.

The static members are mirrored as dynamic members of `BaseClass`. Any constructor of a class derived from `Base` can then be used as if it was a `BaseClass` instance.

The static `mayContain` member function of syntax element types (classes derived from `types.base`) returns a list of other element types (defined as `BaseClass` instances) that it supports as direct children. The parser uses these to create a kind of state machine.

Syntax elements may also have attributes. They should be initialized to `null` in the class definition (the TypeScript compiler will automatically generate a constructor to initialize them). The parser will construct an instance of each class it finds, and examine its automatically constructed dynamic members. During parsing, they will then be automatically initialized to attributes found in the schema being parsed. Unknown attributes will be ignored.

License
=======

[The MIT License](https://raw.githubusercontent.com/charto/fast-xml/master/LICENSE)

Copyright (c) 2015 BusFaster Ltd
