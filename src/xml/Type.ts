// This file is part of cxml, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Namespace} from './Namespace';

/** Tuple: name, flags, type ID list */
export type MemberSpec = [ string, number, number[] ];

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
			var splitPos = name.indexOf(':');

			if(splitPos >= 0) {
				this.safeName = name.substr(0, splitPos);
				name = name.substr(splitPos + 1);
			} else this.safeName = name;

			this.name = name;
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

			this.type = class extends parent {};
			this.type.register(this);
		}

		for(var dependent of this.dependentList) {
			dependent.defineType();
		}

		this.dependentList = [];
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
}

export interface TypeClass {
	new(): Type;

	register(spec: TypeSpec): void;
}

export class Type {
	static register(spec: TypeSpec) {
		this.spec = spec;
	}

	static name: string;
	private static spec: TypeSpec;
}
