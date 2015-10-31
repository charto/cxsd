// This file is part of fast-xml, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as expat from 'node-expat';

import {Cache} from './Cache';
import * as types from './XsdTypes'
import {State, Namespace, Rule, Scope, QName} from './XsdState'

import * as util from 'util';

var xsdTbl: {[url: string]: boolean} = {}

function parseRule(ctor: types.XsdBaseClass) {
	if(ctor.rule) return(ctor.rule as Rule);

	var rule = new Rule(new QName().parseClass(ctor.name), ctor);

	ctor.rule = rule;

	for(var follower of ctor.mayContain()) {
		var followerName = new QName().parseClass(follower.name);

		rule.followerTbl[followerName.nameFull] = parseRule(follower);
		rule.followerTbl[followerName.name] = parseRule(follower);
	}

	var obj = new ctor();

	for(var key of Object.keys(obj)) {
		rule.attributeList.push(key);
	}

	return(rule);
}

Namespace.register('http://www.w3.org/2001/XMLSchema', 'http://www.w3.org/2009/XMLSchema/XMLSchema.xsd', 'xsd');

var rootRule = parseRule(types.XsdRoot);

export class Xsd {
	constructor(remoteUrl: string, cache: Cache) {
		var state = new State(null, rootRule);

		state.stateStatic = {
			remoteUrl: remoteUrl,
			cache: cache,
			qName: new QName(),

			root: null,

			namespaceTarget: null,
			namespaceDefault: null,
			namespaceMap: {}
		};

		var stateStatic = state.stateStatic;
		var qName = stateStatic.qName;

		var stream = cache.fetch(remoteUrl);
		var xml = new expat.Parser('utf-8');

		var pendingList: State[] = [];

		xml.on('startElement', (name: string, attrTbl: {[name: string]: string}) => {
try {
			qName.parse(name, state, stateStatic.namespaceDefault);

			var rule = state.rule;

			if(rule) {
				rule = (
					rule.followerTbl[qName.nameFull] ||
					rule.followerTbl[qName.name] ||
					rule.followerTbl['*']
				);
			}

			state = new State(state, rule);

			if(rule && rule.proto) {
				var xsdElem = new rule.proto();

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
						xsdElem[key] = attrTbl[key];
					}
				}

				if(xsdElem.init) {
					state.attributeTbl = attrTbl;

					xsdElem.init(state);
				}
			}

//			if(namespace == 'xsd') console.log((rule ? ' ' : '!') + new Array(stateStatic.depth + 1).join(' ') + '<' + nameFull + Object.keys(attrTbl).map((key: string) => ' ' + key + '="' + attrTbl[key] + '"').join('') + '>');
} catch(e) {console.log(e);}
		});

		xml.on('endElement', function(name: string) {
//			console.log('</' + name + '>');

			if(state.xsdElement && state.xsdElement.finish) {
				// Schedule finish hook to run after parsing is done.
				// It might depend on definitions in scope but appearing later,
				// and selectively postponing only hooks that cannot run yet
				// would be extremely complicated.

				pendingList.push(state);
			}

			state = state.parent;
		});

		xml.on('text', function(text: string) {
//			text = text.replace(/\s+$/, '');
//			if(text) console.log(text);
		});

		xml.on('error', function(err: any) {
			console.error(err);
		});

		stream.on('data', (data: string) => {
			xml.parse(data, false);
		});

		stream.on('end', () => {
			// Finish parsing the file (synchronous call).

			xml.parse('', true);

			// Run all finish hooks.

			pendingList.forEach((state: State) => state.xsdElement.finish(state));

			console.log(stateStatic.namespaceMap);
			console.log(util.inspect(stateStatic.root, {depth: 4, colors: true}));
		});
	}
}

var xsdCache = new Cache('cache/xsd', '_index.xsd');

new Xsd(process.argv[2], xsdCache);
