// This file is part of cxml, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Type} from '../Type';
import {Member} from '../Member';
import {Transform} from './Transform';

function sanitizeName(name: string) {
	return(name.replace(/[^_0-9A-Za-z]/g, '').replace(/^[^A-Za-z]+/, ''));
}

export class Sanitize extends Transform<void> {
	prepare() {
		this.visitType(this.doc);

		for(var type of this.namespace.typeList) {
			if(type) this.visitType(type);
		}

		return(true);
	}

	visitType(type: Type) {
		var member: Member;

		if(type.name) type.safeName = sanitizeName(type.name);

		if(type.attributeList) {
			for(member of type.attributeList) {
				if(member.name) member.safeName = sanitizeName(member.name);
			}
		}

		if(type.childList) {
			for(member of type.childList) {
				if(member.name) member.safeName = sanitizeName(member.name);
			}
		}
	}

	construct = Sanitize;
}
