// This file is part of cxml, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as path from 'path';
import * as Promise from 'bluebird';

import {Address, Cache} from 'cget'
import {Namespace} from './Namespace';
import {Type} from './Type';

/** Export parsed schema to a TypeScript d.ts definition file. */

export class ExporterTS {
	constructor(doc: Type) {
		this.doc = doc;

		this.cacheDir = path.dirname(
			ExporterTS.cache.getCachePathSync(new Address(doc.namespace.name))
		);
	}

	/** Format an XSD annotation as JSDoc. */

	static formatComment(indent: string, comment: string) {
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

	/** Output list of original schema file locations. */
	exportSourceList(sourceList: string[]) {
		var output: string[] = [];

		output.push('// Source files:');

		for(var urlRemote of sourceList) {
			output.push('// ' + urlRemote);
		}

		return(output.join('\n'));
	}

	/** Output namespace contents, if not already exported. */

	export(): Promise<Namespace> {
		if(!this.doc) return(null);

		var outName = this.doc.namespace.name + '.d.ts';

		return(ExporterTS.cache.ifCached(outName).then((isCached: boolean) =>
			isCached ? this.doc.namespace : this.forceExport(outName)
		));
	}

	/** Output namespace contents to the given cache key. */

	forceExport(outName: string): Promise<Namespace> {
		var outImports: string[] = [];
		var outTypes: string[] = [];
		var doc = this.doc;
		var namespace = doc.namespace;

		var outSources = [this.exportSourceList(namespace.sourceList), ''];

		for(var type of namespace.typeList) {
			outTypes.push(type.exportTS(namespace, '', 'export '));
		}

		for(var child of doc.childList) {
			var outElement = child.exportTS(namespace, '', 'export var ', false);
			if(outElement) outTypes.push(outElement);
		}

		outTypes.push('');

		outImports.push(namespace.exportHeaderTS(this));

		var importNameTbl = namespace.getImports();
		var importList = Object.keys(importNameTbl).map(
			(shortName: string) => Namespace.byId(importNameTbl[shortName])
		);

		return(ExporterTS.cache.store(
			outName,
			[].concat(
				outImports,
				outSources,
				outTypes
			).join('\n')
		).then(() => Promise.map(
			importList,
			(namespace: Namespace) => new ExporterTS(namespace.doc).export()
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

	private doc: Type;

	/** Full path of directory containing exported output for the current namespace. */
	private cacheDir: string;
}
