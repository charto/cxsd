// This file is part of cxsd, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Type} from '../Type';
import {Member} from '../Member';
import {Transform} from './Transform';

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

export class Sanitize extends Transform<void> {
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

		for(var key of Object.keys(this.pendingAnonTbl)) {
			var spec = this.pendingAnonTbl[key];

			if(spec) {
				for(var typeMember of spec.memberList) {
					this.addNameToMemberTypes(spec.type, typeMember, false);
				}
			}
		}

		for(type of typeList) {
			if(!type.safeName) type.safeName = 'Type';
		}

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

		for(type of typeList) {
			if(type.safeName == name) {
				type.safeName += '_' + (suffix++);
			} else {
				name = type.safeName;
				suffix = 2;
			}
		}

		return(true);
	}

	visitType(type: Type) {
		var memberList: Member[] = [];
		var member: Member;
		var other: Type;
		var otherMember: Member;
		var iter: number;

		if(type.name) type.safeName = sanitizeName(type.name);

		if(type.attributeList) {
			for(member of type.attributeList) {
				// Add a $ prefix to attributes of this type
				// conflicting with children of this or parent types.

				other = type;
				iter = 100;

				while(other && --iter) {
					otherMember = other.childTbl[member.name];
					if(otherMember) {
						member.prefix = '$';
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
					otherMember = other.attributeTbl[member.name];
					if(otherMember && !otherMember.prefix) {
						otherMember.prefix = '$';
						if(otherMember.safeName) otherMember.safeName = otherMember.prefix + otherMember.safeName;
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
						otherMember = other.childTbl[member.name];
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

			member.safeName = (member.prefix || '') + sanitizeName(member.name);

			this.addNameToMemberTypes(type, member, true);
		}
	}

	addNameToMemberTypes(type: Type, member: Member, allowDefer: boolean) {
		for(var memberType of member.typeList) {
			if(!memberType.safeName) {
				if(type.safeName || !allowDefer) {
					memberType.safeName = (type.safeName || '') + member.safeName.replace(/^([a-z])/, capitalize) + 'Type';

					var spec = this.pendingAnonTbl[memberType.surrogateKey];

					if(spec) {
						for(var typeMember of spec.memberList) {
							this.addNameToMemberTypes(memberType, typeMember, false);
						}

						this.pendingAnonTbl[memberType.surrogateKey] = null;
					}
				} else {
					var spec = this.pendingAnonTbl[type.surrogateKey];

					if(!spec) {
						spec = { type: type, memberList: [] };
						this.pendingAnonTbl[type.surrogateKey] = spec;
					}

					spec.memberList.push(member);
				}
			}
		}
	}

	pendingAnonTbl: { [typeId: number]: { type: Type, memberList: Member[] } } = {};

	construct = Sanitize;
}
