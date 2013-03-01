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

function isNullPointer(ptr) {
  return !parseInt(ptr);
  return parseInt(ctypes.cast(ptr, ctypes.uintptr_t).value) == 0;
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
  console.log(obj);
  assert.ok(!isNullPointer(obj), "GetObject doesn't return a null pointer");
  let GetObjectAttr = declare(lib, "GetObjectAttr", ctypes.int, MyClass.ptr);
  let attr = GetObjectAttr(obj);
  assert.equal(attr, 42, "GetObjectAttr works");
  lib.close();
}

exports["test C++ library"] = function (assert) {
  let path = getSharedLib("cpp");
  let lib = ctypes.open(path);
  let MyFunction = declare(lib, "MyFunction", ctypes.long, ctypes.int.ptr, ctypes.int);
  let i = ctypes.int(1);
  let rv = MyFunction(i.address(), 2);
  assert.equal(rv, 3, "MyFunction works");

  let MyClass = CppClass("MyClass");
  let GetObject = declare(lib, "GetObject", MyClass.ptr, ctypes.int);
  let obj = GetObject(42);
  assert.ok(!isNullPointer(obj), "GetObject doesn't return a null pointer");
  let GetObjectAttr = declare(lib, "GetObjectAttr", ctypes.long, MyClass.ptr);
  let attr = GetObjectAttr(obj);
  assert.equal(attr, 42, "GetObjectAttr works");
  
  let MyNSFunction = declare(lib, "MyNS::MySubNS::MyNSFunction", ctypes.long, ctypes.long);
  let rv = MyNSFunction(1);
  assert.equal(rv, 2, "MyNSFunction works");

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

