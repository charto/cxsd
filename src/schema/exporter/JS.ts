// This file is part of cxsd, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Cache} from 'cget'
import {Exporter} from './Exporter';
import {Namespace, TypeState} from '../Namespace';
import {Member} from '../Member';
import {Type} from '../Type';

export type NumTbl = { [id: string]: number };

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

	writeMember(member: Member, typeNumTbl: NumTbl, importNumTbl: NumTbl) {
		var name = member.safeName;
		if(member.name != name) name += ':' + member.name;

		var flags = 0;
		if(member.min < 1) flags |= Member.optionalFlag;
		if(member.max > 1) flags |= Member.arrayFlag;

		var memberTypeList = member.typeList.map((memberType: Type) =>
			typeNumTbl[memberType.surrogateKey]
		);

		return(
			'[' +
			"'" + name + "', " +
			flags + ', ' +
			'[' + memberTypeList.join(', ') + ']' +
			((member.namespace != this.namespace) ? ', ' + importNumTbl[member.namespace.id] : '') +
			']'
		);
	}

	writeType(type: Type, typeNumTbl: NumTbl, importNumTbl: NumTbl) {
		var childSpecList: string[] = [];
		var attributeSpecList: string[] = [];

		var flags = 0;
		if(type.literalType) flags |= Type.literalFlag;

		if(type.childList) {
			for(var member of type.childList) {
				childSpecList.push(this.writeMember(member, typeNumTbl, importNumTbl));
			}
		}

		if(type.attributeList) {
			for(var member of type.attributeList) {
				attributeSpecList.push(this.writeMember(member, typeNumTbl, importNumTbl));
			}
		}

		var parentNum = type.parent ? typeNumTbl[type.parent.surrogateKey] : 0;

		return(
			'\n\t[' +
			flags + ', ' +
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

		var typeNumTbl: NumTbl = {};
		var typeNum = 1;

		var importTbl = namespace.getUsedImportTbl();
		var importSpecList: string[] = [];
		var importNumTbl: NumTbl = {};
		var num = 0;

		for(var importName of Object.keys(importTbl)) {
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

			importNumTbl[otherNamespaceId] = num++;
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

		typeSpecList.push(this.writeType(namespace.doc, typeNumTbl, importNumTbl));

		for(var type of typeList) {
			typeSpecList.push(this.writeType(type, typeNumTbl, importNumTbl));
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

	getOutName(name: string) {
		return(name + '.js');
	}

	construct = JS;
}
