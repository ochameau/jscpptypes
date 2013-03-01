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
function mangleArgument(args, arg, position) {
  let symbol = "";

  if (arg.isConst) {
    arg = arg.ctype;
    if (arg.ptr) {
      symbol += "PB";
      arg = arg.targetType;
    } else {
      //XXX: need to verify the non-pointer scenario:
      symbol += "B";
    }
  }

  if (arg.isEnum) {
    return "?AW4" + mangleName(arg.name) + "@";
  }

  // Consider PointerType object as 'Pointer-to'
  while (arg instanceof ctypes.PointerType ||
         (arg.isClassObject && arg.targetType)) {
    //XXX: Pointer can have a different CV-class modifier different than
    //     none = 'A'
    symbol += "PA";
    arg = arg.targetType;
  }

  if (arg.isClassObject || arg instanceof ctypes.StructType) {
    // Search for previous argument with same name
    let sameNameArg = null;
    for (let i = 0; i < position; i++) {
      let a = args[i];      
      if (a.name == arg.name) {
        sameNameArg = i;
        break;
      }
    }
    // if a previous argument used the same struct or class name,
    // just use argument index, beginning from 1
    let name;
    if (sameNameArg != null)
      name = sameNameArg + 1;
    else
      name = mangleName(arg.name);

    if (arg.isClassObject) {
      // Handle C++ definitions
      //XXX-TODO: mangle nested name
      symbol += "V" + name + "@";
    } else if (arg instanceof ctypes.StructType) {
      symbol += "U" + name + "@";
    }
  } else {
    symbol += mangleBuiltinType(arg);
  }

  return symbol;
}

// Returns symbol for a given name: BasicName Qualification '@'
// XXX: missing operator case
function mangleName(name) {
  // We put each name in reserve order seperated by '@' and with an extra
  // '@' at the end.
  let l = name.split("::");
  l.reverse();
  return l.join("@") + "@";
}

// Returns symbol for a given function: MangledName
function mangleFunction(funName, returnType, args) {
  // XXX: It looks like function are always:
  //      UnqualifiedTypeCode -> 'Y',
  //      StorageClass: (Normal Storage) -> 'A',
  let symbol = "?" + mangleName(funName) + "@" + "Y" + "A";
  let allTypes = [returnType].concat(args);
  for (let i = 0; i < allTypes.length; i++) {
    symbol += mangleArgument(allTypes, allTypes[i], i);
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

