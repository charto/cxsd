# xsd

This is an XSD parser, which reads several XSD files into an internal representation grouped by namespaces, which can be converted into a simpler,
serializable representation (located in the `schema` directory of this project).

Handlers for individual tags present in XSD files are in the `types` subdirectory.
