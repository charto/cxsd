// This file is part of cxsd, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as cxml from 'cxml';

import {Context} from './Context';
import {NamespaceRef} from './NamespaceRef';
import {Type} from './Type';
import {Member} from './Member';

export enum TypeState {
	anonymous,
	exported
}

export class Namespace extends cxml.NamespaceBase<Context, Namespace> {
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

	getUsedImportTbl() {
		var importTbl = this.importTbl;

		if(!importTbl) {
			importTbl = {};

			if(this.importTypeNameTbl) {
				for(var key of Object.keys(this.importTypeNameTbl)) {
					var id = +key;
					var short = this.getShortRef(id);
					importTbl[this.getShortRef(id)] = this.context.namespaceById(id);
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
				this.context.namespaceById(+id)
			));
		}
	}

	addType(type: Type) {
		var id = type.surrogateKey;
		this.typeList[id] = type;
		this.typeStateList[id] = TypeState.anonymous;

		type.namespace = this;
	}

	addMember(member: Member) {
		var id = member.surrogateKey;
		this.memberList[id] = member;

		member.namespace = this;
	}

	exportType(type: Type) {
		this.typeStateList[type.surrogateKey] = TypeState.exported;
	}

	cachePath: string;

	/** Invisible document element defining the types of XML file root elements. */
	doc: Type;

	/** All types used in the document. */
	typeList: Type[] = [];

	memberList: Member[] = [];

	typeStateList: TypeState[] = [];

	/** List of URL addresses of files with definitions for this namespace. */
	sourceList: string[];

	exported: boolean;

	private refList: NamespaceRef[];
	private refTbl: {[namespaceId: number]: NamespaceRef};

	private cacheDir: string;

	/** Short names used to reference other namespaces in schemas defining this namespace. */
	shortNameTbl: {[namespaceId: string]: string[]} = {};

	/** Table of namespaces actually imported, by short name. */
	private importTbl: {[short: string]: Namespace};

	/** List of referenced type names from each imported namespace. */
	importTypeNameTbl: { [namespaceId: string]: { [name: string]: Type } };

	/** True only for the special namespace containing primitives. */
	isPrimitiveSpace: boolean;
}
