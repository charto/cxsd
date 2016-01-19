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

/** Tuple: name, type, flags */
export type MemberSpec = [string, number, number];

/** Tuple: name, member list */
export type TypeSpec = [ string, MemberSpec[] ];

function mark(exports: ModuleExports) {
	if(!exports._cxml) {
		exports._cxml = true;
		pendingList.push(exports);
		++pendingCount;
	}
}

export function register(name: string, exports: ModuleExports, imports: ImportSpec[], types: TypeSpec[]) {
	mark(exports);
	console.log(name);
	console.log(imports);

	for(var spec of imports) mark(spec[0]);
	if(--pendingCount == 0) {
		console.log('done');
		pendingList = [];
	}
}
