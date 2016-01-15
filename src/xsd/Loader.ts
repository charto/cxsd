// This file is part of cxml, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Address, FetchOptions, Cache, CacheResult, util} from 'cget'
import {Namespace} from './Namespace'
import {Source} from './Source'
import {Parser} from './Parser'

/** Loader handles caching schema definitions and calling parser stages. */

export class Loader {
	constructor(options?: FetchOptions) {
		this.options = util.clone(options);
		this.parser = new Parser();
	}

	import(urlRemote: string) {
		var namespace = Namespace.register(null, urlRemote);

		var promise = new Promise<Namespace>((resolve, reject) => {
			this.resolve = resolve;
			this.reject = reject;
		})

		namespace.importSchema(this);
		this.targetNamespace = namespace;

		return(promise);
	}

	/** Internal function called by Namespace.importSchema. */

	importFile(namespace: Namespace, urlRemote: string) {
		var options = this.options;
		options.address = new Address(urlRemote);

		var source = Loader.sourceTbl[urlRemote];

		if(!source) {
			source = new Source(namespace, urlRemote);

			Loader.cache.fetch(options).then((cached: CacheResult) => {
				source.updateUrl(cached.address.url);
				namespace.updateUrl(urlRemote, cached.address.url);

				return(this.parser.init(cached, source, this));
			}).then((dependencyList: Source[]) => {
				// TODO: The source could be parsed already if all dependencies
				// (and recursively their dependencies) have been preprocessed.

				if(--this.pendingCount == 0) this.finish();
			});

			Loader.sourceTbl[urlRemote] = source;
			++this.pendingCount;
		}

		return(source);
	}

	private finish() {
		this.parser.resolve();
		this.resolve(this.targetNamespace);
	}

	getOptions() { return(this.options); }

	private static cache = new Cache('cache/xsd', '_index.xsd');
	private static sourceTbl: {[url: string]: Source} = {};

	private options: FetchOptions;
	private parser: Parser;

	private targetNamespace: Namespace;
	private pendingCount = 0;

	private resolve: (result: Namespace) => void;
	private reject: (err: any) => void;
}
