const { Cu, Cc, Ci } = require("chrome");
const { OS } = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULRuntime);

Cu.import("resource://gre/modules/ctypes.jsm");
Cu.import("resource://gre/modules/Services.jsm");

function convertToCtypes(arg) {
  if (arg.isCppClass) {
    return arg.ctype;
  }
  return arg;
}

let mangler = OS == "WINNT" ? require("winnt-mangler") 
                            : require("gcc-mangler");

function CppObject(name, noPtr, ptr) {
  return {
    isCppClass: true,
    symbol: mangler.mangleClass(name, noPtr),
    ctype: ptr ? ctypes.uint64_t.ptr : ctypes.uint64_t
  };
}
exports.CppObject = CppObject;

function declare(lib, name, returnType) {
  let args = Array.slice(arguments, 3);
  let ctypesArgs = args.map(convertToCtypes);
  let symbol = mangler.mangleFunction(name, returnType, args);
  try {
    return lib.declare.apply(
      lib,
      [symbol,
       ctypes.default_abi,
       convertToCtypes(returnType)].concat(ctypesArgs)
    );
  } catch(e) {
    // XXX: C++ doesn't seem to be mangled on windows?
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
