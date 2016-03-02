// This file is part of cxsd, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Namespace} from './Namespace';
import {Scope, TypeMember} from './Scope';
import {Source} from './Source';
import * as types from './types';
import * as schema from '../schema';

interface MemberGroup extends TypeMember {
	item: types.MemberBase;
	typeList: types.TypeBase[];
}

function mergeDuplicateTypes(typeList: types.TypeBase[]) {
	if(typeList.length < 2) return(typeList);

	var tbl: {[key: string]: types.TypeBase} = {};

	for(var type of typeList) tbl[type.surrogateKey] = type;

	return(Object.keys(tbl).map((key: string) => tbl[key]));
}

function exportMemberRef(spec: TypeMember, parentScope: Scope, namespace: schema.Namespace, context: schema.Context) {
	var member = spec.item as types.MemberBase;
	var outMember = member.getOutMember(context);
	var outRef = new schema.MemberRef(outMember, spec.min, spec.max);

	if(!outMember.typeList) exportMember(member, outRef, parentScope, namespace, context);

	return(outRef);
}

function exportMember(member: types.MemberBase, outRef: schema.MemberRef, parentScope: Scope, namespace: schema.Namespace, context: schema.Context) {
	var outMember = outRef.member;
	var scope = member.getScope();
	var otherNamespace = scope.namespace;

	outMember.comment = scope.getComments();

	if(otherNamespace != parentScope.namespace) {
		outMember.namespace = context.copyNamespace(otherNamespace);
	} else outMember.namespace = namespace;

	outMember.typeList = mergeDuplicateTypes(member.getTypes()).map(
		(type: types.TypeBase) => {
			var outType = type.getOutType(context);
			var qName = type.qName;

			if(!qName && !type.name && !type.exported) {
				// Anonymous type defined only within this element.

				outType.containingRef = outRef;

				// Look through parent scopes for a containing type,
				// If the member was referenced from another namespace,
				// its scope points to definition in that namespace.
				var parentType = scope.getParentType(otherNamespace);
				if(parentType) {
					outType.containingType = parentType.getOutType(context);
				}

				exportType(type, outMember.namespace, context);
			}

			return(outType);
		}
	);

	outMember.isAbstract = member.isAbstract();

	if(member instanceof types.Element) {
		if(member.substitutes) {
			outMember.substitutes = member.substitutes.getOutMember(context);
			outMember.namespace.pendingSubstituteList.push(outMember);
		}
		if(member.isSubstituted) outMember.isSubstituted = true;
	}
}

function exportAttributes(scope: Scope, namespace: schema.Namespace, context: schema.Context, type: schema.Type) {
	var memberTbl = scope.dumpMembers('attribute', 'attributeGroup');

	for(var key of Object.keys(memberTbl).sort()) {
		var ref = exportMemberRef(memberTbl[key], scope, namespace, context);
		type.addAttribute(ref);
	}
}

function exportChildren(
	scope: Scope,
	namespace: schema.Namespace,
	context: schema.Context,
	outType: schema.Type,
	setExported: boolean
) {
	var memberTbl = scope.dumpMembers('element', 'group');

	for(var key of Object.keys(memberTbl).sort()) {
		var ref = exportMemberRef(memberTbl[key], scope, namespace, context);

		if(setExported) ref.member.isExported = true;
		outType.addChild(ref);
	}
}

/* TODO
function exportGroups(scope: Scope, namespace: schema.Namespace, context: schema.Context) {
//	var groupTbl = scope.dumpGroups();
	var groupList: schema.Member[] = [];

	return(groupList);
}
*/

function exportType(type: types.TypeBase, namespace: schema.Namespace, context: schema.Context) {
	var scope = type.getScope();
	var comment = scope.getComments();

	type.exported = true;

	var outType = type.getOutType(context);
	outType.comment = comment;
	outType.bytePos = type.bytePos;
	// If the type derives from a primitive type, it may have text content.
	var parentPrimitive = type.getParent(types.Primitive, false);

	if(parentPrimitive) {
		// Get equivalent JavaScript type.
		outType.primitiveType = parentPrimitive.getOutType(context);

		// Check if primitive type is inherited without any additional attributes
		// or children, so contents can be represented as a JavaScript primitive.
		// NOTE: Substitutions won't be applied to such types!
		parentPrimitive = type.getParent(types.Primitive, true);
	}

	if(parentPrimitive) {
		var literalList: string[];
		var parentSimple = type.getParent(types.SimpleType, false) as types.SimpleType;

		if(parentSimple) {
			// If parent is restricted to enumerated alternatives, output those instead.
			literalList = parentSimple.getEnumerationList();
			if(literalList) literalList = literalList.map((content: string) => '"' + content + '"');
		}

		outType.literalList = literalList;
		outType.isPlainPrimitive = true;
		outType.primitiveType = parentPrimitive.getOutType(context);
	}

	var parent = type.parent;

	if(parent instanceof types.TypeBase && parent != parentPrimitive) {
		outType.parent = parent.getOutType(context);
	}

	exportAttributes(scope, namespace, context, outType);
	exportChildren(scope, namespace, context, outType, false);
//	outType.groupList = exportGroups(scope, namespace, context);

	var listType = type.getListType();

	if(listType) {
		for(var spec of listType) {
			var outMember = new schema.Member('');
			var outMemberRef = new schema.MemberRef(outMember, spec.min, spec.max);

			outMember.namespace = namespace;
			outMember.typeList = [
				exportType(spec.item as types.TypeBase, namespace, context)
			];

			outType.addChild(outMemberRef);
		}

		outType.isList = true;
	}

	return(outType);
}

/** Export parsed xsd into a simpler internal schema format. */

export function exportNamespace(namespace: Namespace, context: schema.Context): schema.Type {
	var outNamespace = context.copyNamespace(namespace);
	var doc = outNamespace.doc;

	if(doc) return(doc);

//	if(!doc) {
		var scope = namespace.getScope();

		var sourceList = namespace.getSourceList();
		var importTbl: { [id: string]: Namespace } = {}

		for(var source of sourceList) {
			var namespaceRefTbl = source.getNamespaceRefs();

			for(var name of Object.keys(namespaceRefTbl)) {
				var otherNamespace = namespaceRefTbl[name];

				outNamespace.addRef(name, context.copyNamespace(otherNamespace));

				importTbl[otherNamespace.id] = otherNamespace;
			}
		}

		outNamespace.sourceList = sourceList.map((source: Source) => source.url).sort();

		for(var spec of scope.dumpTypes('type') || []) {
			if(spec.name) exportType(spec.item as types.TypeBase, outNamespace, context).isExported = true;
		}

		doc = new schema.Type(null);

		doc.namespace = outNamespace;
		exportAttributes(scope, outNamespace, context, doc);
		exportChildren(scope, outNamespace, context, doc, true);

		outNamespace.doc = doc;

		for(var namespaceId of Object.keys(importTbl)) {
			exportNamespace(importTbl[namespaceId], context);
		}

		for(var member of outNamespace.pendingSubstituteList) {
			var proxy = member.substitutes.getProxy();

			if(member.substitutes.namespace == member.namespace) {
				if(member.isSubstituted || member.isAbstract) {
					proxy.addMixin(member.getProxy());
				} else {
					proxy.addChildSpec(member);
				}
			} else {
				member.namespace.addAugmentation(proxy, member);
			}
		}
//	}

	return(doc);
}
