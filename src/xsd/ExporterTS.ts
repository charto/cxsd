// This file is part of fast-xml, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as path from 'path';
import * as Promise from 'bluebird';

import {Cache} from 'cget'
import {Namespace} from './Namespace';
import {Scope, TypeMember} from './Scope';
import {Source} from './Source';
import * as types from './types';

interface ElementGroup extends TypeMember {
	item: types.Element;
	typeList: types.TypeBase[];
}

/** Export parsed schema to a TypeScript d.ts definition file. */

export class ExporterTS {
	constructor(namespace: Namespace) {
		if(namespace.name) {
			this.namespace = namespace;
			this.cacheDir = path.dirname(
				ExporterTS.cache.getCachePathSync(namespace.name)
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

	exportTypeRef(indent: string, type: types.TypeBase) {
		var output: string[] = [];

		if(type.qName) {
			var namespace = type.qName.namespace;
			if(namespace == this.namespace) {
				// Type from the current namespace.
				output.push(type.name);
			} else {
				// Type from another, imported namespace.

				var short: string;

				if(this.shortNameTbl[namespace.id] && this.shortNameTbl[namespace.id].length) {
					short = this.shortNameTbl[namespace.id][0];
				} else {
					console.error('MISSING IMPORT ' + namespace.name + ' <- ' + namespace.url);
					short = 'ERROR';
				}
				output.push(short + '.' + type.name);
				this.namespaceUsedTbl[namespace.id] = namespace;
			}
		} else if(type.name) {
			// Primitive type.
			output.push(type.name);
		} else if(type.parent || type.exported) {
			// TODO: Generate names for all derived and circularly defined types so this never happens!
			output.push('any');
		} else {
			// Anonymous type defined only within this element.
			type.exported = true;
			var members = this.exportTypeMembers(indent + '\t', '', type.getScope(), true);

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

	private static mergeDuplicateTypes(typeList: types.TypeBase[]) {
		if(typeList.length < 2) return(typeList);

		var tbl: {[key: number]: types.TypeBase} = {};

		for(var type of typeList) tbl[type.surrogateKey] = type;

		return(Object.keys(tbl).map((key: string) => tbl[key]));
	}

	/** Output an element, which can be an exported variable
	  * or a member of an interface. */

	exportElement(indent: string, syntaxPrefix: string, group: ElementGroup, outputOptionalFlags: boolean) {
		var output: string[] = [];
		var element = group.item;
		var comment = element.getScope().getComments();

		if(comment) {
			output.push(this.formatComment(indent, comment));
			output.push('\n');
		}

		output.push(indent + syntaxPrefix + element.name);
		if(outputOptionalFlags && group.min == 0) output.push('?');
		output.push(': ');

		// TODO: remove duplicate types before exporting!
		var outTypeList = ExporterTS.mergeDuplicateTypes(group.typeList).map(
			(type: types.TypeBase) => this.exportTypeRef(indent, type)
		);

		if(outTypeList.length == 0) return('');

		var outTypes = outTypeList.join(' | ');
		var suffix = '';

		if(group.max > 1) suffix = '[]';

		if(suffix && outTypeList.length > 1) outTypes = '(' + outTypes + ')';

		output.push(outTypes);
		output.push(suffix + ';');

		return(output.join(''));
	}

	/** Handle substitution groups. */

	private static expandSubstitutes(element: types.Element) {
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
		var groupTbl: {[name: string]: ElementGroup} = {};

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

	/** Output all member elements of a type. */

	exportTypeMembers(indent: string, syntaxPrefix: string, scope: Scope, outputOptionalFlags: boolean) {
		var output: string[] = [];
		var elementTbl = scope.dumpElements();
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

		for(var group of ExporterTS.mergeDuplicateElements(specList)) {
			var outElement = this.exportElement(indent, syntaxPrefix, group, outputOptionalFlags);
			if(outElement) output.push(outElement);
		}

		return(output.join('\n'));
	}

	/** Output a type definition. */

	exportType(indent: string, syntaxPrefix: string, namespacePrefix: string, type: types.TypeBase) {
		var output: string[] = [];
		var scope = type.getScope();
		var comment = scope.getComments();
		var parentDef = '';

		type.exported = true;

		if(comment) {
			output.push(this.formatComment(indent, comment));
			output.push('\n');
		}

		var parent = type.parent;

		if(parent && parent instanceof types.Primitive) {
			output.push(indent + syntaxPrefix + 'type ' + type.name + ' = ' + parent.name + ';');
		} else {
			if(parent) parentDef = ' extends ' + parent.name;
			var members = this.exportTypeMembers(indent + '\t', '', scope, true);

			output.push(indent + syntaxPrefix + 'interface ' + type.name + parentDef + ' {');
			if(members) {
				output.push('\n');
				output.push(members);
				output.push('\n' + indent);
			}
			output.push('}');
		}

		return(output.join(''));
	}

	/** Output list of original schema file locations. */

	exportSourceList(sourceList: Source[]) {
		var output: string[] = [];

		output.push('// Source files:');

		for(var source of sourceList) {
			output.push('// ' + source.url);
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

		var typeTbl = scope.dumpTypes();

		var sourceList = this.namespace.getSourceList();

		var outSources = [this.exportSourceList(sourceList), ''];

		var namespaceRefTbl: {[name: string]: Namespace};

		for(var source of sourceList) {
			namespaceRefTbl = source.getNamespaceRefs();

			for(var name in namespaceRefTbl) {
				var id = namespaceRefTbl[name].id;

				if(!this.shortNameTbl[id]) this.shortNameTbl[id] = [];
				this.shortNameTbl[id].push(name);
			}
		}

		for(var key of Object.keys(typeTbl)) {
			outTypes.push(this.exportType('', 'export ', '', typeTbl[key].item));
		}

		outTypes.push(this.exportTypeMembers('', 'export var ', scope, false));
		outTypes.push('');

		var importKeyList = Object.keys(this.namespaceUsedTbl);
		var importList: Namespace[] = [];

		if(importKeyList.length) {
			for(var key of importKeyList) {
				var namespace = this.namespaceUsedTbl[key];

				if(!this.shortNameTbl[key] || !this.shortNameTbl[key].length) continue;

				importList.push(namespace);
				outImports.push(
					'import * as ' +
					this.shortNameTbl[key][0] +
					' from ' +
					"'" + this.getPathTo(namespace) + "';"
				);
			}

			outImports.push('');
		}

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

	getPathTo(namespace: Namespace) {
		return(path.relative(
			this.cacheDir,
			ExporterTS.cache.getCachePathSync(namespace.name)
		));
	}

	/** Cache where all output is written. */
	private static cache = new Cache('cache/js', '_index.js');

	/** Namespace to export. */
	private namespace: Namespace;

	/** Full path of directory containing exported output for the current namespace. */
	private cacheDir: string;

	/** Short names used to reference other namespaces in schemas defining this namespace. */
	private shortNameTbl: {[namespaceId: number]: string[]} = {};

	/** Other namespaces actually referenced in schema definitions for this namespace. */
	private namespaceUsedTbl: {[namespaceId: number]: Namespace} = {};
}
