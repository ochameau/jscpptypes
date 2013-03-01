const { Cu } = require("chrome");
Cu.import("resource://gre/modules/ctypes.jsm");

// Convert ctypes data type into Itanium C++ abi type descriptor
// http://refspecs.linux-foundation.org/cxxabi-1.83.html#mangling

// Return symbol for a given primary type: <builtin-type>
function mangleBuiltinType(arg) {
  if (arg == ctypes.size_t) {
    if (ctypes.size_t.size == 8)
      arg = ctypes.unsigned_long;
    else
      arg = ctypes.unsigned_int;
  }
  // <builtin-type>
  switch (arg) {
    case ctypes.void_t:
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
function mangleArgument(substitutes, arg) {
  let symbol = "";
  let saveSubstitute = false;

  // For non built-in types, search for previous substitute
  if (arg instanceof ctypes.PointerType ||
      arg instanceof ctypes.FunctionType ||
      arg.isClassObject && arg.targetType ||
      arg.isConst && arg.ptr) {
    // Search for previous argument with same type
    let sameArgIndex = substitutes.indexOf(arg);
    // if a previous argument used the same struct or class name,
    // just use argument index, beginning from 0
    if (sameArgIndex != -1) {
      if (sameArgIndex == 0)
        return "S_";
      else
        return "S" + (sameArgIndex - 1) + "_";
    } else {
      saveSubstitute = true;
    }
  }

  if (arg.isConst) {
    if (arg.ctype.ptr) {
      symbol += "P";
    }
    symbol += "K";
    symbol += mangleArgument(substitutes, arg.ctype.targetType || arg.ctype);
    // Add an entry for the const symbol in substitutes
    // otherwise 'S_' indexes are wrong
    // TODO: add real subtitutes support for non-pointer const
    substitutes.push({});
  } else if (arg.isEnum) {
    symbol += mangleBuiltinType(arg.ctype);
  } else if (arg instanceof ctypes.PointerType ||
         (arg.isClassObject && arg.targetType)) {
    // Consider PointerType object as 'Pointer-to'
    symbol += "P" 
    symbol += mangleArgument(substitutes, arg.targetType);
  } else  if (arg instanceof ctypes.FunctionType) {
    symbol += "F" +
              mangleArgument(substitutes, arg.returnType) +
              arg.argTypes.map(
                mangleArgument.bind(null, substitutes)
              ).join("") +
              "E";
  } else if (arg.isClassObject || arg instanceof ctypes.StructType) {
    symbol += mangleName(substitutes, arg.name, true);
  } else {
    symbol += mangleBuiltinType(arg);
  }

  if (saveSubstitute) {
    substitutes.push(arg);
  }

  return symbol;
}

// Returns symbol for a given name: <name>
// XXX: missing various cases like template names and ::std::
function mangleName(substitutes, name, classOrStructName) {
  let symbol = "";
  let l = name.split("::");

  // <nested-name>
  if (l.length > 1)
    symbol += "N";

  symbol += l.map(function (part) {
    // Search for previous argument with same type
    let sameArgIndex = substitutes.indexOf(part);
    // if a previous argument used the same struct or class name,
    // just use argument index, beginning from 0
    if (sameArgIndex != -1) {
      if (sameArgIndex == 0)
        return "S_";
      else
        return "S" + (sameArgIndex - 1) + "_";
    } else if (part != l[l.length-1] || classOrStructName) {
      // We ignore the last part of function names
      substitutes.push(part);
    }
    return part.length + part;
  }).join("");

  if (l.length > 1)
    symbol += "E";

  return symbol;
}

// Returns symbol for a given function: <mangled-name>
function mangleFunction(funName, returnType, args) {
  let substitutes = [];
  let symbol = "_Z" + mangleName(substitutes, funName, false);
  for (let i = 0; i < args.length; i++) {
    symbol += mangleArgument(substitutes, args[i]);
  }
  return symbol;
  
}
exports.mangleFunction = mangleFunction;

function manglePointer(symbol) {
  return "P" + symbol;
}
exports.manglePointer = manglePointer;

