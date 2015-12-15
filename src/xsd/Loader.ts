// This file is part of fast-xml, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {FetchOptions, Cache, CacheResult, util} from 'cget'
import {Namespace} from './Namespace'
import {Source} from './Source'
import {XsdParser} from '../XsdParser'

export class Loader {
	constructor(options?: FetchOptions) {
		this.options = util.clone(options);
		this.parser = new XsdParser();
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

	importFile(namespace: Namespace, urlRemote: string) {
		var options = this.options;
		options.url = urlRemote;

		var source = Loader.sourceTbl[options.url];

		if(!source) {
			source = new Source(namespace, urlRemote);

			Loader.cache.fetch(options).then((cached: CacheResult) => {
				source.updateUrl(cached.url);
				namespace.updateUrl(urlRemote, cached.url);

				return(this.parser.preprocess(cached, source, this));
			}).then((dependencyList: Source[]) => {
				// TODO: The source could be parsed already if all dependencies
				// (and recursively their dependencies) have been preprocessed.

				if(--this.pendingCount == 0) this.finish();
			});

			Loader.sourceTbl[options.url] = source;
			++this.pendingCount;
		}

		return(source);
	}

	finish() {
		this.parser.finish();
		this.resolve(this.targetNamespace);
	}

	getOptions() { return(this.options); }

	private static cache = new Cache('cache/xsd', '_index.xsd');
	private static sourceTbl: {[url: string]: Source} = {};

	private options: FetchOptions;
	private parser: XsdParser;

	private targetNamespace: Namespace;
	private pendingCount = 0;

	private resolve: (result: Namespace) => void;
	private reject: (err: any) => void;
}
