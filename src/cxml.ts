// This file is part of cxml, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

var pendingList: any[] = [];
var pendingCount = 0;

function mark(exports: any) {
	if(!exports._cxml) {
		exports._cxml = true;
		pendingList.push(exports);
		++pendingCount;
	}
}

export function register(name: string, exports: any, imports: any[]) {
	mark(exports);
	console.log(name);
	console.log(imports);

	for(var other of imports) mark(other);
	if(--pendingCount == 0) {
		console.log('done');
		pendingList = [];
	}
}
