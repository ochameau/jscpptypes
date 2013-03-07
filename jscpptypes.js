const { Cu, Cc, Ci } = require("chrome");
const { OS } = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULRuntime);

Cu.import("resource://gre/modules/ctypes.jsm");
Cu.import("resource://gre/modules/Services.jsm");

let mangler = OS == "WINNT" ? require("winnt-mangler") 
                            : require("gcc-mangler");

// For some reason (ctype.uintptr_t.ptr has wrong size??),
// we can't use ptr for class type and use uint64_t instead.
// But we expect all class intances to be pointer and have isNull method...
if (OS == "WINNT") {
  ctypes.uint64_t.prototype.isNull = function () {
    parseInt(this);
  }
}

function CppClass(name) {
  if (!name)
    throw new Error("CppClass `name` argument is mandatory");
  return {
    isClassObject: true,
    name: name,
    ctype: OS == "WINNT" ? ctypes.uint64_t : ctypes.uintptr_t.ptr,
    create: function () {
      //if (this.ctype == ctypes.uintptr_t)
      //  throw new Error("CppClass.create only works for class pointers");
      return this.ctype(0);
    },
    get ptr() {
      // Create ptr dynamically and keep a cache in
      // order to return the same object each time
      // we access ptr attribute
      delete this.ptr;
      let ptr = CppClass(this.name);
      ptr.ctype = this.ctype.ptr;
      ptr.targetType = this;
      this.ptr = ptr;
      return ptr;
    },
    // Returns a pointer to type object at given address
    // the address should be an hexadecimal string, like 0x0a3927ff...
    fromAddress: function (addr) {
      return ctypes.cast(ctypes.uintptr_t(addr), this.ctype);
    }
  };
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

function convertToCtypes(arg) {
  if (arg.isClassObject || arg.isConst || arg.isEnum) {
    return arg.ctype;
  }
  return arg;
}

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

