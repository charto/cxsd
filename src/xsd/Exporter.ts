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

/** Handle substitution groups. */

function expandSubstitutes(element: types.Element) {
	// Filter out types of abstract elements.
	var elementList = element.isAbstract() ? [] : [element];

	if(element.substituteList) {
		elementList = elementList.concat.apply(
			elementList,
			element.substituteList.map(expandSubstitutes)
		);
	}

	return(elementList);
}

/** Group elements by name and list all their different types. */

function mergeDuplicateElements(specList: TypeMember[]) {
	var groupTbl: {[name: string]: MemberGroup} = {};

	for(var spec of specList) {
		var element = spec.item as types.Element;
		var group = groupTbl[element.getScope().namespace.id + ':' + element.name];

		if(!group) {
			group = {
				min: spec.min,
				max: spec.max,
				item: element,
				typeList: element.getTypes()
			};

			groupTbl[element.name] = group;
		} else {
			group.min += spec.min;
			group.max += spec.max;
			group.typeList = group.typeList.concat(element.getTypes());
		}
	}

	return(Object.keys(groupTbl).sort().map((name: string) => groupTbl[name]));
}

function exportMember(group: MemberGroup, parentScope: Scope, namespace: schema.Namespace, context: schema.Context) {
	var member = group.item;
	var scope = member.getScope();
	var otherNamespace = scope.namespace;
	var outMember = new schema.Member(member.name, group.min, group.max);

	outMember.comment = scope.getComments();

	if(otherNamespace != parentScope.namespace) {
		outMember.namespace = context.copyNamespace(otherNamespace);
	} else outMember.namespace = namespace;

	outMember.typeList = mergeDuplicateTypes(group.typeList).map(
		(type: types.TypeBase) => {
			var outType = type.getOutType(context);
			var qName = type.qName;

			if(!qName && !type.name && !type.exported) {
				// Anonymous type defined only within this element.

				outType.containingMember = outMember;

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

	return(outMember);
}

function exportAttributes(scope: Scope, namespace: schema.Namespace, context: schema.Context) {
	var attributeTbl = scope.dumpMembers('attribute', 'attributegroup');
	var attributeList: schema.Member[] = [];

	for(var key of Object.keys(attributeTbl).sort()) {
		var spec = attributeTbl[key];
		var attribute = spec.item as types.Attribute;

		var group = {
			min: spec.min,
			max: spec.max,
			item: attribute,
			typeList: attribute.getTypes()
		};

		var outAttribute = exportMember(group, scope, namespace, context);
		if(outAttribute) attributeList.push(outAttribute);
	}

	return(attributeList);
}

function exportChildren(scope: Scope, namespace: schema.Namespace, context: schema.Context) {
	var elementTbl = scope.dumpMembers('element', 'group');
	var childList: schema.Member[] = [];
	var specList: TypeMember[] = [];

	for(var key of Object.keys(elementTbl)) {
		var spec = elementTbl[key];
		var min = spec.min;
		var max = spec.max;

		var substituteList = expandSubstitutes(spec.item as types.Element);

		// If there are several alternatives, no specific one is mandatory.
		if(substituteList.length > 1) min = 0;

		for(var element of substituteList) {
			specList.push({
				min: min,
				max: max,
				item: element
			});
		}
	}

	var groupList = mergeDuplicateElements(specList);

	for(var group of groupList) {
		var outChild = exportMember(group, scope, namespace, context);
		if(outChild) childList.push(outChild);
	}

	return(childList);
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

	outType.attributeList = exportAttributes(scope, namespace, context);
	outType.childList = exportChildren(scope, namespace, context);
//	outType.groupList = exportGroups(scope, namespace, context);

	return(outType);
}

/** Export parsed xsd into a simpler internal schema format. */

export function exportNamespace(namespace: Namespace, context: schema.Context): schema.Type {
	var outNamespace = context.copyNamespace(namespace);
	var doc = outNamespace.doc;

	if(!doc) {
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

		for(var spec of scope.dumpTypes()) {
			if(spec.name) outNamespace.exportType(exportType(spec.item as types.TypeBase, outNamespace, context));
		}

		doc = new schema.Type();

		doc.namespace = outNamespace;
		doc.attributeList = exportAttributes(scope, outNamespace, context);
		doc.childList = exportChildren(scope, outNamespace, context);

		outNamespace.doc = doc;

		for(var namespaceId of Object.keys(importTbl)) {
			exportNamespace(importTbl[namespaceId], context);
		}
	}

	return(doc);
}
