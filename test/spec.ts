import * as cxml from "cxml";
import * as example from "./xmlns/pathvisio.org/GPML/2013a";
var fs = require("fs");
var path = require("path");

var parser = new cxml.Parser();

var result = parser.parse(
  fs.createReadStream(path.resolve(__dirname, "input/one-of-each.gpml")),
  example.document
);

parser.attach(
  class CustomHandlerPathwayComment extends example.document.Pathway.Comment[0]
    .constructor {
    _before() {
      console.log("_before");
      console.log(this);
    }

    _after() {
      console.log("_after");
      console.log(this);
    }
  }
);

parser.attach(
  class CustomHandlerDataNodeComment extends example.document.Pathway
    .DataNode[0].Comment[0].constructor {
    _before() {
      console.log("_before");
      console.log(this);
    }

    _after() {
      console.log("_after");
      console.log(this);
    }
  }
);

test("the data is peanut butter", () => {
  expect.assertions(1);
  return result.then(doc => {
    //console.log("\n=== 123 ===\n");
    //console.log(JSON.stringify(doc, null, 2));
    expect(typeof doc).toBe("object");
  });
});
