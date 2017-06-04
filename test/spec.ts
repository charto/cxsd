import * as cxml from "cxml";
import * as example from "./xmlns/pathvisio.org/GPML/2013a";
var fs = require("fs");
var path = require("path");

var parser = new cxml.Parser();

//parser.attach(
//  class PathwayHandler extends example.document.Pathway.constructor {
//    _before() {
//      console.log("\nBefore " + this.Name + ": " + JSON.stringify(this));
//    }
//
//    _after() {
//      console.log("After  " + this.Name + ": " + JSON.stringify(this));
//    }
//  }
//);
//
//parser.attach(
//  class InfoBoxHandler extends example.document.InfoBox.constructor {
//    _before() {
//      console.log("\nBefore " + this.CenterX + ": " + JSON.stringify(this));
//    }
//
//    _after() {
//      console.log("After  " + this.CenterX + ": " + JSON.stringify(this));
//    }
//  }
//);
//
//parser.attach(
//  class DataNodeHandler extends example.document.DataNode.constructor {
//    /** Fires when the opening <DataNode> and attributes have been parsed. */
//
//    _before() {
//      console.log("\nBefore " + this.TextLabel + ": " + JSON.stringify(this));
//    }
//
//    /** Fires when the closing </DataNode> and children have been parsed. */
//
//    _after() {
//      console.log("After  " + this.TextLabel + ": " + JSON.stringify(this));
//    }
//  }
//);

var result = parser.parse(
  fs.createReadStream(path.resolve(__dirname, "input/one-of-each.gpml")),
  example.document
);

result.then(doc => {
  console.log("\n=== 123 ===\n");

  console.log(JSON.stringify(doc, null, 2));
});

/*
var xsd = require('xsd');
var json2 = xsd.fileToFlatJSON('./GPML2013a.xsd', function(errors, obj) {
	console.log('obj');
	console.log(JSON.stringify(obj, null, '  '));
});


var convert = require('xml-js');
var GPML2013aSchema = fs.readFileSync(path.resolve(__dirname, "GPML2013a.xsd"));
var result1 = convert.xml2json(GPML2013aSchema, {compact: true, spaces: 4});
console.log('result1');
console.log(result1);
//*/

//var sampleGPML = fs
//  .readFileSync(__dirname + "/simple.gpml", "utf8")
//  .replace('<?xml version="1.0" encoding="UTF-8"?>', "");
//console.log("sampleGPML");
//console.log(sampleGPML);
//var result = parser.parse(sampleGPML, example.document);

//var parser = new cxml.Parser();
//
//parser.attach(class DirHandler extends (example.document.dir.constructor) {
//
//	/** Fires when the opening <dir> and attributes have been parsed. */
//
//	_before() {
//		console.log('\nBefore ' + this.name + ': ' + JSON.stringify(this));
//	}
//
//	/** Fires when the closing </dir> and children have been parsed. */
//
//	_after() {
//		console.log('After  ' + this.name + ': ' + JSON.stringify(this));
//	}
//
//});
//
//var result = parser.parse('<dir name="empty"></dir>', example.document);
//
//result.then((doc: example.document) => {
//
//	console.log('\n=== empty ===\n');
//
//	console.log( JSON.stringify(doc) );  // {"dir":{"name":"empty"}}
//	var dir = doc.dir;
//
//	console.log( dir instanceof example.document.dir.constructor );   // true
//	console.log( dir instanceof example.document.file.constructor );  // false
//
//	console.log( dir instanceof example.DirType );   // true
//	console.log( dir instanceof example.FileType );  // false
//
//	console.log( dir._exists );          // true
//	console.log( dir.file[0]._exists );  // false (not an error!)
//
//});
//
//result = parser.parse(
//  fs.createReadStream(path.resolve(__dirname, 'xml/dir-example.xml')), example.document);
//
//result.then((doc: example.document) => {
//
//	console.log('\n=== 123 ===\n');
//
//	console.log(JSON.stringify(doc, null, 2));
//
//});
