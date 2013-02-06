#if defined(WINNT)
#define MYLIB_API __declspec(dllexport)
#else
#define MYLIB_API
#endif

long MYLIB_API MyFunction(int *foo, int bar)
{
  return *foo + bar;
}

class MYLIB_API MyClass {
  public:
    long attr;
};

MyClass MYLIB_API *GetObject(int attr)
{
  MyClass *obj = new MyClass();
  obj->attr = attr;
  return obj;
}

long MYLIB_API GetObjectAttr(MyClass *obj)
{
  return obj->attr;
}

namespace MyNS {
  namespace MySubNS {
    long MYLIB_API MyNSFunction(long foo)
    {
      return foo + 1;
    }
  }
}
