// This file is part of cxml, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

var pendingList: any[] = [];
var pendingCount = 0;

export interface ModuleExports {
	[name: string]: any;
	_cxml: boolean;
}

/** Tuple: module exports object, list of imported type names */
export type ImportSpec = [ ModuleExports, string[] ];

/** Tuple: name, flags, type ID list */
export type MemberSpec = [ string, number, number[] ];

/** Tuple: parent type ID, child element list, attribute list */
export type TypeSpec = [ number, MemberSpec[], MemberSpec[] ];

function mark(exports: ModuleExports) {
	if(!exports._cxml) {
		exports._cxml = true;
		pendingList.push(exports);
		++pendingCount;
	}
}

export function register(
	name: string,
	exportObject: ModuleExports,
	importSpecList: ImportSpec[],
	exportTypeNameList: string[],
	typeSpecList: TypeSpec[]
) {
	mark(exportObject);

	console.log(name);
	console.log(importSpecList);
	console.log(exportTypeNameList);
	console.log(typeSpecList);

	for(var spec of importSpecList) mark(spec[0]);
	if(--pendingCount == 0) {
		console.log('done');
		pendingList = [];
	}
}
