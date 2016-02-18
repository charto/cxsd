// This file is part of cxsd, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Type} from '../Type';
import {Member} from '../Member';
import {Transform} from './Transform';

export interface State {
	pendingAnonTbl: { [typeId: string]: { type: Type, memberTypeList: Type[] } };
	pendingAnonList: Type[];
	typeListList: Type[][];
}

function capitalize(match: string, initial: string) {
	return(initial.toUpperCase());
}

function sanitizeName(name: string) {
	var reserved = {
		'constructor': true
	};

	name = name
		.replace(/-([a-z])/, capitalize)
		.replace(/[^_0-9A-Za-z]/g, '')
		.replace(/^[^A-Za-z]+/, '');

	if(reserved.hasOwnProperty(name)) name = '_' + name;

	return(name);
}

export class Sanitize extends Transform<Sanitize, void, State> {
	prepare() {
		var typeList = this.namespace.typeList.filter((type: Type) => !!type);
		var type: Type;

		for(type of typeList) {
			type.buildMemberTbl();
		}

		this.visitType(this.doc);

		for(type of typeList) {
			this.visitType(type);
		}

		this.state.typeListList.push(typeList);

		return(true);
	}

	renameDuplicates(typeList: Type[]) {
		// TODO: handle collisions between names of types and members of doc.

		// Sort types by sanitized name and duplicates by original name
		// (missing original names sorted after existing original names).

		// TODO: merge types with identical contents.

		typeList = typeList.sort((a: Type, b: Type) =>
			a.safeName.localeCompare(b.safeName) ||
			+!!b.name - +!!a.name ||
			(a.name && a.name.localeCompare(b.name))
		);

		// Add numeric suffix to duplicate names.

		var name = '';
		var suffix = 2;

		for(var type of typeList) {
			if(type.safeName == name) {
				type.safeName += '_' + (suffix++);
			} else {
				name = type.safeName;
				suffix = 2;
			}
		}
	}

	finish() {
		for(var key of Object.keys(this.state.pendingAnonTbl)) {
			var spec = this.state.pendingAnonTbl[key];

			if(spec) {
				for(var memberType of spec.memberTypeList) {
					if(memberType.containingType.safeName) this.addNameToType(memberType);
				}
			}
		}

		for(var type of this.state.pendingAnonList) {
			if(!type.safeName) type.safeName = 'Type';
		}

		for(var typeList of this.state.typeListList) {
			this.renameDuplicates(typeList);
		}
	}

	visitType(type: Type) {
		var memberList: Member[] = [];
		var member: Member;
		var other: Type;
		var otherMember: Member;
		var iter: number;

		if(type.name) type.safeName = sanitizeName(type.name);
		else this.state.pendingAnonList.push(type);

		if(type.attributeList) {
			for(member of type.attributeList) {
				// Add a $ prefix to attributes of this type
				// conflicting with children of this or parent types.

				other = type;
				iter = 100;

				while(other && --iter) {
					otherMember = other.childTbl[member.element.name];
					if(otherMember) {
						member.element.prefix = '$';
						break;
					}

					other = other.parent;
				}

				memberList.push(member);
			}
		}

		if(type.childList) {
			for(member of type.childList) {
				// Add a $ prefix to attributes of parent types
				// conflicting with children of this type.

				other = type;
				iter = 100;

				while((other = other.parent) && --iter) {
					otherMember = other.attributeTbl[member.element.name];
					if(otherMember && !otherMember.element.prefix) {
						otherMember.element.prefix = '$';
						if(otherMember.element.safeName) otherMember.element.safeName = otherMember.element.prefix + otherMember.element.safeName;
					}
				}

				// Ensure maximum allowed occurrence count is no less than in parent types,
				// because overriding a parent class member with a different type
				// (array vs non-array) doesn't compile.

				if(member.max < 2) {
					other = type;
					iter = 100;

					// TODO: Topologically sort dependencies to start processing from root types,
					// to avoid continuing search after one parent with a matching member is found.

					while((other = other.parent) && --iter) {
						otherMember = other.childTbl[member.element.name];
						if(otherMember && otherMember.max > member.max) {
							member.max = otherMember.max;
							if(member.max > 1) break;
						}
					}
				}

				memberList.push(member);
			}
		}

		// Add names to any unnamed types of members, based on the member name.

		for(var member of memberList) {
			// TODO: Detect duplicate names from other namespaces and prefix them.

			if(member.element.name == '*') member.element.safeName = '*';
			else member.element.safeName = (member.element.prefix || '') + sanitizeName(member.element.name);

			this.addNameToMemberTypes(type, member);
		}
	}

	addNameToType(type: Type) {
		var containingType = type.containingType;
		var containingMember = type.containingMember;

		if(containingMember) {
			type.namespace = containingMember.element.namespace;

			type.safeName = (containingType ? containingType.safeName : '') + (containingMember.element.safeName || '').replace(/^([a-z])/, capitalize) + 'Type';
		}

		var spec = this.state.pendingAnonTbl[type.surrogateKey];

		if(spec) {
			for(var memberType of spec.memberTypeList) {
				this.addNameToType(memberType);
			}

			this.state.pendingAnonTbl[type.surrogateKey] = null;
		}
	}

	addNameToMemberTypes(type: Type, member: Member) {
		for(var memberType of member.element.typeList) {
			if(!memberType.safeName && memberType.namespace == this.namespace) {
				if(memberType.containingType) {
					if(memberType.containingType.safeName) this.addNameToType(memberType);
					else {
						var spec = this.state.pendingAnonTbl[memberType.containingType.surrogateKey];

						if(!spec) {
							spec = { type: memberType.containingType, memberTypeList: [] };
							this.state.pendingAnonTbl[memberType.containingType.surrogateKey] = spec;
						}

						spec.memberTypeList.push(memberType);
					}
				} else if(memberType.containingMember) {
					if(memberType.containingMember.element.safeName) this.addNameToType(memberType);
				}
			}
		}
	}

	protected state: State = {
		pendingAnonTbl: {},
		pendingAnonList: [],
		typeListList: []
	};

	construct = Sanitize;
}
