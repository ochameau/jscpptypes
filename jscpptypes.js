const { Cu, Cc, Ci } = require("chrome");
const { OS } = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULRuntime);

Cu.import("resource://gre/modules/ctypes.jsm");
Cu.import("resource://gre/modules/Services.jsm");

function convertToCtypes(arg) {
  if (arg.isClassObject || arg.isConst || arg.isEnum) {
    return arg.ctype;
  }
  return arg;
}

let mangler = OS == "WINNT" ? require("winnt-mangler") 
                            : require("gcc-mangler");

function CppClass(name, forcePtr) {
  if (!name)
    throw new Error("CppClass `name` argument is mandatory");
  let cls = {
    isClassObject: true,
    name: name,
    ctype: ctypes.voidptr_t.size == 8 ? ctypes.uint64_t : ctypes.uint32_t,
    get ptr() {
      let ptr = Object.create(this);
      // Only start using .ptr when using Class.ptr.ptr,
      // And force ptr type for reference passing.
      if (this != cls || forcePtr) {
        ptr.ctype = ptr.ctype.ptr;
      }
      ptr.targetType = this;
      return ptr;
    }
  };
  return cls;
}
exports.CppClass = CppClass;

function Const(type, ptr) {
  return {
    isConst: true,
    ptr: ptr,
    ctype: ptr ? type.ptr : type
  };
}
exports.Const = Const;

function Enum(name) {
  return {
    isEnum: true,
    ctype: ctypes.int,
    name: name
  };
}
exports.Enum = Enum;

function declare(lib, name, returnType) {
  let args = Array.slice(arguments, 3);
  let ctypesArgs = args.map(convertToCtypes);
  let symbol = mangler.mangleFunction(name, returnType, args);
  let f;
  try {
    f = lib.declare.apply(
      lib,
      [symbol,
       ctypes.default_abi,
       convertToCtypes(returnType)].concat(ctypesArgs)
    );
  } catch(e) {
    // Just in case, try the unmangled version
    try {
      f = lib.declare.apply(
        lib,
        [name,
         ctypes.default_abi,
         convertToCtypes(returnType)].concat(ctypesArgs)
      );
    } catch(e) {
      throw new Error("Unable to find function '" + name +
                      "', mangled symbol (" + symbol + ")");
    }
  }
  return function () {
    //console.log(">> "+name);
    //console.log(Array.slice(arguments).join(', '));
    return f.apply(this, arguments);
  }
}
exports.declare = declare;
