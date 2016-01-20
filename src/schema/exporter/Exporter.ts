// This file is part of cxml, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as path from 'path';
import * as Promise from 'bluebird';

import {Transform} from '../transform/Transform';
import {Address, Cache} from 'cget'
import {Namespace} from '../Namespace';
import {Type} from '../Type';

export abstract class Exporter extends Transform<string> {
/*
	constructor(doc: Type) {
		super(doc);

		this.cacheDir = path.dirname(
			this.getCache().getCachePathSync(new Address(doc.namespace.name))
		);
	}
*/

	writeHeader() {
		var output: string[] = [];
		var importTbl = this.namespace.getUsedImportTbl();

		for(var shortName of Object.keys(importTbl).sort()) {
			var namespace = importTbl[shortName];
			var relativePath = this.getPathTo(namespace.name);
			output.push(this.writeImport(shortName, relativePath));
		}

		output.push('');
		return(output);
	}

	abstract writeImport(shortName: string, relativePath: string): string;

	/** Output namespace contents to cache, if not already exported. */

	prepare() {
		var doc = this.doc;
		if(!doc) return(null);

		this.cacheDir = path.dirname(
			this.getCache().getCachePathSync(new Address(doc.namespace.name))
		);

		var outName = this.getOutName(doc.namespace.name);

		return(this.getCache().ifCached(outName).then((isCached: boolean) => {
			if(isCached) return(null)

			return(this.getCache().store(
				outName,
				this.writeContents()
			)).then(() => false);
		}));
	}

/*
	done() {
		return(this.getCache().store(
			outName,
			this.output
		));
	}
*/

	abstract writeContents(): string;

	/** Get relative path to another namespace within the cache. */

	getPathTo(name: string) {
		var relPath = path.relative(
			this.cacheDir,
			this.getCache().getCachePathSync(new Address(name))
		).replace(new RegExp(path.sep, 'g'), '/');

		if(relPath.indexOf('/') < 0) relPath = './' + relPath;

		return(relPath);
	}

	abstract getCache(): Cache;

	protected abstract getOutName(name: string): string;

	/** Full path of directory containing exported output for the current namespace. */
	protected cacheDir: string;

	protected output: string;
}
