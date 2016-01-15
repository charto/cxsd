// This file is part of cxml, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {State} from '../State';
import {QName} from '../QName';
import * as types from '../types';

export class MemberBase extends types.Base {
	resolveMember(state: State, kind: string) {
		var member = this as MemberBase;

		if(this.ref) {
			// Replace this with another, referenced element.

			var ref = new QName(this.ref, state.source);
			member = this.scope.lookup(ref, kind) as MemberBase;

			if(member) member.define(state, kind, this.min, this.max, this.scope);
			else throw new types.MissingReferenceError(this, state, kind, ref);
		}

		// If the element has a type set through an attribute, look it up in scope.

		if(this.type) {
			var type = new QName(this.type as string, state.source);
			this.type = this.scope.lookup(type, 'type') as types.TypeBase || type;
		} else {
			// If there's a single type as a child, use it as the element's type.
			this.type = this.scope.getType();
		}

		return(member);
	}

	getTypes(): types.TypeBase[] {
		var typeList: types.TypeBase[];

		// Filter out types of unresolved elements.
		if(
			typeof(this.type) == 'object' &&
			this.type instanceof types.TypeBase
		) {
			typeList = [this.type as types.TypeBase];
		} else typeList = [];

		return(typeList);
	}

	id: string = null;
	name: string = null;
	ref: string = null;
	type: string | QName | types.TypeBase = null;

	min: number;
	max: number;

	surrogateKey: number;
}
