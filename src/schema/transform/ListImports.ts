// This file is part of cxml, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Type} from '../Type';
import {Member} from '../Member';
import {Transform} from './Transform';

function sanitizeName(name: string) {
	return(name.replace(/[^_0-9A-Za-z]/g, '').replace(/^[^A-Za-z]+/, ''));
}

export type Output = { [namespaceId: string]: { [name: string]: boolean } };

export class ListImports extends Transform<Output> {
	prepare() {
		this.visitType(this.doc);

		for(var type of this.namespace.typeList) {
			if(type) this.visitType(type);
		}

		this.namespace.importTypeNameTbl = this.output;

		return(true);
	}

	visitType(type: Type) {
		for(var member of this.getTypeMembers(type)) {
			for(var memberType of member.typeList) this.visitTypeRef(memberType, member, type);
		}
	}

	visitTypeRef(type: Type, member: Member, parent: Type) {
		if(type.namespace && type.namespace != this.namespace) {
			// Type from another, imported namespace.

			// Make sure it gets exported.
			type.namespace.exportType(type);

			var id = type.namespace.id;
			var short = this.namespace.getShortRef(id);

			if(short) {
				if(!this.output[id]) this.output[id] = {};
				this.output[id][type.safeName] = true;
			}
		}
	}

	construct = ListImports;
	output: Output = {};
}
