// This file is part of cxml, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Type} from '../Type';
import {Member} from '../Member';
import {Transform} from './Transform';

function sanitizeName(name: string) {
	return(name.replace(/[^_0-9A-Za-z]/g, '').replace(/^[^A-Za-z]+/, ''));
}

export class Sanitize extends Transform<void> {
	visitType(type: Type) {
		if(type.name) type.safeName = sanitizeName(type.name);

		super.visitType(type);
	}

	visitMember(member: Member) {
		if(member.name) member.safeName = sanitizeName(member.name);
	}

	construct = Sanitize;
}
