// This file is part of fast-xml, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {FetchOptions, Cache} from 'cget';
import {XsdParser} from '../XsdParser';

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

		var result = this.resultTbl[options.url];

		if(result) return(result);

		if(!Namespace.parser) Namespace.parser = new XsdParser();

		this.resultTbl[options.url] = Namespace.parser.parse(this, options);
	}

	private static list: Namespace[] = [];
	private static tbl: {[name: string]: Namespace} = {};
	static cache = new Cache('cache/xsd', '_index.xsd');

	static parser: XsdParser;

	id: number;
	name: string;
	url: string;
	private short: string;

	resultTbl: {[url: string]: Promise<any>} = {};
}
