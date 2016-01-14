// This file is part of fast-xml, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as path from 'path';
import * as Promise from 'bluebird';

import {Address, Cache} from 'cget'
import {Namespace} from './Namespace';
import {Scope, TypeMember} from './Scope';
import {Source} from './Source';
import {QName} from './QName';
import * as types from './types';
import * as schema from '../schema';

interface MemberGroup extends TypeMember {
	item: types.MemberBase;
	typeList: types.TypeBase[];
}

/** Export parsed schema to a TypeScript d.ts definition file. */

export class Exporter {
	constructor(namespace: Namespace) {
		if(namespace.name) {
			this.namespace = namespace;
			this.cacheDir = path.dirname(
				Exporter.cache.getCachePathSync(new Address(namespace.name))
			);
		}
	}

	/** Format an XSD annotation as JSDoc. */

	formatComment(indent: string, comment: string) {
		var lineList = comment.split('\n');
		var lineCount = lineList.length;
		var blankCount = 0;
		var contentCount = 0;
		var output: string[] = [];
		var prefix = '/\**';

		for(var line of lineList) {
			// Remove leading whitespace.
			line = line.replace(/^\s+/, '');

			// Remove trailing whitespace.
			line = line.replace(/\s+$/, '');

			if(!line) ++blankCount;
			else {
				if(blankCount && contentCount) output.push(indent + prefix);

				output.push(indent + prefix + ' ' + line);
				prefix = '  *';

				++contentCount;
				blankCount = 0;
			}
		}

		if(output.length) output[output.length - 1] += ' *\/';

		return(output.join('\n'));
	}

	private static mergeDuplicateTypes(typeList: types.TypeBase[]) {
		if(typeList.length < 2) return(typeList);

		var tbl: {[key: string]: types.TypeBase} = {};

		for(var type of typeList) tbl[type.surrogateKey] = type;

		return(Object.keys(tbl).map((key: string) => tbl[key]));
	}

	/** Handle substitution groups. */

	private static expandSubstitutes(element: types.Element) {
		// Filter out types of abstract elements.
		var elementList = element.isAbstract() ? [] : [element];

		if(element.substituteList) {
			elementList = elementList.concat.apply(
				elementList,
				element.substituteList.map(Exporter.expandSubstitutes)
			);
		}

		return(elementList);
	}

	/** Group elements by name and list all their different types. */

