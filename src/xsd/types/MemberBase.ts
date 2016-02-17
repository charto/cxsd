// This file is part of cxsd, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {State} from '../State';
import {QName} from '../QName';
import * as types from '../types';
import {TypedBase} from './TypedBase';

export class MemberBase extends TypedBase {
	resolveMember(state: State, kind: string) {
		var member = this as MemberBase;

		if(this.ref) {
			// Replace this with another, referenced element.

			var ref = new QName(this.ref, state.source);
			member = this.scope.lookup(ref, kind) as MemberBase;

			if(member) member.define(state, kind, this.min, this.max, this.scope);
			else throw new types.MissingReferenceError(kind, ref);
		}

		this.resolveType(state);

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

	min: number;
	max: number;

	surrogateKey: number;
}
