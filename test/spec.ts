import * as cxml from "cxml";
import * as example from "./xmlns/pathvisio.org/GPML/2013a";
var fs = require("fs");
var path = require("path");

var parser = new cxml.Parser();

var result = parser.parse(
  fs.createReadStream(path.resolve(__dirname, "input/one-of-each.gpml")),
  example.document
);

result.then(doc => {
  console.log("\n=== 123 ===\n");

  console.log(JSON.stringify(doc, null, 2));
});