	private static mergeDuplicateElements(specList: TypeMember[]) {
		var groupTbl: {[name: string]: MemberGroup} = {};

		for(var spec of specList) {
			var element = spec.item as types.Element;
			var group = groupTbl[element.name];

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

	exportMember(group: MemberGroup) {
		var member = group.item;
		var outMember = new schema.Member(member.name, group.min, group.max);

		outMember.comment = member.getScope().getComments();

		outMember.typeList = Exporter.mergeDuplicateTypes(group.typeList).map(
			(type: types.TypeBase) => {
				var outType = type.getOutType();
				var qName = type.qName;

				if(qName) {
					this.outNamespace.markUsed(type.qName.namespace.id);
				} else if(type.name) {
					// Primitive type.
				} else if(type.exported) {
					// TODO: Generate names for all circularly defined types so this never happens!
				} else {
					// Anonymous type defined only within this element.
					type.exported = true;

					this.exportType(type);
				}

				return(outType);
			}
		);

		return(outMember);
	}

	exportAttributes(scope: Scope) {
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

			var outAttribute = this.exportMember(group);
			if(outAttribute) attributeList.push(outAttribute);
		}

		return(attributeList);
	}

	exportChildren(scope: Scope) {
		var elementTbl = scope.dumpElements();
		var childList: schema.Member[] = [];
		var specList: TypeMember[] = [];

		for(var key of Object.keys(elementTbl)) {
			var spec = elementTbl[key];
			var min = spec.min;
			var max = spec.max;

			var substituteList = Exporter.expandSubstitutes(spec.item as types.Element);

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

		var groupList = Exporter.mergeDuplicateElements(specList);

		for(var group of groupList) {
			var outChild = this.exportMember(group);
			if(outChild) childList.push(outChild);
		}

		return(childList);
	}

	exportType(type: types.TypeBase) {
		var scope = type.getScope();
		var comment = scope.getComments();

		type.exported = true;

		var outType = type.getOutType();
		outType.comment = comment;

		var parent = type.parent;

		if(parent && parent instanceof types.Primitive) {
			// TODO: if parent is a string restricted to enumerated alternatives, output those instead.
			outType.primitiveList = [parent.name];
		} else {
			if(parent instanceof types.TypeBase) {
				outType.parent = parent.getOutType();
				this.outNamespace.markUsed(parent.qName.namespace.id);
			}

			outType.attributeList = this.exportAttributes(scope);
			outType.childList = this.exportChildren(scope);
		}

		return(outType);
	}

	/** Output list of original schema file locations. */

	exportSourceList(sourceList: Source[]) {
		var output: string[] = [];

		output.push('// Source files:');

		for(var urlRemote of sourceList.map((source: Source) => source.url).sort()) {
			output.push('// ' + urlRemote);
		}

		return(output.join('\n'));
	}

	/** Output namespace contents, if not already exported. */

	export(): Promise<Namespace> {
		if(!this.namespace) return(null);

		var outName = this.namespace.name + '.d.ts';

		return(Exporter.cache.ifCached(outName).then((isCached: boolean) =>
			isCached ? this.namespace : this.forceExport(outName)
		));
	}

	/** Output namespace contents to the given cache key. */

	forceExport(outName: string): Promise<Namespace> {
		var outImports: string[] = [];
		var outTypes: string[] = [];
		var scope = this.namespace.getScope();

		var namespace: Namespace;
		var outNamespace = schema.Namespace.register(this.namespace.id, this.namespace.name);
		this.outNamespace = outNamespace;

		var typeTbl = scope.dumpTypes();

		var sourceList = this.namespace.getSourceList();

		var outSources = [this.exportSourceList(sourceList), ''];

		var namespaceRefTbl: {[name: string]: Namespace};

		for(var source of sourceList) {
			namespaceRefTbl = source.getNamespaceRefs();

			for(var name in namespaceRefTbl) {
				namespace = namespaceRefTbl[name];
				outNamespace.addRef(name, schema.Namespace.register(namespace.id, namespace.name));
			}
		}

		for(var key of Object.keys(typeTbl).sort()) {
			outNamespace.addType(this.exportType(typeTbl[key].item as types.TypeBase));
		}

		var doc = new schema.Type();
		doc.childList = this.exportChildren(scope);

		for(var type of outNamespace.typeList) {
			outTypes.push(type.exportTS('', 'export ', this));
		}

		for(var child of doc.childList) {
			var outElement = child.exportTS('', 'export var ', false, this);
			if(outElement) outTypes.push(outElement);
		}

		outTypes.push('');

		outImports.push(outNamespace.exportTS(this));
		var importNameTbl = outNamespace.getImports();
		var importList = Object.keys(importNameTbl).map((short: string) => Namespace.byId(importNameTbl[short]));

		return(Exporter.cache.store(
			outName,
			[].concat(
				outImports,
				outSources,
				outTypes
			).join('\n')
		).then(() => Promise.map(
			importList,
			(namespace: Namespace) => new Exporter(namespace).export()
		).then(() => namespace)))
	}

	/** Get relative path to another namespace within the cache. */

	getPathTo(name: string) {
		return(path.relative(
			this.cacheDir,
			Exporter.cache.getCachePathSync(new Address(name))
		));
	}

	/** Cache where all output is written. */
	private static cache = new Cache('cache/js', '_index.js');

	/** Namespace to export. */
	private namespace: Namespace;

	outNamespace: schema.Namespace;

	/** Full path of directory containing exported output for the current namespace. */
	private cacheDir: string;
}
