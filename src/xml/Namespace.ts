// This file is part of cxml, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Type, TypeSpec, TypeClassMembers} from './Type';

export interface ModuleExports {
	[name: string]: any;
	_cxml: [ Namespace ];
}

/** Tuple: module exports object, list of imported type names */
export type ImportSpec = [ ModuleExports, string[] ];

export class Namespace {
	constructor(name: string, importSpecList: ImportSpec[]) {
		this.name = name;
		this.importSpecList = importSpecList;

		// Skip the document type.
		var importOffset = 1;

		for(var importSpec of importSpecList) {
			importOffset += importSpec[1].length;
		}

		this.typeSpecList.length = importOffset;
	}

	addType(spec: TypeSpec) {
		if(this.typeSpecList[0]) this.typeSpecList.push(spec);
		else {
			// First type added after imports is number 0, the document type.
			this.typeSpecList[0] = spec;
		}

		if(spec.safeName) this.exportTypeTbl[spec.safeName] = spec;
	}

	typeByNum(num: number) {
		return(this.typeSpecList[num]);
	}

	link() {
		// Skip the document type.
		var typeNum = 1;

		for(var importSpec of this.importSpecList) {
			var other = importSpec[0]._cxml[0];

			for(var typeName of importSpec[1]) {
				this.typeSpecList[typeNum++] = other.exportTypeTbl[typeName];
			}
		}

		this.exportOffset = typeNum;

		var typeSpecList = this.typeSpecList;
		var typeCount = typeSpecList.length;

		while(typeNum < typeCount) {
			var typeSpec = typeSpecList[typeNum++];

			if(typeSpec.parentNum) {
				typeSpec.setParent(typeSpecList[typeSpec.parentNum]);
			}
		}
	}

	exportTypes(exports: ModuleExports) {
		var typeSpecList = this.typeSpecList;
		var typeCount = typeSpecList.length;

		for(var typeNum = this.exportOffset; typeNum < typeCount; ++typeNum) {
			var typeSpec = typeSpecList[typeNum];

			exports[typeSpec.safeName] = typeSpec.type;
		}
	}

	exportDocument(exports: ModuleExports) {
		var doc = this.typeSpecList[0].type.prototype as TypeClassMembers;

		for(var safeName of Object.keys(doc)) {
			exports[safeName] = doc[safeName];
		}
	}

	name: string;
	importSpecList: ImportSpec[];
	exportTypeNameList: string[];
	typeSpecList: TypeSpec[] = [];
	exportOffset: number;

	exportTypeTbl: { [name: string]: TypeSpec } = {};
}
