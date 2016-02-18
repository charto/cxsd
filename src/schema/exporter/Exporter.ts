// This file is part of cxsd, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as Promise from 'bluebird';
import * as path from 'path';

import {Address, Cache} from 'cget'

import {Transform} from '../transform/Transform';
import {Type} from '../Type';

export interface State {
	cache: Cache;
}

export abstract class Exporter extends Transform<Exporter, boolean, State> {
	constructor(doc: Type, cache: Cache) {
		super(doc);
		this.state = { cache: cache };
	}

	writeHeader() {
		var output: string[] = [];
		var importTbl = this.namespace.getUsedImportTbl();

		for(var shortName of Object.keys(importTbl).sort()) {
			var namespace = importTbl[shortName];
			var relativePath = this.getPathTo(namespace.name);
			output.push(this.writeImport(shortName, relativePath, namespace.name));
		}

		return(output);
	}

	abstract writeImport(shortName: string, relativePath: string, absolutePath: string): string;

	/** Output namespace contents to cache, if not already exported. */

	prepare() {
		var doc = this.doc;
		if(!doc) return(null);

		this.cacheDir = path.dirname(
			this.state.cache.getCachePathSync(new Address(doc.namespace.name))
		);

		var outName = this.getOutName(doc.namespace.name);

		return(this.state.cache.ifCached(outName).then((isCached: boolean) => {
			if(isCached) return(null)

			return(this.state.cache.store(
				outName,
				this.writeContents()
			));
		}));
	}

	abstract writeContents(): string;

	/** Get relative path to another namespace within the cache. */

	getPathTo(name: string) {
		// Append and then strip a file extension so references to a parent
		// directory will target the directory by name instead of .. or similar.

		var targetPath = this.state.cache.getCachePathSync(new Address(name)) + '.js';

		var relPath = path.relative(
			this.cacheDir,
			targetPath
		).replace(new RegExp(path.sep, 'g'), '/').replace(/\.js$/, '');

		if(!relPath.match(/^[./]/)) relPath = './' + relPath;

		return(relPath);
	}

	protected abstract getOutName(name: string): string;

	protected state: State;

	/** Full path of directory containing exported output for the current namespace. */
	protected cacheDir: string;
}
