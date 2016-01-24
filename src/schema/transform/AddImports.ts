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

		// Types holding primitives should inherit from them.
		// NOTE: This makes base primitive types inherit themselves.
		if(type.literalType && !type.parent) type.parent = type.literalType;

		if(type.parent) this.visitTypeRef(type.parent);

		for(var member of this.getTypeMembers(type)) {
			for(var memberType of member.typeList) this.visitTypeRef(memberType, member);
		}
	}

	visitTypeRef(type: Type, member?: Member) {
		if(type.namespace && type.namespace != this.namespace) {
			// Type from another, imported namespace.

			var id = type.namespace.id;
			var short = this.namespace.getShortRef(id);

			if(!short) {
				short = (member && member.namespace.getShortRef(id)) || type.namespace.short;
				if(short) this.namespace.addRef(short, type.namespace);
			}
		}
	}

	construct = AddImports;
}
