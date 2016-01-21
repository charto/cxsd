// This file is part of cxml, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Type} from '../Type';
import {Member} from '../Member';
import {Transform} from './Transform';

export class AddImports extends Transform<void> {
	prepare() {
		this.visitType(this.doc);

		for(var type of this.namespace.typeList) {
			if(type) this.visitType(type);
		}

		return(true);
	}

	visitType(type: Type) {
		var member: Member;

		if(type.attributeList) {
			for(var member of type.attributeList) {
				for(var memberType of member.typeList) this.visitTypeRef(memberType, member, type);
			}
		}

		if(type.childList) {
			for(var member of type.childList) {
				for(var memberType of member.typeList) this.visitTypeRef(memberType, member, type);
			}
		}
	}

	visitTypeRef(type: Type, member: Member, parent: Type) {
		if(type.namespace && type.namespace != this.namespace) {
			// Type from another, imported namespace.

			var id = type.namespace.id;
			var short = this.namespace.getShortRef(id);

			if(!short) {
				short = member.namespace.getShortRef(id) || type.namespace.short;
				if(short) this.namespace.addRef(short, type.namespace);
			}
		}
	}

	construct = AddImports;
}
