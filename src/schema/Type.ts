// This file is part of cxsd, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Namespace} from './Namespace';
import {Member} from './Member';

export class Type {
	constructor() {
		this.surrogateKey = Type.nextKey++;
	}

	// TODO: handle naming collisions between attributes and children,
	// and between namespaces.
	buildMemberTbl() {
		var member: Member;

		if(this.attributeList) for(member of this.attributeList) this.attributeTbl[member.name] = member;
		if(this.childList) for(member of this.childList) this.childTbl[member.name] = member;
	}

	name: string;
	namespace: Namespace;
	safeName: string;
	bytePos: number;

	/** Primitive type of child text node if defined
	  * (representable as a JavaScript value). */
	primitiveType: Type;
	/** List of allowed literal values, if such a restriction is defined. */
	literalList: string[];

	/** Type only contains a child text node and no other data. */
	isPlainPrimitive: boolean;

	attributeTbl: {[name: string]: Member} = {};
	childTbl: {[name: string]: Member} = {};
	/** XML attributes in an element of this type. */
	attributeList: Member[];
	/** Allowed child elements for an element of this type. */
	childList: Member[];
	/** TODO: Other types added as mixins. */
	// groupList: Member[];

	/** Parent type this is derived from. */
	parent: Type;

	/** For an anonymous type, the member (of another type) that it defines.
	  * Used for giving the type a descriptive name. */
	containingType: Type;
	containingMember: Member;

	comment: string;

	surrogateKey: number;
	private static nextKey = 0;

	static primitiveFlag = 1;
	static plainPrimitiveFlag = 2;
}
