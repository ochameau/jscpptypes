const { Cu } = require("chrome");
Cu.import("resource://gre/modules/ctypes.jsm");

// Documentation about visual studio mangling
// http://en.wikipedia.org/wiki/Visual_C%2B%2B_name_mangling
// http://www.kegel.com/mangle.html

// Return symbol for a given primary type
function mangleBuiltinType(arg) {
  if (arg == ctypes.size_t) {
    if (ctypes.size_t.size == 8)
      arg = ctypes.unsigned_long;
    else
      arg = ctypes.unsigned_int;
  }
  switch (arg) {
    // XXX: signed char
    case ctypes.char:
      return 'D';
    // XXX: unsigned char
    case ctypes.short:
      return 'F';
    case ctypes.unsigned_short:
      return 'G';
    case ctypes.int:
      return 'H';
    case ctypes.bool:
      return 'H';
    case ctypes.unsigned_int:
      return 'I';
    case ctypes.long:
      return 'J';
    case ctypes.unsigned_long:
      return 'K';
    case ctypes.float:
      return 'M';
    case ctypes.double:
      return 'N';
    // XXX: long double
    case ctypes.void_t:
      return 'X';
    case ctypes.jschar:
      return '_W';
    // XXX: elipsis
  }
  
  throw new Error("Unsupported type: " + arg);
}

// Returns symbol for each argument of a function: FunctionTypeCode
function mangleArgument(substitutes, arg, doNotSubstitute) {
  let symbol = "";

  let saveSubstitute = false;
  if (!doNotSubstitute && (arg instanceof ctypes.PointerType ||
      arg instanceof ctypes.FunctionType ||
      arg.isClassObject ||
      arg.isConst)) {
    // Search for previous argument with same type
    let sameArgIndex = substitutes.indexOf(arg);
    // if a previous argument used the same struct or class name,
    // just use argument index, beginning from 0
    if (sameArgIndex != -1) {
      return sameArgIndex;
    } else {
      saveSubstitute = true;
      substitutes.push(arg);
    }
  }

  if (arg.isConst) {
    arg = arg.ctype;
    if (arg.ptr) {
      symbol += "PB";
      symbol += mangleArgument(substitutes, arg.targetType);
    } else {
      //XXX: need to verify the non-pointer scenario:
      symbol += "B";
      symbol += mangleArgument(substitutes, arg);
    }
  } else if (arg.isEnum) {
    symbol += "?AW4" + mangleName(substitutes, arg.name, true) + "@";
  } else if (arg instanceof ctypes.PointerType ||
             (arg.isClassObject && arg.targetType)) {
    //XXX: Pointer can have a different CV-class modifier different than
    //     none = 'A'
    symbol += "PA";
    symbol += mangleArgument(substitutes, arg.targetType, (arg.isClassObject && arg.targetType));
  } else if (arg.isClassObject || arg instanceof ctypes.StructType) {
    let name = mangleName(substitutes, arg.name, true);

    if (arg.isClassObject) {
      // Handle C++ definitions
      symbol += "V" + name + "@";
    } else if (arg instanceof ctypes.StructType) {
      symbol += "U" + name + "@";
    }
  } else {
    symbol += mangleBuiltinType(arg);
  }

  if (saveSubstitute)
    ;//substitutes.push(arg);

  return symbol;
}

// Returns symbol for a given name: BasicName Qualification '@'
// XXX: missing operator case
function mangleName(substitutes, name, classOrStructName) {
  // We put each name in reserve order seperated by '@' and with an extra
  // '@' at the end.
  let l = name.split("::");
  l.reverse();
  l = l.map(function (part) {
    // Search for previous argument with same type
    let sameArgIndex = substitutes.indexOf(part);
    console.log(part+" -> "+sameArgIndex+" ---- "+substitutes.join(', '));
    // if a previous argument used the same struct or class name,
    // just use argument index, beginning from 0
    if (sameArgIndex != -1) {
      return sameArgIndex;
    } else if (part != l[0] || classOrStructName) {
      // We ignore the last part of function names
      substitutes.push(part);
    }
    return part;
  })
  //XXX: not sure about this rule:
  if (l.length == 1 && parseInt(l[0])>=0)
    return l;
  return l.join("@") + "@";
}

// Returns symbol for a given function: MangledName
function mangleFunction(funName, returnType, args) {
  // XXX: It looks like function are always:
  //      UnqualifiedTypeCode -> 'Y',
  //      StorageClass: (Normal Storage) -> 'A',
  let substitutes = [];
  let o = substitutes.push;
  substitutes.push = function (a) {
    console.log(" + "+a + "/"+ a.name);
    o.call(substitutes, a);
  };
  let symbol = "?" + mangleName([], funName, false) + "@" + "Y" + "A";
  let allTypes = [returnType].concat(args);
  for (let i = 0; i < allTypes.length; i++) {
    symbol += mangleArgument(substitutes, allTypes[i]);
  }
  
  return symbol + "@Z";
}
exports.mangleFunction = mangleFunction;

function mangleConst(symbol) {
  return symbol;
}
exports.mangleConst = mangleConst;


function manglePointer(symbol) {
  return "PA" + symbol;
}
exports.manglePointer = manglePointer;

