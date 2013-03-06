const { Cu, Cc, Ci } = require("chrome");
const { CppClass, Const, declare } = require("jscpptypes");
const { createFromURL } = require("sdk/test/tmp-file");

Cu.import("resource://gre/modules/ctypes.jsm");

const { OS, XPCOMABI } = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULRuntime);
const ARCH = XPCOMABI.split("-")[0]; // x86, x86_64

function getSharedLib(name) {
  let filename = ctypes.libraryName(
    name + (OS == "Linux" ? "-" + ARCH: "")
  );
  let url = module.uri.replace("test-jscpptypes.js", "shared_libs/" + filename);
  return createFromURL(url, filename);
}

exports["test C library"] = function (assert) {
  let path = getSharedLib("c");
  let lib = ctypes.open(path);
  let MyFunction = declare(lib, "MyFunction", ctypes.long, ctypes.int.ptr, ctypes.int);
  let i = ctypes.int(1);
  let rv = MyFunction(i.address(), 2);
  assert.equal(rv, 3, "MyFunction works");

  let MyClass = CppClass("MyClass");
  let GetObject = declare(lib, "GetObject", MyClass.ptr, ctypes.int);
  let obj = GetObject(42);
  assert.ok(!obj.isNull(), "GetObject doesn't return a null pointer");
  let GetObjectAttr = declare(lib, "GetObjectAttr", ctypes.int, MyClass.ptr);
  let attr = GetObjectAttr(obj);
  assert.equal(attr, 42, "GetObjectAttr works");
  lib.close();
}

exports["test C++ library"] = function (assert) {
  let path = getSharedLib("cpp");
  let lib = ctypes.open(path);

  // Check simple function with primitive types
  let MyFunction = declare(lib, "MyFunction", ctypes.long, ctypes.int.ptr, ctypes.int);
  let i = ctypes.int(1);
  let rv = MyFunction(i.address(), 2);
  assert.equal(rv, 3, "MyFunction works");

  // Check simple Class pointer usage
  let MyClass = CppClass("MyClass");
  let GetObject = declare(lib, "GetObject", MyClass.ptr, ctypes.int);
  let obj = GetObject(42);
  assert.ok(!obj.isNull(), "GetObject doesn't return a null pointer");
  let GetObjectAttr = declare(lib, "GetObjectAttr", ctypes.long, MyClass.ptr);
  let attr = GetObjectAttr(obj);
  assert.equal(attr, 42, "GetObjectAttr works");

  // Check CppClass.fromAddress()
  // Get the hex string for the object address
  let addr = String(obj).match(/0x[\dA-Fa-f]+/)[0];
  let p = MyClass.ptr.fromAddress(addr);
  let attr = GetObjectAttr(p);
  assert.equal(attr, 42, "GetObjectAttr works on the pointer from MyClass.fromAddress");

  // Check usage of reference
  let GetObjectByRef = declare(lib, "GetObjectByRef", ctypes.void_t, MyClass.ptr.ptr, ctypes.int);
  let obj = MyClass.ptr.create();
  GetObjectByRef(obj.address(), 43);
  assert.ok(!obj.isNull(), "GetObjectByRef set the reference to a non-null object");
  let attr = GetObjectAttr(obj);
  assert.equal(attr, 43, "GetObjectAttr works on the reference");
  
  let MyNSFunction = declare(lib, "MyNS::MySubNS::MyNSFunction", ctypes.long, ctypes.long);
  let rv = MyNSFunction(1);
  assert.equal(rv, 2, "MyNSFunction works");

  // Check compression mangling...
  let Substitution1 = declare(lib, "Substitution1", ctypes.int, MyClass.ptr, MyClass.ptr, MyClass);
  let Substitution2 = declare(lib, "Substitution2", ctypes.int, MyClass, MyClass.ptr, MyClass);
  let Substitution3 = declare(lib, "MyNS::Substitution3", ctypes.int, MyClass, MyClass);
  let MyClass2 = CppClass("MyNS::MyClass2");
  let Substitution4 = declare(lib, "MyNS::Substitution4", ctypes.int, MyClass2);
  let constCharPtr = Const(ctypes.char, true);
  let Substitution5 = declare(lib, "Substitution5", ctypes.int, constCharPtr, ctypes.char, ctypes.char.ptr, constCharPtr);

  lib.close();
}

require('sdk/test').run(exports);

