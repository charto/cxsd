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

export class ExporterTS {
	constructor(namespace: Namespace) {
		if(namespace.name) {
			this.namespace = namespace;
			this.cacheDir = path.dirname(
				ExporterTS.cache.getCachePathSync(new Address(namespace.name))
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

	/** Output a reference to a type, for example the type of a member inside
	  * an interface declaration. */

	exportTypeRef(indent: string, type: schema.Type) {
		var output: string[] = [];

		if(type.name) {
			var namespace = type.namespace;

			if(!namespace || namespace.id == this.namespace.id) {
				output.push(type.name);
			} else {
				// Type from another, imported namespace.

				var short = this.outNamespace.getShortRef(namespace.id);

				if(!short) {
					console.error('MISSING IMPORT ' + namespace.name);
					short = 'ERROR';
				}

				output.push(short + '.' + type.name);
			}
		} else if(type.exported) {
			// TODO: Generate names for all circularly defined types so this never happens!
			output.push('any');
		} else if(type.parent) {
			// TODO: Generate names for all derived types so this never happens!
			output.push('any');
		} else {
			// Anonymous type defined only within this element.
			type.exported = true;

			output.push(this.exportTypeContent(indent, type));
		}

		return(output.join(''));
	}

	private static mergeDuplicateTypes(typeList: types.TypeBase[]) {
		if(typeList.length < 2) return(typeList);

		var tbl: {[key: string]: types.TypeBase} = {};

		for(var type of typeList) tbl[type.surrogateKey] = type;

		return(Object.keys(tbl).map((key: string) => tbl[key]));
	}

	/** Output an element, which can be an exported variable
	  * or a member of an interface. */

	exportMember(indent: string, syntaxPrefix: string, member: schema.Member, outputOptionalFlags: boolean) {
		var output: string[] = [];
		var comment = member.comment;

		if(comment) {
			output.push(this.formatComment(indent, comment));
			output.push('\n');
		}

		output.push(indent + syntaxPrefix + member.name);
		if(outputOptionalFlags && member.min == 0) output.push('?');
		output.push(': ');

		var outTypeList = member.typeList.map(
			(type: schema.Type) => this.exportTypeRef(indent, type)
		);

		if(outTypeList.length == 0) return('');

		var outTypes = outTypeList.sort().join(' | ');
		var suffix = '';

		if(member.max > 1) suffix = '[]';

		if(suffix && outTypeList.length > 1) outTypes = '(' + outTypes + ')';

		output.push(outTypes);
		output.push(suffix + ';');

		return(output.join(''));
	}

	/** Handle substitution groups. */

	private static expandSubstitutes(element: types.Element) {
		// Filter out types of abstract elements.
		var elementList = element.isAbstract() ? [] : [element];

		if(element.substituteList) {
			elementList = elementList.concat.apply(
				elementList,
				element.substituteList.map(ExporterTS.expandSubstitutes)
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

	/** Output all member elements and attributes of a type. */

	exportTypeMembers(indent: string, syntaxPrefix: string, type: schema.Type) {
		var output: string[] = [];

		for(var attribute of type.attributeList) {
			var outAttribute = this.exportMember(indent, syntaxPrefix, attribute, true);
			if(outAttribute) output.push(outAttribute);
		}

		for(var child of type.childList) {
			var outElement = this.exportMember(indent, syntaxPrefix, child, true);
			if(outElement) output.push(outElement);
		}

		return(output.join('\n'));
	}

	exportTypeContent(indent: string, type: schema.Type) {
		var output: string[] = [];

		if(type.primitiveList && type.primitiveList.length) {
			//TODO: if parent is a string restricted to enumerated alternatives, output them joined with pipe characters.
			output.push(type.primitiveList[0]);
		} else {
			var members = this.exportTypeMembers(indent + '\t', '', type);

			output.push('{');
			if(members) {
				output.push('\n');
				output.push(members);
				output.push('\n' + indent);
			}
			output.push('}');
		}

		return(output.join(''));
	}

	/** Output a type definition. */

	exportType(indent: string, syntaxPrefix: string, type: schema.Type) {
		var output: string[] = [];
		var comment = type.comment;
		var parentDef = '';

		type.exported = true;

		if(comment) {
			output.push(this.formatComment(indent, comment));
			output.push('\n');
		}

		var parent = type.parent;

		if(type.primitiveList && type.primitiveList.length) {
			output.push(indent + syntaxPrefix + 'type ' + type.name + ' = ' + type.primitiveList[0] + ';');
		} else {
			var content = this.exportTypeContent(indent, type);
			if(parent) parentDef = ' extends ' + this.exportTypeRef(indent + '\t', parent);
			output.push(indent + syntaxPrefix + 'interface ' + type.name + parentDef + ' ' + content);
		}

		return(output.join(''));
	}

	exportMember2(group: MemberGroup) {
		var member = group.item;
		var outMember = new schema.Member(member.name, group.min, group.max);

		outMember.comment = member.getScope().getComments();

		outMember.typeList = ExporterTS.mergeDuplicateTypes(group.typeList).map(
			(type: types.TypeBase) => {
				var outType = type.getOutType();
				var qName = type.qName;

				if(qName) {
					this.outNamespace.markUsed(type.qName.namespace.id);
				} else if(type.name) {
					// Primitive type.
				} else if(type.exported2) {
					// TODO: Generate names for all circularly defined types so this never happens!
				} else {
					// Anonymous type defined only within this element.
					type.exported2 = true;

					this.exportType2(type);
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

			var outAttribute = this.exportMember2(group);
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

			var substituteList = ExporterTS.expandSubstitutes(spec.item as types.Element);

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

		var groupList = ExporterTS.mergeDuplicateElements(specList);

		for(var group of groupList) {
			var outChild = this.exportMember2(group);
			if(outChild) childList.push(outChild);
		}

		return(childList);
	}

	exportType2(type: types.TypeBase) {
		var scope = type.getScope();
		var comment = scope.getComments();

		type.exported2 = true;

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

		return(ExporterTS.cache.ifCached(outName).then((isCached: boolean) =>
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
			outNamespace.addType(this.exportType2(typeTbl[key].item));
		}

		var doc = new schema.Type();
		doc.childList = this.exportChildren(scope);

		for(var type of outNamespace.typeList) {
			outTypes.push(this.exportType('', 'export ', type));
		}

		for(var child of doc.childList) {
			var outElement = this.exportMember('', 'export var ', child, false);
			if(outElement) outTypes.push(outElement);
		}

		outTypes.push('');

		outImports.push(outNamespace.exportTS(this));
		var importNameTbl = outNamespace.getImports();
		var importList = Object.keys(importNameTbl).map((short: string) => Namespace.byId(importNameTbl[short]));

		return(ExporterTS.cache.store(
			outName,
			[].concat(
				outImports,
				outSources,
				outTypes
			).join('\n')
		).then(() => Promise.map(
			importList,
			(namespace: Namespace) => new ExporterTS(namespace).export()
		).then(() => namespace)))
	}

	/** Get relative path to another namespace within the cache. */

	getPathTo(name: string) {
		return(path.relative(
			this.cacheDir,
			ExporterTS.cache.getCachePathSync(new Address(name))
		));
	}

	/** Cache where all output is written. */
	private static cache = new Cache('cache/js', '_index.js');

	/** Namespace to export. */
	private namespace: Namespace;

	private outNamespace: schema.Namespace;

	/** Full path of directory containing exported output for the current namespace. */
	private cacheDir: string;
}
