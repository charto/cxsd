// This file is part of cxsd, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import { Cache } from 'cget';
import { Exporter } from './Exporter';
import { Namespace } from '../Namespace';
import { Member } from '../Member';
import { MemberRef } from '../MemberRef';
import { Type } from '../Type';

var docName = 'document';
var baseName = 'Element';

/** Export parsed schema to a TypeScript d.ts definition file. */

export class TS extends Exporter {
  /** Format an XSD annotation as JSDoc. */

  static formatComment(indent: string, comment: string) {
    var lineList = comment.split('\n');
    var lineCount = lineList.length;
    var blankCount = 0;
    var contentCount = 0;
    var output: string[] = [];
    var prefix = '/**';

    for (var line of lineList) {
      // Remove leading and trailing whitespace.
      line = line.trim();

      if (!line) ++blankCount;
      else {
        if (blankCount && contentCount) output.push(indent + prefix);

        output.push(indent + prefix + ' ' + line);
        prefix = '  *';

        ++contentCount;
        blankCount = 0;
      }
    }

    if (output.length) output[output.length - 1] += ' */';

    return output.join('\n');
  }

  writeImport(shortName: string, relativePath: string, absolutePath: string) {
    return (
      'import * as ' + shortName + ' from ' + "'" + relativePath + "'" + ';'
    );
  }

  /** Output list of original schema file locations. */

  exportSourceList(sourceList: string[]) {
    var output: string[] = [];

    output.push('// Source files:');

    for (var urlRemote of sourceList) {
      output.push('// ' + urlRemote);
    }

    output.push('');
    return output;
  }

  writeTypeRef(type: Type, namePrefix: string) {
    var output: string[] = [];

    var namespace = type.namespace;
    var name =
      namePrefix +
      type.safeName
        .replace(/(\w|_)Type/g, '$1')
        .replace(/_(\w)/g, (_, c) => c.toUpperCase());
    if (!namespace || namespace == this.namespace) {
      output.push(name);
    } else {
      // Type from another, imported namespace.

      var short = this.namespace.getShortRef(namespace.id);

      if (short) {
        output.push(short + '.' + name);
      } else {
        console.error(
          'MISSING IMPORT ' + namespace.name + ' for type ' + type.name
        );
        output.push('any');
      }
    }

    return output.join('');
  }

  writeParents(parentDef: string, mixinList: Type[]) {
    var parentList: string[] = [];

    if (parentDef) parentList.push(parentDef.replace(/^_/, ''));

    for (var type of mixinList || []) {
      parentList.push(this.writeTypeRef(type, '_').replace(/^_/, ''));
    }

    if (!parentList.length) parentList.push(baseName);

    return (
      ' extends ' +
      parentList.map((parent) => parent.replace(/^_/, '')).join(', ')
    );
  }

  writeTypeList(ref: MemberRef, isAttribute = false) {
    var typeList = ref.member.typeList;

    if (ref.max > 1 && ref.member.proxy) typeList = [ref.member.proxy];

    var outTypeList = typeList.map((type: Type) => {
      if (
        type.isPlainPrimitive &&
        (!type.literalList || !type.literalList.length)
      ) {
        const primitiveName = type.primitiveType.name;
        return !isAttribute &&
          ['string', 'number', 'boolean'].includes(primitiveName)
          ? 'Text'
          : primitiveName;
      } else return this.writeTypeRef(type, '');
    });

    if (outTypeList.length == 0) return null;

    var outTypes = outTypeList.sort().join(' | ');

    if (ref.max > 1) {
      if (outTypeList.length > 1) return '(' + outTypes + ')[]';
      else return outTypes + '[]';
    } else return outTypes;
  }

  writeMember(ref: MemberRef, isGlobal: boolean, isAttribute = false) {
    var output: string[] = [];
    var member = ref.member;
    var comment = member.comment;
    var indent = '\t';

    if ((ref as any).isHidden) return '';
    if (isGlobal && member.isAbstract) return '';
    if (member.name == '*') return '';

    if (comment) {
      output.push(TS.formatComment(indent, comment));
      output.push('\n');
    }

    output.push(
      indent +
        ref.safeName
          .replace(/(\w|_)Type/g, '$1')
          .replace(/_(\w)/g, (_, c) => c.toUpperCase())
    );
    if (ref.min == 0) output.push('?');
    output.push(': ');

    var outTypes = this.writeTypeList(ref, isAttribute);
    if (!outTypes) return '';

    output.push(outTypes);
    output.push(';');

    return output.join('');
  }

