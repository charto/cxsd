import * as cxml from "@wikipathways/cxml";
import * as example from "../xmlns/pathvisio.org/GPML/2013a";
var fs = require("fs");
var path = require("path");

var parser = new cxml.Parser();

var result = parser.parse(
  fs.createReadStream(path.resolve(__dirname, "../input/one-of-each.gpml")),
  example.document
);

test("full response", () => {
  expect.assertions(1);
  return result.then(doc => {
    //console.log("\n=== 123 ===\n");
    //console.log(JSON.stringify(doc, null, 2));
    expect(typeof doc).toBe("object");
  });
});
