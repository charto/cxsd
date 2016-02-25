// This file is part of cxsd, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Namespace, ImportContent} from '../Namespace';
import {Type} from '../Type';
import {Member} from '../Member';
import {MemberRef} from '../MemberRef';
import {Transform} from './Transform';

export type Output = { [namespaceId: string]: ImportContent };

export class AddImports extends Transform<AddImports, Output, void> {
	prepare() {
		this.visitType(this.doc);

		for(var type of this.namespace.typeList) {
			if(type) this.visitType(type);
		}

		this.namespace.importContentTbl = this.output;

		return(this.output);
	}

	/** Replace imported type and member IDs with sanitized names. */
	finish(result: Output[]) {
		for(var namespaceTbl of result) {
			for(var namespaceId of Object.keys(namespaceTbl)) {
				var output: ImportContent = {
					typeTbl: {},
					memberTbl: {}
				};

				var typeTbl = namespaceTbl[namespaceId].typeTbl;

				for(var key of Object.keys(typeTbl)) {
					var type = typeTbl[key];
					output.typeTbl[type.safeName] = type;
				}

				var memberTbl = namespaceTbl[namespaceId].memberTbl;

				for(var key of Object.keys(memberTbl)) {
					var member = memberTbl[key];
					// Use name instead of safeName, because the latter may
					// randomly differ between different containing types due to
					// naming collisions (for example between attribute and element).
					output.memberTbl[member.name] = member;
				}

				namespaceTbl[namespaceId] = output;
			}
		}
	}

	addRef(namespace: Namespace, member?: Member, type?: Type) {
		if(namespace && namespace != this.namespace) {
			// Type and/or member from another, imported namespace.

			// Make sure it gets exported.
			if(type) type.isExported = true;
			if(member) member.isExported = true;

			var id = namespace.id;
			var short = this.namespace.getShortRef(id);

			if(!short) {
				short = (member && member.namespace.getShortRef(id)) || namespace.short;

				if(short) this.namespace.addRef(short, namespace);
			}

			if(short) {
				if(!this.output[id]) {
					this.output[id] = {
						typeTbl: {},
						memberTbl: {}
					};
				}

				if(type && type.namespace == namespace) {
					this.output[id].typeTbl[type.surrogateKey] = type;
				}

				if(member && member.namespace == namespace) {
					this.output[id].memberTbl[member.surrogateKey] = member;
				}
			}
		}
	}

	visitMember(member: Member) {
		this.addRef(member.namespace, member);

		if(member.substitutes) this.addRef(member.substitutes.namespace, member.substitutes);

		for(var type of member.typeList) this.addRef(type.namespace, member, type);
	}

	visitType(type: Type) {
		// Types holding primitives should inherit from them.
		// NOTE: This makes base primitive types inherit themselves.
		if(type.primitiveType && !type.parent) type.parent = type.primitiveType;

		if(type.parent) this.addRef(type.parent.namespace, null, type.parent);

		for(var member of this.getTypeMembers(type)) this.visitMember(member.member);
	}

	construct = AddImports;
	output: Output = {};
}
