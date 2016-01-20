// This file is part of cxml, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as path from 'path';

import {Address, Cache} from 'cget'

import {NamespaceRef} from './NamespaceRef';
import {Type} from './Type';
import {Member} from './Member';

export enum TypeState {
	anonymous,
	/** Types not exported but needed to represent elements in the document. */
	named,
	exported
}

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

	addSrc(namespace: Namespace) {
		var id = namespace.id;

		this.srcNamespaceTbl[id] = namespace;
	}

	getShortRef(id: number) {
		var nameList = this.shortNameTbl[id];

		if(nameList && nameList.length) return(nameList[0]);
		else return(null);
	}

	getUsedImportTbl() {
		var importTbl = this.importTbl;

		if(!importTbl) {
			importTbl = {};

			if(this.importTypeNameTbl) {
				for(var key of Object.keys(this.importTypeNameTbl)) {
					var id = +key;
					var short = this.getShortRef(id);
					importTbl[this.getShortRef(id)] = Namespace.list[id];
				}

				this.importTbl = importTbl;
			}
		}

		return(importTbl);
	}

	getUsedImportList() {
		if(this.importTypeNameTbl) {
			var importTbl = this.getUsedImportTbl();

			return(Object.keys(importTbl).map((shortName: string) =>
				importTbl[shortName]
			));
		} else {
			return(Object.keys(this.shortNameTbl).map((id: string) =>
				Namespace.list[+id]
			));
		}
	}

	addType(type: Type) {
		var id = type.surrogateKey;
		this.typeList[id] = type;
		this.typeStateList[id] = TypeState.anonymous;

		type.namespace = this;
	}

	exportType(type: Type) {
		this.typeStateList[type.surrogateKey] = TypeState.exported;
	}

	makeTypeNamed(type: Type) {
		var id = type.surrogateKey;
		if(this.typeStateList[id] == TypeState.anonymous) {
			this.typeStateList[id] = TypeState.named
		};
	}

	static register(id: number, name: string) {
		var namespace = Namespace.list[id];

		if(!namespace) {
			namespace = new Namespace(id, name);
			Namespace.list[id] = namespace;
		}

		return(namespace);
	}

	id: number;
	name: string;
	cachePath: string;

	/** Invisible document element defining the types of XML file root elements. */
	doc: Type;

	/** All types used in the document. */
	typeList: Type[] = [];

	typeStateList: TypeState[] = [];

	/** List of URL addresses of files with definitions for this namespace. */
	sourceList: string[];

	exported: boolean;

	private refList: NamespaceRef[];
	private refTbl: {[namespaceId: number]: NamespaceRef};

	private cacheDir: string;

	/** Example short name for this namespace, currently used only for elements
	  * or attributes referenced from another namespace where they are defined. */
	short: string;

	/** Short names used to reference other namespaces in schemas defining this namespace. */
	shortNameTbl: {[namespaceId: string]: string[]} = {};

	srcNamespaceTbl: {[namespaceId: string]: Namespace} = {};

	/** Table of namespaces actually imported, by short name. */
	private importTbl: {[short: string]: Namespace};

	/** List of referenced type names from each imported namespace. */
	importTypeNameTbl: { [namespaceId: string]: { [name: string]: boolean } };

	/** Internal list of namespaces indexed by a surrogate key. */
	private static list: Namespace[] = [];
}
