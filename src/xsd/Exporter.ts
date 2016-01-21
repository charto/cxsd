// This file is part of cxml, copyright (c) 2015-2016 BusFaster Ltd.
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
			if(group.min > spec.min) group.min = spec.min;
			if(group.max < spec.max) group.max = spec.max;
			group.typeList = group.typeList.concat(element.getTypes());
		}
	}

	return(Object.keys(groupTbl).sort().map((name: string) => groupTbl[name]));
}

function exportMember(group: MemberGroup, parentScope: Scope, namespace: schema.Namespace) {
	var member = group.item;
	var scope = member.getScope();
	var otherNamespace = scope.namespace;
	var outMember = new schema.Member(member.name, group.min, group.max);

	outMember.comment = scope.getComments();

	if(otherNamespace != parentScope.namespace) {
		outMember.namespace = schema.Namespace.register(otherNamespace.id, otherNamespace.name, otherNamespace.short);
	} else outMember.namespace = namespace;

	outMember.typeList = mergeDuplicateTypes(group.typeList).map(
		(type: types.TypeBase) => {
			var outType = type.getOutType();
			var qName = type.qName;

			if(!qName && !type.name && !type.exported) {
				// Anonymous type defined only within this element.
				exportType(type, namespace);
			}

			return(outType);
		}
	);

	return(outMember);
}

function exportAttributes(scope: Scope, namespace: schema.Namespace) {
	var attributeTbl = scope.dumpAttributes();
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

		var outAttribute = exportMember(group, scope, namespace);
		if(outAttribute) attributeList.push(outAttribute);
	}

	return(attributeList);
}

function exportChildren(scope: Scope, namespace: schema.Namespace) {
	var elementTbl = scope.dumpElements();
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
		var outChild = exportMember(group, scope, namespace);
		if(outChild) childList.push(outChild);
	}

	return(childList);
}

function exportType(type: types.TypeBase, namespace: schema.Namespace) {
	var scope = type.getScope();
	var comment = scope.getComments();

	type.exported = true;

	var outType = type.getOutType();
	outType.comment = comment;
	outType.bytePos = type.bytePos;

	var parentPrimitive = type.getParent(types.Primitive, true);

	if(parentPrimitive) {
		var primitiveList: string[];
		var parentSimple = type.getParent(types.SimpleType, false) as types.SimpleType;

		if(parentSimple) {
			// If parent is restricted to enumerated alternatives, output those instead.
			primitiveList = parentSimple.getEnumerationList();
			if(primitiveList) primitiveList = primitiveList.map((content: string) => '"' + content + '"');
		}

		outType.primitiveList = primitiveList;
		outType.literalType = parentPrimitive.name;
	}

	var parent = type.parent;

	if(parent instanceof types.TypeBase && parent != parentPrimitive) {
		outType.parent = parent.getOutType();
	}

	outType.attributeList = exportAttributes(scope, namespace);
	outType.childList = exportChildren(scope, namespace);

	return(outType);
}

/** Export parsed xsd into a simpler internal schema format. */

export function exportNamespace(namespace: Namespace): schema.Type {
	var outNamespace = schema.Namespace.register(namespace.id, namespace.name, namespace.short);
	var doc = outNamespace.doc;

	if(!doc) {
		var scope = namespace.getScope();

		var sourceList = namespace.getSourceList();
		var importTbl: { [id: string]: Namespace } = {}

		for(var source of sourceList) {
			var namespaceRefTbl = source.getNamespaceRefs();

			for(var name of Object.keys(namespaceRefTbl)) {
				var otherNamespace = namespaceRefTbl[name];

				outNamespace.addRef(name, schema.Namespace.register(otherNamespace.id, otherNamespace.name, otherNamespace.short));

				importTbl[otherNamespace.id] = otherNamespace;
			}
		}

		outNamespace.sourceList = sourceList.map((source: Source) => source.url).sort();

		var typeTbl = scope.dumpTypes();

		for(var key of Object.keys(typeTbl)) {
			outNamespace.exportType(exportType(typeTbl[key].item as types.TypeBase, outNamespace));
		}

		doc = new schema.Type();

		doc.namespace = outNamespace;
		doc.attributeList = exportAttributes(scope, outNamespace);
		doc.childList = exportChildren(scope, outNamespace);

		outNamespace.doc = doc;

		for(var namespaceId of Object.keys(importTbl)) {
			exportNamespace(importTbl[namespaceId]);
		}
	}

	return(doc);
}
