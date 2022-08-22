## Parsing XSD schema files

Schema handling is implemented in the `xsd` directory. Supported syntax elements are defined in its `types` subdirectory. Each element in the xsd namespace inherits from `types.Base` which has static and dynamic members that affect parser initialization. The `Base` class and its derived classes shouldn't have manually defined constructors, because the parser will instantiate objects to inspect the dynamic properties. Instead, an `init` function is called on constructed objects when creating them during actual parsing.

The static members are mirrored as dynamic members of `BaseClass`. Any constructor of a class derived from `Base` can then be used as if it was a `BaseClass` instance.

The static `mayContain` member function of syntax element types (classes derived from `types.base`) returns a list of other element types (defined as `BaseClass` instances) that it supports as direct children. The parser uses these to create a kind of state machine.

Syntax elements may also have attributes. They should be initialized to `null` in the class definition (the TypeScript compiler will automatically generate a constructor to initialize them). The parser will construct an instance of each class it finds, and examine its automatically constructed dynamic members. During parsing, they will then be automatically initialized to attributes found in the schema being parsed. Unknown attributes will be ignored.

The XSD parser proceeds in stages (the parser and all syntax element classes have correspondingly named methods):

- `init` which calls `define` to bind named elements, attributes, types etc. to their scope and handles `import` and `include` declarations. The imports form a directed, possibly cyclic graph and can modify root scopes of arbitrary namespaces, so it's impossible to generally resolve references to other named things visible in scope before all imports have been processed.
- `resolve` which resolves references by name and finds out how many times they may appear. Because possible attributes and child elements can be defined through deeply nested references that can point to other namespaces, it's generally impossible to know them all before all references in all namespaces have been resolved.