  writeTypeContent(type: Type) {
    var output: string[] = [];

    if (type.isPlainPrimitive) {
      var literalList = type.literalList;

      if (literalList && literalList.length > 0) {
        if (literalList.length > 1) {
          output.push('(' + literalList.join(' | ') + ')');
        } else output.push(literalList[0]);
      } else output.push(type.primitiveType.name);
    } else if (type.isList) {
      output.push(this.writeTypeList(type.childList[0]));
    } else {
      var outMemberList: string[] = [];

      var output: string[] = [];
      var parentType = type.parent;
      const safeName = type.safeName.replace(/Type/g, '');

      const outAttrList = type.attributeList
        .map((attribute) => {
          var outAttribute = this.writeMember(attribute, false, true);
          if (outAttribute) {
            return outAttribute
              .replace(/(\w|_)Type/g, '$1')
              .replace(/_(\w)/g, (_, c) => c.toUpperCase());
          }
        })
        .filter(Boolean);

      const outChildList = type.childList
        .map((child) => {
          var outChild = this.writeMember(child, false);
          if (!outChild) return;

          const outChildButText = outChild.replace(
            /\b(string|number)\b/,
            'Text'
          );
          return outChildButText;
        })
        .filter(Boolean);

      const name = (
        type.name ||
        (type.containingRef &&
          type.containingRef.member &&
          type.containingRef.member.name) ||
        type.safeName
      ).replace(/(\w|_)Type/g, '$1');

      const out = `{
	type: 'element',
	name: '${name.replace(/(\w)/, (c) => c.toLowerCase())}',
  attributes: {
	${outAttrList.join('\n\t')}
	}
	${outChildList.length ? `children: RequiredMap<${safeName}Children>` : ''}
}

${
  outChildList.length
    ? `export interface ${safeName}Children  {
	${outChildList.join('\n\t')}
}`
    : ''
}
			`;
      output.push(out);

      // if(outMemberList.length) {
      // 	output.push('\n');
      // 	output
      // 	output.push(outMemberList.join('\n'));
      // 	output.push('\n');
      // }
    }

    return output.join('');
  }

  writeType(type: Type, member?: MemberRef) {
    var namespace = this.namespace;
    var output: string[] = [];
    var comment =
      type.comment ||
      (member && member.member && member.member.comment) ||
      (type.containingRef &&
        type.containingRef.member &&
        type.containingRef.member.comment) ||
      '';

    if (type.safeName)
      type.safeName = type.safeName
        .replace(/(\w|_)Type/g, '$1')
        .replace(/_(\w)/g, (_, c) => c.toUpperCase());

    if (type.containingRef) {
      type.containingRef.safeName = type.containingRef.safeName
        .replace(/Type/g, '')
        .replace(/_(\w)/g, (_, c) => c.toUpperCase());

      if (type.containingRef.member && type.containingRef.member.safeName) {
        type.containingRef.member.safeName = type.containingRef.member.safeName
          .replace(/(\w|_)Type/g, '$1')
          .replace(/_(\w)/g, (_, c) => c.toUpperCase());
      }
    }
    if (type.parent && type.parent.safeName) {
      type.parent.safeName = type.parent.safeName
        .replace(/(\w|_)Type/g, '$1')
        .replace(/_(\w)/g, (_, c) => c.toUpperCase());
    }

    var parentDef: string;
    var exportPrefix = type.isExported ? 'export ' : '';

    const name = type.safeName
      .replace(/(\w|_)Type/g, '$1')
      .replace(/_(\w)/g, (_, c) => c.toUpperCase());

    if (comment) {
      output.push(TS.formatComment('', comment));
      output.push('\n');
    }

    const content = this.writeTypeContent(type);

    if (namespace.isPrimitiveSpace) {
      output.push(
        exportPrefix +
          'interface _' +
          name +
          this.writeParents(null, type.mixinList) +
          ' { ' +
          'content' +
          ': ' +
          type.primitiveType.name +
          '; }' +
          '\n'
      );
    } else if (type.isList) {
      output.push(exportPrefix + 'type ' + name + ' = ' + content + ';' + '\n');
    } else if (type.isPlainPrimitive) {
      parentDef = this.writeTypeRef(type.parent, '_');

      output.push(exportPrefix + 'type ' + name + ' = ' + content + ';' + '\n');
      if (type.literalList && type.literalList.length) {
        output.push(
          'interface _' +
            name +
            this.writeParents(parentDef, type.mixinList) +
            ' { ' +
            'content' +
            ': ' +
            name +
            '; }' +
            '\n'
        );
      } else {
        // NOTE: Substitution groups are ignored here!
        output.push('type _' + name + ' = ' + parentDef + ';' + '\n');
      }
    } else {
      if (type.parent) parentDef = this.writeTypeRef(type.parent, '_');

      output.push(
        'export interface ' +
          name +
          this.writeParents(parentDef, type.mixinList) +
          ' ' +
          content +
          '\n'
      );
      //output.push(exportPrefix + 'interface ' + name + ' extends _' + name + ' { constructor: { new(): ' + name + ' }; }' + '\n');
      //if(type.isExported) output.push(exportPrefix + 'var ' + name + ': { new(): ' + name + ' };' + '\n');
    }

    return output.join('');
  }

