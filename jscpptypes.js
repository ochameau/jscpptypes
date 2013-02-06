const { Cu } = require("chrome");

Cu.import("resource://gre/modules/ctypes.jsm");
Cu.import("resource://gre/modules/Services.jsm");

// Convert ctypes data type into Itanium C++ abi type descriptor
// http://refspecs.linux-foundation.org/cxxabi-1.83.html#mangling

// Return symbol for a given primary type: <builtin-type>
function mangleBuiltinType(arg) {
  // <builtin-type>
  switch (arg) {
    case ctypes.void:
      return 'v';
    // XXX: wchar_t -> w ?
    case ctypes.bool:
      return 'b';
    case ctypes.char:
      return 'c';
    // XXX: signed char -> a ?
    // XXX: unsigned char -> h ?
    case ctypes.short:
      return 's';
    case ctypes.unsigned_short:
      return 't';
    case ctypes.int:
      return 'i';
    case ctypes.unsigned_int:
      return 'j';
    case ctypes.long:
      return 'l';
    case ctypes.unsigned_long:
      return 'm';
    case ctypes.int64_t:
      return 'x';
    case ctypes.uint64_t:
      return 'y';
    // XXX: int128 -> n ?
    // XXX: unsigned int128 -> n ?
    case ctypes.float:
      return 'f';
    case ctypes.double:
      return 'd';
    // XXX: long double -> e ?
    // XXX: float128 -> g ?
    // XXX: ellipsis -> z ?
  }
  
  throw new Error("Unsupported type: " + arg);
}


// Returns symbol for each argument of a function: <bare-function-type>
function mangleArgument(arg) {
  let symbol = "";

  // Consider PointerType object as 'Pointer-to'
  if (arg instanceof ctypes.PointerType) {
    symbol += "P";
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

// Returns symbol for a given name: <name>
// XXX: missing various cases like template names and ::std::
function mangleName(name) {
  let symbol = "";
  let l = name.split("::");
  if (l.length == 1) {
    // <unscoped-name> -> <source-name>
    symbol += name.length + name;
  } else {
    // <nested-name>
    symbol += "N";
    symbol += l.map(function (part) {
      return part.length + part;
    }).join("");
    symbol += "E";
  }
  return symbol;
}

// Returns symbol for a given function: <mangled-name>
function mangleFunction(funName, args) {
  return "_Z" + mangleName(funName) +
    args.map(mangleArgument).join('');
}

function convertToCtypes(arg) {
  if (arg.isCppClass) {
    return arg.ctype;
  }
  return arg;
}

function CppObject(name, noPtr, ptr) {
  let symbol = "";
  if (!noPtr)
    symbol += "P";
  symbol += mangleName(name);
  return {
    isCppClass: true,
    symbol: symbol,
    ctype: ptr ? ctypes.uint64_t.ptr : ctypes.uint64_t
  };
}
exports.CppObject = CppObject;

function declare(lib, name, returnType) {
  let args = Array.slice(arguments, 3);
  // XXX: jsapi isn't mangled on windows, but it won't necessary apply to all libs
  // Remove that test and always mangle.
  let symbol = Services.appinfo.OS == "WINNT" ? name : mangleFunction(name, args);
  let ctypesArgs = args.map(convertToCtypes);
  try {
    return lib.declare.apply(
      lib,
      [symbol,
       ctypes.default_abi,
       convertToCtypes(returnType)].concat(ctypesArgs)
    );
  } catch(e) {
    try {
      return lib.declare.apply(
        lib,
        [name,
         ctypes.default_abi,
         convertToCtypes(returnType)].concat(ctypesArgs)
      );
    } catch(e) {
      throw new Error("Unable to find function '" + name + "', mangled symbol: " + symbol);
    }
  }
}
exports.declare = declare;
