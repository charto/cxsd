// This file is part of cxsd, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import { MemberSpec as Member, MemberRef } from "@wikipathways/cxml";

import { Type } from "../Type";
import { Transform } from "./Transform";

export interface AnonType {
  type: Type;
  memberTypeList: Type[];
}

export interface State {
  pendingAnonTbl: { [typeId: string]: AnonType };
  pendingAnonList: Type[];
  typeListList: Type[][];
}

function capitalize(match: string, initial: string) {
  return initial.toUpperCase();
}

function sanitizeName(name: string) {
  var reserved = {
    constructor: true
  };

  name = name
    .replace(/-([a-z])/, capitalize)
    .replace(/[^_0-9A-Za-z]/g, "")
    .replace(/^[^A-Za-z]+/, "");

  if (reserved.hasOwnProperty(name)) name = "_" + name;

  return name;
}

export class Sanitize extends Transform<Sanitize, void, State> {
  prepare() {
    var memberList = this.namespace.memberList.filter(
      (member: Member) => !!member
    );

    for (var member of memberList) {
      if (member.isSubstituted || member.isAbstract) {
        member.getProxy(Type).containingRef.safeName = sanitizeName(
          member.name
        );
      }

      if (member.substitutes) {
        member.safeName = sanitizeName(member.name);
      }
    }

    var typeList = this.namespace.typeList.filter((type: Type) => !!type);

    this.visitType(this.doc);

    for (var type of typeList) {
      this.visitType(type);
    }

    this.state.typeListList.push(typeList);
  }

  renameDuplicates(typeList: Type[]) {
    // TODO: handle collisions between names of types and members of doc.

    // Sort types by sanitized name and duplicates by original name
    // (missing original names sorted after existing original names).

    // TODO: merge types with identical contents.

    typeList = typeList.sort(
      (a: Type, b: Type) =>
        a.safeName.localeCompare(b.safeName) ||
        +!!b.name - +!!a.name ||
        (a.name && a.name.localeCompare(b.name))
    );

    // Add numeric suffix to duplicate names.

    var name = "";
    var suffix = 2;

    for (var type of typeList) {
      if (type.safeName == name) {
        type.safeName += "_" + suffix++;
      } else {
        name = type.safeName;
        suffix = 2;
      }
    }
  }

  finish() {
    for (var key of Object.keys(this.state.pendingAnonTbl)) {
      var spec = this.state.pendingAnonTbl[key];

      if (spec) {
        for (var memberType of spec.memberTypeList) {
          if (memberType.containingType.safeName)
            this.addNameToType(memberType);
        }
      }
    }

    for (var type of this.state.pendingAnonList) {
      if (!type.safeName) type.safeName = "Type";
    }

    for (var typeList of this.state.typeListList) {
      this.renameDuplicates(typeList);
    }
  }

  visitType(type: Type) {
    // var refList: MemberRef[] = [];
    var refList: any[] = [];
    // var ref: MemberRef;
    var ref: any;
    var member: Member;
    var other: Type;
    // var otherMember: MemberRef;
    var otherMember: any;
    var iter: number;

    if (type.name) type.safeName = sanitizeName(type.name);
    else this.state.pendingAnonList.push(type);

    for (ref of type.attributeList) {
      // Add a $ prefix to attributes of this type
      // conflicting with children of this or parent types.

      other = type;
      iter = 100;

      while (other && --iter) {
        otherMember = other.childTbl[ref.member.name];
        if (otherMember) {
          ref.prefix = "$";
          break;
        }

        other = other.parent;
      }

      refList.push(ref);
    }

    for (ref of type.childList) {
      // Add a $ prefix to attributes of parent types
      // conflicting with children of this type.

      other = type;
      iter = 100;
      member = ref.member;

      while ((other = other.parent) && --iter) {
        otherMember = other.attributeTbl[member.name];
        if (otherMember && !otherMember.prefix) {
          otherMember.prefix = "$";
          if (otherMember.safeName)
            otherMember.safeName = otherMember.prefix + otherMember.safeName;
        }
      }

      // Ensure maximum allowed occurrence count is no less than in parent types,
      // because overriding a parent class member with a different type
      // (array vs non-array) doesn't compile.

      if (ref.max < 2) {
        other = type;
        iter = 100;

        // TODO: Topologically sort dependencies to start processing from root types,
        // to avoid continuing search after one parent with a matching member is found.

        while ((other = other.parent) && --iter) {
          otherMember = other.childTbl[member.name];
          if (otherMember && otherMember.max > ref.max) {
            ref.max = otherMember.max;
            if (ref.max > 1) break;
          }
        }
      }

      if (
        ref.max <= 1 &&
        !type.isProxy &&
        (member.isSubstituted || member.isAbstract)
      ) {
        let proxy = member.getProxy(Type);

        type.addMixin(proxy as any);

        // TODO: Remove following line!
        (ref as any).isHidden = true;
      }

      refList.push(ref);
    }

    // Add names to any unnamed types of members, based on the member name.

    for (var ref of refList) {
      // TODO: Detect duplicate names from other namespaces and prefix them.

      var safeName = ref.member.safeName;

      if (!safeName) {
        if (ref.member.name == "*") safeName = "*";
        else safeName = sanitizeName(ref.member.name);

        ref.member.safeName = safeName;
      }

      if (safeName == "*") ref.safeName = safeName;
      else ref.safeName = (ref.prefix || "") + safeName;

      this.addNameToMemberTypes(type, ref.member);

      let proxy = ref.member.proxy;

      if (proxy && !(proxy as any).sanitized) {
        (proxy as any).sanitized = true;
        this.visitType(proxy);
      }
    }
  }

  addNameToType(type: Type) {
    var containingType = type.containingType;
    var containingRef = type.containingRef;
    var spec: AnonType;

    if (containingType && !containingType.safeName) {
      // Type is inside another which is not named (yet) so try again later.

      spec = this.state.pendingAnonTbl[memberType.containingType.surrogateKey];

      if (!spec) {
        spec = { type: memberType.containingType, memberTypeList: [] };
        this.state.pendingAnonTbl[
          memberType.containingType.surrogateKey
        ] = spec;
      }

      spec.memberTypeList.push(memberType);
    } else if (containingType || (containingRef && containingRef.safeName)) {
      // Type is inside a named type or referenced by a named member.
      // Give it a name based on those.

      if (containingRef) {
        type.namespace = containingRef.member.namespace;

        type.safeName = [
          containingType ? containingType.safeName : "",
          (containingRef.safeName || "").replace(/^([a-z])/, capitalize),
          type.isProxy ? "Proxy" : "",
          "Type"
        ].join("");
      }

      spec = this.state.pendingAnonTbl[type.surrogateKey];

      if (spec) {
        for (var memberType of spec.memberTypeList) {
          this.addNameToType(memberType);
        }

        this.state.pendingAnonTbl[type.surrogateKey] = null;
      }
    }
  }

  addNameToMemberTypes(type: Type, member: Member) {
    if (
      member.proxySpec &&
      !member.proxySpec.safeName &&
      (member.namespace as any) == this.namespace
    ) {
      this.addNameToType(member.proxySpec as any);
    }
    for (var memberType of member.typeSpecList) {
      if (
        !memberType.safeName &&
        (memberType.namespace as any) == this.namespace
      ) {
        this.addNameToType(memberType as any);
      }
    }
  }

  protected state: State = {
    pendingAnonTbl: {},
    pendingAnonList: [],
    typeListList: []
  };

  construct = Sanitize;
}