  writeSubstitutions(type: Type, refList: MemberRef[], output: string[]) {
    for (var ref of refList) {
      var proxy = ref.member.proxy;

      if (!ref.member.isAbstract) output.push(this.writeMember(ref, false));

      if (proxy && proxy != type)
        this.writeSubstitutions(proxy, proxy.childList, output);
    }

    for (var mixin of type.mixinList) {
      if (mixin != type)
        this.writeSubstitutions(mixin, mixin.childList, output);
    }
  }

  writeAugmentations(output: string[]) {
    var namespace = this.namespace;

    for (var namespaceId of Object.keys(namespace.augmentTbl)) {
      var augmentTbl = namespace.augmentTbl[namespaceId];
      var typeIdList = Object.keys(augmentTbl);
      var type = augmentTbl[typeIdList[0]].type;
      var other = type.namespace;

      output.push(
        'declare module ' + "'" + this.getPathTo(other.name) + "'" + ' {'
      );

      for (var typeId of typeIdList) {
        type = augmentTbl[typeId].type;

        output.push('export interface _' + type.safeName + ' {');

        for (var ref of augmentTbl[typeId].refList) {
          ref.safeName = ref.member.safeName;
        }

        this.writeSubstitutions(type, augmentTbl[typeId].refList, output);

        output.push('}');
      }

      output.push('}');
    }
  }

  writeContents(): string {
    var output = this.writeHeader();
    var doc = this.doc;
    var namespace = this.namespace;
    var prefix: string;

    output.push('');
    output = output.concat(this.exportSourceList(namespace.sourceList));

    output.push('');
    this.writeAugmentations(output);

    // output.push('interface ' + baseName + ' {');
    // output.push('\t_exists: boolean;');
    // output.push('\t_namespace: string;');
    // output.push('}');

    output.push(`import {Element, Text} from 'xast'`);
    output.push(`export type ValuesType<T extends ReadonlyArray<any> | ArrayLike<any> | Record<any, any>> = T extends ReadonlyArray<any> ? T[number] : T extends ArrayLike<any> ? T[number] : T extends object ? T[keyof T] : never;
export type NoUndefined<T> = Exclude<T, undefined>
export type ArrayValueMaybe<T> = T extends any[]
? ValuesType<NoUndefined<T>>
: NoUndefined<T>
export type AllTypes<T> = ArrayValueMaybe<ValuesType<T>>
    
export type RequiredMap<T> = AllTypes<T>`);

    for (var type of namespace.typeList
      .slice(0)
      .sort((a: Type, b: Type) => a.safeName.localeCompare(b.safeName))) {
      if (!type) continue;

      output.push(this.writeType(type));
    }

    output.push('export interface ' + docName + ' extends ' + baseName + ' {');

    for (var child of doc.childList) {
      var outElement = this.writeMember(child, true);
      if (outElement) {
        output.push(outElement);
      }
    }

    output.push('}');
    output.push('export var ' + docName + ': ' + docName + ';\n');

    return output.join('\n');
  }

  getOutName(name: string) {
    return name + '.d.ts';
  }

  construct = TS;
}
