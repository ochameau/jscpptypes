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

int MYLIB_API Substitution1(MyClass *a, MyClass* b, MyClass c)
{
  return 1;
}

int MYLIB_API Substitution2(MyClass a, MyClass* b, MyClass c)
{
  return 2;
}

namespace MyNS {
  namespace MySubNS {
    long MYLIB_API MyNSFunction(long foo)
    {
      return foo + 1;
    }
  }

  int MYLIB_API Substitution3(MyClass a, MyClass b)
  {
    return 3;
  }

  class MYLIB_API MyClass2 {};

  int MYLIB_API Substitution4(MyClass2 a)
  {
    return 4;
  }
}

int MYLIB_API Substitution5(const char* a, char b, char* c, const char* d)
{
  return 5;
}

