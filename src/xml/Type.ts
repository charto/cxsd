// This file is part of cxml, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Namespace} from './Namespace';

/** Tuple: name, flags, type ID list */
export type MemberSpec = [ string, number, number[] ];

function parseName(name: string) {
	var splitPos = name.indexOf(':');
	var safeName: string

	if(splitPos >= 0) {
		safeName = name.substr(0, splitPos);
		name = name.substr(splitPos + 1);
	} else safeName = name;

	return({
		name: name,
		safeName: safeName
	});
}

/** Tuple: parent type ID, child element list, attribute list */
export class TypeSpec {
	constructor(
		namespace: Namespace,
		name: string,
		parentNum: number,
		childSpecList: MemberSpec[],
		attributeSpecList: MemberSpec[]
	) {
		if(name) {
			var parts = parseName(name);
			this.name = parts.name;
			this.safeName = parts.safeName;
		}

		this.namespace = namespace;
		this.parentNum = parentNum;
		this.childSpecList = childSpecList;
		this.attributeSpecList = attributeSpecList;
	}

	setParent(spec: TypeSpec) {
		this.parent = spec;

		if(spec.type) {
			// Entire namespace for parent type is already fully defined,
			// so the parent type's dependentList won't get processed any more
			// and we should process this type immediately.

			this.defineType();
		} else if(spec != this) spec.dependentList.push(this);
	}

	defineType() {
		if(!this.type) {
			// This function hasn't been called for this type yet by setParent,
			// but something must by now have called it for the parent type.

			var parent = (this.parent && this.parent != this) ? this.parent.type : Type;

			this.type = class XmlType extends parent {};
		}

		for(var dependent of this.dependentList) {
			dependent.defineType();
		}

		this.dependentList = [];
	}

	private defineMember(spec: MemberSpec) {
		var parts = parseName(spec[0]);
		var flags = spec[1];
		var typeNumList = spec[2];

		if(typeNumList.length == 1) {
			var type = (this.type.prototype) as TypeClassMembers;
			var memberType = new (this.namespace.typeByNum(typeNumList[0]).type);

			if(flags & TypeSpec.arrayFlag) type[parts.safeName] = [memberType];
			else type[parts.safeName] = memberType;
		} else {
			// TODO: What now? Make sure this is not reached.
			// Different types shouldn't be joined with | in .d.ts, instead
			// they should be converted to { TypeA: TypeA, TypeB: TypeB... }
		}
	}

	defineMembers() {
		var spec: MemberSpec;

		for(spec of this.childSpecList) this.defineMember(spec);
		for(spec of this.attributeSpecList) this.defineMember(spec);
	}

	namespace: Namespace;
	name: string;
	safeName: string;

	parentNum: number;
	parent: TypeSpec;
	childSpecList: MemberSpec[];
	attributeSpecList: MemberSpec[];

	// Track dependents for Kahn's topological sort algorithm.
	dependentList: TypeSpec[] = [];

	type: TypeClass;

	static optionalFlag = 1;
	static arrayFlag = 2;
}

export interface TypeClass {
	new(): Type;
}

export interface TypeClassMembers {
	[name: string]: Type | Type[];
}

export class Type {
	static name: string;
}
