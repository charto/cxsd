// This file is part of fast-xml, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {FetchOptions, Cache, CacheResult} from 'cget';
import {XsdParser} from '../XsdParser';
import {Scope} from './Scope';

export class Namespace {
	constructor(id: number) {
		this.id = id;
	}

	init(name: string, url?: string, short?: string) {
		if(name) {
			if(!this.name) this.name = name;
			Namespace.tbl[name] = this;
		}

		if(url) {
			if(!this.url) this.url = url;
			Namespace.tbl[url] = this;
		}

		if(short) {
			if(!this.short) this.short = short;
			Namespace.tbl[short] = this;
		}

		return(this);
	}

	static register(name: string, url?: string, short?: string) {
		var namespace = Namespace.tbl[name] || Namespace.tbl[url];

		if(!namespace) {
			var id = Namespace.list.length;

			namespace = new Namespace(id);
			Namespace.list[id] = namespace;
		}

		return(namespace.init(name, url, short));
	}

	static lookup(name: string) {
		return(Namespace.tbl[name]);
	}

	importSchema(options?: FetchOptions) {
		if(!options) options = {};
		if(!options.url) options.url = this.url;

		var result = Namespace.parsedTbl[options.url];

		if(!result) {
			result = Namespace.cache.fetch(options).then((result: CacheResult) =>
				new XsdParser().parse(result, this, options)
			);

			Namespace.parsedTbl[options.url] = result;
		}

		return(result);
	}

	getScope() { return(this.scope); }

	private static list: Namespace[] = [];
	private static tbl: {[name: string]: Namespace} = {};

	private static cache = new Cache('cache/xsd', '_index.xsd');

	id: number;
	name: string;
	url: string;
	private short: string;
	private scope: Scope = new Scope(null, this);

	private static parsedTbl: {[url: string]: Promise<any>} = {};
}
