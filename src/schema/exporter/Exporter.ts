// This file is part of cxml, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as path from 'path';

import {Address, Cache} from 'cget'
import {Namespace} from '../Namespace';
import {Type} from '../Type';

export abstract class Exporter {
	constructor(doc: Type) {
		this.doc = doc;

		this.cacheDir = path.dirname(
			this.getCache().getCachePathSync(new Address(doc.namespace.name))
		);
	}

	/** Output namespace contents, if not already exported. */

	export(): Promise<Namespace> {
		if(!this.doc) return(null);

		var outName = this.getOutName(this.doc.namespace.name);

		return(this.getCache().ifCached(outName).then((isCached: boolean) =>
			isCached ? this.doc.namespace : this.forceExport(outName)
		));
	}

	/** Output namespace contents to the given cache key. */

	abstract forceExport(outName: string): Promise<Namespace>;

	/** Get relative path to another namespace within the cache. */

	getPathTo(name: string) {
		return(path.relative(
			this.cacheDir,
			this.getCache().getCachePathSync(new Address(name))
		));
	}

	abstract getCache(): Cache;

	protected abstract getOutName(name: string): string;

	protected doc: Type;

	/** Full path of directory containing exported output for the current namespace. */
	protected cacheDir: string;
}
