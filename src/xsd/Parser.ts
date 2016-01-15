// This file is part of cxml, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as expat from 'node-expat';
import * as Promise from 'bluebird';

import {FetchOptions, Cache, CacheResult} from 'cget';
import * as types from './types';
import {State, Rule} from './State';
import {Namespace} from './Namespace';
import {Loader} from './Loader';
import {Source} from './Source';
import {QName} from './QName'

import * as util from 'util';

/** Parse syntax rules encoded into handler classes. */

function parseRule(ctor: types.BaseClass) {
	if(ctor.rule) return(ctor.rule as Rule);

	var rule = new Rule(new QName().parseClass(ctor.name, ctor.getNamespace()), ctor);

	ctor.rule = rule;

	for(var follower of ctor.mayContain()) {
		var followerName = new QName().parseClass(follower.name, follower.getNamespace());

		rule.followerTbl[followerName.nameFull] = parseRule(follower);
		rule.followerTbl[followerName.name] = parseRule(follower);
	}

	var obj = new ctor();

	for(var key of Object.keys(obj)) {
		rule.attributeList.push(key);
	}

	return(rule);
}

export class Parser {
	constructor() {
		this.rootRule = parseRule(types.Root);
	}

	startElement(state: State, name: string, attrTbl: {[name: string]: string}) {
		var qName = this.qName;

		qName.parse(name, state.source, state.source.defaultNamespace);

		var rule = state.rule;

		if(rule) {
			rule = (
				rule.followerTbl[qName.nameFull] ||
				rule.followerTbl[qName.name] ||
				rule.followerTbl['*']
			);
			// if(!rule) console.log('Unhandled child ' + state.rule.qName.nameFull + ' -> ' + qName.nameFull);
		}

		state = new State(state, rule);

		if(!rule || !rule.proto) return(state);

		var xsdElem = new rule.proto(state);

		state.xsdElement = xsdElem;

		// Make all attributes lowercase.

		for(var key of Object.keys(attrTbl)) {
			var keyLower = key.toLowerCase();

			if(key != keyLower && !attrTbl.hasOwnProperty(keyLower)) {
				attrTbl[keyLower] = attrTbl[key];
			}
		}

		// Copy known attributes to XSD element.

		for(var key of rule.attributeList) {
			if(attrTbl.hasOwnProperty(key)) {
				(xsdElem as any as {[key: string]: string})[key] = attrTbl[key];
			}
		}

		if(xsdElem.init) {
			state.attributeTbl = attrTbl;

			xsdElem.init(state);
		}

		return(state);
	}

	init(cached: CacheResult, source: Source, loader: Loader) {
		var state = new State(null, this.rootRule, source);
		var importList: {namespace: Namespace, url: string}[] = [];

		var xml = new expat.Parser(null);

		state.stateStatic = {
			addImport: (namespaceTarget: Namespace, urlRemote: string) => {
				importList.push({namespace: namespaceTarget, url: urlRemote});
			},

			getLineNumber: () => {
				return(xml.getCurrentLineNumber());
			},

			textDepth: 0,
			textHandlerList: []
		};

		var stateStatic = state.stateStatic;
		var resolve: (result: Source[]) => void;
		var reject: (err: any) => void;

		var promise = new Promise<Source[]>((res, rej) => {
			resolve = res;
			reject = rej;
		})

		var stream = cached.stream;

		var pendingList = this.pendingList;

		xml.on('startElement', (name: string, attrTbl: {[name: string]: string}) => {
			try {
				state = this.startElement(state, name, attrTbl);
			} catch(err) {
				// Exceptions escaping from node-expat's event handlers cause weird effects.
				console.error(err);
				console.error(err.stack);
			}
		});

		xml.on('endElement', function(name: string) {
			if(state.xsdElement) {
				if(state.xsdElement.loaded) {
					state.xsdElement.loaded(state);
				}

				if(state.xsdElement.resolve) {
					// Schedule resolve hook to run after parsing is done.
					// It might depend on definitions in scope but appearing later,
					// and selectively postponing only hooks that cannot run yet
					// would be extremely complicated.

					pendingList.push(state);
				}
			}

			state = state.parent;
		});

		xml.on('text', function(text: string) {
			if(stateStatic.textDepth) {
				stateStatic.textHandlerList[stateStatic.textDepth - 1].addText(state, text);
			}
		});

		xml.on('error', function(err: any) {
			console.error(err);
		});

		stream.on('data', (data: Buffer) => {
			xml.parse(data, false);
		});

		stream.on('end', () => {
			// Finish parsing the file (synchronous call).

			xml.parse('', true);

			resolve(importList.map((spec: {namespace: Namespace, url: string}) => {
				console.log('IMPORT into ' + spec.namespace.name + ' from ' + spec.url);
				return(spec.namespace.importSchema(loader, spec.url));
			}))
		});

		return(promise);
	}

	/** Bind references, call after all imports have been initialized. */
	resolve() {
		try {
			for(var pos = 0; pos < this.pendingList.length; ++pos) {
				var state = this.pendingList[pos];
				state.xsdElement.resolve(state);
			}

			this.pendingList = [];
		} catch(err) {
			console.error(err);
			console.error(err.stack);
		}
	}

	/** Temporarily holds a qualified name, re-used to avoid allocating objects. */
	private qName = new QName();

	/** List of parser states still needing further processing
	  * after previous stage is done. */
	private pendingList: State[] = [];

	/** Defines valid contents for the XML file root element. */
	private rootRule: Rule;
}
