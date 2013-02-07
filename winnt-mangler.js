const { Cu } = require("chrome");
Cu.import("resource://gre/modules/ctypes.jsm");

// Return symbol for a given primary type
function mangleBuiltinType(arg) {
  switch (arg) {
    // XXX: signed char
    case ctypes.char:
      return 'C';
    // XXX: unsigned char
    case ctypes.short:
      return 'F';
    case ctypes.unsigned_short:
      return 'G';
    case ctypes.int:
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
    case ctypes.void:
      return 'X';
    // XXX: elipsis
  }
  
  throw new Error("Unsupported type: " + arg);
}

// Returns symbol for each argument of a function: FunctionTypeCode
function mangleArgument(arg) {
  let symbol = "";

  // Consider PointerType object as 'Pointer-to'
  if (arg instanceof ctypes.PointerType) {
    //XXX: Pointer can have a different CV-class modifier different than
    //     none = 'A'
    symbol += "PA";
    arg = arg.targetType;
  }

  if (arg.isCppClass) {
    // Handle C++ definitions
    symbol += arg.symbol;
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
  return "?" + mangleName(funName) + "@" + "Y" + "A" +
    mangleArgument(returnType) +
    args.map(mangleArgument).join('') + "@Z";
}

exports.mangleFunction = mangleFunction;

function mangleClass(name, noPtr) {
  let symbol = "";
  //XXX: Pointer can have a different CV-class modifier different than
  //     none = 'A'
  if (!noPtr)
    symbol += "PA";
  //XXX-TODO: mangle nested name
  return symbol + "V" + name + "@@";
}
exports.mangleClass = mangleClass;
