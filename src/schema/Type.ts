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

	/** Primitive type, if the XML type only contains single value
	  * that can be parsed into a JavaScript value. */
	literalType: Type;
	/** List of allowed literal values, if such a restriction is defined. */
	primitiveList: string[];

	attributeTbl: {[name: string]: Member} = {};
	childTbl: {[name: string]: Member} = {};
	/** XML attributes in an element of this type. */
	attributeList: Member[];
	/** Allowed child elements for an element of this type. */
	childList: Member[];

	/** Parent type this is derived from. */
	parent: Type;

	comment: string;

	surrogateKey: number;
	private static nextKey = 0;

	static optionalFlag = 1;
	static arrayFlag = 2;
}
