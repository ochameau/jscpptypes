
long MyFunction(int *foo, int bar)
{
  return *foo + bar;
}

class MyClass {
  public:
    long attr;
};

MyClass* GetObject(int attr)
{
  MyClass *obj = new MyClass();
  obj->attr = attr;
  return obj;
}

long GetObjectAttr(MyClass *obj)
{
  return obj->attr;
}

namespace MyNS {
  namespace MySubNS {
    long MyNSFunction(long foo)
    {
      return foo + 1;
    }
  }
}

