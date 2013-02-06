#include <stdlib.h>

#if defined(WINNT)
#define MYLIB_API __declspec(dllexport)
#else
#define MYLIB_API
#endif

long MYLIB_API MyFunction(int *foo, int bar)
{
  return *foo + bar;
}

struct sMyStruct {
  int attr;
};
typedef struct sMyStruct MyClass;

MyClass MYLIB_API *GetObject(int attr)
{
  MyClass* obj;
  obj = (MyClass*) malloc(sizeof(MyClass));
  obj->attr = attr;
  return obj;
}

int MYLIB_API GetObjectAttr(MyClass *obj)
{
  return obj->attr;
}

