// This file is part of cxsd, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Cache} from 'cget'
import {Exporter} from './Exporter';
import {Namespace, TypeState} from '../Namespace';
import {Member} from '../Member';
import {Type} from '../Type';

export class JS extends Exporter {
	writeImport(shortName: string, relativePath: string, absolutePath: string) {
		return(
			'var ' +
			shortName +
			' = require(' +
			"'" + relativePath + "'" +
			');'
		);
	}

	writeMember(member: Member, typeNumTbl: { [id: number]: number }) {
		var name = member.safeName;
		if(member.name != name) name += ':' + member.name;

		var flags = 0;
		if(member.min < 1) flags |= Type.optionalFlag;
		if(member.max > 1) flags |= Type.arrayFlag;

		var memberTypeList = member.typeList.map((memberType: Type) =>
			typeNumTbl[memberType.surrogateKey]
		);

		return(
			'[' +
			"'" + name + "', " +
			flags + ', ' +
			'[' + memberTypeList.join(', ') + ']' +
			']'
		);
	}

	writeType(type: Type, typeNumTbl: { [id: number]: number }) {
		var childSpecList: string[] = [];
		var attributeSpecList: string[] = [];

		if(type.childList) {
			for(var member of type.childList) {
				childSpecList.push(this.writeMember(member, typeNumTbl));
			}
		}

		if(type.attributeList) {
			for(var member of type.attributeList) {
				attributeSpecList.push(this.writeMember(member, typeNumTbl));
			}
		}

		var parentNum = type.parent ? typeNumTbl[type.parent.surrogateKey] : 0;

		return(
			'\n\t[' +
			parentNum + ', ' +
			'[' + childSpecList.join(', ') + '], ' +
			'[' + attributeSpecList.join(', ') + ']' +
			']'
		);
	}

	/** Output namespace contents to the given cache key. */

	writeContents(): string {
		var doc = this.doc;
		var namespace = doc.namespace;

		var typeNumTbl: { [id: number]: number } = {};
		var typeNum = 1;

		var importTbl = namespace.getUsedImportTbl();
		var importNameList = Object.keys(importTbl);
		var importSpecList: string[] = [];

		for(var importName of importNameList) {
			var otherNamespaceId = importTbl[importName].id;
			var importTypeNameTbl = namespace.importTypeNameTbl[otherNamespaceId];
			var importTypeNameList: string[] = [];

			if(importTypeNameTbl) {
				for(var name of Object.keys(importTypeNameTbl).sort()) {
					var type = importTypeNameTbl[name];

					importTypeNameList.push("'" + type.safeName + "'");
					typeNumTbl[type.surrogateKey] = typeNum++;
				}
			}

			importSpecList.push(
				'\n\t' + '[' + importName + ', [' +
				importTypeNameList.join(', ') +
				']]'
			);
		}

		var exportedTypeList: Type[] = [];
		var hiddenTypeList: Type[] = [];
		var typeSpecList: string[] = [];

		for(var type of namespace.typeList) {
			if(!type) continue;
			var isExported = (namespace.typeStateList[type.surrogateKey] == TypeState.exported);

			if(isExported) exportedTypeList.push(type);
			else hiddenTypeList.push(type);
		}

		exportedTypeList.sort((a: Type, b: Type) => a.safeName.localeCompare(b.safeName));
		hiddenTypeList.sort((a: Type, b: Type) => a.safeName.localeCompare(b.safeName));

		var typeList = exportedTypeList.concat(hiddenTypeList);

		for(var type of typeList) {
			typeNumTbl[type.surrogateKey] = typeNum++;
		}

		var parentNum: number;

		typeSpecList.push(this.writeType(namespace.doc, typeNumTbl));

		for(var type of typeList) {
			typeSpecList.push(this.writeType(type, typeNumTbl));
		}

		var exportSpecList: string[] = [];

		for(var type of exportedTypeList) {
			name = type.safeName;
			if(type.name && type.name != name) name += ':' + type.name;

			exportSpecList.push('\n\t' + "'" + name + "'");
		}

		return([].concat(
			[
				'var cxml = require("cxml");',
			],
			this.writeHeader(),
			[
				'',
				'cxml.register(' +
				"'" + namespace.name+ "', " +
				'exports, ' +
				'[' + importSpecList.join(',') + '\n], ' +
				'[' + exportSpecList.join(',') + '\n], ' +
				'[' + typeSpecList.join(',') + '\n]' +
				');'
			]
		).join('\n'));
	}

	getCache() {
		return(JS.cache);
	}

	getOutName(name: string) {
		return(name + '.js');
	}

	construct = JS;

	/** Cache where all output is written. */
	private static cache = new Cache('cache/js', '_index.js');
}
