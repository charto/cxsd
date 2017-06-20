import * as cxml from "@wikipathways/cxml";
import * as example from "../xmlns/pathvisio.org/GPML/2013a";
var fs = require("fs");
var path = require("path");

jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000; // 10 second timeout

var parser = new cxml.Parser();

var result = parser.parse(
  fs.createReadStream(path.resolve(__dirname, "../input/one-of-each.gpml")),
  example.document
);

//test("attach to Pathway.Comment[0]", done => {
//  let iAfter = 0;
//  expect.assertions(1);
//  parser.attach(
//    class CustomHandler extends example.document.Pathway.Comment[0]
//      .constructor {
//      _before() {
//        //expect(typeof this).toBe("object");
//      }
//
//      _after() {
//        console.log("this");
//        console.log(this);
//        expect(this.content).toBe("Document: mycommentA");
//        done();
//        /*
//        if (iAfter < 1) {
//          expect(this.content).toBe("Document: mycommentA");
//          done();
//        }
//        iAfter += 1;
//				//*/
//      }
//    }
//  );
//});

//test("attach to Pathway.DataNode[0].Comment[0]", done => {
//  let called = false;
//  parser.attach(
//    class CustomHandler extends example.document.Pathway.DataNode[0].Comment[0]
//      .constructor {
//      /*
//      _before() {
//        console.log("Before:");
//        console.log(JSON.stringify(this));
//        expect(typeof this).toBe("object");
//      }
//			//*/
//
//      _after() {
//        console.log("After:");
//        console.log(JSON.stringify(this));
//        if (!called) {
//          called = true;
//          expect(this.content).toBe("DataNode: anotherComment");
//          done();
//        }
//      }
//    }
//  );
//});

test("full response", () => {
  expect.assertions(1);
  return result.then(doc => {
    //console.log("\n=== 123 ===\n");
    //console.log(JSON.stringify(doc, null, 2));
    expect(typeof doc).toBe("object");
  });
});

/*
console.log("example.document.Pathway.Comment[0].constructor.toString()");
console.log(example.document.Pathway.Comment[0].constructor.toString());
console.log(example.document.Pathway.Comment[0].constructor);
console.log(example.document.Pathway.Comment[0]);

console.log(
  "example.document.Pathway.DataNode[0].Comment[0].constructor.toString()"
);
console.log(
  example.document.Pathway.DataNode[0].Comment[0].constructor.toString()
);
console.log(example.document.Pathway.DataNode[0].Comment[0].constructor);
console.log(example.document.Pathway.Comment[0]);
//*/

// passes
test("path awareness1", () => {
  expect(example.document.Pathway.Comment).not.toBe(
    example.document.Pathway.DataNode[0].Comment
  );
});

/*
// fails
test("path awareness2", () => {
  expect(example.document.Pathway.Comment[0]).not.toBe(
    example.document.Pathway.DataNode[0].Comment[0]
  );
});
//*/
