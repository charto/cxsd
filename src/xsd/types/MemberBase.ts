// This file is part of cxsd, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {State} from '../State';
import {QName} from '../QName';
import * as types from '../types';
import {TypedBase} from './TypedBase';
import * as schema from '../../schema';

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

		this.typeRef = this.resolveType(this.type, state);

		return(member);
	}

	getOutMember(schemaContext: schema.Context): schema.Member {
		var outMember = this.outMember;

		if(!outMember) {
			outMember = new schema.Member(this.name);

			if(this.scope) {
				schemaContext.copyNamespace(this.scope.namespace).addMember(outMember);
			}

			this.outMember = outMember;
		}

		return(outMember);
	}

	getTypes(): types.TypeBase[] {
		var typeList: types.TypeBase[];

		// Filter out types of unresolved elements.
		if(
			this.typeRef &&
			this.typeRef instanceof types.TypeBase
		) {
			typeList = [this.typeRef as types.TypeBase];
		} else typeList = [];

		return(typeList);
	}

	isAbstract() {
		return(false);
	}

	id: string = null;
	name: string = null;
	ref: string = null;
	type: string = null;

	min: number;
	max: number;

	typeRef: QName | types.TypeBase;

	outMember: schema.Member;
}
