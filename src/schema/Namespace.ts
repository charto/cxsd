// This file is part of fast-xml, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as path from 'path';

import {Address, Cache} from 'cget'

import {NamespaceRef} from './NamespaceRef';
import {Type} from './Type';
import {Member} from './Member';

export class Namespace {
	constructor(id: number, name: string) {
		this.id = id;
		this.name = name;
	}

	addRef(shortName: string, namespace: Namespace) {
		var id = namespace.id;

		if(!this.shortNameTbl[id]) this.shortNameTbl[id] = [];
		this.shortNameTbl[id].push(shortName);
	}

	getShortRef(id: number) {
		var nameList = this.shortNameTbl[id];

		if(nameList && nameList.length) return(nameList[0]);
		else return(null);
	}

	markUsed(id: number) {
		this.namespaceUsedList[id] = true;
	}

	getImports() {
		var namespaceCount = this.namespaceUsedList.length;
		var importNameTbl = this.importNameTbl;

		if(!importNameTbl) {
			importNameTbl = {};

			for(var id = 0; id < namespaceCount; ++id) {
				if(this.namespaceUsedList[id] && id != this.id) {
					var short = this.getShortRef(id);
					if(short) importNameTbl[short] = id;
				}
			}
		}

		return(importNameTbl);
	}

	addType(type: Type) {
		this.typeList.push(type);
	}

	exportHeaderTS(exporter: any) {
		var output: string[] = [];
		var importNameTbl = this.getImports();

		for(var shortName of Object.keys(importNameTbl).sort()) {
			var namespace = Namespace.list[importNameTbl[shortName]];

			output.push(
				'import * as ' +
				shortName +
				' from ' +
				"'" + exporter.getPathTo(namespace.name) + "';"
			);
		}

		output.push('');
		return(output.join('\n'));
	}

	static register(id: number, name: string) {
		var namespace = Namespace.list[id];

		if(!namespace) {
			namespace = new Namespace(id, name);
			Namespace.list[id] = namespace;
		}

		return(namespace);
	}

	static byId(id: number) {
		return(Namespace.list[id]);
	}

	id: number;
	name: string;
	cachePath: string;

	doc: Type;

	typeList: Type[] = [];
//	childList: Member[] = [];

	sourceList: string[];

	exported: boolean;

	private refList: NamespaceRef[];
	private refTbl: {[namespaceId: number]: NamespaceRef};

	private cacheDir: string;

	/** Short names used to reference other namespaces in schemas defining this namespace. */
	private shortNameTbl: {[namespaceId: string]: string[]} = {};

	/** Table of namespaces actually imported, mapping their short name to ID. */
	private importNameTbl: {[short: string]: number};

	private namespaceUsedList: boolean[] = [];

	/** Internal list of namespaces indexed by a surrogate key. */
	private static list: Namespace[] = [];
}
