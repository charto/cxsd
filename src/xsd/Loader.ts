// This file is part of fast-xml, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {FetchOptions, Cache, CacheResult, util} from 'cget'
import {Namespace} from './Namespace'
import {Source} from './Source'
import {XsdParser} from '../XsdParser'

export class Loader {
	constructor(options?: FetchOptions) {
		this.options = util.clone(options);
	}

	import(namespace: Namespace, urlRemote: string) {
		var options = this.options;
		options.url = urlRemote;

		var result = Loader.parsedTbl[options.url];

		if(!result) {
			result = Loader.cache.fetch(options).then((cached: CacheResult) => {
				var source = new Source(namespace, cached.url);

				namespace.updateUrl(urlRemote, cached.url);

				new XsdParser().parse(cached, source, this);
			});

			Loader.parsedTbl[options.url] = result;
		}

		return(result);
	}

	getOptions() { return(this.options); }

	private options: FetchOptions;

	private static cache = new Cache('cache/xsd', '_index.xsd');
	private static parsedTbl: {[url: string]: Promise<any>} = {};
}
